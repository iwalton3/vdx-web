# Attribute-contract matrix

Walks the cross product of element kind x attribute x value source and compares
what VDX produced against what the contract says it should. It exists because
the defects in this area are combinatorial: they sit at intersections of
independent axes, so reviewers who sample cells never converge on them. See
`docs/tasklists/CODEX-AUDIT-HANDOFF.md` for the history that led here.

```sh
python3 tools/test-server.py &
cd tests/e2e && node run-attr-matrix.js          # diff against the baseline
SHOW_CLASS=1 node run-attr-matrix.js             # + the derived DOM classification
UPDATE_BASELINE=1 node run-attr-matrix.js        # re-record, once a change is intended
```

## Two halves, two sources of truth

**Literal template text** is defined as HTML source, so the HTML parser IS the
oracle: the same markup is built with `ref.innerHTML` and the results compared.
Nothing is transcribed, so this half cannot encode our own bugs as expectations.

**Interpolated `${}` values** answer to a stated design rule (documented at the
top of `matrix.js`), not to any external truth. The matrix shows completeness
and self-consistency here; correctness is a ratification question. Conformance
with other frameworks is explicitly *not* the goal - the rule is "what would a
VDX component do, given what this DOM node means".

How each attribute spells "off" is derived from the live DOM rather than a
hand-kept list - a free-string round-trip probe separates plain attributes from
enumerated ones, then on/off words are probed as PAIRS (probing them
independently is ambiguous, because an invalid value falls back to the
attribute's default). That is what finds `translate` spelling off as `"no"`.

## The baseline

`expected-disagreements.json` records the residue. It is not zero and is not
expected to reach zero. A **new** row is a regression; a **resolved** row is a
fix worth recording. Either fails the run, which is what stops this from being a
one-shot audit that rots the next time someone edits a sink.

The 37 recorded entries are, in full:

| count | what | why it stays |
|-------|------|--------------|
| 14 | SVG / `svg-hyphen` `hidden`, and bare attributes in SVG | `isBooleanAttr` special-cases `GLOBAL_BOOLEAN_ATTRS` past the `notHtmlElement` guard (`constants.js`), so these keep presence semantics inside SVG. Harmless: the UA `[hidden]` rule is HTML-namespace-scoped, so nothing renders differently either way. |
| 11 | `itemscope` normalised to `""` | Deliberate: it is a global boolean, so VDX gives it presence semantics. Diverges from the parser on literal text; observable behaviour is the same. |
| 10 | `style` gaining a trailing `;` | The browser's own cssText normalisation, not VDX. Belongs in the comparator, not here. |
| 2 | `component` `hidden` with nullish | Probe artifact: the probe declares `hidden` as a prop, so its own accessor shadows the DOM one. Note that declaring a host attribute (`hidden`/`class`/`style`) as a prop is itself a bad idea and nothing currently warns against it. |

If that table and the JSON ever disagree in count, the JSON is authoritative -
re-derive the table rather than trusting it.

## What this does NOT cover

The `computed()` flag machine and the Node/`DocumentFragment` insertion sites -
the other two areas the handoff names. The method transfers (derive the
classification, enumerate, diff) but the harness does not: it is DOM-shaped, and
`computed()` is a state machine that wants a six-cell test in node.
