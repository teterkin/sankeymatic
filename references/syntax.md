# SankeyMATIC syntax

Source: the official manual (https://sankeymatic.com/manual/syntax.html,
https://sankeymatic.com/manual/colors.html) and the pinned build
`nowthis/sankeymatic@a6d8053` (`build/constants.js`), checked 2026-11-23.

## Line types

```
// comment                     any line starting with // or '
                              blank lines are ignored
Source [123.45] Target        a flow
Source [*] Target             consume whatever the source has left
Source [?] Target             provide whatever the target is missing
:Node #3cf                    node color
:Node #3cf >>                 also paint flows FROM the node
:Node #3cf <<                 also paint flows TO the node
labelname size 18             a setting
```

A flow may carry its own color and opacity:

```
A [8] C #00CC00       flow color
A [8] C #00CC00.9     flow color with opacity
```

Amounts are positive numbers without separators or units. Node names may
contain spaces and emoji; names are case sensitive. `\n` breaks a label.

## Settings used by this skill

| Line | Values | Meaning |
| --- | --- | --- |
| `labelname size 18` | half step, min 6 | base label size in px |
| `node h 20` | 0–100, half steps | Nodes → Height slider |
| `node spacing 30` | 0–100, half steps | Nodes → Spacing slider |
| `node theme b` | `a`, `b`, `c`, `d`, `none` | node color theme |
| `flow inheritfrom source` | `source`, `target`, `outside-in`, `none` | flow color source |
| `flow opacity 0.45` | 0–1 | default flow opacity |
| `value prefix '$'` | quoted text | unit before the amount |
| `value suffix ' у.е.'` | quoted text | unit after the amount |

Settings may appear anywhere in the file. The site applies each valid line and
turns it into a `// ✓` comment; a saved file keeps them, a pasted block works
the same way.

`scripts/validate.mjs` carries the full settings map from the pinned build and
checks types, ranges and allowed values. Do not invent setting names: an
unknown key is an error.

## Colors

- `#rgb` or `#rrggbb`, with an optional `.opacity` suffix (`.0`–`.9999`).
- Node color precedence: explicit `:Node` line, then the theme.
- Flow color precedence: flow line color, then source inheritance, then target
  inheritance, then the default flow color.
- `flow inheritfrom source` with the default `0.45` opacity is what makes flows
  look like a lighter version of their source node.

## Theme letters

| Letter | Theme | Colors |
| --- | --- | --- |
| `a` | Categories | 10 |
| `b` | Tableau10 | 10 |
| `c` | Dark | 8 |
| `d` | Varied | 12 |

See `palettes.md` for the hex values. Colors are assigned in the order nodes
first appear in the source.

## Not supported

- cycles and self-flows;
- zero or negative amounts;
- amounts with thousands separators or unit symbols.

The validator rejects all three.
