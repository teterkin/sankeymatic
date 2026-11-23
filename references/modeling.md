# From text to a flow graph

The diagram is correct when every number in it can be found in the user's text
(or is an explicitly agreed calculation), and every intermediate node balances.

## 1. Extract the pairs

Walk the text and collect `(source, target, amount)` triples. Amounts stay
untouched: no unit conversion, no rounding beyond what the text already has,
no thousands separators.

- "A brings 900 of the total" with a total → `A [900] Total`
- "the total is split into 800 and 1000" → `Total [800] Cost`, `Total [1000] Profit`
- "after subtracting 640 and 10, 350 remains" → `Profit [640] Overhead`,
  `Profit [10] Depreciation`, `Profit [350] Operating`

If a sentence gives a difference instead of a flow ("260 remains"), use the
difference only when the other parts are known and add up exactly.

## 2. Find the stages

Draw the graph before writing lines:

- **Sources** have outgoing flows only (departments, income, inputs).
- **Sinks** have incoming flows only (costs, taxes, savings).
- **Intermediate nodes** have both, and must satisfy `in = out`.

Typical finance shape: `A, B, C → Revenue → {Cost of Sales, Gross Profit}`,
`Gross Profit → {SG&A, Amortization, Operating Profit}`,
`Operating Profit → {Tax, Net Profit}`.

## 3. Check the totals

When the text states a total:

1. Sum the stated parts.
2. If the sum differs from the total, the text is ambiguous. Ask which number
   wins; do not silently insert a balancing flow.
3. If the difference comes from rounding (for example percentages that add up
   to 99.9%), ask whether to keep the stated amounts or the stated total.

Percentages are never a source of amounts on their own. Compute a percentage
only from a total that the text provides, and keep the result to two decimals
at most.

## 4. Reject invalid shapes

- **Cycles** and **self-flows** are not supported. Restructure only with the
  user's agreement.
- **Zero** and **negative** amounts are not supported. Represent a negative
  value as a positive flow in the opposite direction with a clear label.
- **Duplicate** `source → target` pairs are merged into one line.

## 5. Name and order

- Keep the user's terms, including mixed languages if they used them.
- Node names are case sensitive: `Revenue` and `revenue` are different nodes.
- Use `\n` for a line break inside a label.
- Put stage-0 nodes first in the source text: SankeyMATIC assigns theme colors
  in order of first appearance, and the first colors should go to the roots.

## 6. Worked example

Text: revenue 1800 from A 900, B 750, C 150; 800 cost of sales and 1000 gross
profit; 640 SG&A, 10 amortization, 350 operating profit; 90 tax, 260 net profit.

```
A [900] Revenue
B [750] Revenue
C [150] Revenue
Revenue [800] Cost of Sales
Revenue [1000] Gross Profit
Gross Profit [640] SG&A
Gross Profit [10] Amortization
Gross Profit [350] Operating Profit
Operating Profit [90] Tax
Operating Profit [260] Net Profit
```

Check: Revenue 1800/1800, Gross Profit 1000/1000, Operating Profit 350/350;
sources and sinks are one-sided. Validator: 11 nodes, 10 flows, 0 imbalances.

## Checklist

- [ ] Every amount appears in the text or in an agreed calculation.
- [ ] Every intermediate node balances.
- [ ] No cycles, no self-flows, no zero or negative amounts.
- [ ] Duplicate pairs merged.
- [ ] Stage-0 nodes listed first.
- [ ] `node scripts/validate.mjs <file>` exits 0.
