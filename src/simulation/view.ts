import type { ComponentId } from './components.ts'
import type { Cloud } from './cloud.ts'
import type { BubbleKind, Receipt, Scenario, Step } from './scenarios.ts'

export type Bubble = {
  id: string
  from: 'me' | 'alex'
  kind: BubbleKind
  text: string
  receipt?: Receipt
}

export type BoxState = {
  kind: 'inflight' | 'stored'
  caption: string
  body: string
}

export const seedBubbles: Bubble[] = [
  {
    id: 'm1',
    from: 'alex',
    kind: 'text',
    text: 'Did the design notes land?',
    receipt: 'delivered',
  },
  {
    id: 'm2',
    from: 'me',
    kind: 'text',
    text: 'Working through them now.',
    receipt: 'delivered',
  },
]

export type WalkView = {
  bubbles: Bubble[]
  status: string
  presenceOnline: boolean
  boxes: Partial<Record<ComponentId, BoxState>>
  activeId: ComponentId | null
}

export function projectWalk(
  scenario: Scenario | null,
  stepIndex: number,
  cloud: Cloud,
  alexOnline: boolean,
): WalkView {
  const bubbles = seedBubbles.map((bubble) => ({ ...bubble }))
  let status = alexOnline ? 'Alex is online' : 'Alex is offline'
  let presenceOnline = alexOnline
  const boxes: Partial<Record<ComponentId, BoxState>> = {}
  let activeId: ComponentId | null = null

  if (!scenario || stepIndex < 0) {
    return { bubbles, status, presenceOnline, boxes, activeId }
  }

  const last = Math.min(stepIndex, scenario.steps.length - 1)
  for (let i = 0; i <= last; i += 1) {
    const step: Step = scenario.steps[i]
    if (step.outgoing) {
      bubbles.push({
        id: `out-${scenario.id}`,
        from: 'me',
        kind: step.outgoing.kind,
        text: step.outgoing.text,
        receipt: 'pending',
      })
    }
    if (step.receipt) {
      const mine = [...bubbles].reverse().find((bubble) => bubble.from === 'me')
      if (mine) mine.receipt = step.receipt
    }
    if (step.presence !== undefined) presenceOnline = step.presence
    status = step.status
    boxes[step.componentId] = {
      kind: step.kind,
      caption: step.caption,
      body: JSON.stringify(step.payload(cloud), null, 2),
    }
    activeId = step.componentId
  }

  return { bubbles, status, presenceOnline, boxes, activeId }
}
