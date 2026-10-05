# Chat

Version 1.3.0. A static simulation of a 1:1 messaging path. Type in the chat pane and walk a message through the architecture one hop at a time. Pause on any hop to read the in-flight payload or the stored record. Each component has its purpose and a short note on the alternatives that were set aside.

- [Vision and requirements](docs/vision-and-requirements.md)
- [Architecture and design](docs/architecture-and-design.md)

The page links to a short summary of both, and lists the changes in every version. The version in `src/product/releases.ts` is the version of the app.

Switch the cloud control to see the AWS, Azure, or Google product for the same role. Nothing leaves the browser.

```bash
npm install
npm run dev
```

Open http://localhost:5173/chat-architecture-sim/

The hosted copy is a GitHub Pages site from this repository.
