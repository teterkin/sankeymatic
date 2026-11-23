# Themes and palettes

SankeyMATIC assigns a node color from the selected theme in the order nodes
first appear in the source. The first theme color goes to the first new node,
the second to the second, and so on; after the last color the list continues
from the beginning. See `themeoffset_*` in `syntax.md` to rotate the start.

Themes are the d3 categorical schemes used by the site
(`build/constants.js`, pinned build `nowthis/sankeymatic@a6d8053`).

## `a` — Categories (d3 Category10, 10 colors)

```
#1f77b4 #ff7f0e #2ca02c #d62728 #9467bd
#8c564b #e377c2 #7f7f7f #bcbd22 #17becf
```

## `b` — Tableau10 (10 colors)

```
#4e79a7 #f28e2c #e15759 #76b7b2 #59a14f
#edc948 #b07aa1 #ff9da7 #9c755f #bab0ab
```

## `c` — Dark (d3 Dark2, 8 colors)

```
#1b9e77 #d95f02 #7570b3 #e7298a
#66a61e #e6ab02 #a6761d #666666
```

## `d` — Varied (d3 Set3, 12 colors)

```
#8dd3c7 #ffffb3 #bebada #fb8072 #80b1d3 #fdb462
#b3de69 #fccde5 #d9d9d9 #bc80bd #ccebc5 #ffed6f
```

## How flows get their color

With `flow inheritfrom source` (what this skill writes) every flow takes its
source node's color at `flow opacity 0.45`. Over a white background that reads
as a lighter, mixed version of the node color. `flow inheritfrom target` and
`flow inheritfrom outside-in` are the other two automatic options.

## When to use explicit colors

Only when the user asks for specific colors. Then add node lines and flow
colors:

```
:Revenue #1f77b4
:Gross Profit #2ca02c
Revenue [800] Cost of Sales #d62728
```

Explicit colors override the theme for the nodes and flows they name; everything
else keeps the theme. Do not mix a theme with hand-picked colors unless the user
asked for it.
