# Vision and requirements

Version 1.3.1 · 2026-10-04

## Vision

Chat is a teaching simulation of a 1:1 messaging system. A person types in a chat pane and watches that message move through the architecture one hop at a time. The point is to see where data is in flight, where it is stored, and why each component exists. Nothing is sent to a server. The phone remains the system of record for message history.

## Who it is for

Someone learning how to describe a messaging architecture: the path of a message, the stores it touches, and the product that would host each role on AWS, Azure, or Google.

## Goals

- Make a send look like a chat, and make the architecture visible at the same time.
- Let the reader stop on any hop and inspect the transient payload.
- Name components the way a real system would, and show the cloud product for the selected provider.
- Explain purpose separately from the tradeoff that chose the design.
- Keep the vision, the design, and the version history aligned with the running app.

## Scope

In scope:

- 1:1 text while the recipient is online.
- 1:1 text while the recipient is offline, including park, wake, deliver, and delete.
- A photo whose bytes go to object storage and a CDN, while the decryption key stays in the chat message.
- Pause, play, step forward, and step back.
- AWS, Azure, and Google as labels on the same roles.
- Data, Purpose, and Why this choice for every component.
- Conceptual, logical, and physical descriptions of the same system.

Out of scope:

- A live multi-user backend, real encryption, or real cloud resources.
- Group chat, voice, or video calls.
- Accounts, login, or stored history beyond the browser session.

## Functional requirements

1. The reader can type a message and send it while the recipient is online or offline, and can send a photo.
2. The send walks a fixed sequence of hops. Play advances on a timer. Pause freezes the current hop. Step forward and step back move one hop.
3. The chat bubble appears when the sender device encrypts it. It shows Sent after the gateway accepts the frame, and Delivered after the receipt returns.
4. The architecture is a flow of symbols and arrows. A pair that exchanges data in both directions has two arrows.
5. Clicking a symbol opens a panel with three tabs: Data (the payload or stored record for the current walk), Purpose (the component’s job), and Why this choice (alternatives and the reason this design held).
6. Switching AWS, Azure, or Google changes the product name and the resource names in stored records, and does not reset the hop.
7. The page links to a short vision and architecture summary, and shows the version history with the changes in every version. Opening either panel pauses the walk. Sending a message closes the panel and shows the flow again.
8. The displayed version matches `APP_VERSION` in `src/product/releases.ts`.

## Non-functional requirements

- The app is a static site. No database, API key, or always-on process.
- A reader can understand a hop without reading source code.
- Documents in `docs/` describe the same system the page simulates. A change to behavior updates the version, the history, and any affected document.

## Version history

- **1.3.1** (2026-10-04). Opening the vision summary or the version history pauses the walk. Sending a message closes that panel and returns to the flow.
- **1.3.0** (2026-10-04). Vision and requirements document. Architecture and design document with conceptual, logical, and physical diagrams. On-page summary and version history. Rule that later changes update the version and both documents.
- **1.2.0** (2026-10-04). Purpose tab on every component.
- **1.1.0** (2026-10-04). Flow of symbols and arrows. Two arrows for two-way traffic. Data and Why this choice open on click.
- **1.0.0** (2026-10-04). First simulation: three walks, step controls, cloud products, and the tradeoff note.
