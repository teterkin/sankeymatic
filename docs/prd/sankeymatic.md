# PRD: OpenCode skill for SankeyMATIC

Status: confirmed 2026-11-23.

## Goal

Turn a user's data in one exchange into a valid SankeyMATIC diagram: four setup
questions with defaults, a balanced flow graph, a validated `.txt` source, and a
link that opens the finished diagram. The skill is distributed as a public
GitHub repository and installed by cloning it into the OpenCode skills
directory.

## Non-goals

- Rendering PNG or SVG locally; the site exports images in the browser.
- Automating sankeymatic.com or storing diagrams on a server.
- Inventing, rounding or rebalancing the user's numbers.
- Rebranding SankeyMATIC or removing its attribution.
- Installing the skill on the author's machine as part of development.

## User story

As an analyst with a financial narrative and numbers, I want to paste the text
and get a correct, good-looking Sankey diagram without learning the syntax, and
I want to install the skill from a single link.

## Decisions

1. **Layout** — the repository root is the skill directory, so installation is
   `git clone <url> ~/.config/opencode/skill/sankeymatic`. The directory name is
   the skill ID.
2. **Install prompt** — a user can tell an agent
   "Установи скилл отсюда: <url>"; README states the exact command and the
   detection rule for `skill/` vs `skills/`.
3. **Questions** — exactly four, asked in one batch with the default first:
   label size 18, node height 20, node spacing 30, theme Categories. A fifth
   question about units is asked only when the text is ambiguous; default none.
4. **Colors** — native SankeyMATIC themes (`a` Categories, `b` Tableau10,
   `c` Dark, `d` Varied), `flow inheritfrom source`, `flow opacity 0.45`.
   No hand-computed blending.
5. **Delivery** — `<slug>.txt` in the working directory, the same text in a
   fenced block, and a `?i=` share link. Local preview on request.
6. **Local mode** — download the pinned build, d3 and canvg into
   `~/.cache/sankeymatic-skill/<pin>/` on first use (checksums verified), patch
   the two CDN tags, serve on `127.0.0.1`. Nothing is vendored in the repo.
7. **Validation** — `scripts/validate.mjs` with the settings map from the
   pinned `build/constants.js`, plus amount, cycle, self-flow and balance
   checks; `node:test` covers it.
8. **Acceptance case** — the P&L fixture: 10 flows, 11 nodes, 0 imbalances.
9. **License** — MIT for the skill; `NOTICE` carries the ISC/MIT texts of
   SankeyMATIC, d3, canvg and lz-string.

## Acceptance criteria

1. `SKILL.md` is at the repository root with a description that advertises the
   skill; after the user clones into the skills directory and runs `/reload`,
   the skill is listed.
2. `node --test scripts/*.test.mjs` is green.
3. `node scripts/validate.mjs tests/fixtures/pl-1800.expected.txt` exits 0 with
   11 nodes, 10 flows, 0 imbalances.
4. The golden fixture contains `labelname size 18`, `node h 20`,
   `node spacing 30`, `node theme a`, `flow inheritfrom source` and
   `flow opacity 0.45`.
5. `scripts/link.mjs` produces a URL whose `?i=` payload decodes back to the
   source text.
6. `scripts/local.mjs --check` exits 0, the patched page has no
   `cdn.jsdelivr` reference, and the server answers 200 on `/`.
7. The validator rejects malformed amounts, zero/negative amounts, unknown
   settings, invalid setting values, cycles and self-flows; it warns about
   imbalanced nodes.
8. README contains the clone command and the install prompt.
9. The repository is public with a description and at least five topics.

## Risks

- The site can change the `?i=` encoding or setting names; the build is pinned,
  the link round-trip is tested, and the local copy is frozen.
- Theme colors follow node appearance order; the skill lists stage-0 nodes
  first and the golden fixture locks the expected line order.
- A share link exposes its payload; the skill warns and offers `--local`.
- The local cache needs network on first use; afterwards it works offline.
- ISC/MIT require keeping the notices; `NOTICE` is part of the repo.

## Sources

- `https://sankeymatic.com/build/`, `/manual/{,syntax,colors,labels-units,misc}.html`
- `nowthis/sankeymatic@a6d8053`: `LICENSE.txt`, `build/index.html`,
  `build/constants.js`, `build/sankeymatic.js`, `build/build.css`,
  `build/lz-string.min.js`
- npm: `d3@7.9.2` (ISC), `canvg@3.0.11` (MIT), `lz-string@1.5.0` (MIT)
- `https://opencode.ai/docs/skills`, OpenCode `v2.3.2`
- Node.js `v20.11.1`
