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

## The relations

`relations.js` adds a third source of truth that needs no rule at all. A
metamorphic relation says two ways of reaching one state must land in one
state, and reads both sides through the same snapshot - so it cannot encode
an opinion the way `ruleFor` can, and every mistake in this arc was made in
an opinion:

| relation | what is compared | walked over |
|---|---|---|
| `update` | update-to-X against a fresh render of X | every (prior, next) value pair, every job |
| `ingress` | `el.p = x` against `el.setProps({ p: x })`, `propsChanged` included | every pair, registered kinds |
| `timing` | render-then-register against register-then-render, plus two updates | every value, declared and undeclared |
| `children` | the same, for light-DOM children: present, text, handler, binding | a handful of text values |

Rows carry `oracle: relation:<name>` and join the same baseline diff. The one
stated exception is in `relTiming`: `${undefined}` compares on the prop channel
only, because the mirror is documented to differ there (the eager path mirrors
the resolved default, an omitted or lazy value takes it unmirrored).

The relations found two things the cells could not: a `style` withdrawn on
update leaving `style=""` behind (Blink re-serialises lazily, and the matrix's
own before-read was masking it), and the attribute mirror written by four
sites with two rules, so a lazily registered component kept the text mirror
the renderer wrote before upgrade. Both fixed; both fail-first through the
relation itself.

## The baseline

`expected-disagreements.json` is **meant to be empty**. A nonzero row is a
finding to rule on, not a table entry to add. A ratified divergence belongs in
`ruleFor` (or the relation) as a clause with a reason; only a finding that is
scheduled, not shrugged at, may wait here - and it must say where it is going.

**15 rows, `relation:children`, waiting on the registry-answerer collapse
(ATTR-CONTRACT-CYCLE-4.md, "what to do next").** A component registered after
its call site rendered captures its light DOM through an `innerHTML` round
trip (`connectedCallback`), which drops every `on-*` listener and every
binding the parent put on those children. Registered first, the same children
arrive as deferred descriptors and keep both. The prop half of the timing
promise in `docs/templates.md` holds; the children half does not yet. When the
capture adopts the live nodes, these rows show as RESOLVED and the file goes
back to empty.

It held 37 rows until the restructure. They were four different things wearing
one label, and a genuine regression - a lazily-registered component losing every
non-string prop - sat among them for two rounds because it looked like the other
36. Each category went to the place that could express it:

| rows | what | where it went |
|------|------|---------------|
| 14 | SVG / `svg-hyphen` `hidden` | a `ruleFor` clause. `isBooleanAttr()` tests `GLOBAL_BOOLEAN_ATTRS` *before* its `notHtmlElement` guard, so global booleans keep presence semantics in SVG - deliberately, so an unregistered component stays hideable. |
| 11 | `itemscope` | `classify()`. Chrome ships no microdata IDL, so the DOM probe read nothing and called a spec boolean attribute "plain". Presence, not text, is its observable. |
| 10 | `style` trailing `;` | `sameFor()`. The browser's own cssText normalisation; both sides now round-trip through one declaration block. |
| 2 | `component` `hidden` nullish | the harness. The probe declared `hidden` as a prop, installing an accessor that shadowed the DOM's - it was reporting on itself. |

Only the first is a VDX opinion. The other three were the instrument measuring
the wrong thing.

### Keeping it honest

Reaching zero by teaching the oracle to agree is the failure mode this whole
arc keeps producing, so the restructure was checked by breaking the sink and
confirming the matrix still fails:

| mutation in `lib/` | rows |
|---|---|
| string `style` writes corrupted | 5 |
| `GLOBAL_BOOLEAN_ATTRS` early return deleted from `isBooleanAttr` | 4 |

Repeat that before trusting any future change that lowers the count. Note the
second figure: deleting that early return - a live proposal in
`docs/tasklists/ATTR-CONTRACT-HANDOFF.md` - changes behaviour in **4** cells,
all SVG `${''}`/`${0}`, and in none on components. The 14 rows it used to
produce were the classifier's blind spot, not its blast radius.

## What this does NOT cover

The `computed()` flag machine (`tests/node/computed-cells.mjs` has it) and the
slot value dispatchers. The slot relation `contain(() => v) == v` lives in the
framework suite instead (`tests/framework/slot-relations.test.js`), because it
is about what a slot renders rather than what an attribute holds; it carries
its own known-divergent list for the same reason this file carries a baseline.
