# `each()` silently discards `when()` / `contain()` / `memoEach()` items

Filed from **codemap**, which vendors `dist/framework.js`. Reproduced against
`lib/core/template.js` at **v1.1.0** (`91b95e1`), so it is not a stale-bundle
artefact.

**Fixed** in `37da760` — see "Resolution (landed)" below. The workaround
recorded at the bottom is no longer needed for `when()`.

## Symptom

A `when()` in **function form** returned as an `each()` item template renders
**nothing at all**, with no console output, no thrown guard, and no visible
difference from an empty list.

```js
// renders nothing — no error, no warning
${each(rows, r => when(r.urgent,
  () => html`<a class="pill bad" href="${r.url}">${r.label}</a>`,
  () => html`<span class="pill">${r.label}</span>`), r => r.key)}
```

We hit this twice in one week on two unrelated pages. The first cost a debugging
round because the page looked *structurally* correct — the surrounding chrome, the
counts and the section headings all rendered from the same data, and only the
list was missing. A count that says "7 items" above a list showing none reads as
a data bug, not a template bug, so the search starts in the wrong place.

## Diagnosis

`when()` in function form returns a **lazy marker object** whose payload lives on
the marker, while `_compiled` is only a stub (`lib/core/template.js:239`):

```js
return {
    [WHEN_MARKER]: true,
    [HTML_MARKER]: true,
    _condition: !!condition,      // ← payload
    _thenValue: thenValue,        // ← payload
    _elseValue: elseValue,        // ← payload
    _compiled: { op: OP.SLOT, type: 'when' },   // ← stub only
    toString() { return '[when]'; }
};
```

`each()` passes every item through `toKeyedChild()`, which keeps **only
`_compiled`** (`lib/core/template.js:343`):

```js
export function toKeyedChild(result, key) {
    if (!result || !result._compiled) return null;
    const child = result._compiled;          // ← the stub
    const childValues = result._values;
    ...
    return { ...child, key, _itemValues: childValues, _src: child._src || child };
}
```

So the fragment child that reaches the renderer is `{op: SLOT, type: 'when'}`
with **no `_condition` and no branches**. There is nothing left to resolve, and
nothing to report.

**Why it is silent rather than loud:** the stub is truthy, so the
`if (child) compiledChildren.push(child)` guard in `each()` accepts it. Both the
"drop it" path (`return null` for whitespace text) and the "keep it" path assume
`_compiled` is the whole value. A lazy directive is the case where it is not.

## Scope

Every lazy directive that stores its payload beside `_compiled`:

| item template | child produced by `each()` | payload lost |
|---|---|---|
| `when(c, () => html\`…\`)` | `{type:'when', op:SLOT}` | `_condition`, `_thenValue`, `_elseValue` |
| `contain(() => html\`…\`)` | `{type:'contain', op:SLOT}` | `_renderFn` |
| `memoEach(...)` | `{type:'memoEach', op:SLOT}` | `_array`, `_mapFn`, `_keyFn` |

`when()` in **value form** (`when(c, html\`…\`)`) is unaffected — it returns the
real template, which has a genuine `_compiled` with children.

## Repro

Pure node, no browser and no test server:

```sh
node --input-type=module -e '
import { html, each, when, contain } from "/path/to/vdx-web/lib/core/template.js";
const kids = t => t._compiled.children.map(c =>
  ({ type: c.type, op: c.op, keys: Object.keys(c).filter(k => k.startsWith("_")) }));
console.log("when fn   :", JSON.stringify(kids(each([1], i => when(true, () => html`<b>${i}</b>`), i => i))));
console.log("when value:", JSON.stringify(kids(each([1], i => when(true, html`<b>${i}</b>`), i => i))));
console.log("contain   :", JSON.stringify(kids(each([1], i => contain(() => html`<b>${i}</b>`), i => i))));
console.log("plain     :", JSON.stringify(kids(each([1], i => html`<b>${i}</b>`, i => i))));
console.log("marker    :", JSON.stringify(Object.keys(when(true, () => html`<b>x</b>`))));
'
```

Observed at v1.1.0:

