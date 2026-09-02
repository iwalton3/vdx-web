# Structural / Refactoring Audit

Date: 2026-09-01

Ground truth: reviewed commit `f828abe` (`Merge pull request #1 from iwalton3/list-guards-and-live-ranges`). The tree was dirty only because `HOT-PATH-CORRECTNESS-REVIEW.md` was untracked.

Scope: `lib/` and `tools/`.

This is a structural review, not a correctness review. The resolved `toKeyedChild()`, keyed live-range, and T9-T12 findings are treated as background and are not re-reported as open bugs.

## Assessment of the Listed Candidates

### 1. `instantiateSlot`'s parallel state

Partly real duplication, but the separate state lifetimes are load-bearing.

The ordinary slot state is replaced by the outer effect at `lib/core/template-renderer.js:1144`, while containment state belongs to a nested effect created at `lib/core/template-renderer.js:1176` and deliberately preserves DOM across boundary executions at `lib/core/template-renderer.js:1339`.

The repeated cleanup and mounting mechanics are real duplication. The two state sets themselves should not be merged. A safe refactor could package them into records and extract narrowly named cleanup helpers while preserving the two lifetimes.

### 2. Instantiate, insert, then record

This is real mechanical duplication, but it is not one uniform operation.

- Regular templates snapshot and insert at `lib/core/template-renderer.js:1471`.
- Deferred children change effect ownership before insertion at `lib/core/template-renderer.js:1500`.
- Keyed items must call `makeItemRecord()` before insertion so it can append the live-range anchor at `lib/core/template-renderer.js:1445`.

A small fragment-insertion primitive is plausible. One universal mount-and-record abstraction would hide meaningful ownership and range differences.

### 3. Repeated `while (isWhen(...))` loops

This is real semantic duplication.

The loops at `lib/core/template.js:377`, `lib/core/template-renderer.js:986`, and `lib/core/template-renderer.js:1226` all select a branch, invoke a thunk, recursively unwrap nested `when()` results, and normalize nullish/false to `EMPTY_WHEN_RESULT`.

This is one normalization contract and should have one implementation. The shared helper must execute thunks inside the caller's existing reactive effect rather than creating a new tracking boundary.

### 4. Empty compiled fragments

This is real duplication.

The stable empty object is defined at `lib/core/template.js:218`, while invalid inputs to `each()` and `memoEach()` allocate equivalent fresh objects at `lib/core/template.js:432` and `lib/core/template.js:540`.

Those invalid-input branches can return the shared empty result. A valid `each([])` must remain a `fromEach` fragment so an existing rendered list can reconcile to empty.

### 5. `memoEach` key and `_src` stamping

This is real and redundant.

The cache-miss copy at `lib/core/template-renderer.js:884` has no intervening consumer before `toKeyedChild()` repeats the work at `lib/core/template-renderer.js:900`. `toKeyedChild()` is already the canonical keyed-child producer at `lib/core/template.js:409`.

The cache-miss copy can be removed.

### 6. Attribute application paths

The claim of three independent sinks is refuted. There are two sinks and one scheduling wrapper.

`applyAttribute()` at `lib/core/template-renderer.js:119` decides whether to apply immediately or queue an update, then delegates to `applyAttributeDirect()`. That split is load-bearing.

The real duplication is between the compiler's static sink at `lib/core/template-compiler.js:311` and the renderer sink at `lib/core/template-renderer.js:1795`. Their behavior can differ based only on whether a subtree qualifies as fully static at `lib/core/template-compiler.js:114`.

A browser probe showed that literal `disabled="false"` produces:

- A fully static button: `disabled === false`, no `disabled` attribute.
- The same button with a dynamic child: `disabled === true`, `disabled=""`.

The static and dynamic sinks should not be unified until the intended compatibility behavior is specified.

### 7. `isSameCompiled` versus `isSameStructure`

These are distinct identity notions that should remain separate.

`isSameCompiled()` proves root call-site identity through `_statics` at `lib/core/template.js:17`. `isSameStructure()` compares keyed-child provenance through `(_statics, _staticsIndex)` and has a fallback for provenance-free children at `lib/core/template-renderer.js:669`.

Replacing either with the other would collapse sibling positions or treat shallowly similar templates as identical.

### 8. `each()` and `memoEach()` list-result shapes

This is a real shared contract, but the current values are not identical shapes.

`each()` emits a complete compiled fragment at `lib/core/template.js:469`. The renderer synthesizes only the fields its current consumer reads at `lib/core/template-renderer.js:1407`.

Both should use a common trusted-list-result factory. `memoEach()` must remain a slot marker until its slot-scoped cache has run.

### 9. Template-lint scanners

