# Privacy

**Short version: we don't have your data.**

This app is a static website that runs entirely in your browser. All your
collection data — stickers owned, packs purchased, settings — is stored in
your browser's local IndexedDB, on your device only.

## What we collect

Nothing. There is no server, no account system, no analytics, no telemetry, no
cookies, no fingerprinting. The site has no backend at all.

## What leaves your device

- **Nothing automatically.** Your data never leaves your device unless _you_
  export a backup file and choose to share it.
- The site does load assets (HTML, CSS, JS, the Inter font) from the hosting
  CDN (GitHub Pages by default). These are normal page requests; no personal
  data is transmitted.

## Where your data lives

- IndexedDB (`StickerTracker26`) in your browser.
- LocalStorage for small UI preferences (dismiss banners, etc).
- Backup files you download — those live wherever you put them.

## Browser data lifetime

Browsers may clear IndexedDB after long inactivity. iOS Safari is particularly
strict (data may be cleared after 7 days of inactivity for non-installed sites).
**Use the backup feature regularly** and install the app as a PWA (Add to Home
Screen) for the most durable storage.

## Right to be forgotten

There is nothing for us to delete. To remove your data from your device, open
the app's Settings → "Sammlung zurücksetzen", or clear your browser's site data
for this site.

## Open source

The full source code is available on GitHub. You can audit, fork, and self-host
the app. We don't host anything you can't see.
