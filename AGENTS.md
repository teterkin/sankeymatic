# Project notes for agents

## What this repository is

An OpenCode skill. The repository root **is** the skill directory: `SKILL.md`
sits next to `scripts/`, so cloning into `~/.config/opencode/skill/sankeymatic`
installs it. There is no build step and no runtime dependency.

## Commands

| Purpose | Command |
| --- | --- |
| Tests | `node --test scripts/*.test.mjs` |
| Validate a diagram source | `node scripts/validate.mjs <file>` |
| Build a share link | `node scripts/link.mjs <file>` |
| Local preview (network on first run) | `node scripts/local.mjs <file> --open` |
| Verify the local asset cache | `node scripts/local.mjs --check` |

Node 20+. All scripts use built-in modules only.

## Conventions

- Trunk is `main`. Branches: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`,
  `chore/<slug>`.
- Commit messages are imperative and scoped: `validate: reject zero amounts`.
- Version lives in `VERSION` and in the top entry of `CHANGELOG.md`; a tag is
  created only at release.
- Docs change in the same commit as the behavior they describe.

## Map

- `SKILL.md` — the workflow the agent follows. Keep it under one screen of
  scroll; details belong in `references/`.
- `references/modeling.md` — text to balanced flow graph. This is the core of
  the skill; changes here need a golden fixture.
- `references/syntax.md`, `references/palettes.md` — SankeyMATIC grammar and
  themes, verified against a pinned build.
- `scripts/validate.mjs` — the single source of truth for syntax and settings.
  The settings map mirrors `build/constants.js` of the pinned build.
- `scripts/link.mjs` — `?i=` payload, exactly as the site builds it
  (`encodeURIComponent(...).replaceAll('-', '%2D')`).
- `scripts/assets.mjs`, `scripts/local.mjs` — pinned asset cache and the
  127.0.0.1 server. Hashes in `assets.mjs` must match the pinned files; local
  mode must never keep a `cdn.jsdelivr` URL in the page.
- `tests/fixtures/pl-1800.*` — the acceptance case: 10 flows, 11 nodes, 0
  imbalances.

## Invariants

- Numbers are never invented: every amount exists in the user's text or comes
  from an agreed calculation.
- Every intermediate node balances (`in = out`); sources and sinks may be
  one-sided.
- No cycles, no self-flows, no zero or negative amounts.
- `flow inheritfrom source` is always present; without it flows are grey.
- Settings emitted by the skill are limited to the four answers, units, and the
  two flow lines above.

## Secrets and data

- No secrets in this repository, ever.
- Diagram sources can contain real financial data. Do not add user data to
  fixtures; `pl-1800` is synthetic.
- A share link embeds its payload; treat it as public.
