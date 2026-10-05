import type { ComponentId } from './components.ts'
import type { Step } from './scenarios.ts'

export const FLOW_WIDTH = 1040
export const FLOW_HEIGHT = 620

export const nodePoint: Record<ComponentId, { x: number; y: number }> = {
  sender: { x: 110, y: 100 },
  gateway: { x: 310, y: 100 },
  chatServerA: { x: 510, y: 100 },
  chatServerB: { x: 730, y: 100 },
  recipient: { x: 930, y: 100 },
  userDirectory: { x: 110, y: 300 },
  session: { x: 310, y: 300 },
  presence: { x: 510, y: 300 },
  transient: { x: 730, y: 300 },
  push: { x: 930, y: 300 },
  objectStore: { x: 310, y: 500 },
  cdn: { x: 930, y: 500 },
}

export type Link = {
  from: ComponentId
  to: ComponentId
  both: boolean
  curve?: 'above'
}

export const links: Link[] = [
  { from: 'sender', to: 'userDirectory', both: true },
  { from: 'sender', to: 'gateway', both: false },
  { from: 'gateway', to: 'chatServerA', both: false },
  { from: 'chatServerA', to: 'sender', both: false, curve: 'above' },
  { from: 'chatServerA', to: 'session', both: true },
  { from: 'chatServerA', to: 'presence', both: true },
  { from: 'chatServerA', to: 'chatServerB', both: true },
  { from: 'chatServerB', to: 'recipient', both: true },
  { from: 'chatServerA', to: 'transient', both: false },
  { from: 'transient', to: 'chatServerB', both: true },
  { from: 'chatServerA', to: 'push', both: false },
  { from: 'push', to: 'recipient', both: false },
  { from: 'sender', to: 'objectStore', both: false },
  { from: 'objectStore', to: 'cdn', both: false },
  { from: 'cdn', to: 'recipient', both: true },
]

export type Direction = {
  from: ComponentId
  to: ComponentId
}

const overrides: Record<string, Direction | null> = {
  'session>presence': { from: 'chatServerA', to: 'presence' },
  'presence>chatServerB': { from: 'chatServerA', to: 'chatServerB' },
  'presence>transient': { from: 'chatServerA', to: 'transient' },
  'transient>push': { from: 'chatServerA', to: 'push' },
  'push>session': null,
  'session>transient': { from: 'chatServerB', to: 'transient' },
  'sender>transient': { from: 'chatServerA', to: 'transient' },
  'cdn>sender': null,
  'chatServerB>cdn': { from: 'recipient', to: 'cdn' },
}

export function arrowAt(steps: Step[], index: number): Direction | null {
  const current = steps[index]
  if (!current) return null
  if (index === 0) {
    return current.componentId === 'userDirectory'
      ? { from: 'sender', to: 'userDirectory' }
      : null
  }
  const previous = steps[index - 1].componentId
  const landed = current.componentId
  if (previous === landed) return null
  const key = `${previous}>${landed}`
  if (key in overrides) return overrides[key]
  return { from: previous, to: landed }
}

export function directionKey(direction: Direction): string {
  return `${direction.from}>${direction.to}`
}
