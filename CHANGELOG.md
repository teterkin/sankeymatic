# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-23

### Added

- OpenCode skill that turns text into SankeyMATIC source: four setup questions
  with defaults (label size 18, node height 20, node spacing 30, theme
  Categories), optional units question, and the modelling rules for balanced
  flows.
- `scripts/validate.mjs`: syntax, settings whitelist, non-positive amounts,
  cycles, self-flows and imbalance warnings. Exit 0/1, `--strict`, `--json`.
- `scripts/link.mjs`: `?i=` share links with the same encoding the site uses.
- `scripts/local.mjs` and `scripts/assets.mjs`: pinned, checksum-verified local
  preview on `127.0.0.1`, no CDN left in the page.
- Golden fixture `tests/fixtures/pl-1800.*`: 10 flows, 11 nodes, 0 imbalances.
- Documentation: README, modelling/syntax/palette references, AGENTS.md, NOTICE
  with ISC/MIT attributions.

[0.1.0]: https://github.com/teterkin/sankeymatic/releases/tag/v0.1.0
