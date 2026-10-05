import { product, type Cloud } from './simulation/cloud.ts'
import { requirementSummary, visionSummary } from './product/summary.ts'
import { APP_VERSION, releases } from './product/releases.ts'

export function VersionLink({
  open,
  onClick,
}: {
  open: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={open ? 'selected' : ''} aria-pressed={open} onClick={onClick}>
      Version {APP_VERSION}
    </button>
  )
}

export function SummaryPanel({ cloud, onBack }: { cloud: Cloud; onBack: () => void }) {
  const physical = [
    'Sender device',
    product.directory[cloud],
    product.gateway[cloud],
    `${product.compute[cloud]} · Chat Server A`,
    `${product.redis[cloud]} · session and presence`,
    `${product.compute[cloud]} · Chat Server B`,
    'Recipient device',
  ]
  return (
    <article className="doc">
      <header className="doc-head">
        <div>
          <p className="kicker">Version {APP_VERSION}</p>
          <h2>Vision and architecture</h2>
        </div>
        <button type="button" onClick={onBack}>
          Back to the simulation
        </button>
      </header>
      <section>
        <h3>Vision</h3>
        {visionSummary.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
      <section>
        <h3>Requirements</h3>
        <ul>
          {requirementSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Conceptual</h3>
        <p>Who does what, before any product name.</p>
        <ol className="chain">
          <li>Sender device</li>
          <li>Edge</li>
          <li>Chat servers</li>
          <li>Recipient device</li>
        </ol>
        <p>
          Presence chooses a live push or an offline store plus a wake-up. A photo’s bytes go to a
          media store and an edge cache. The receipt travels back to the sender, and the servers
          then drop their copy.
        </p>
      </section>
      <section>
        <h3>Logical</h3>
        <p>The services and what they exchange. A double arrow is a two-way exchange.</p>
        <ol className="chain">
          <li>Sender device</li>
          <li>User directory</li>
          <li>Edge gateway</li>
          <li>Chat Server A</li>
          <li>Session and presence</li>
          <li>Chat Server B</li>
          <li>Recipient device</li>
        </ol>
        <p>
          Offline adds the transient message store and the push service. Media adds the object
          store and the CDN. The CDN never receives the decryption key.
        </p>
      </section>
      <section>
        <h3>Physical</h3>
        <p>The same roles on the selected cloud. Phones stay on the device.</p>
        <ol className="chain">
          {physical.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p>
          Offline store: {product.transient[cloud]}. Wake-up: {product.push[cloud]}. Media:{' '}
          {product.object[cloud]} and {product.cdn[cloud]}.
        </p>
      </section>
      <p className="doc-note">
        The full write-ups are docs/vision-and-requirements.md and docs/architecture-and-design.md
        in the project.
      </p>
    </article>
  )
}

export function HistoryPanel({ onBack }: { onBack: () => void }) {
  return (
    <article className="doc">
      <header className="doc-head">
        <div>
          <p className="kicker">Current version {APP_VERSION}</p>
          <h2>Version history</h2>
        </div>
        <button type="button" onClick={onBack}>
          Back to the simulation
        </button>
      </header>
      <ol className="history">
        {releases.map((release) => (
          <li key={release.version}>
            <h3>
              {release.version}
              <span>{release.date}</span>
            </h3>
            <ul>
              {release.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </article>
  )
}
