# Codex audit worklist

Two external (Codex) reviews of this repo, plus the verification pass and
decisions taken on top of them. Branch: `codex-audit`.

Source documents in this directory:

- `HOT-PATH-CORRECTNESS-REVIEW.md` — reviewed `91b95e1` (stale; see below)
- `STRUCTURAL-REFACTORING-REVIEW.md` — reviewed `f828abe`

The hot-path review ran against `91b95e1`, one commit behind the merge, so it
excluded the keyed live-range work. Every finding in it was re-verified against
`f828abe` and all six still reproduce; nothing in it is stale. The corollary is
that the merged keyed-range code has not had its own hot-path pass.

## Verification status

All 11 substantive claims across both documents were reproduced on `f828abe`
before any of this was acted on. Nothing was taken on trust.

| # | Claim | Location | Verified |
|---|-------|----------|----------|
| H1 | A computed that throws cannot notify consumers when it heals | `lib/core/reactivity.js:1051` | yes (node) |
| H2 | Top-level component event closures freeze at first render | `lib/core/component.js:1067` | yes (browser) |
| H3 | A queued property write can execute after its binding was disposed | `lib/core/template-renderer.js:47` | yes (browser) |
| H4 | `null`/`undefined` does not clear a native input's live value | `lib/core/template-renderer.js:1743` | yes (browser) |
| H5 | Object-form styles retain keys omitted by the next value | `lib/core/template-renderer.js:1761` | yes (browser) |
| H6 | `contain()` reverses array results | `lib/core/template-renderer.js:1183` | yes (browser) |
| S1 | `currentRenderComponent` is write-only dead code | `lib/core/template.js:33` | yes (28 writers, 0 readers) |
| S2 | Ordinary-array `isHtml` branch is unreachable | `lib/core/template-renderer.js:1574` | yes (inspection) |
| S3 | Template-lint walkers diverge on `/` classification | `tools/template-lint.js:387` | yes (repro below) |
| S4 | Static and dynamic attribute sinks disagree | compiler `:320` / renderer `:1874` | yes (browser) |
| S5 | `contain(() => raw(...))` renders escaped text | `lib/core/template-renderer.js:1310` | yes (browser) |

### Reproductions

Computed heal (H1) — no server needed:

```sh
node --input-type=module - <<'NODE'
import { reactive, computed, createEffect, flushEffects } from './lib/core/reactivity.js';
const state = reactive({ bad: false, n: 1 });
const value = computed(() => { const n = state.n; if (state.bad) throw new Error('transient'); return n; });
const seen = [];
createEffect(() => seen.push(value.get()), { onError: e => seen.push(e.message) });
state.bad = true; flushEffects();
state.bad = false; flushEffects();
console.log(seen);   // [1, 'transient'] - expected [1, 'transient', 1]
NODE
```

Lint walker divergence (S3) — no server needed. The template on a line
containing `n++ / 2` is silently never scanned, so its violations are missed:

