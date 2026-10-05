import { useMemo } from 'react'
import {
  components,
  laneLabel,
  type ComponentId,
} from './simulation/components.ts'
import type { Cloud } from './simulation/cloud.ts'
import {
  arrowAt,
  directionKey,
  FLOW_HEIGHT,
  FLOW_WIDTH,
  links,
  nodePoint,
  type Direction,
} from './simulation/flow.ts'
import type { Scenario } from './simulation/scenarios.ts'
import type { BoxState } from './simulation/view.ts'

export type InspectTab = 'data' | 'purpose' | 'why'

export type Inspect = {
  id: ComponentId
  tab: InspectTab
}

type FlowMapProps = {
  cloud: Cloud
  scenario: Scenario | null
  stepIndex: number
  boxes: Partial<Record<ComponentId, BoxState>>
  activeId: ComponentId | null
  inspect: Inspect | null
  onInspect: (next: Inspect | null) => void
}

const NODE_HW = 82
const NODE_HH = 58

function borderPoint(
  origin: { x: number; y: number },
  toward: { x: number; y: number },
): { x: number; y: number } {
  const dx = toward.x - origin.x
  const dy = toward.y - origin.y
  const sx = dx === 0 ? Number.POSITIVE_INFINITY : NODE_HW / Math.abs(dx)
  const sy = dy === 0 ? Number.POSITIVE_INFINITY : NODE_HH / Math.abs(dy)
  const scale = Math.min(sx, sy)
  return { x: origin.x + dx * scale, y: origin.y + dy * scale }
}

function offsetEnds(from: ComponentId, to: ComponentId, gap: number) {
  const a = nodePoint[from]
  const b = nodePoint[to]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ox = (-dy / len) * gap
  const oy = (dx / len) * gap
  const start = borderPoint(a, b)
  const end = borderPoint(b, a)
  return {
    x1: start.x + ox,
    y1: start.y + oy,
    x2: end.x + ox,
    y2: end.y + oy,
  }
}

