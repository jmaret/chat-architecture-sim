import { useEffect, useMemo, useRef, useState } from 'react'
import { CLOUDS, type Cloud } from './simulation/cloud.ts'
import {
  components,
  laneLabel,
  type ComponentId,
} from './simulation/components.ts'
import {
  photoMessage,
  textOffline,
  textOnline,
  type Receipt,
  type Scenario,
} from './simulation/scenarios.ts'
import { projectWalk } from './simulation/view.ts'

const STEP_MS = 1100

function receiptLabel(receipt: Receipt | undefined): string | null {
  if (receipt === 'pending') return 'Sending'
  if (receipt === 'sent') return 'Sent'
  if (receipt === 'delivered') return 'Delivered'
  return null
}

export default function App() {
  const [cloud, setCloud] = useState<Cloud>('aws')
  const [alexOnline, setAlexOnline] = useState(true)
  const [draft, setDraft] = useState('')
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [stepIndex, setStepIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [openWhy, setOpenWhy] = useState<ComponentId | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const stepRef = useRef(-1)
  stepRef.current = stepIndex

  const view = useMemo(
    () => projectWalk(scenario, stepIndex, cloud, alexOnline),
    [scenario, stepIndex, cloud, alexOnline],
  )

  const lastIndex = scenario ? scenario.steps.length - 1 : -1
  const atEnd = scenario !== null && stepIndex >= lastIndex

  useEffect(() => {
    if (!playing || !scenario || atEnd) return
    const timer = window.setTimeout(() => {
      const next = Math.min(stepRef.current + 1, lastIndex)
      stepRef.current = next
      setStepIndex(next)
    }, STEP_MS)
    return () => window.clearTimeout(timer)
  }, [playing, scenario, stepIndex, atEnd, lastIndex])

  useEffect(() => {
    if (atEnd) setPlaying(false)
  }, [atEnd])

  useEffect(() => {
    if (!view.activeId) return
    document.getElementById(`card-${view.activeId}`)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [view.activeId, stepIndex])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [view.bubbles, view.status])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenWhy(null)
        return
      }
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function goTo(next: number) {
    const clamped = scenario
      ? Math.min(scenario.steps.length - 1, Math.max(0, next))
      : -1
    stepRef.current = clamped
    setStepIndex(clamped)
  }

  function begin(next: Scenario) {
    setScenario(next)
    stepRef.current = 0
    setStepIndex(0)
    setPlaying(false)
    setOpenWhy(null)
    setDraft('')
  }

  function sendText() {
    const text = draft.trim()
    if (!text) return
    begin(alexOnline ? textOnline(text) : textOffline(text))
  }

  function sendPhoto() {
    begin(photoMessage(draft.trim() || 'Photo'))
  }

  function step(delta: number) {
    if (!scenario) return
    setPlaying(false)
    goTo(stepRef.current + delta)
  }

  function reset() {
    setScenario(null)
    stepRef.current = -1
    setStepIndex(-1)
    setPlaying(false)
    setOpenWhy(null)
    setDraft('')
    draftRef.current?.focus()
  }

  function toggleWhy(id: ComponentId) {
    setPlaying(false)
    setOpenWhy((current) => (current === id ? null : id))
  }

  const hopLabel = scenario
    ? `Hop ${stepIndex + 1} of ${scenario.steps.length} · ${scenario.steps[stepIndex]?.caption ?? ''}`
    : 'Send a message to walk it through the architecture'

  return (
    <div className="app">
      <section className="chat" aria-label="Chat">
        <header className="chat-head">
          <div className={`avatar ${view.presenceOnline ? 'on' : 'off'}`} aria-hidden>
            A
          </div>
          <div>
            <h1>Alex</h1>
            <p className="presence">
              {view.presenceOnline ? 'Online' : 'Offline'}
              <span> · {view.status}</span>
            </p>
          </div>
        </header>

        <div className="thread" ref={threadRef}>
          {view.bubbles.map((bubble) => (
            <article key={bubble.id} className={`bubble ${bubble.from}`}>
              {bubble.kind === 'photo' ? (
                <div className="photo">
                  <span>Photo</span>
                  <strong>{bubble.text}</strong>
                </div>
              ) : (
                <p>{bubble.text}</p>
              )}
              {bubble.from === 'me' && receiptLabel(bubble.receipt) ? (
                <footer>{receiptLabel(bubble.receipt)}</footer>
              ) : null}
            </article>
          ))}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            sendText()
          }}
        >
          <div className="switch">
            <button
              type="button"
              className={alexOnline ? 'selected' : ''}
              aria-pressed={alexOnline}
              onClick={() => setAlexOnline(true)}
            >
              Alex online
            </button>
            <button
              type="button"
              className={!alexOnline ? 'selected' : ''}
              aria-pressed={!alexOnline}
              onClick={() => setAlexOnline(false)}
            >
              Alex offline
            </button>
          </div>
          <div className="compose-row">
            <textarea
              ref={draftRef}
              rows={2}
              value={draft}
              placeholder="Message Alex"
              aria-label="Message"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendText()
                }
              }}
            />
            <div className="send-col">
              <button type="submit" disabled={!draft.trim()}>
                Send
              </button>
              <button type="button" onClick={sendPhoto}>
                Send photo
              </button>
            </div>
          </div>
          <p className="hint">
            Photo always delivers while Alex is online. The online switch applies to text.
          </p>
        </form>
      </section>

      <section className="board" aria-label="Architecture">
        <header className="board-head">
          <div>
            <p className="kicker">Chat simulation</p>
            <h2>How a message moves</h2>
          </div>
          <div className="clouds" role="group" aria-label="Cloud provider">
            {CLOUDS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cloud === item.id ? 'selected' : ''}
                aria-pressed={cloud === item.id}
                onClick={() => setCloud(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="transport">
          <p aria-live="polite">{hopLabel}</p>
          <div className="transport-buttons">
            <button type="button" onClick={() => step(-1)} disabled={!scenario || stepIndex <= 0}>
              Step back
            </button>
            {playing ? (
              <button type="button" onClick={() => setPlaying(false)}>
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                disabled={!scenario || atEnd}
              >
                Play
              </button>
            )}
            <button type="button" onClick={() => step(1)} disabled={!scenario || atEnd}>
              Step forward
            </button>
            <button type="button" onClick={reset} disabled={!scenario && !draft}>
              Reset
            </button>
          </div>
        </div>

        <div className="cards">
          {components.map((component) => {
            const box = view.boxes[component.id]
            const active = view.activeId === component.id
            const onPath = scenario?.steps.some((step) => step.componentId === component.id) ?? false
            const open = openWhy === component.id
            const placeholder = !scenario
              ? 'Send a message to fill this box.'
              : onPath
                ? 'Waiting for this hop.'
                : 'Not on this path.'
            return (
              <article
                key={component.id}
                id={`card-${component.id}`}
                className={`card ${active ? 'active' : ''} ${box ? 'filled' : ''} ${open ? 'open' : ''}`}
              >
                <button
                  type="button"
                  className="why"
                  aria-expanded={open}
                  aria-controls={`why-${component.id}`}
                  onClick={() => toggleWhy(component.id)}
                >
                  Why this choice
                </button>
                {open ? (
                  <div
                    className="why-pop"
                    id={`why-${component.id}`}
                    role="dialog"
                    aria-label={`Why ${component.role}`}
                  >
                    <h3>{component.role}</h3>
                    <p>
                      <strong>Choice. </strong>
                      {component.choice(cloud)}
                    </p>
                    <p>
                      <strong>Also considered. </strong>
                      {component.considered}
                    </p>
                    <p>
                      <strong>Why it held. </strong>
                      {component.why(cloud)}
                    </p>
                    <button type="button" onClick={() => setOpenWhy(null)}>
                      Close
                    </button>
                  </div>
                ) : null}
                <p className="lane">{laneLabel[component.lane]}</p>
                <h3>{component.role}</h3>
                <p className="product">{component.product[cloud]}</p>
                <label className="box-label">
                  {box ? (box.kind === 'stored' ? 'Stored' : 'In flight') : 'Idle'}
                  {box ? ` · ${box.caption}` : ''}
                  <textarea
                    readOnly
                    value={box?.body ?? ''}
                    placeholder={placeholder}
                    aria-label={`${component.role} data`}
                  />
                </label>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
