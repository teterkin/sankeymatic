# SankeyMATIC diagram — OpenCode skill

Turn a text, a table or a prose description into a valid
[SankeyMATIC](https://sankeymatic.com/build/) diagram: the agent asks four setup
questions with defaults, builds the flows, checks that every intermediate node
balances, validates the syntax, and gives you a `.txt` source plus a link that
opens the finished diagram.

## What you get

- four questions, each with a default: label size 18, node height 20, node
  spacing 30, theme Categories (alternatives: Tableau10, Dark, Varied);
- one extra question about units, only when the text does not make them clear;
- a validated `<slug>.txt` that loads through **Load from file**;
- a share link that opens the diagram with all settings applied;
- optional local preview served from `127.0.0.1`, no public link.

## Requirements

- OpenCode 2.x.
- Node.js 20 or newer for the helper scripts. No npm dependencies.
- Internet for the share link and for the first run of the local preview.

## Install

Give your agent a single line:

> Установи скилл отсюда: https://github.com/teterkin/sankeymatic

or, in English:

> Install this skill from https://github.com/teterkin/sankeymatic

What it means:

```sh
git clone https://github.com/teterkin/sankeymatic.git \
  ~/.config/opencode/skill/sankeymatic
```

The directory name is the skill ID, so keep it `sankeymatic`. If your OpenCode
discovers `~/.config/opencode/skills` (plural) instead, clone there. Then run
`/reload`; the skill shows up in the available skills list.

Update and uninstall:

```sh
git -C ~/.config/opencode/skill/sankeymatic pull --ff-only
rm -rf ~/.config/opencode/skill/sankeymatic
```

## Use

Ask in plain language and paste the data:

> Сделай диаграмму Sankey: выручка 1800, из них подразделение A — 900,
> B — 750, C — 150; себестоимость 800, валовая прибыль 1000; SG&A 640,
> амортизация 10, операционная прибыль 350; налоги 90, чистая прибыль 260.

The agent answers with the four questions, then returns the source, the link and
the same text in a fenced block for pasting into the Inputs field.

A complete example lives in
[`tests/fixtures/pl-1800.expected.txt`](tests/fixtures/pl-1800.expected.txt),
with the original text in
[`tests/fixtures/pl-1800.md`](tests/fixtures/pl-1800.md).

## Local preview

```sh
node scripts/local.mjs path/to/diagram.txt --open
```

The script downloads a pinned copy of the SankeyMATIC build (about 750 KB,
checksums verified) into `~/.cache/sankeymatic-skill/<pin>/`, rewrites the two
CDN script tags to local files, serves the directory on `127.0.0.1` and prints
the URL. Later runs work offline. `node scripts/local.mjs --check` verifies the
cache without starting a server.

## Privacy

- Nothing is uploaded. The share link carries the diagram in its `?i=` payload;
  anyone who has the URL can read it.
- The local preview never talks to sankeymatic.com: only the pinned assets are
  downloaded on the first run, and the diagram itself stays in the URL.
- Use `--local` for financial or otherwise private data.

## Limits

- No local rendering: PNG and SVG are exported from the opened diagram page.
- SankeyMATIC rejects cycles, self-flows, zero and negative amounts; so does the
  validator.
- The link needs internet; the local preview needs Node and a browser.

## Checks

```sh
node --test scripts/*.test.mjs
node scripts/validate.mjs tests/fixtures/pl-1800.expected.txt
node scripts/local.mjs --check
```

## Project layout

```
SKILL.md                 the instruction the agent loads
references/              modelling, syntax and palette references
scripts/                 validator, link builder, local preview, tests
tests/fixtures/          the P&L example and its golden output
docs/prd/                the confirmed PRD
NOTICE                   third-party licenses and attribution
```

## License

MIT for this skill, see [LICENSE](LICENSE). Third-party components (SankeyMATIC,
d3, canvg, lz-string) are covered by [NOTICE](NOTICE). This project is not
affiliated with or endorsed by SankeyMATIC.
