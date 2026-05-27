# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**. Instead:

- Open a [GitHub Security Advisory](../../security/advisories/new) for this
  repository, or
- Email the maintainer (contact in repository profile)

We aim to acknowledge reports within 7 days.

## Scope

This is a pure frontend application with no backend, no authentication, and no
user data leaving the device. Realistic threat categories:

- **XSS** via imported backup files or user-typed text
- **Prototype pollution** in the backup importer
- **Storage poisoning** (corrupt data in IndexedDB)
- **Service worker** misconfiguration causing stale or broken assets
- **Dependency vulnerabilities** in npm packages

Out of scope:

- Phishing or social engineering targeting our domain (we have no accounts)
- Anything requiring physical access to a user's unlocked device

## Mitigations already in place

- Imported JSON backups are validated against a strict Zod schema before any
  data is written to IndexedDB.
- An automatic safety-backup of current data is downloaded before any import.
- React's default JSX escaping is preserved everywhere — no
  `dangerouslySetInnerHTML`.
- Dependencies are kept up-to-date via Dependabot.
