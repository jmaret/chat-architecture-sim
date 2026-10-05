import {
  directoryHost,
  mediaUri,
  product,
  redisHost,
  type Cloud,
} from './cloud.ts'
import type { ComponentId } from './components.ts'

export type Receipt = 'pending' | 'sent' | 'delivered'
export type BubbleKind = 'text' | 'photo'

export type Step = {
  componentId: ComponentId
  kind: 'inflight' | 'stored'
  caption: string
  status: string
  payload: (cloud: Cloud) => Record<string, unknown>
  outgoing?: { kind: BubbleKind; text: string }
  receipt?: Receipt
  presence?: boolean
}

export type Scenario = {
  id: string
  title: string
  steps: Step[]
}

const TEXT_ID = 'msg_18'
const PHOTO_ID = 'msg_19'
const TEXT_CIPHER = 'ct:3a91c0e7'
const PHOTO_CIPHER = 'ct:88b1aa02'
const WRAPPED_KEY = 'wk:alex-only'

function directoryStep(): Step {
  return {
    componentId: 'userDirectory',
    kind: 'stored',
    caption: 'Recipient row',
    status: 'Resolving Alex in the user directory',
    payload: (cloud) => ({
      store: product.directory[cloud],
      host: directoryHost(cloud),
      lookup: 'phone:+1-415-555-0148',
      userId: 'usr_alex',
      identityKey: 'BSpub_alex…',
    }),
  }
}

function ackSteps(messageId: string): Step[] {
  return [
    {
      componentId: 'recipient',
      kind: 'inflight',
      caption: 'Delivery receipt',
      status: "Alex's phone is sending a delivery receipt",
      payload: () => ({
        op: 'ack',
        messageId,
        state: 'delivered',
        plaintextOnServer: false,
      }),
    },
    {
      componentId: 'chatServerB',
      kind: 'inflight',
      caption: 'Relaying receipt',
      status: 'Chat Server B is relaying the receipt',
      payload: (cloud) => ({
        server: 'chat-b-6',
        compute: product.compute[cloud],
        frame: { ack: messageId, state: 'delivered' },
      }),
    },
    {
      componentId: 'chatServerA',
      kind: 'inflight',
      caption: 'Relaying receipt',
      status: 'Chat Server A is relaying the receipt',
      payload: (cloud) => ({
        server: 'chat-a-3',
        compute: product.compute[cloud],
        frame: { ack: messageId, state: 'delivered' },
      }),
    },
    {
      componentId: 'sender',
      kind: 'stored',
      caption: 'Receipt stored',
      status: 'Your phone marked the message delivered',
      receipt: 'delivered',
      payload: () => ({
        sqlite: `messages/${messageId}`,
        receipt: 'delivered',
        serverCopy: 'not kept',
      }),
    },
  ]
}

function transientEmpty(messageId: string): Step {
  return {
    componentId: 'transient',
    kind: 'stored',
    caption: 'No offline row',
    status: 'Nothing was written for an online recipient',
    payload: (cloud) => ({
      store: product.transient[cloud],
      key: `offline:usr_alex:${messageId}`,
      status: 'not written',
      reason: 'recipient was online',
    }),
  }
}

function textHops(text: string, online: boolean): Step[] {
  return [
    directoryStep(),
    {
      componentId: 'sender',
      kind: 'stored',
      caption: 'Local outbox',
      status: 'Encrypting on your phone',
      outgoing: { kind: 'text', text },
      receipt: 'pending',
      payload: () => ({
        op: 'encrypt',
        protocol: 'Signal',
        plaintext: text,
        ciphertext: TEXT_CIPHER,
        sqlite: `messages/${TEXT_ID} status=pending`,
      }),
    },
    {
      componentId: 'gateway',
      kind: 'inflight',
      caption: 'WebSocket frame',
      status: 'The gateway accepted the frame',
      receipt: 'sent',
      payload: (cloud) => ({
        edge: product.gateway[cloud],
        connectionId: 'ws_7f2',
        to: 'usr_alex',
        ciphertext: TEXT_CIPHER,
        plaintextVisible: false,
      }),
    },
    {
      componentId: 'chatServerA',
      kind: 'inflight',
      caption: 'Sender connection',
      status: 'Chat Server A holds your socket',
      payload: (cloud) => ({
        server: 'chat-a-3',
        compute: product.compute[cloud],
        holdsSocket: 'usr_me',
        forward: { to: 'usr_alex', ciphertext: TEXT_CIPHER },
      }),
    },
    {
      componentId: 'session',
      kind: 'stored',
      caption: 'Connection lookup',
      status: online
        ? 'Session directory points at Chat Server B'
        : 'Session directory has no live server for Alex',
      payload: (cloud) => ({
        store: product.redis[cloud],
        host: redisHost(cloud),
        key: 'session:usr_alex',
        value: online ? 'chat-b-6' : null,
        ttlSec: online ? 30 : 0,
      }),
    },
    {
      componentId: 'presence',
      kind: 'stored',
      caption: online ? 'Online' : 'Offline',
      status: online ? 'Alex is online' : 'Alex is offline',
      presence: online,
      payload: (cloud) => ({
        store: product.redis[cloud],
        host: redisHost(cloud),
        key: 'presence:usr_alex',
        status: online ? 'online' : 'offline',
        lastSeen: online ? 'now' : '2026-10-04T20:11:02Z',
      }),
    },
  ]
}

