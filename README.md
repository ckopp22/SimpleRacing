# Top Down Racer

See MDD.md. Plain ES modules, vendored three.js (`lib/`), no build step.

Run locally: `npx serve .` (or VS Code Live Server), then open the printed URL.

## PWA
- `manifest.webmanifest`, `service-worker.js`, `icons/` (placeholder car icons, replace freely).
- **Bump `CACHE` in `service-worker.js` on every deploy** so installed copies update.
- Add new files to the `SHELL` list in `service-worker.js`.
- The service worker is skipped on `localhost` (it would serve stale code while developing). To test offline locally, open `http://localhost:3000/?sw`, reload once, then go offline in DevTools. Unregister it afterwards (DevTools > Application > Service Workers).
