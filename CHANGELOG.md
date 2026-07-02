# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- "Requires income" toggle on savings entries (default on). Unchecking it lets a
  savings entry be created without enough available money, for tracking savings
  that aren't funded from tracked income.

## [0.3.0] - 2026-06-25

### Added

- Date-range picker dialog (From / To) for the analytics "Custom" range and the
  transaction list's period filter, replacing the inline date fields on both
  desktop and mobile.

### Changed

- Reworked the mobile layout: centered donut, a trimmed set of range pills (All
  time / This month / Custom), per-category breakdowns tucked behind a "More
  details" toggle, tap-a-row to edit (no cogwheel), and tighter transaction cards.
- Renamed the app to "FinTracker" across the header, login, browser tab, and PWA
  manifest.

### Fixed

- Native form controls (the type filter and date inputs) now follow the dark
  theme instead of rendering in light mode.

## [0.2.1] - 2026-06-24

### Fixed

- PWA home-screen icon fell back to `favicon.svg`; the web manifest now references
  the 512×512 PNG only, so installs use the app icon.

## [0.2.0] - 2026-06-24

### Added

- Dark mode with a header toggle that follows the system color-scheme preference
  and animates smoothly between themes.
- Delete a transaction from the edit dialog, behind a confirmation step.
- Income vs. spending comparison bar in the analytics view, with per-segment
  percentages and a free/over headline.
- Installable as a PWA: web manifest and home-screen icon with standalone launch.

### Changed

- Replaced emoji UI glyphs with Lucide SVG icons throughout (header, table,
  panels, floating action button).

## [0.1.0] - 2026-06-21

First public release.

### Added

- Multi-user accounts: self-service signup and login with JWT auth and per-user
  data isolation.
- Transactions: add, edit, and remove income, expense, and savings entries.
- Categories scoped per transaction type, with a management tab; transactions
  whose category was deleted are flagged as uncategorized.
- Recurring transactions with automatic generation of due entries.
- Analytics: donut chart and category breakdowns over selectable date ranges
  (defaults to the current month).
- Filtering over the transaction list.
- PostgreSQL support (Supabase) with a SQLite fallback, plus Docker Compose for
  local development.
- Hosted deployment — Supabase (database), Render (backend), Netlify (frontend) —
  with tag-gated release automation.
- Mobile-responsive UI.

[Unreleased]: https://github.com/antoniomf97/fintracker/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/antoniomf97/fintracker/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/antoniomf97/fintracker/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/antoniomf97/fintracker/releases/tag/v0.1.0