export function textOnline(text: string): Scenario {
  return {
    id: 'text-online',
    title: 'Text, Alex online',
    steps: [
      ...textHops(text, true),
      {
        componentId: 'chatServerB',
        kind: 'inflight',
        caption: 'Push down the socket',
        status: "Chat Server B is writing the frame to Alex's socket",
        payload: (cloud) => ({
          server: 'chat-b-6',
          compute: product.compute[cloud],
          holdsSocket: 'usr_alex',
          pushFrame: { ciphertext: TEXT_CIPHER },
        }),
      },
      {
        componentId: 'recipient',
        kind: 'stored',
        caption: 'Decrypted locally',
        status: "Alex's phone decrypted the message",
        payload: () => ({
          op: 'decrypt',
          protocol: 'Signal',
          ciphertext: TEXT_CIPHER,
          plaintext: text,
          sqlite: `messages/${TEXT_ID}`,
        }),
      },
      ...ackSteps(TEXT_ID),
      transientEmpty(TEXT_ID),
    ],
  }
}

export function textOffline(text: string): Scenario {
  return {
    id: 'text-offline',
    title: 'Text, Alex offline',
    steps: [
      ...textHops(text, false),
      {
        componentId: 'transient',
        kind: 'stored',
        caption: 'Parked ciphertext',
        status: 'The message is parked. Alex has not seen it.',
        payload: (cloud) => ({
          store: product.transient[cloud],
          pk: 'usr_alex',
          ck: TEXT_ID,
          ciphertext: TEXT_CIPHER,
          plaintext: null,
          deleteOn: 'delivery ack',
        }),
      },
      {
        componentId: 'push',
        kind: 'inflight',
        caption: 'Wake-up only',
        status: 'A push was sent with no message body',
        payload: (cloud) => ({
          service: product.push[cloud],
          to: 'device_alex',
          alert: 'New message',
          body: null,
          data: { messageId: TEXT_ID },
        }),
      },
      {
        componentId: 'session',
        kind: 'stored',
        caption: 'Reconnect',
        status: 'Alex reconnected to Chat Server B',
        presence: true,
        payload: (cloud) => ({
          store: product.redis[cloud],
          host: redisHost(cloud),
          key: 'session:usr_alex',
          value: 'chat-b-6',
          event: 'reconnect',
          ttlSec: 30,
        }),
      },
      {
        componentId: 'transient',
        kind: 'stored',
        caption: 'Read parked row',
        status: 'Chat Server B read the parked ciphertext',
        payload: (cloud) => ({
          store: product.transient[cloud],
          op: 'read',
          pk: 'usr_alex',
          ck: TEXT_ID,
          ciphertext: TEXT_CIPHER,
        }),
      },
      {
        componentId: 'chatServerB',
        kind: 'inflight',
        caption: 'Deliver after reconnect',
        status: "Chat Server B is delivering the parked frame",
        payload: (cloud) => ({
          server: 'chat-b-6',
          compute: product.compute[cloud],
          holdsSocket: 'usr_alex',
          pushFrame: { ciphertext: TEXT_CIPHER, from: 'transient-store' },
        }),
      },
      {
        componentId: 'recipient',
        kind: 'stored',
        caption: 'Decrypted locally',
        status: "Alex's phone decrypted the parked message",
        payload: () => ({
          op: 'decrypt',
          protocol: 'Signal',
          ciphertext: TEXT_CIPHER,
          plaintext: text,
          sqlite: `messages/${TEXT_ID}`,
        }),
      },
      ...ackSteps(TEXT_ID),
      {
        componentId: 'transient',
        kind: 'stored',
        caption: 'Row deleted',
        status: 'The server copy was deleted after delivery',
        payload: (cloud) => ({
          store: product.transient[cloud],
          op: 'delete',
          pk: 'usr_alex',
          ck: TEXT_ID,
          remaining: 0,
        }),
      },
    ],
  }
}