This is real duplication, and there are three affected walkers rather than two.

- `maskStringsAndComments()` classifies `/` at `tools/template-lint.js:105`.
- `scanExprBrace()` repeats it at `tools/template-lint.js:304`.
- `collectTemplates()` repeats it at `tools/template-lint.js:387`.

The `++`/`--` exception exists in the first two but is absent from `collectTemplates()`. The duplication has therefore already diverged.

The following command demonstrates the difference:

```sh
node --input-type=module -e '
import {buildRegistry,lintTemplates} from "./tools/template-lint.js";
const run=s => {
  const entries=[{path:"x.js",content:s}];
  return lintTemplates(s,"x.js",buildRegistry(entries)).map(x=>x.checkId);
};
const s="class X extends Component { template(){ let n=0; n++ / 2; return html`<button onclick=\"x()\">x</button>`; } } defineComponent(\"x-x\", X);";
console.log({sameLine:run(s), nextLine:run(s.replace("; return html",";\nreturn html"))});
'
```

Observed result:

```text
{ sameLine: [], nextLine: [ 't10-inline-events' ] }
```

## Unlisted Divergences and Couplings

### Ordinary slots and `contain()` dispatch different value types

Ordinary slots parse a top-level `raw()` result at `lib/core/template-renderer.js:1485`. Containment sends the same result through primitive stringification at `lib/core/template-renderer.js:1310` because a raw marker is not an HTML marker.

Consequently, `raw('<b>R</b>')` creates a `<b>` element, while `contain(() => raw('<b>R</b>'))` renders escaped text. This is especially notable because the framework documentation recommends that contained form for isolating raw content from unrelated renders.

The array dispatchers also differ:

- Ordinary slots reject any array containing an HTML vnode at `lib/core/template-renderer.js:1524`.
- Containment explicitly instantiates HTML array items at `lib/core/template-renderer.js:1275`.
- Ordinary arrays parse `raw()` items at `lib/core/template-renderer.js:1589`.
- Containment has no `isRaw()` array branch and stringifies those items.

The HTML-array distinction may be intentional because containment replaces its complete boundary. It should nevertheless be an explicit contract and test rather than an accidental consequence of separate dispatchers.

### Deferred-child trust checks differ

The ordinary array path requires `isDeferredChild(item)` at `lib/core/template-renderer.js:1554`. The containment path accepts any object with a truthy `.compiled` field at `lib/core/template-renderer.js:1289`.

Both paths should use the marker predicate unless manually constructed descriptor-shaped objects are intentionally supported.

### Unreachable ordinary-array HTML branch

`value.some(isHtml)` throws before iteration at `lib/core/template-renderer.js:1534`. Therefore, the later `else if (isHtml(item))` block at `lib/core/template-renderer.js:1574` cannot be reached for a stable array.

It can be deleted.

### Cleanup ordering is duplicated but meaningful

Ordinary replacement removes nodes before disposing effects at `lib/core/template-renderer.js:1144`. Keyed removal snapshots a live range, disposes effects, then removes the captured nodes at `lib/core/template-renderer.js:497`.

The different order is load-bearing for live ranges. If cleanup helpers are introduced, they should encode the two orderings explicitly rather than normalizing them behind a generic helper.

### Render-context mechanism is dead

`currentRenderComponent` is assigned only by `setRenderContext()` at `lib/core/template.js:31`; there is no read anywhere in `lib/` or `tools/`.

The many call pairs, such as `lib/core/component.js:999`, now do nothing. `setRenderContext` is not part of the public framework export surface at `lib/framework.js:336`.

The internal calls and backing variable can be removed. Retaining a temporary no-op deep export would cover undocumented direct imports if desired.

### `slotInSvg` is dead item-record state

`makeItemRecord()` stores `slotInSvg` at `lib/core/template-renderer.js:347`, but the field is never read from an item record. Reinstantiation receives the current `slotInSvg` directly at `lib/core/template-renderer.js:464`.

The record field can be removed.

### Bundler and optimizer carry forked minifiers

`tools/optimize.js:1768` explicitly says its minification implementation was ported from `bundler-esm.js`.

CSS, HTML, and VLQ logic is duplicated from `tools/bundler-esm.js:1150` into `tools/optimize.js:1772`. The large JavaScript minifiers are separate copies at `tools/bundler-esm.js:1365` and `tools/optimize.js:2118`.

Source-map assembly legitimately differs between single-file optimization and multi-file bundles. Tokenization and embedded-template handling do not require separate implementations.

### Scanner duplication extends beyond template-lint

`tools/scripts/convert-to-class.mjs:41` independently carries the same keyword/previous-character regex heuristic. It implements the heuristic separately in its structural scanner at `tools/scripts/convert-to-class.mjs:83` and code-mask scanner at `tools/scripts/convert-to-class.mjs:376`.

Neither path has template-lint's increment/decrement exception.

## Renderer Behavior Probe

With the test server running on port 9000:

```sh
cd tests/e2e
node <<'NODE'
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:9000/tests/framework/', {
    waitUntil: 'domcontentloaded'
  });

  const result = await page.evaluate(async () => {
    const T = await import('/lib/core/template.js');
    const R = await import('/lib/core/template-renderer.js');
    const mount = value => {
      const host = document.createElement('div');
      document.body.append(host);
      host.append(R.instantiateTemplate(
        value._compiled, value._values || [], {}
      ).fragment);
      return host;
    };

    const s = mount(T.html(['<button disabled="false"></button>']));
    const d = mount(T.html(['<button disabled="false">', '</button>'], 'x'));
    const r = mount(T.html(['<div>', '</div>'], T.raw('<b>R</b>')));
    const c = mount(T.html(
      ['<div>', '</div>'],
      T.contain(() => T.raw('<b>R</b>'))
    ));

    return {
      static: [
        s.querySelector('button').disabled,
        s.querySelector('button').getAttribute('disabled')
      ],
      dynamic: [
        d.querySelector('button').disabled,
        d.querySelector('button').getAttribute('disabled')
      ],
      raw: r.querySelector('div').innerHTML,
      containRaw: c.querySelector('div').innerHTML
    };
  });

  console.log(result);
  await browser.close();
})();
NODE
```

Observed results:

- `static: [false, null]`
- `dynamic: [true, ""]`
- Ordinary raw markup creates `<b>`.
- Contained raw markup is escaped.

## Payback and Risk Ranking

1. **Share slash classification and literal skipping across the template-lint walkers.** This has the highest immediate payback because an actual divergence is observable. Browser-runtime risk: none. Tooling risk: low to medium. Add the same-line `n++ / 2` fixture before changing it.

2. **Extract the common bundler/optimizer minifier core.** This removes substantial duplication and prevents fixes from landing in only one build path. Browser-runtime risk: none. Release-tool risk: medium to high because source maps, regex literals, template nesting, and ASI handling are sensitive. Keep source-map assembly in separate adapters.

3. **Cut dead scaffolding.** Remove `currentRenderComponent` and internal `setRenderContext()` calls, the unreachable ordinary-array HTML branch, and the unused record-level `slotInSvg`. Payback is modest clarity and fewer misleading contracts. Risk is low.

4. **Unify list-result construction.** Use the shared invalid-input empty result, one `fromEach` result factory, and remove the memo cache-miss key copy. Payback is moderate and locally bounded. Risk is low to medium because this is a hot list path; exercise keyed, unkeyed, memoized, and empty transitions and regenerate `dist/`.

5. **Extract one `resolveWhen()` normalizer.** Payback is moderate because it protects a single branching contract. Risk is medium: thunk evaluation must remain inside the caller's active reactive effect, and list-root emptiness must retain a keyed empty item.

6. **Share value classification between ordinary slots and containment while keeping their state machines separate.** This addresses the most consequential unlisted divergence. Payback is high, but risk is high because mounting, reuse, and wholesale array replacement differ, and applications may accidentally rely on current escaping behavior.

7. **Add only small cleanup and insertion helpers.** Payback is low to moderate. Risk is medium because fragment snapshots, live ranges, effect ownership, and remove/dispose ordering vary. Do not introduce a universal mount-record abstraction.

8. **Do not unify the compiler and renderer attribute sinks yet.** Their observed behavior must first be specified as intentional or erroneous. Potential payback is high, but compatibility risk is very high because adding a dynamic descendant currently changes literal-attribute semantics.

9. **Do not unify `isSameCompiled()` and `isSameStructure()`, or merge ordinary and containment state.** Those distinctions are load-bearing.

## What to Cut

Cut only the narrow dead or redundant pieces:

- The dead render-context mechanism.
- The unreachable ordinary-array HTML branch.
- The unused item-record `slotInSvg` field.
- The redundant `memoEach` cache-miss key/`_src` copy.

Do not cut `contain()`, `memoEach()`, keyed live ranges, or either identity notion. Their complexity is serving distinct behavior.

## Validation Notes

The following checks passed during the audit:

```text
node tools/scripts/test-template-lint.mjs
✓ template-lint fixtures pass (84 assertions, 18 files)

node tools/template-lint.js lib ui site examples
✓ No template binding issues found
```

The configured `tools/test-server.py` initially could not start because `aiohttp` was absent from the environment. Browser behavior probes used a temporary standard-library localhost server instead. The temporary files and processes were removed after the probes.
