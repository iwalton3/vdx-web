# VDX Template Lint — Design Spec

**Status:** FULLY IMPLEMENTED — v0 (§11), v1 + v2 (§12). All checks T1–T6 live, `--emit-registry` shipped.
**Author context:** July 2026, following the class-component migration (commits `24504b9` → `0c879a6`)

## 1. Motivation — what TypeScript cannot reach

The class-component migration closed most of the static-checking gaps. Measured with real
`tsc --strict` runs against twin components with deliberate mistakes:

| Mistake | Legacy options format | Class format |
|---|---|---|
| `this.state.showAction` (state member typo) | ✅ caught | ✅ caught |
| `this.props.tsk` (props member typo) | ✅ caught | ✅ caught |
| `this.stat.showActions` (typo on `this`) | ❌ silently `any` | ✅ caught |
| `${this.handleClik}` (missing method, template interpolation) | ❌ silently `any` | ✅ caught |

(The options format structurally cannot do better: methods land on `this` dynamically, so
`ComponentInstance` needs `[key: string]: any` — framework.d.ts — which swallows all typos on
`this`. This is why classes are now the default.)

**What remains unchecked in BOTH formats** is everything inside the `html\`\`` string itself.
TS treats the template as an opaque string; interpolated `${...}` expressions are checked, but
string-form bindings are not:

```javascript
html`
    <button on-click="handleClik">save</button>        <!-- missing method: silent -->
    <input x-model="serchQuery">                        <!-- missing state key: silent -->
    <div ref="contaner"></div>  ... this.refs.container <!-- mismatch: silent -->
    <cl-button labl="Save"></cl-button>                 <!-- unknown prop on child: silent -->
    <div on-touchmove-passive-prevent="h">              <!-- contradictory modifiers: runtime warn only -->
`
```

These are the most common real template bugs (rename a method, miss the string reference).
This lint makes them static errors. Full *type* checking of template bindings (attribute value
types against child prop types, editor squiggles) is explicitly **out of scope** — that would
be a TS language-service plugin à la `ts-lit-plugin`/`lit-analyzer`, a separate project. This
lint is the cheap, high-yield subset: **existence and declaration checking**.

## 2. Prior art / infrastructure to reuse (all in this repo)

| Asset | Where | What it gives you |
|---|---|---|
| Lint harness (`--lint-only`, `--strict`, issue shape `{line, variable, path, fixable, message}`, exit codes) | `optimize.js` → `runLintOnly()` | CLI, reporting, CI integration — plug in as another issue source, like `lintClassComponentFields` already does |
| Class/component discovery (find `class X extends Component`, parse `static props` incl. same-file inheritance, brace-matched body spans) | `optimize.js` → `lintClassComponentFields()` + `maskStringsAndComments()` | The registry builder starts here; extract the shared pieces into a module rather than duplicating |
| Structure-aware JS scanner (strings, template literals w/ `${}` nesting, comments, regex literals; object-member splitting) | `scripts/convert-to-class.mjs` → `scan()`, `objectMembers()`, `parseMember()` | Needed to harvest methods/getters from class bodies and options objects |
| **Real HTML parsing of template contents** | `lib/core/html-parser.js` → `htmlParse` — **verified to import cleanly in Node** (zero-dep, no DOM) | Parse template HTML with the framework's OWN parser instead of regex: attribute names/values, custom-element tags, exactly the semantics the runtime uses |
| Attribute↔prop name mapping rules | `lib/core/component.js` → `toKebabCase`, `attrToProp` construction (~line 350) | camelCase prop ⇄ kebab-case attribute, legacy smushed-lowercase accepted |
| Event modifier semantics | `lib/core/template-renderer.js` ~1599, ~1912 (`def.modifiers`); compiler assigns them in `template-compiler.js` | Known modifiers: `prevent`, `stop`, `passive`, `delegate`, `once`?, `outside` (verify the full set in template-compiler before hardcoding) |
| `x-model` resolution semantics | `template-renderer.js` → `resolveDynamicProp()` ~1757: `getNestedValue(component.state, def.xModel)` | x-model paths are **dot-paths into state** (`x-model="filters.query"`), plus `x-model-checked`/`-radio` contexts |

