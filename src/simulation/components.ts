import { product, type Cloud } from './cloud.ts'

export type ComponentId =
  | 'sender'
  | 'userDirectory'
  | 'gateway'
  | 'chatServerA'
  | 'session'
  | 'presence'
  | 'chatServerB'
  | 'transient'
  | 'push'
  | 'recipient'
  | 'objectStore'
  | 'cdn'

export type Lane = 'core' | 'offline' | 'media'

export type ComponentDef = {
  id: ComponentId
  role: string
  lane: Lane
  product: Record<Cloud, string>
  purpose: string
  choice: (cloud: Cloud) => string
  considered: string
  why: (cloud: Cloud) => string
}

const onDevice: Record<Cloud, string> = {
  aws: 'On device',
  azure: 'On device',
  google: 'On device',
}

export const components: ComponentDef[] = [
  {
    id: 'sender',
    role: 'Sender Device',
    lane: 'core',
    product: onDevice,
    purpose:
      'This is where the message starts. The phone encrypts the text before anything leaves, keeps a local outbox, and later records the delivery receipt. Plaintext does not travel past this point.',
    choice: () =>
      'Encrypt with the Signal protocol on the phone, and keep the outbox in local SQLite.',
    considered:
      'TLS only, with the servers encrypting stored messages at rest. Or a long-lived key pair in the style of PGP.',
    why: () =>
      'TLS ends at the gateway, so chat servers and the transient store would see plaintext. Encryption at rest still lets the operator read messages. A long-lived key means one stolen key opens the whole history. Signal ratchets a new key per message, and the server only forwards ciphertext. The phone is the only place plaintext is stored.',
  },
  {
    id: 'userDirectory',
    role: 'User Directory',
    lane: 'core',
    product: product.directory,
    purpose:
      'Resolves who the recipient is before the message is encrypted. It maps a phone number to a user id and the identity key the sender needs. After the chat is open, ordinary frames do not come back here.',
    choice: (cloud) => `A relational database: ${product.directory[cloud]}.`,
    considered:
      'Putting profiles in the same wide-column store as offline messages. A document collection with no uniqueness constraints.',
    why: () =>
      'A person, their phone number, their identity key, and their groups are a small relational record. This lookup happens when a chat is opened, not on every frame. It needs a unique phone number and a stable user id. Messages are the opposite shape: huge, short-lived, and deleted after delivery. One store for both would force profile reads to scale like the message firehose.',
  },
  {
    id: 'gateway',
    role: 'Edge Gateway',
    lane: 'core',
    product: product.gateway,
    purpose:
      'The front door for the phone’s long-lived connection. It terminates TLS, accepts the WebSocket, and hands each frame to the chat server that owns that socket. It does not decrypt the message.',
    choice: (cloud) =>
      `${product.gateway[cloud]}, terminating TLS and forwarding WebSocket frames.`,
    considered:
      'HTTP long-polling. A request/response API that opens a new connection for every message.',
    why: () =>
      'Each signed-in phone holds one connection open so the server can push immediately. Long-polling repeats headers on every poll and cannot deliver until the next poll returns. A fresh HTTP request per message forces the client to reconnect constantly. This tier does not read the payload. It accepts the socket and hands the frame to the chat server that owns the connection.',
  },
  {
    id: 'chatServerA',
    role: 'Chat Server A',
    lane: 'core',
    product: product.compute,
    purpose:
      'Holds the sender’s open connection. When a frame arrives, it asks where the recipient is connected and whether they are online, then either forwards the ciphertext or parks it for later.',
    choice: (cloud) =>
      `A long-lived process on ${product.compute[cloud]}, owning the sender's socket.`,
    considered:
      'Stateless functions that wake once per request. Round-robin across servers with no connection ownership.',
    why: (cloud) =>
      `Something has to remember the open socket between messages. A function that exits after one request cannot push the next frame. Round-robin would land on a machine that does not hold the other person's connection. Chat Server A is stateful on purpose, hosted on ${product.compute[cloud]}. The session directory is what keeps that workable: any server can ask which machine holds the recipient.`,
  },
  {
    id: 'session',
    role: 'Session Directory',
    lane: 'core',
    product: product.redis,
    purpose:
      'Tells a chat server which machine currently holds someone’s socket. Without it, the sender’s server would not know where to forward the frame.',
    choice: (cloud) =>
      `An in-memory map in ${product.redis[cloud]}: user id to the chat server holding the socket.`,
    considered:
      'A row in the user directory. Asking every chat server who is connected.',
    why: (cloud) =>
      `This lookup happens on every message and has to finish in a fraction of a millisecond. The value is one address. A relational query is too much machinery, and broadcasting to the fleet does not survive millions of open sockets. ${product.redis[cloud]} keeps that tiny map in memory, with a short TTL so a dead connection disappears on its own.`,
  },
  {
    id: 'presence',
    role: 'Presence Service',
    lane: 'core',
    product: product.redis,
    purpose:
      'Answers whether the recipient is online right now. That answer chooses the branch: deliver straight down their socket, or park the ciphertext and wake the phone.',
    choice: (cloud) =>
      `A second keyspace in ${product.redis[cloud]}, separate from the session map.`,
    considered:
      'Writing every heartbeat into the transient message store. Trusting the phone to declare itself online, with nothing recorded.',
    why: (cloud) =>
      `Online and last-seen change constantly and then expire. A durable write per heartbeat would cost more than the messages and would still be stale. A TTL in ${product.redis[cloud]} flips the user to offline when the heartbeat stops. That flag chooses the live push versus the parked-message branch. It does not belong in the user directory, which changes rarely.`,
  },
  {
    id: 'chatServerB',
    role: 'Chat Server B',
    lane: 'core',
    product: product.compute,
    purpose:
      'Holds the recipient’s open connection. It writes incoming ciphertext down that socket and, on the way back, relays the delivery receipt. If the recipient is offline, it stays out of the path until the phone reconnects.',
    choice: (cloud) =>
      `A long-lived process on ${product.compute[cloud]}, owning the recipient's socket.`,
    considered:
      'The same alternatives as Chat Server A: stateless functions, or round-robin with no ownership.',
    why: (cloud) =>
      `Chat Server B is the same kind of process as Chat Server A. It stays up on ${product.compute[cloud]} because it is holding Alex's WebSocket. When presence says Alex is online, Server A forwards ciphertext here and Server B writes it down the existing socket. When Alex is offline, this process is not in the path until the phone reconnects.`,
  },
  {
    id: 'transient',
    role: 'Transient Message Store',
    lane: 'offline',
    product: product.transient,
    purpose:
      'Keeps ciphertext for someone who is not connected. The row lasts only until their phone acknowledges delivery, then it is deleted. Conversation history does not live here.',
    choice: (cloud) =>
      `${product.transient[cloud]}, holding ciphertext only until the phone acknowledges it.`,
    considered:
      'Keeping every message forever in a central database. Parking the queue only in Redis. Using the user-directory database.',
    why: (cloud) => {
      const base = `Offline messages are a large write stream that is deleted on delivery. A forever-store would keep history this design leaves on the phone, which costs more and retains ciphertext longer than it needs to. Redis is for the tiny hot keys, session and presence, not a backlog. The relational database cannot take this write rate. ${product.transient[cloud]} takes the spike and the delete.`
      if (cloud === 'google') {
        return `${base} Google has no managed Cassandra, so Bigtable is the wide-column counterpart: same shape of row, different API.`
      }
      return base
    },
  },
  {
    id: 'push',
    role: 'Push Notification Service',
    lane: 'offline',
    product: product.push,
    purpose:
      'Wakes a phone whose connection the operating system has dropped. The notification has no message body. The phone reconnects and pulls the ciphertext from the transient store.',
    choice: (cloud) => `${product.push[cloud]}, with a wake-up and no message body.`,
    considered: 'Requiring the socket to stay open in the background. SMS.',
    why: (cloud) =>
      `Phone operating systems suspend apps and drop the socket. ${product.push[cloud]} asks the device to reconnect and pull. The notification has no plaintext and no ciphertext. The message is already in the transient store, and only the phone can decrypt it. SMS is billed per message and is not end-to-end encrypted.`,
  },
  {
    id: 'recipient',
    role: 'Recipient Device',
    lane: 'core',
    product: onDevice,
    purpose:
      'Where the message becomes readable. The phone decrypts it, stores the plaintext locally, and sends a delivery receipt back so the server can drop its copy.',
    choice: () => 'Decrypt on the phone and append the plaintext to local SQLite.',
    considered: 'An inbox the app reloads from the server whenever it opens.',
    why: () =>
      'Once the phone acknowledges the message, the server copy is deleted. The phone is the record of the conversation. That is the privacy property and the cost property together: the service does not keep the chat logs. A server inbox would undo the transient store.',
  },
  {
    id: 'objectStore',
    role: 'Object Store',
    lane: 'media',
    product: product.object,
    purpose:
      'Holds the encrypted bytes of a photo or file. Those bytes never travel on the chat socket. The object is ciphertext only; the key goes separately, inside the chat message.',
    choice: (cloud) =>
      `Client ciphertext in ${product.object[cloud]}. The decryption key is not in the object.`,
    considered:
      'Sending the image bytes on the chat socket. Storing the blob in the transient message store.',
    why: (cloud) =>
      `A photo is megabytes. On the messaging socket it would block every other frame and force chat servers to buffer bulk data. The wide-column store is for small message rows, not media. ${product.object[cloud]} holds large immutable blobs. The chat message later carries only the object location and a key wrapped for the recipient.`,
  },
  {
    id: 'cdn',
    role: 'Media CDN',
    lane: 'media',
    product: product.cdn,
    purpose:
      'Caches that ciphertext near the recipient so a download does not hit the origin every time. It still does not hold the decryption key.',
    choice: (cloud) => `${product.cdn[cloud]}, caching the ciphertext object.`,
    considered: 'Every download read from the origin bucket. No cache.',
    why: (cloud) =>
      `The recipient may fetch the same object immediately, and again after a reinstall. ${product.cdn[cloud]} keeps that read off the origin. The cached bytes are still ciphertext. The request that fills the cache does not include the decryption key. The key arrives only inside the encrypted chat message, on the phone.`,
  },
]

export const laneLabel: Record<Lane, string> = {
  core: 'Every message',
  offline: 'Offline branch',
  media: 'Media branch',
}