function Glyph({ id }: { id: ComponentId }) {
  const props = {
    width: 28,
    height: 28,
    viewBox: '0 0 32 32',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    'aria-hidden': true as const,
  }
  if (id === 'sender' || id === 'recipient') {
    return (
      <svg {...props}>
        <rect x="9" y="3" width="14" height="26" rx="2.5" />
        <path d="M14 7h4M13 25h6" />
      </svg>
    )
  }
  if (id === 'userDirectory' || id === 'transient') {
    return (
      <svg {...props}>
        <ellipse cx="16" cy="8" rx="9" ry="3.5" />
        <path d="M7 8v12c0 2 4 3.5 9 3.5s9-1.5 9-3.5V8" />
        <path d="M7 14c0 2 4 3.5 9 3.5s9-1.5 9-3.5" />
      </svg>
    )
  }
  if (id === 'gateway' || id === 'cdn') {
    return (
      <svg {...props}>
        <path d="M16 4l10 6v8l-10 6-10-6V10l10-6z" />
        <path d="M16 14v6M12 12h8" />
      </svg>
    )
  }
  if (id === 'session' || id === 'presence') {
    return (
      <svg {...props}>
        <rect x="6" y="6" width="20" height="6" rx="1" />
        <rect x="6" y="14" width="20" height="4" rx="1" />
        <rect x="6" y="20" width="20" height="4" rx="1" />
      </svg>
    )
  }
  if (id === 'push') {
    return (
      <svg {...props}>
        <path d="M16 6a6 6 0 0 1 6 6v4l2 3H8l2-3v-4a6 6 0 0 1 6-6z" />
        <path d="M13 23a3 3 0 0 0 6 0" />
      </svg>
    )
  }
  if (id === 'objectStore') {
    return (
      <svg {...props}>
        <path d="M8 10l8-4 8 4v12l-8 4-8-4V10z" />
        <path d="M8 10l8 4 8-4M16 14v12" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <rect x="6" y="7" width="20" height="6" rx="1" />
      <rect x="6" y="15" width="20" height="6" rx="1" />
      <path d="M9 10h2M9 18h2M22 10h2M22 18h2" />
    </svg>
  )
}

export function FlowMap({
  cloud,
  scenario,
  stepIndex,
  boxes,
  activeId,
  inspect,
  onInspect,
}: FlowMapProps) {
  const { traversed, currentKey } = useMemo(() => {
    const seen = new Set<string>()
    if (scenario) {
      const last = Math.min(stepIndex, scenario.steps.length - 1)
      for (let i = 0; i <= last; i += 1) {
        const arrow = arrowAt(scenario.steps, i)
        if (arrow) seen.add(directionKey(arrow))
      }
    }
    const current = scenario ? arrowAt(scenario.steps, stepIndex) : null
    return {
      traversed: seen,
      currentKey: current ? directionKey(current) : null,
    }
  }, [scenario, stepIndex])

  const drawn = useMemo(() => {
    const items: Array<Direction & { curve?: 'above'; key: string; gap: number }> = []
    for (const link of links) {
      const pair = link.both
        ? [
            { from: link.from, to: link.to, gap: 8 },
            { from: link.to, to: link.from, gap: 8 },
          ]
        : [{ from: link.from, to: link.to, gap: 0, curve: link.curve }]
      for (const item of pair) {
        items.push({ ...item, key: directionKey(item) })
      }
    }
    return items
  }, [])

  const selected = inspect ? components.find((item) => item.id === inspect.id) : undefined
  const selectedBox = inspect ? boxes[inspect.id] : undefined
  const onPath = (id: ComponentId) =>
    scenario?.steps.some((step) => step.componentId === id) ?? false

  function toggle(id: ComponentId, tab: InspectTab) {
    onInspect(inspect?.id === id && inspect.tab === tab ? null : { id, tab })
  }

  return (
    <div className="flow-wrap">
      <p className="flow-legend">Two arrows mean the data goes both ways.</p>
      <div className="flow-scroll">
        <div className="flow">
          <svg
            className="flow-svg"
            viewBox={`0 0 ${FLOW_WIDTH} ${FLOW_HEIGHT}`}
            role="img"
            aria-label="Message path between architecture components"
          >
            <defs>
              <marker
                id="flow-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
              </marker>
            </defs>
            {drawn.map((arrow) => {
              const ends = offsetEnds(arrow.from, arrow.to, arrow.gap)
              const hot = traversed.has(arrow.key)
              const current = arrow.key === currentKey
              const state = current ? 'current' : hot ? 'hot' : 'idle'
              if (arrow.curve === 'above') {
                const from = nodePoint[arrow.from]
                const to = nodePoint[arrow.to]
                const top = 16
                return (
                  <path
                    key={arrow.key}
                    className={`arrow ${state}`}
                    d={`M ${from.x} ${from.y - NODE_HH} V ${top} H ${to.x} V ${to.y - NODE_HH}`}
                    markerEnd="url(#flow-arrow)"
                  />
                )
              }
              return (
                <line
                  key={arrow.key}
                  className={`arrow ${state}`}
                  x1={ends.x1}
                  y1={ends.y1}
                  x2={ends.x2}
                  y2={ends.y2}
                  markerEnd="url(#flow-arrow)"
                />
              )
            })}
          </svg>
          {components.map((component) => {
            const point = nodePoint[component.id]
            const active = activeId === component.id
            const filled = Boolean(boxes[component.id])
            const dataOpen = inspect?.id === component.id && inspect.tab === 'data'
            const whyOpen = inspect?.id === component.id && inspect.tab === 'why'
            return (
              <div
                key={component.id}
                id={`card-${component.id}`}
                className={`node ${active ? 'active' : ''} ${filled ? 'filled' : ''} ${
                  scenario && !onPath(component.id) ? 'offpath' : ''
                }`}
                style={{
                  left: `${(point.x / FLOW_WIDTH) * 100}%`,
                  top: `${(point.y / FLOW_HEIGHT) * 100}%`,
                }}
              >
                <div className={`node-shell ${dataOpen || whyOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="node-body"
                    aria-expanded={dataOpen}
                    aria-label={`${component.role}. Show data`}
                    onClick={() => toggle(component.id, 'data')}
                  >
                    <Glyph id={component.id} />
                    <span className="lane">{laneLabel[component.lane]}</span>
                    <span className="role">{component.role}</span>
                    <span className="product">{component.product[cloud]}</span>
                  </button>
                  <button
                    type="button"
                    className="why"
                    aria-expanded={whyOpen}
                    aria-label={`Why this choice for ${component.role}`}
                    onClick={() => toggle(component.id, 'why')}
                  >
                    Why this choice
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {selected && inspect ? (
        <section className="detail" aria-label={selected.role}>
          <div className="detail-tabs" role="tablist" aria-label={`${selected.role} details`}>
            <button
              type="button"
              role="tab"
              aria-selected={inspect.tab === 'data'}
              className={inspect.tab === 'data' ? 'selected' : ''}
              onClick={() => onInspect({ id: inspect.id, tab: 'data' })}
            >
              Data
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspect.tab === 'purpose'}
              className={inspect.tab === 'purpose' ? 'selected' : ''}
              onClick={() => onInspect({ id: inspect.id, tab: 'purpose' })}
            >
              Purpose
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspect.tab === 'why'}
              className={inspect.tab === 'why' ? 'selected' : ''}
              onClick={() => onInspect({ id: inspect.id, tab: 'why' })}
            >
              Why this choice
            </button>
            <button type="button" className="detail-close" onClick={() => onInspect(null)}>
              Close
            </button>
          </div>
          {inspect.tab === 'data' ? (
            <label className="box-label">
              {selectedBox
                ? `${selectedBox.kind === 'stored' ? 'Stored' : 'In flight'} · ${selectedBox.caption}`
                : 'Idle'}
              <textarea
                readOnly
                value={selectedBox?.body ?? ''}
                placeholder={
                  !scenario
                    ? 'Send a message to fill this box.'
                    : onPath(selected.id)
                      ? 'Waiting for this hop.'
                      : 'Not on this path.'
                }
                aria-label={`${selected.role} data`}
              />
            </label>
          ) : inspect.tab === 'purpose' ? (
            <div className="why-body">
              <h3>{selected.role}</h3>
              <p>{selected.purpose}</p>
            </div>
          ) : (
            <div className="why-body">
              <h3>{selected.role}</h3>
              <p>
                <strong>Choice. </strong>
                {selected.choice(cloud)}
              </p>
              <p>
                <strong>Also considered. </strong>
                {selected.considered}
              </p>
              <p>
                <strong>Why it held. </strong>
                {selected.why(cloud)}
              </p>
            </div>
          )}
        </section>
      ) : (
        <p className="flow-hint">
          Click a symbol for its data, purpose in the architecture, or why this choice held.
        </p>
      )}
    </div>
  )
}
