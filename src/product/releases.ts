export const APP_VERSION = '1.4.0'

export type Release = {
  version: string
  date: string
  changes: string[]
}

export const releases: Release[] = [
  {
    version: '1.4.0',
    date: '2026-10-04',
    changes: [
      'Matched the page to the AetherForge palette: cream paper, ink, and teal.',
      'Added a background of early telephones connected across a room, and a logo of two candlestick phones.',
    ],
  },
  {
    version: '1.3.1',
    date: '2026-10-04',
    changes: [
      'Opening the vision summary or the version history pauses the walk.',
      'Sending a message closes that panel and shows the flow again.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-04',
    changes: [
      'Added a vision and requirements document and an architecture and design document with conceptual, logical, and physical diagrams.',
      'Added an on-page summary of the vision and architecture.',
      'Added this version history, and a project rule that bumps the version and updates both documents on every change.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-04',
    changes: [
      'Added a Purpose tab beside Data and Why this choice, describing what each component does in the message path.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-04',
    changes: [
      'Replaced the card grid with a flow of architecture symbols and arrows.',
      'Drew two arrows wherever data travels both ways.',
      'Data and Why this choice now open on click instead of staying open on every box.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-04',
    changes: [
      'First simulation: a chat pane, three walks (text online, text offline, photo), and pause, play, and step controls.',
      'Each hop shows the in-flight payload or stored record.',
      'AWS, Azure, and Google switch the product name on every component.',
      'Why this choice records the alternatives that were set aside.',
    ],
  },
]
