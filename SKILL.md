---
name: SankeyMATIC diagram
description: Turn pasted text, tables, CSV or a prose description into valid SankeyMATIC source and a ready-to-open diagram. Asks four setup questions with defaults (label size 18, node height 20, node spacing 30, theme Categories/Tableau10/Dark/Varied), validates amounts, balances and cycles, then returns a .txt file, a share link and a local preview. Trigger words - SankeyMATIC, sankey, Sankey diagram, flow diagram, диаграмма Sankey, диаграмма потоков, схема потоков.
---

# SankeyMATIC diagram

Convert the user's data into a SankeyMATIC source file that loads without
warnings, then give them a link that opens the finished diagram.

This is a simplified workflow: four questions with defaults, automatic colors
from a SankeyMATIC theme, automatic validation. Do not ask anything else unless
the data is genuinely ambiguous.

## 1. Read the data

Accept whatever the user provides: a pasted table, CSV, a list of amounts, a
prose description, or a path to a file.

- If the input is already SankeyMATIC lines (`Source [amount] Target`), keep
  them as they are and only add settings and ordering.
- If the input is prose, extract the nodes, the amounts, and the direction of
  each flow. Read `references/modeling.md` for the procedure.
- If a total and its parts disagree, or a number is missing, ask one question
  and stop. Never invent, adjust, or silently drop numbers.

## 2. Ask the four questions

Ask all four in one batch, in the language of the conversation, each with the
default first and marked as the default. Use the `question` tool when it is
available. If the user says "defaults", "you choose", or similar, apply them
without asking again.

| Question | Default | Alternatives | Setting |
| --- | --- | --- | --- |
| Base label size | 18 | 16 (SankeyMATIC default), 20, 24 | `labelname size` |
| Node height | 20 | 35, 50 (SankeyMATIC default), 75 | `node h` |
| Node spacing | 30 | 50, 75, 90 | `node spacing` |
| Color theme | Categories | Tableau10, Dark, Varied | `node theme` |

Themes are letters: Categories `a`, Tableau10 `b`, Dark `c`, Varied `d`.

Ask a fifth question only when the unit is not clear from the text:

> Units in labels: none (default) / `$`, `€`, `%`, ` у.е.`, other?

Map the answer to `value prefix '…'` or `value suffix '…'` (single quotes, keep
leading spaces inside the quotes).

## 3. Build the flows

One flow per line:

```
SourceName [123.45] TargetName
```

Hard rules:

- Amounts are plain numbers: no thousands separators, no currency symbols, no
  percent signs. Decimals use a dot. Every amount is greater than zero.
- No cycles and no self-flows; SankeyMATIC cannot render them.
- A node that both receives and sends must balance: total in = total out.
  Sources and sinks may be one-sided.
- Aggregate duplicate source/target pairs into one line.
- Percentages are computed from the total stated in the text, never from a
  guessed base.
- `[*]` and `[?]` (calculated flows) only when the user explicitly agrees.
- Keep the user's wording for node names. Use `\n` inside a name for a line
  break. Names are case sensitive.

Read `references/modeling.md` before modelling anything non-trivial.

## 4. Order the lines and write the source

SankeyMATIC assigns theme colors by the order in which nodes first appear, so
list stage-0 nodes first, in the intended color order, then each next stage.
Flow lines grouped by source also keep `layout order exact` readable.

Emit settings first, then flows:

```
// === Settings ===
labelname size 18
node h 20
node spacing 30
node theme a
flow inheritfrom source
flow opacity 0.45

A [900] Revenue
B [750] Revenue
```

`flow inheritfrom source` is required: without it every flow is grey.
Do not add settings the user did not choose, and do not change the diagram size
(600 × 600) unless asked.

## 5. Validate before delivering

From this skill's directory:

```sh
node scripts/validate.mjs <file>
```

Exit code 0 and `0 imbalances` are required. Fix the source and run it again —
never deliver a file with errors. Warnings are real information: tell the user
which node does not balance instead of hiding it.

## 6. Deliver

1. Save the source as `<slug>.txt` in the working directory.
2. Print the same text in a fenced block so it can be pasted into Inputs.
3. Build a link that opens the finished diagram:

   ```sh
   node scripts/link.mjs <file>
   ```

4. For private data, offer the local preview instead — it serves a pinned copy
   of SankeyMATIC from 127.0.0.1 and never sends the data anywhere:

   ```sh
   node scripts/local.mjs <file> --open
   ```

   The first run downloads about 750 KB into the cache; later runs are offline.

Warn once that a share link contains the data itself in its `?i=` payload:
anyone who gets the URL can read the diagram. Nothing is uploaded to
sankeymatic.com.

5. To get an image, open the diagram and use **Save as .PNG** or
   **Download .SVG** in the page. There is no local renderer.

## 7. Never

- Invent or round numbers to make a diagram balance.
- Rename nodes the user already named.
- Use negative or zero amounts, cycles, or self-flows.
- Deliver without running the validator.
- Add settings beyond the four answers and the optional units.

## References

- `references/modeling.md` — turning text into a balanced flow graph.
- `references/syntax.md` — the full line grammar and settings.
- `references/palettes.md` — theme letters and their hex colors.
