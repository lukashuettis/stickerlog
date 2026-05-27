# StickerLog

**Your private album tracker for the 2026 sticker season.**

StickerLog is a local-first, no-account web app for tracking your sticker album, pack purchases, expenses, duplicates, missing stickers, and trade lists.

No account. No cloud. No analytics. Your collection stays on your device.

[Live Demo](https://lukashuettis.github.io/stickerlog/)

---

## Features

- Track a 980-slot album collection
- Quickly add stickers by code, e.g. `GER 14`, `FRA3`, `BRA-20`
- See missing stickers and duplicates
- Log pack purchases and expenses
- Calculate spending, hit rate, and cost per new sticker
- Export trade lists for WhatsApp or CSV
- Backup and restore your collection as a JSON file
- Works as a PWA and can be used offline
- Local-first: data is stored in your browser via IndexedDB
- Bilingual UI (German / English)

## Screenshots

> Screenshots coming once the first dev cycle wraps up.

## Why this exists

Most sticker trackers are either closed-source, account-based, ad-supported, or focused mainly on trading.

StickerLog is built for collectors who want a simple, private tracker that also answers the real collector question:

> **"How much did this album actually cost me?"**

## Built by

Built by [Lukas Hüttis](https://www.youtube.com/@lukashuettis).

_Vibecoded with heart, together with Claude Code & Codex._

This project is also a building-in-public experiment: a practical, real-world app built with AI coding tools, then released as open source.

## Privacy

StickerLog does not use accounts, servers, analytics, or cloud sync.

Your collection is stored locally in your browser. You can export a backup file anytime and import it on another device.

Read more in [PRIVACY.md](./PRIVACY.md).

## Disclaimer

StickerLog is an unofficial fan project.

It is not affiliated with, endorsed by, or connected to Panini, FIFA, Coca-Cola, or any other rights holder.

This project does not host official sticker images, logos, or copyrighted album artwork.

See [DATA_SOURCES.md](./DATA_SOURCES.md) for what data is included and where it comes from.

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Dexie / IndexedDB
- vite-plugin-pwa (Service Worker)
- Zod (backup schema validation)

## Development

```bash
npm install
npm run dev
npm run build
```

## Contributing

Contributions are welcome, especially:

- sticker data corrections (see [DATA_SOURCES.md](./DATA_SOURCES.md) for source rules)
- translations (other languages beyond DE / EN)
- browser / PWA fixes
- accessibility improvements
- export formats
- tests

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License. See [LICENSE](./LICENSE).

---

## Deutsch

StickerLog ist ein privater, accountloser Tracker für dein WM-2026-Stickeralbum.

Du kannst deine Sammlung verwalten, fehlende Sticker und Duplikate sehen, Pack-Käufe und Ausgaben tracken, Tauschlisten exportieren und Backups erstellen.

Keine Anmeldung. Keine Cloud. Kein Tracking. Deine Daten bleiben auf deinem Gerät.

Gebaut von [Lukas Hüttis](https://www.youtube.com/@lukashuettis).
_Vibecoded with heart, together with Claude Code & Codex._

Inoffizielles Fan-Projekt. Nicht verbunden mit Panini, FIFA, Coca-Cola oder anderen Rechteinhabern.