export function photoMessage(caption: string): Scenario {
  const label = caption.trim() || 'Photo'
  return {
    id: 'photo',
    title: 'Photo, Alex online',
    steps: [
      directoryStep(),
      {
        componentId: 'sender',
        kind: 'stored',
        caption: 'Media encrypted locally',
        status: 'Encrypting the photo on your phone',
        outgoing: { kind: 'photo', text: label },
        receipt: 'pending',
        payload: () => ({
          op: 'encrypt-media',
          plaintextBytes: 248113,
          ciphertext: 'blob:9f3ce1',
          wrappedKey: WRAPPED_KEY,
          note: 'The key stays on the phone until the chat message is sent',
        }),
      },
      {
        componentId: 'objectStore',
        kind: 'stored',
        caption: 'Ciphertext object',
        status: 'Photo ciphertext is stored. The key is not in the object.',
        payload: (cloud) => ({
          store: product.object[cloud],
          put: mediaUri(cloud),
          bytes: 248113,
          encryption: 'client ciphertext',
          contentKeyPresent: false,
        }),
      },
      {
        componentId: 'cdn',
        kind: 'stored',
        caption: 'Edge cache',
        status: 'The CDN cached ciphertext only',
        payload: (cloud) => ({
          cache: product.cdn[cloud],
          object: mediaUri(cloud),
          contentKeyPresent: false,
        }),
      },
      {
        componentId: 'sender',
        kind: 'inflight',
        caption: 'Chat pointer',
        status: 'Sending the media pointer through chat, not the bytes',
        payload: (cloud) => ({
          op: 'encrypt-chat',
          plaintext: {
            caption: label,
            mediaRef: mediaUri(cloud),
            wrappedKey: WRAPPED_KEY,
          },
          ciphertext: PHOTO_CIPHER,
        }),
      },
      {
        componentId: 'gateway',
        kind: 'inflight',
        caption: 'WebSocket frame',
        status: 'The gateway accepted the pointer frame',
        receipt: 'sent',
        payload: (cloud) => ({
          edge: product.gateway[cloud],
          connectionId: 'ws_7f2',
          ciphertext: PHOTO_CIPHER,
          mediaBytesOnSocket: false,
        }),
      },
      {
        componentId: 'chatServerA',
        kind: 'inflight',
        caption: 'Sender connection',
        status: 'Chat Server A is forwarding the pointer',
        payload: (cloud) => ({
          server: 'chat-a-3',
          compute: product.compute[cloud],
          forward: { ciphertext: PHOTO_CIPHER },
        }),
      },
      {
        componentId: 'session',
        kind: 'stored',
        caption: 'Connection lookup',
        status: 'Session directory points at Chat Server B',
        payload: (cloud) => ({
          store: product.redis[cloud],
          host: redisHost(cloud),
          key: 'session:usr_alex',
          value: 'chat-b-6',
          ttlSec: 30,
        }),
      },
      {
        componentId: 'presence',
        kind: 'stored',
        caption: 'Online',
        status: 'Alex is online',
        presence: true,
        payload: (cloud) => ({
          store: product.redis[cloud],
          key: 'presence:usr_alex',
          status: 'online',
        }),
      },
      {
        componentId: 'chatServerB',
        kind: 'inflight',
        caption: 'Push down the socket',
        status: "Chat Server B is delivering the pointer",
        payload: (cloud) => ({
          server: 'chat-b-6',
          compute: product.compute[cloud],
          pushFrame: { ciphertext: PHOTO_CIPHER },
        }),
      },
      {
        componentId: 'cdn',
        kind: 'inflight',
        caption: 'Ciphertext fetch',
        status: 'Alex fetched the object. The request has no decryption key.',
        payload: (cloud) => ({
          cache: product.cdn[cloud],
          get: mediaUri(cloud),
          contentKeyPresent: false,
          body: 'ciphertext bytes',
        }),
      },
      {
        componentId: 'recipient',
        kind: 'stored',
        caption: 'Decrypted locally',
        status: "Alex's phone decrypted the photo with the key from chat",
        payload: (cloud) => ({
          op: 'decrypt',
          chatCiphertext: PHOTO_CIPHER,
          mediaRef: mediaUri(cloud),
          wrappedKey: WRAPPED_KEY,
          keySource: 'chat message, not the CDN',
          caption: label,
          sqlite: `messages/${PHOTO_ID}`,
        }),
      },
      ...ackSteps(PHOTO_ID),
      transientEmpty(PHOTO_ID),
    ],
  }
}