Template location/extraction: `optimize.js` → `findAllHtmlTemplateStarts()` /
`extractExpressionsFromTemplate()` already find every `html\`\`` and its span. For the lint,
replace `${...}` expressions with placeholder markers, then feed the static HTML to
`htmlParse` for attribute-level analysis.

## 3. Architecture

New module `template-lint.js` at repo root (peer of `optimize.js`), imported by `optimize.js`
and wired into `runLintOnly()` (both normal and `--strict` modes — these are correctness
checks). Also runnable standalone: `node template-lint.js <dirs>`.

Two passes over the input tree:

### Pass 1 — build the component registry

For every `.js`/`.mjs`/`.ts` file, find `defineComponent('tag-name', X)` sites (reuse the
codemod's code-mask so string/comment mentions are skipped — `examples.js` contains
defineComponent calls inside display strings).

For each site, resolve `X`:
- **Options object literal** → harvest `props` keys, `methods` names, `computed` names, and
  `data()`'s returned literal keys (state), via `objectMembers`.
- **Class in the same file** → walk the class chain (like `lintClassComponentFields`):
  `static props` (merged parent-first), prototype method names, getter names, state keys from
  field-style `state = {...}` or a single top-level `this.state = {...}` literal in the
  constructor.
- **Imported class** → best-effort: follow the import specifier to the file, match the
  exported class name, harvest there. If unresolvable, register the tag as **opaque**.

Registry entry: `{ tag, file, props: Set, methods: Set, getters: Set, stateKeys: Set|null,
opaque: bool }`. `stateKeys: null` means "not statically known" (spread, function call,
conditional) — every state-dependent check bails for that component.

Also register **built-in/special tags** that must never produce unknown-tag noise:
`router-outlet`, `router-link`, `x-await-then`, plus every tag in the registry. Hyphenated
tags NOT in the registry: report at most an `info`-level "unknown component tag" (could be
third-party/runtime-registered) — never an error, and consider gating it behind a flag.

### Pass 2 — check every template against its enclosing component

Associate each `html\`\`` span with the class/options body that contains it (containment by
span; the enclosing-scan already computes body ranges). Templates outside any component
(helper functions, `renderItem` factories) get **only** the checks that don't need `this`
context (modifier sanity, cross-component props), since string handlers in detached templates
resolve against whatever component renders them.

Within each template: replace `${...}` with markers, `htmlParse` the HTML, walk elements.

## 4. The checks

Severity levels: **error** (unfixable, fails `--strict`), **warn**, **info**. Every check has
a documented bail-out. Guiding rule: **silence over false positives** — this must be able to
run in CI on this repo with zero errors on day one (the repo post-conversion is the corpus:
126+ componentlib components, apps, demos).

### T1. String event handlers (error)
`on-<event>[-modifiers]="name"` where the attribute VALUE is a plain string (not a `${}`
marker): after stripping modifiers, `name` must be in the enclosing component's
`methods ∪ own-prototype-chain`. Getters are **not callable** → dedicated error message
("`total` is a computed getter, not a method"). Bail-outs: value contains a marker
(TS checks those); template not inside a component.
Note: event NAME parsing must mirror the compiler (modifiers only recognized at the END;
`on-status-change-prevent` = event `status-change` + `prevent`). Extract the modifier list
from `template-compiler.js` — do not guess.

### T2. `x-model` paths (error, with generous bail-outs)
`x-model="a.b.c"` → root key `a` must be in the enclosing component's `stateKeys`. Only the
ROOT key is checked (nested shapes are rarely statically knowable). Bail-outs: `stateKeys ===
null`; any dynamic state assignment detected anywhere in the class (e.g. `this.state[key] =`)
→ downgrade the whole component to `stateKeys = null` during harvest.

### T3. Refs (warn)
Collect `ref="name"` in all of a component's templates (including `renderError`) and
`this.refs.NAME` member accesses in its body. `this.refs.X` with no `ref="X"` anywhere →
warn. The reverse (declared ref never read) → info at most. Bail-outs: computed access
`this.refs[expr]`; refs consumed by helpers that receive `this.refs` wholesale.