```sh
node --input-type=module -e '
import {buildRegistry,lintTemplates} from "./tools/template-lint.js";
const run=s => lintTemplates(s,"x.js",buildRegistry([{path:"x.js",content:s}])).map(x=>x.checkId);
const s="class X extends Component { template(){ let n=0; n++ / 2; return html`<button onclick=\"x()\">x</button>`; } } defineComponent(\"x-x\", X);";
console.log({sameLine:run(s), nextLine:run(s.replace("; return html",";\nreturn html"))});
'
# { sameLine: [], nextLine: [ 't10-inline-events' ] }
```

H2-H6 and S4-S5 need the test server (`python3 tools/test-server.py`) and a
Puppeteer probe; the exact scripts are in the two source review documents.

Note when writing custom-element probes: `componentDefinitions.has(tag)` is
what the compiler means by "custom element", so a bare `customElements.define`
is *not* one. A probe that does not go through `defineComponent` measures the
native path and will mislead you. This cost a round.

## Severity re-ranking

The hot-path review's own ordering is not the shipping order.

- **H6 is labelled Low and should not be.** Silently wrong DOM order, no error,
  and the fix is to advance `insertPoint` the way the ordinary array path
  already does. Low frequency (no occurrences in this repo) but it is the
  worst failure class this framework has.
- **H2 has the widest blast radius** — `ui/` alone has ~197 inline-arrow
  handlers. See the open decision below.
- **H1 is a missed half of an existing fix.** `reactivity.js:1013-1021` already
  carries a comment describing exactly this failure mode being fixed in the
  effect path; the lazy `get()` recompute at line 1051 never got the same
  treatment.
- **S3 is the highest-payback structural item** and I agree with the review's
  ranking. It is a false negative in the tool that guards the banned patterns.
  This same `/`-classification bug has already been fixed twice in other
  walkers; a third live instance (plus two more copies in
  `tools/scripts/convert-to-class.mjs`) makes the shared-helper extraction
  clearly justified rather than speculative.
- **The bundler/optimizer minifier extraction should drop from rank 2 to near
  last.** Medium-to-high risk by the review's own admission, in release
  tooling, before v1, and the duplication produces no wrong runtime behaviour.
  Stable inert duplication is not urgent.
- **S5 is misfiled.** It is a correctness bug, not a structural divergence —
  the docs recommend `contain()` for exactly the raw-content case that breaks.

The reviews' "do not unify" calls are all correct and should be respected:
`isSameCompiled()` vs `isSameStructure()`, the two attribute sinks (until
specified — now specified, see below), and the ordinary vs containment state
machines.

## Decisions taken

### Boolean attribute semantics (settled)

**Literal template text follows HTML. `${}` fill follows JS.** Stated by the
repo owner; this is the contract, not an inference.

| case | should be |
|------|-----------|
| `<button disabled>` | disabled |
| `<button disabled="false">` | disabled (literal text is HTML) |
| `<button disabled="${false}">` | not disabled |
| `<button disabled="${true}">` | disabled |
| `<vdx-cmp disabled="false">` | prop = `"false"` (string) |
| `<vdx-cmp disabled="${false}">` | prop = `false` (boolean) |
| `<vdx-cmp disabled="${true}">` | prop = `true` (boolean) |

Measured against that, there is one bug per sink:

- **Fix A** — `buildStaticDOM` (`template-compiler.js:320`) applies JS-ish
  coercion to literal text and drops `disabled="false"`. A literal boolean
  attribute is HTML: presence means true regardless of value. Only reachable
  for literals, since any interpolation makes the subtree non-static.
- **Fix B** — `applyAttributeDirect` (`template-renderer.js:1874`) applies
  `BOOLEAN_ATTRS` coercion to custom elements, so a component receives boolean
  `true` where it should receive the string `"false"`. Net rule for components:
  **string goes to the attribute, non-string goes to the property.** Gating the
  boolean branch on `!isCustomElement` alone is not enough — it regresses
  `disabled="${true}"` into `setAttribute(name, '')`, arriving as `""`. Both
  halves are required.

`isFullyStatic()` returns false for any registered component
(`template-compiler.js:122`), so both component literal cases go through the
renderer sink; neither is genuinely static.

Blast radius, measured across `lib/ ui/ site/ examples/ tests/` and
`/working/mrepo-web`:

- Fix A: **zero occurrences** of `="false"` or any non-`true` literal on a
  boolean attribute. Nothing observable changes.
- Fix B: 18 sites, all benign. 17 are `="true"` in `ui/examples.js` and
  `ui/example-components.js` (demo/docs, several display-only code samples);
  one bare `disabled` on `<cl-button>` at
  `/working/mrepo-web/frontend/pages/browse-page.js:1751`. No
  `typeof props.X === 'boolean'`, no `=== false`, no `!== true` on any
  boolean-named prop in any consumer.
- codemap is not a consumer: `/working/codemap-sidecar` has no reference to
  `framework.js` or vdx.

Sharp edge this creates: `<cl-button disabled="false">` now hands the component
the string `"false"`, which is truthy, so `if (this.props.disabled)` disables
it. That is the contract, but components must not hand-roll their own
coercion — `ui/form/toggle.js:54` already invented `=== true || === 'true'`
ad hoc. Hence the shared helper, and componentlib being brought into line.

### Open decision: function pass-through (H2)

`component.js:1067` passes function-valued slots through unwrapped, so top-level
inline-arrow handlers freeze at first render and function props never update.
`wrapReactiveValues()` (`template-renderer.js:248`) already wraps *all* values
including functions, against a genuinely `reactive()` container, for every
`each()` row and nested template — so the behaviour the pass-through avoids is
already the norm one level down, in the hot list path.

Only four sites read the values array (`975`, `1933`, `1945`, `2028`) and all
four unwrap `VALUE_GETTER`, so wrapping is mechanically safe.

Two options:

1. **Wrap with tracking** (recommended) — delete the special case, match
   `wrapReactiveValues`. Fixes frozen handlers and stale function props, removes
   the top-level/nested asymmetry. Risk: the prop effect gains a dep on
   `cacheVersion`, re-runs each render, and re-assigns function props with a new
   identity. `cl-virtual-list` ignores `renderItem` in `propsChanged`
   (`ui/data/virtual-list.js:108`), so the flagship consumer is unaffected.
2. **Wrap without tracking** — same getter minus the `cacheVersion.v` read.
   Fixes handlers only (dispatch happens outside any effect, so tracking is
   inert there) with provably zero change to effect scheduling.

One-line difference between them; try 1 first. Still needs an answer to: does
any component in the private mrepo memoize on a function prop's identity?

## The `="false"` question — settled

Runtime coercion was **rejected**. The rule stays: literal template text is a
string, `${}` passes the JS value, on every kind of element. Typed props were
weighed and turned down - they reintroduce hidden coercion, collapse enumerated
attributes like `spellcheck` (true/false/inherit) to two states, and create a
silent two-tier system where a prop declared `null` behaves differently from one
declared `false`. The measured argument for them also failed: the real
downstream app declares 19 props, exactly 1 boolean.

Instead the declared type is used for **diagnosis, not transformation**:

- `boolProp()` is the one coercion helper, exported from `lib/framework.js` and
  `lib/utils.js`. True for everything except the string `"false"` and JS-falsy
  values, so bare `disabled`, `disabled=""` and `disabled="true"` are all true.
- `t13-bool-false` reads the component's declared default, so `flag: false`
  makes `flag="false"` an error while a prop declared `flag: ''` is left alone.
  A name-based rule could not do this: `cl-button` declares `text: false` and
  `cl-tooltip` declares `text: ''`.
- Every `cl-*` flag is read and forwarded through `boolProp()`.

Earlier holds, all resolved: `raw()` is trusted by definition so the `contain()`
escaping was a plain bug; template-lint is a checker rather than live API
surface, so tightening it is fair game; nullish yields `""` to HTML and `null`
to a component.

## Downstream verification (2026-09-01)

Both consumers checked against this branch. Neither had any of the new code
vendored beforehand.

| | linter | e2e baseline | e2e with new build |
|---|---|---|---|
| codemap (`~/Desktop/codemap`) | 1 t8, unchanged pre/post | 132/132 | **132/132** |
| mrepo-web | 14 t8 + 2 t12 unchanged, **+19 t14** | 426 pass / 1 fail | **427 pass / 0 fail** |

mrepo's one baseline failure is a `remote-queue` flake under full-suite load -
it passes 12/12 run on its own, and passed in the new-build run.

**The downstream check earned its keep: it caught a real bug in this branch that
no vdx suite can see.** `dist/utils.js` shipped
`export { boolProp } from './core/constants.js'`, a dangling import - `utils.js`
and `router.js` go through `processSimpleFile`, minified in place rather than
bundled, so their imports survive verbatim and must resolve inside `dist/`.
Only the sibling bundles do. Every vdx suite passes because they import `lib/`
sources where that path resolves; any app vendoring `dist/` fails to load.
Fixed by importing `boolProp` from `./framework.js`, which already re-exports
it. `bundler-esm.js` now verifies every relative import left in `dist/` resolves
inside `dist/` and exits 1 otherwise - proven by reintroducing the bug.

**Re-vendoring mrepo needs `dist/overlay.js` added**, which it has never had:
its `componentlib/overlay/` holds only `dialog.js` and `toast.js` against vdx's
seven, so it predates `e1ed8b3` (the top-layer overlay migration). Its own
vendored `FRAMEWORK.md:515` already documents `vdx/lib/overlay.js` - the doc
came across in an earlier re-vendor, the file did not. Eight componentlib files
import it, so without it the app will not boot.

codemap's suite is the more useful of the two: it has a real browser "web UI"
suite, and `src/e2e/vdx-lint.e2e.ts` shells out to `/working/vdx-web/tools` -
this checkout, live - so its baseline had already run the new linter over
codemap's app before anything was vendored.

mrepo's suite is hermetic and self-provisioning - the entry point is
`tests/run-e2e.js`, which stands up its own backend on a free high port with a
scratch DB and a curated fixture library. `tests/test-runner.js` is the raw
per-suite runner underneath it and assumes a server is already up on :9900,
which is the owner's live docker; running that directly is what made the suite
look like it needed docker.

mrepo's 19 new findings are all `t14-bool-string` (18 `visible="true"`, one
`outlined="true"`) - idiom warnings that behave identically before and after.
Zero `t13` hits, so nothing there passes `="false"` to a flag.

Static exposure to the behavioural changes in both apps: none. No
`contain(() => raw(...))`, no `contain(() => [...])`, no `="false"`, no
function-prop identity comparisons.

Neither repo was modified. codemap ran in a detached worktree (another session
is active in that checkout); mrepo was tested by serving a scratchpad copy of
its `frontend/`, leaving its tree at exactly the 8 pre-existing dirty files.

## Loose ends from the structural audit

Closed on the final sweep: invalid `each()`/`memoEach()` input now returns the
shared `EMPTY_WHEN_RESULT` (candidate 4); containment's deferred-child check now
uses the `isDeferredChild` marker rather than a truthy `.compiled`, matching the
ordinary array path - `createDeferredChild` is the only producer and always sets
the marker, so a descriptor-shaped object reaching there is forged; and the
ordinary-vs-containment array contract for `html``` items is now pinned by a
test rather than being an accidental consequence of separate dispatchers.

**Deliberately still open**, all pure refactors the audit itself ranked low and
none of them bugs:

- **Candidate 3 - one `resolveWhen()` normalizer.** Three copies of the
  when-unwrapping contract remain (`template.js:365`,
  `template-renderer.js:984`, `:1220`). Medium risk: the thunk must execute
  inside the caller's existing reactive effect, not a new tracking boundary.
- **Candidates 4/8 - a shared trusted-list-result factory.** `each()` emits a
  complete compiled fragment while the renderer synthesizes only the fields its
  consumer reads (`template-renderer.js:1438`). Hot list path.
- **Candidates 1/2 - cleanup and fragment-insertion helpers.** The audit's own
  advice is to extract narrow helpers only and never a universal mount-record
  abstraction, because effect ownership, live ranges and remove/dispose ordering
  genuinely differ. Lowest payback of anything in the audit.
- **Bundler/optimizer minifier fork.** Deferred past v1: release tooling,
  medium-to-high risk by the audit's own assessment, and the duplication
  produces no wrong runtime behaviour.

The hot-path audit has no loose ends - all six findings and its "most fragile
invariant" test are done.

## Worklist

- [x] Verify every finding in both reviews against `f828abe`
- [x] Settle boolean-attribute semantics with the repo owner
- [x] **Fix A** — literal boolean attrs follow HTML in `buildStaticDOM`
- [x] **Fix B** — custom elements: string to attribute, non-string to property.
      `checked` needed gating too: it is special-cased ahead of the boolean
      branch, so `<cl-toggle checked="false">` was still being coerced after
      the boolean branch itself was fixed. Neither review caught this.
- [x] Shared helpers in `core/constants.js`: `isBooleanAttr()` (the predicate
      where the custom-element bug lived), `literalAttrValue()` for the literal
      sinks, `boolProp()` for components (exported from `lib/framework.js`)
- [x] `tests/framework/boolean-attrs.test.js` pins all 10 contract rows across
      both sinks
- [x] Bring `cl-*` componentlib onto `boolProp`, replacing ad-hoc coercions
      (30 files; both read sites and pass-downs into native element attributes)
- [x] H6 — `contain()` array insertion order
- [x] S5 — `contain()` + `raw()` renders escaped text. Resolved: `raw()` is the
      trusted-HTML escape hatch by definition (the `dangerouslySetInnerHTML`
      equivalent), so the escaping was a bug, not a protection. Contained single
      values and contained array items both parse raw() now.
- [x] H1 — computed heal-after-throw (try/catch in the lazy `get()` recompute)
- [x] H2 — function pass-through. Resolved with a **stable wrapper**: identity is
      fixed for the life of the component, calls dispatch to the latest closure.
      Fixes frozen handlers and stale function props with no identity churn and
      no new reactive dependency, so the tracking-vs-not question is moot.
- [x] S3 — one slash classifier in `tools/js-scan.js`, used by all three
      template-lint walkers and both `convert-to-class.mjs` scanners. Fixture
      `t14-scanner-regex` pins the same-line `n++ / 2` case. **Measured against
      both downstream apps and it surfaces nothing** - running the pre-fix
      linter (worktree at `0e8626b`) and the post-fix one over mrepo-web and
      codemap gives identical t8/t12 counts. The prediction that mrepo would
      have skipped violations was wrong.
- [x] H4 — nullish handling, to spec: a native form control's live value goes
      to `""` (its value does not track the attribute, so removing the attribute
      alone left stale text reachable through `el.value`); a component receives
      the `null` itself, which already worked.
- [x] H5 — remove object-style keys omitted by the next value
- [x] Dead code: `currentRenderComponent` + 24 `setRenderContext` calls (S1),
      unreachable ordinary-array `isHtml` branch (S2), unused item-record
      `slotInSvg`, redundant `memoEach` cache-miss key copy
- [x] H3 — disposal-ownership invariant. Both commit queues now stamp each
      deferred write with `getActiveEffect()` and drop it if that effect was
      disposed before the commit. `isConnected` was rejected: a freshly
      instantiated subtree queues writes while its fragment is still detached,
      so it would have dropped legitimate first renders.
- [x] Lint check `t13-bool-false` for literal `boolattr="false"` on any tag,
      with fixture and banned-pattern docs. Fires on nothing in the repo today.
- [x] Swept boolean-ish props whose names do NOT collide with `BOOLEAN_ATTRS`.
      The type-aware lint found 18 live call sites the earlier name-based grep
      could not see - `copyable="false"` on `cl-code-block` (declared
      `copyable: true`, read with plain truthiness) was showing a copy button on
      15 tutorial pages. 109 read sites across 31 components now go through
      `boolProp()`, and three more hand-rolled coercions are gone.
      Superseded note follows:
- [x] ~~Decide: sweep boolean-ish props whose names do NOT collide with
      `BOOLEAN_ATTRS`.~~ `outlined`, `inline`, `closable`, `visible`, `modal`,
      `text`, `filter`, `fluid`, `binary`, `linear`, ... were always plain
      strings, so this change did not affect them and they were left alone —
      but it means `outlined="false"` is still truthy. Pre-existing, and a
      separate class of bug from the audit. It does leave `cl-button`
      internally inconsistent: `loading="false"` now works, `outlined="false"`
      does not. Scope call for the repo owner.
- [ ] Hot-path pass over the merged keyed live-range code, which the stale
      review revision never covered
- [ ] Deferred past v1: bundler/optimizer minifier core extraction

Shipping note for anything touching `lib/`: regenerate `dist/` with
`node tools/bundler-esm.js` (no arguments), then re-vendor into the private
mrepo and `/working/mrepo-web`, running both e2e suites at each hop.
