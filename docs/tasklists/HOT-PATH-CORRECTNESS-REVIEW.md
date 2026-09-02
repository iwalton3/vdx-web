# Hot-path correctness review

Reviewed commit `91b95e1` (`core: about:blank for blocked URLs, drop dead entity decoding, C0 scheme tests`). The working tree was clean at the start of the review.

## Revision mismatch

The review context does not match the checked-out revision. `makeItemRecord()` and the previously reviewed keyed-range changes exist in descendant commit `37da760`, not in `91b95e1`. The known findings associated with those changes were excluded; everything below describes the checked-out tree.

## Findings

### 1. High: a computed that throws after previously succeeding cannot notify consumers when it heals

Location: `lib/core/reactivity.js:1051`

The dirty-value recomputation calls `getter()` outside the failure-state handling used by the computed's initial effect. If it throws, `dirty` remains true. On the next dependency change, the invalidation effect clears its dependencies but skips `else if (!dirty)`, so consumers are never triggered again.

Runnable reproduction:

```sh
node --input-type=module - <<'NODE'
import { reactive, computed, createEffect, flushEffects } from './lib/core/reactivity.js';

const state = reactive({ bad: false, n: 1 });
const value = computed(() => {
  const n = state.n;
  if (state.bad) throw new Error('transient');
  return n;
});
const seen = [];
createEffect(() => seen.push(value.get()), {
  onError: error => seen.push(error.message)
});

state.bad = true;
flushEffects();
state.bad = false;
flushEffects();

console.log(seen); // [1, "transient"]; expected [1, "transient", 1]
NODE
```

### 2. High: top-level component event closures remain bound to the first render

Locations: `lib/core/component.js:1067`, `lib/core/template-renderer.js:1606`

`component.js` passes function-valued slots through unchanged, so they never read `cacheVersion`. The renderer then resolves and installs the handler once. A closure capturing a template-local value remains stale even though the template recomputes.

The existing "Event Handler Freshness" test manually supplies a `VALUE_GETTER`; it does not exercise the component-to-renderer handoff that freezes the handler.

Runnable reproduction: run the shared Puppeteer command below and inspect `handlerSeen`, which is `[1]` rather than `[2]`.

### 3. Medium: a queued property write can execute after its binding and node were disposed

Location: `lib/core/template-renderer.js:47`

`applyPendingDOMUpdates()` commits every queued element without checking whether its effect or node survived. An attribute-only flush can queue a custom-element property update for requestAnimationFrame; a later structural flush removes the element, after which `flushSync()` invokes its setter while `isConnected === false`.

Runnable reproduction: run the shared Puppeteer command below and inspect `pendingWrites`, which contains `{ value: "b", connected: false }` even though the probe is no longer rendered.

### 4. Medium: assigning null or undefined does not clear a native input's live value

Location: `lib/core/template-renderer.js:1743`

The nullish branch removes the `value` attribute but does not reset `input.value`, `textarea.value`, or `select.value`. The DOM property silently retains the old value while the attribute reports `null`.

Runnable reproduction: run the shared Puppeteer command below and compare `inputProperty` (`"filled"`) with `inputAttribute` (`null`). The expected property value is `""`.

### 5. Medium: object-form styles retain keys omitted by the next value

Location: `lib/core/template-renderer.js:1761`

Object-form styles are applied with `Object.assign(el.style, value)`. Changing `{ color: 'red', backgroundColor: 'blue' }` to `{ color: 'green' }` leaves the blue background in place.

Runnable reproduction: run the shared Puppeteer command below and inspect `staleBackground`, which remains `"blue"` rather than becoming `""`.

### 6. Low: `contain()` reverses array results

Location: `lib/core/template-renderer.js:1183`

Every array member is inserted directly after the same placeholder. Successive insertions produce `CBA` from `['A', 'B', 'C']`. The ordinary array-slot path advances an insertion point correctly; only the `contain()` path is affected.

Runnable reproduction: run the shared Puppeteer command below and inspect `containOrder`, which is `"CBA"` rather than `"ABC"`.

## Shared Puppeteer reproduction for findings 2-6

This assumes a server is running on port 9000.

```sh
cd tests/e2e
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node --input-type=module - <<'NODE'
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:9000/__hotpath_repro__');

const result = await page.evaluate(async () => {
  const { Component, defineComponent, html, when, contain, flushSync } =
    await import('/lib/framework.js');

  class MainRepro extends Component {
    constructor(props) {
      super(props);
      this.state = {
        n: 1,
        style: { color: 'red', backgroundColor: 'blue' },
        value: 'filled'
      };
      this.seen = [];
    }

    template() {
      const captured = this.state.n;
      return html`
        <button on-click="${() => this.seen.push(captured)}">go</button>
        <div id="styled" style="${this.state.style}"></div>
        <input id="input" value="${this.state.value}">
        <div id="order">${contain(() => {
          void this.state.n;
          return ['A', 'B', 'C'];
        })}</div>
      `;
    }
  }

  defineComponent('hotpath-main-repro', MainRepro);
  const main = document.createElement('hotpath-main-repro');
  document.body.append(main);

  flushSync(() => {
    main.state.n = 2;
    main.state.style = { color: 'green' };
    main.state.value = null;
  });
  main.querySelector('button').click();

  window.__pendingWrites = [];
  customElements.define('hotpath-pending-probe', class extends HTMLElement {
    set value(value) {
      window.__pendingWrites.push({ value, connected: this.isConnected });
    }
  });

  class PendingHost extends Component {
    constructor(props) {
      super(props);
      this.state = { show: true, value: 'a' };
    }

    template() {
      return html`${when(
        this.state.show,
        html`<hotpath-pending-probe
          value="${this.state.value}">
        </hotpath-pending-probe>`,
        null
      )}`;
    }
  }

  defineComponent('hotpath-pending-host', PendingHost);
  const pending = document.createElement('hotpath-pending-host');
  document.body.append(pending);
  window.__pendingWrites = [];

  pending.state.value = 'b';
  await Promise.resolve();
  flushSync(() => { pending.state.show = false; });

  const styled = main.querySelector('#styled');
  const input = main.querySelector('#input');

  return {
    handlerSeen: main.seen,
    pendingWrites: window.__pendingWrites,
    inputProperty: input.value,
    inputAttribute: input.getAttribute('value'),
    staleBackground: styled.style.backgroundColor,
    containOrder: main.querySelector('#order').textContent
  };
});

console.log(result);
await browser.close();
NODE
```

## Most fragile invariant

Scheduling/teardown: once a binding is disposed, no already-queued DOM write may reach its former node.

It crosses the microtask effect queue, requestAnimationFrame commit queue, structural slot disposal, and `flushSync()`, but pending updates carry no ownership token. A test that queues an attribute-only update, awaits exactly one microtask, removes the branch before requestAnimationFrame, and asserts that a custom-element setter never observes `isConnected === false` would catch the current violation and future regressions.

## Verification

- Framework suite: 664/664 passed. The stated 686-test count belongs to a different revision.
- Component-library suite: 18/18 files passed.
- Template-lint fixtures: 64 assertions passed. The stated 84-assertion count belongs to a different revision.
- Template corpus lint: clean.
- No tracked files were changed during the review.