```
when fn   : [{"type":"when","op":1,"keys":["_itemValues","_src"]}]
when value: [{"type":"element","op":3,"keys":["_statics","_staticsIndex","_itemValues","_src"]}]
contain   : [{"type":"contain","op":1,"keys":["_itemValues","_src"]}]
plain     : [{"type":"element","op":3,"keys":["_statics","_staticsIndex","_itemValues","_src"]}]
marker    : ["_condition","_thenValue","_elseValue","_compiled","toString"]
```

The last line is the point: the payload exists on the marker right up until
`toKeyedChild` drops it.

## Suggested direction

Not a patch — you know the renderer and we do not. Two shapes that would each
close it, in rough order of how much we would trust them:

1. **Carry the marker through.** Have `toKeyedChild` detect a lazy marker
   (`WHEN_MARKER` / `CONTAIN_MARKER` / `MEMO_EACH_MARKER`) and key the marker
   itself rather than flattening to `_compiled`, leaving the slot renderer to
   resolve it as it already does outside `each`.
2. **Resolve before keying.** Evaluate a function-form `when` at `each` time —
   the condition is already a concrete boolean by then — and key the resulting
   template. Cheaper, but it changes when the branch thunk runs, which may matter
   for `contain`.

**Whatever the fix, the silence is worth closing separately.** Even a
`console.warn` in `toKeyedChild` when it receives a marker it cannot represent
would have turned both of our incidents into a one-minute fix. A guard that
throws — like the existing bare-`.map()` guard in a slot — would be better still,
and is the same class of mistake: a template expression that is legal JavaScript,
type-checks fine, and produces nothing.

If the decision is instead that this is out of contract, then a thrown guard is
the whole ask, and we will use the workaround below permanently.

## Resolution (landed)

`37da760` ("core+lint: fix each() dropping lazy directives, live keyed-item
ranges, T9-T12"). Verified against `lib/` again on 2026-09-02, because a report
that stays open long enough becomes a workaround nobody revisits:

| item template | now |
|---|---|
| `when(c, () => html\`…\`)` | **Renders.** Both branches produce the right element and interpolate - the reported case is fixed, and it is legal to write. |
| `contain(() => html\`…\`)` | **Throws a render error.** Loud instead of silent, and caught statically by the `t9-list-item` lint rule. Wrap it: `` html`<li>${contain(...)}</li>` ``. |
| a plain value | **Throws a render error**, same rule. |
| `memoEach(...)` | Same `t9-list-item` rule; wrap it. |

So the "candidate rule" in the notes below exists now - as `t9-list-item`,
scoped to the three that are still wrong rather than to `when()`, which is not.

The distinction the fix draws is the one the diagnosis identified: a lazy
directive whose payload lives beside `_compiled` is either supported properly
(`when()`) or refused loudly (the rest). Neither is silent.

## Workaround (what codemap does now, and no longer needs to)

> Superseded for `when()` by the fix above. Kept because it records why the
> incidents were expensive, and because resolving sections before the loop is
> still reasonable where both branches are costly to build.



Resolve conditionals **before** the loop and hand `each` a plain template per
item:

```js
sections(d) {
  const out = [];
  for (const [key, label] of BUCKETS) {
    const rows = d[key] || [];
    if (rows.length) out.push({ key, label, rows });
  }
  return out;
}
// …
${each(this.sections(d), s => html`<div class="sec">${s.label}</div>
  ${each(s.rows, r => this.row(r), r => r.id)}`, s => s.key)}
```

Value-form `when()` also works inside `each` and is fine where both branches are
cheap to build.

## Notes for whoever picks this up

- `tsc` cannot see it: the template is a tagged literal and its contents are
  opaque text to the checker.
- The template lint (`tools/`) does not catch it either — it reads the string
  form, and this is a legal call in a slot position. It is a candidate rule: a
  `when(` with an arrow argument inside an `each(` item is always wrong today.
- codemap now guards its own tree by resolving sections before the loop, and the
  two incidents are documented in `web/app.js` on `DashboardPage.pills` and
  `BacklogPage.sections`.