### T4. Modifier sanity (error)
- `-passive` combined with `-prevent` on one binding (runtime already warns; make it static —
  see template-renderer ~1601).
- Unknown modifier tokens? NO — a trailing token might be part of a custom event name.
  Only check *known-contradictory* combinations, never unknown tokens.

### T5. Cross-component props ("proptypes", warn)
For each element whose tag is in the registry (and not opaque): every attribute must map to a
declared prop after kebab→camel mapping (and legacy lowercase), OR be in the always-allowed
set: `class`, `style`, `id`, `slot`, `ref`, `x-model`, `key`, `on-*`, `json-*`, `data-*`,
`aria-*`, standard global HTML attributes (use a small allowlist; when in doubt, allow).
Unknown attribute on a known component → warn: "`<cl-button>` has no prop `labl` — declared
props: label, variant, ...". Bail-outs: attribute name itself contains a marker; opaque tags.
This is where the "docstring" ambition lands in v1: the declaration source is `static props`
(ground truth, no JSDoc needed).

### T6. JSDoc-declared events and prop docs (v2, info/warn)
If a component class carries JSDoc tags (`@fires status-change`, `@prop {Task|null} task`):
- `on-<custom-event>` on that component's tag where the event is not in `@fires` ∪ `change`
  (from `emitChange`) ∪ events found in `dispatchEvent(new CustomEvent('...'))` string
  literals in its body → info.
- `@prop` names that don't match `static props` → warn (doc drift).
This tier is additive metadata — absence of JSDoc must produce zero output. Do NOT attempt to
check types from the docstrings in v1/v2; that's the language-service-plugin project.

## 5. Non-goals (explicit)

