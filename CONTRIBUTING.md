# Contributing to StickerLog

Thanks for taking the time to look at this! StickerLog is a small, opinionated
hobby project — but contributions are very welcome, especially if they make the
app more useful for fellow collectors.

## What's a good contribution

In rough priority order:

1. **Sticker data corrections** — wrong name, wrong number, missing player.
   These live in `src/data/album.ts` and `src/data/teams.ts`. Please link to the
   official Panini source (PDF page or product photo) in your PR description.
2. **Translations** — currently DE and EN. To add a new locale, see
   `src/i18n/messages.ts` and add the new dict next to `EN`. The
   `Record<MessageKey, ...>` type will tell you exactly which keys are missing.
3. **Bug fixes** — broken backup imports, layout glitches, parser edge cases.
4. **Accessibility improvements** — better keyboard nav, screen reader labels,
   contrast fixes.
5. **Export formats** — new ways to share trade lists (PDF, image, etc).
6. **Tests** — anything in `tests/` that catches regressions.

## What's likely to be rejected

- **New top-level features without prior discussion.** Please open an issue
  first so we can talk about scope. The goal is a small app that's easy for
  non-technical people to use.
- **Adding analytics, tracking, or external services.** Privacy-by-design is
  the core promise (see `PRIVACY.md`).
- **Sticker images or player photos.** Panini and FIFA hold those rights — we
  ship facts (numbers + names) only. See `DISCLAIMER.md`.

## Development setup

```bash
git clone https://github.com/lukashuettis/stickerlog.git
cd stickerlog
npm install
npm run dev
```

Open http://localhost:5173/stickerlog/ in your browser.

## Before you open a PR

Make sure these all pass locally:

```bash
npm run lint
npm test
npm run build
```

CI runs the same checks on every PR.

## Commit style

No strict rules, but please:

- Keep commits focused (one logical change per commit).
- Write commit subjects in the imperative ("fix parser bug" not "fixed parser").
- Reference issue numbers when relevant (`fixes #42`).

## Reporting bugs

Open a GitHub issue with:

- What you tried to do
- What happened
- What you expected to happen
- Browser + OS (especially helpful: iOS Safari version, since PWA behavior
  differs there)
- Console errors if any (open DevTools → Console)

## Reporting security issues

Please see [SECURITY.md](./SECURITY.md) — don't open a public issue for
security problems.

## Code of conduct

Be kind. Disagreements about technical decisions are fine; personal attacks
are not. Reports go to the email in `SECURITY.md`.

## License

By contributing, you agree that your contributions will be licensed under the
MIT License (see `LICENSE`).