- Type-checking attribute values against prop types (needs a type system; plugin project).
- Checking `${...}` interpolations (tsc's job — solved by the class format).
- Editor integration/LSP diagnostics (the registry built here would feed such a plugin later;
  keep the registry serializable — `--emit-registry registry.json` is a cheap future hook).
- Validating standard-HTML attribute correctness (not our domain).
- Dynamic tags (`<${tag}>` isn't valid VDX anyway) or runtime-registered components.

## 6. Suppression & configuration

- Line suppression: `<!-- vdx-lint-disable-next-line t1-handler -->` inside templates and
  `// vdx-lint-disable-next-line t3-refs` in JS, each naming the check id.
- Per-run: `--templates-only` (run just this lint), check-id filters (`--disable t5`).
- No config file in v1.

## 7. Testing & acceptance

1. **Fixture suite** (like the shadow-field lint verification): one fixture file per check
   with true positives AND near-miss negatives (marker-valued handlers, dot-path x-model,
   kebab-case props, modifiers-in-event-names like `on-status-change-prevent`, detached
   `renderItem` templates, opaque imported tags).
2. **Corpus run**: `node optimize.js --lint-only` over `app/` must produce **zero new
   errors** (warns reviewed one by one — each is either a real latent bug, which gets fixed
   and celebrated in the report, or a false positive, which gets a bail-out before landing).
3. **Mutation check**: script that injects 20 known breakages (rename methods, state keys,
   props) across componentlib and asserts the lint catches ≥ the T1/T2/T5 subset.
4. Node-only, zero new dependencies (house rule — see root CLAUDE.md on supply chain).

## 8. Phasing & rough effort

| Phase | Contents | Effort guess |
|---|---|---|
| v0 | Registry (same-file only) + T1 handlers + harness wiring + fixtures + corpus run | 1–2 days |
| v1 | T2 x-model, T3 refs, T4 modifiers, imported-class resolution, T5 cross-component props | 2–3 days |
| v2 | T6 JSDoc events/prop-docs, `--emit-registry` for future editor tooling | 1–2 days |

Implement strictly in phase order; each phase must pass the corpus run before the next.

## 9. Known sharp edges for the implementer

- `examples.js` / `examples-old.js` contain defineComponent calls inside strings — the code
  mask handles this; make sure the registry pass uses it.
- Legacy options components still exist (`lib` internals, `tests/framework` deliberately):
  the lint must handle BOTH formats in the registry pass. `tests/framework` should probably be
  excluded from template checks by default (it contains deliberate error cases).
- The optimizer TRANSFORMS templates (wraps expressions in `html.contain`) — the lint must
  run on SOURCE, never on optimizer output, and must not be confused by already-optimized
  code (`html.contain(...)` markers count as `${}` values).
- Multiple templates per component (`template()` + `renderError()` + branches inside
  `when()` callbacks) — refs/handlers may be declared in any of them; T3 unions across all.
- TS files: annotations inside class bodies (the codemod's generic-comma lesson —
  `scan()` doesn't understand `<>`); harvest keys defensively and bail to opaque on parse
  trouble rather than throwing.

## 10. Research spike findings (2026-07-10, verified against the repo)

Every infrastructure claim in §2 was checked against the code; all hold, with these
corrections and additions:

1. **Drop the marker-replacement plan (§2 last paragraph, §3 pass 2).** `htmlParse(strings)`
   takes a template-strings ARRAY natively — the same shape a tagged template receives. The
   lint should split each template's source at its `${...}` boundaries (spans already
   computed by `extractExpressionsFromTemplate`) and pass the parts array directly. Verified
   in Node: the tree comes back with everything pre-structured —
   `events['status-change'] = {method: 'onStatus', modifiers: ['prevent']}` (T1/T4),
   slot-valued handlers as `{slot: n}` (T1's bail-out signal, distinguished for free),
   `{xModel: 'serchQuery'}` (T2), `attrs.__ref__ = {refName: ...}` (T3), plain attrs on
   custom-element tags (T5). No attribute-name parsing needed in the lint at all.
2. **Modifier semantics live in `html-parser.js`, not `template-compiler.js`.**
   `KNOWN_MODIFIERS = {prevent, stop, passive, delegate}` (html-parser.js:42) and
   `handleEvent()` (~:750) does the end-stripping (`on-status-change-prevent` → event
   `status-change`) plus the `on-click-outside` → `clickoutside` special case. Because the
   lint reuses the parser, its event-name parsing CANNOT diverge from the runtime — T1's
   "mirror the compiler" risk disappears.
3. **Parser is lenient on malformed input** (unclosed tags, stray `<`, unquoted attrs, slot
   in tag position — none throw). Good for lint robustness; still wrap in try/catch and skip
   the template on error.
4. **Gap the spec missed: line numbers.** The parse tree carries no source positions, but the
   `runLintOnly` issue shape needs `{line}`. v0 work item: map findings back by searching the
   raw template span for the attribute text (with occurrence counting), falling back to the
   template's start line.
5. **Registry starting point confirmed.** `lintClassComponentFields` (optimize.js:1345)
   already has class discovery, brace-matched body spans, and `static props` harvesting with
   same-file inheritance. The registry pass extends this with method/getter/state-key
   harvest and `defineComponent` tag association — this, not template analysis, is where the
   v0 effort concentrates.

## 11. v0 implementation notes (2026-07-10)

Landed as `template-lint.js` (repo root) + `scripts/template-lint-fixtures/` +
`scripts/test-template-lint.mjs`, wired into `optimize.js --lint-only` (both modes) with
`--templates-only`, `--disable <ids>`, `--include-tests` flags. User docs in
docs/optimization.md. Deviations from and additions to the spec:

- **Latent bug found & fixed in `maskStringsAndComments`** (celebrated per §7.2): after a
  template expression containing a string literal (`${x ? 'a' : 'b'}`), the old version
  spliced in a recursive mask of the rest of the file computed from the wrong lexer state,
  silently blanking real code downstream — in `example-components.js` it erased subsequent
  `class ... extends Component` heads, so 25 of 26 classes vanished from any masked-based
  scan. This also affected the pre-existing shadow-field lint (wrong class spans). Rewritten
  as a proper state machine (now shared FROM template-lint.js, imported by optimize.js);
  regex-literal bodies are now masked too. Full/strict lint output over app/ is byte-identical
  to the old version otherwise.
- **The mask blanks template text entirely**, so template STRUCTURE (parts/exprs/nesting)
  comes from a dedicated raw-source walker (ported scan() semantics: strings, comments,
  regex-vs-division, nested templates), not from the mask. The mask is used for the registry
  pass only.
- **T1 valid-name set is wider than "methods"** because runtime resolution is a bare
  `component[name]` lookup (template-renderer.js:1901): class fields and `this.x =`
  assignments (arrow handlers), declared props (exposed as element accessors, may hold
  functions), framework members (`emitChange`, `render`, `$method`, `propsChanged`), and a
  generous allowlist of native element methods (`focus`, `showModal`, ...). Getters and
  lifecycle hooks (NOT bound onto the element) get dedicated error messages.
- **Detached-template rule**: a template nested inside an *attribute-position* `${}` of
  another template (e.g. `render-item=${(item) => html\`...\`}`) renders in another
  component's context → skipped. Content-position nesting (`when`/`each`/ternary callbacks)
  renders in the same context → checked.
- **Acceptance results**: fixture suite 22 assertions green; corpus run over app/ zero
  errors with real coverage (359 components: 201 class + 158 options; 353 fully resolved,
  0 opaque, 6 unresolved = framework internals/test doubles); mutation check 18/18 catchable
  method renames caught across 18 componentlib files (2 of 20 sites were inside
  display-string code snippets in examples*.js — correctly not checked).
- v1 note: `stateKeys` (for T2) is already harvested, including the `this.state[...]` and
  non-literal-assignment downgrades to `null`.

## 12. v1 + v2 implementation notes (2026-07-10, same session as v0)

All remaining checks landed. Deviations from and refinements to the spec:

- **Severity plumbing**: template issues carry `severity`; in `optimize.js` errors join the
  unfixable bucket (exit 2 / fails `--strict`), warns print with a summary line but NEVER
  affect exit codes, infos print only with `--verbose`. The standalone CLI prints everything
  and exits non-zero on errors only.
- **T2**: dedupes the x-model defs the parser fans out (one `x-model` becomes an attr def +
  an event def) and checks the root key once per element. All bail-outs as specced.
- **T3**: destructuring reads (`const { panel } = this.refs`) and optional chaining
  (`this.refs?.input`) count as reads; computed access or wholesale `this.refs` hand-off
  bails the component. Reads are collected from the masked body, so `this.refs.x` inside
  template TEXT doesn't count but inside `${...}` expressions does. The reverse direction
  (declared-never-read) is info-level and found one real dead ref in the corpus
  (`cl-inplace` declared `ref="input"` but focuses via rAF+querySelector) — removed.
- **T5**: prop matching accepts exact property-style, kebab-case (`max-count` → `maxCount`),
  and legacy smushed-lowercase. Beyond the spec's allowed set, components declaring ZERO
  props are skipped entirely (they read attributes their own way; a warn there is noise).
  `json-*` kept in the allowed prefixes per spec even though the current framework core has
  no json- handling (private-fork convention; "when in doubt, allow").
- **T6**: `@fires` may carry an optional `{type}`; `@prop`/`@property` accepts `[optional]`
  brackets. The allowed-event set is `@fires` ∪ `CustomEvent('...')` literals in the class
  body (inherited ones merge along the chain) ∪ native DOM events; `emitChange(` adds
  `change`. The corpus currently has zero `@fires` blocks, so T6 is dormant until components
  gain JSDoc — fixture-verified only (per spec: absence produces zero output).
- **Imported-class resolution**: relative specifiers only; named, aliased (`X as Y`), and
  default imports resolve; `export default class X` / `export default X;` aliases tracked.
  Unresolvable (bare specifiers, re-export aliases, missing files) → opaque/unchecked as
  before.
- **Acceptance (v1+v2)**: fixtures 50 assertions across 12 files; corpus over app/ ZERO
  errors and zero warns (`--verbose` infos: one, the real cl-inplace dead ref, fixed);
  mutation checks T1 18/18, T2 10/10, T5 9/9 catchable (misses were inside display strings /
  JSDoc examples — correct bail-outs); legacy lint output byte-identical to the pre-change
  baseline in both modes.

**Follow-ups (not in scope here):** add `@fires` JSDoc to componentlib components so T6 has
corpus surface; port the lint + the maskStringsAndComments fix to the mrepo copies of
optimize.js; the serialized registry is the input for a future editor/LSP plugin.
