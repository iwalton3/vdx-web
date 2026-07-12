# V1 API Plan

Working document for the pre-v1 API additions. Not shipped documentation — delete or
move before cutting the release. Evidence base: mrepo-web friction audit (2026-07-11),
which found ten hand-rolled request-ID guards, ~35 manual version-counter sites, 15
`rAF(() => win.refresh())` calls, two hand-built store facades, and 50ms polling loops
waiting for lazy-mounted children.

Guiding constraint: **these APIs get frozen at v1.** Every design below prefers the
shape we won't regret over the shape that demos best. All four are additive — nothing
existing breaks, and the old forms stay supported.

Settled decisions (2026-07-11): store seeding is `super(); this.state = {...}` for
symmetry with components; the task primitive is named `createTask` (matching the
`create*` family) and **carries status, never data** — see section 3's design
principle.

Suggested implementation order (each lands with unit tests in `tests/framework/`,
bundle regen, then a docs pass at the end):

1. `nextRender()` / `whenMounted()` — smallest, and the others' tests want it
2. `versionedList()` — self-contained
3. `createTask()` — independent; tests read nicer with nextRender available
4. `class Store` — biggest surface (touches component store wiring + docs)

---

## 1. `nextRender()` and `whenMounted()`

### API

```javascript
import { nextRender } from 'vdx/lib/framework.js';

this.state.showPanel = true;
await this.nextRender();               // DOM is updated; new branches are mounted
this.refs.panel.scrollTop = 0;

const editor = await this.whenMounted('parametric-eq-editor');
if (!editor) return;                   // null => we unmounted while waiting
editor.loadPreset(p);
```

- `nextRender(): Promise<void>` — resolves after the next effect flush **and DOM
  commit** complete. If no flush is pending, it schedules one, so
  `mutate; await nextRender()` always works. Also exported standalone (stores,
  tests). `this.nextRender()` on Component just delegates — rendering is globally
  batched, so there is no per-component variant to design (and none to regret).
- `this.whenMounted(selectorOrElement): Promise<Element|null>` — resolves when the
  matched child (queried in this component's subtree) exists, its custom element is
  defined (covers lazy `import()`d definitions), and its **first render + `mounted()`
  have completed**. Resolves `null` if the waiting component unmounts first — callers
  write `if (!el) return;`, no try/catch ceremony.

### Implementation notes

- `nextRender`: keep a resolver list in reactivity.js; `flushEffects()` drains it
  after the commit phase (`onAfterEffectFlush`) and after `isFlushing` clears.
  Schedule a flush if none pending.
- `whenMounted`: components get an internal first-render-complete promise (resolved
  at the end of the initial connect/render path). The helper loops:
  query → if absent, `await nextRender()` → if present but not upgraded,
  `await customElements.whenDefined(tag)` → await the instance's ready promise.
  Unmount of the waiter resolves `null` (hook into the existing cleanup path).

### Why this shape

The flushSync-doesn't-mount-branches gotcha stops needing documentation — the async
form doesn't have it. mrepo uses `flushSync` zero times but polls with rAF/setTimeout
in six+ places; this is the API those call sites were reaching for. `flushSync` stays
for genuinely synchronous needs (tests, scroll-position handoff inside one frame).

Won't-regret check: both promises resolve to stable, minimal types (`void`,
`Element|null`). No options object today; one can be added later without breakage.

---

## 2. `versionedList()`

### API

```javascript
import { versionedList } from 'vdx/lib/framework.js';

state = { songs: versionedList([]) };

const songs = this.state.songs;
songs.push(track);          // structural edit -> auto version bump
songs.splice(from, 1);      // ditto (all mutating array methods)
songs[3] = other;           // index/length writes trapped -> bump
songs[3].title = 'x';       // item fields NOT tracked (that's the point)
songs.touch();              // manual bump for in-place item edits
songs.replace(newArray);    // wholesale swap, single bump
songs.version;              // reactive integer, rarely read directly
```

- Reads of `length` / indices / iteration subscribe the reader to the version
  signal. Items themselves are returned raw — no per-item proxying, same perf
  contract as `untracked()`.
- Works identically inside component state and store state.

### Implementation notes

- A thin `Proxy` over a raw array: `get` for `length`/index/iterator tracks the
  version cell; mutating methods and `set`/`deleteProperty` traps bump it. Carries
  the same skip-proxy marker as `untracked()` so `reactive()` doesn't re-wrap it.
  O(1) overhead per operation on the wrapper only; items untouched.
- Windowing integration is free: `count: () => this.state.songs.length` is now a
  reactive read, and `createWindowing` already tracks `count()` in its own effect —
  the `rAF(() => this._win.refresh())` pattern (15 call sites in mrepo) just stops
  being necessary.
- `memoEach` needs no special casing: keyed rows + `trustKey` behave as today. The
  documented drag-reorder pattern becomes
  `keyFn: (item) => item.id + ':' + list.version` when every row must re-render —
  same strategy table, minus the hand-maintained counter.

### Why this shape

docs/performance.md already calls the untracked-array-plus-version-counter "the
sanctioned pattern"; mrepo pays for it at ~35 sites with three failure modes (forgot
to bump, forgot the forced `void state.version` read, forgot the windowing refresh).
This wraps the sanctioned pattern into an object that can't be half-applied.

Won't-regret check: semantics are exactly the existing documented pattern, so no new
mental model is being frozen. `touch()`/`replace()`/`version` are the whole surface.

---

## 3. `createTask()` — stale-async primitive

**Design principle (settled 2026-07-11): a task carries status, never data.** The
completed work commits to *real state* — `this.state` / a store — from inside the
task body. There is no `task.value`: a side-container for async results would be a
second home for state, which is the exact smell of saving promises into state.
`pending`/`error` stay on the task because they're per-operation metadata, not
application state.

Context worth remembering: promise-in-state is already the blessed *declarative*
pattern (`this.state.profile = this.load()` + `awaitThen`; promises are exempt from
proxying, and the promise's identity in state IS the staleness guard — a late
resolution of a replaced promise is ignored). Tasks exist for the *imperative*
replacement flows awaitThen can't express — re-fetch and overwrite, possibly across
several state fields — which is where mrepo hand-rolls its ten request-ID guards.

**What createTask is NOT (settled 2026-07-11):** it is the latest-wins primitive,
full stop. The litmus test for misuse: *if aborting the previous run would lose
data, it's not a createTask.* Overlapping `loadMore()` calls are the canonical
counter-example — latest-wins would abort page N's fetch because page N+1 was
requested, leaving a hole in the list. Append flows want a different discipline,
and the evidence says which one: mrepo's loadMore is drop-if-busy
(`if (!hasMore || isLoading) return;`) plus an explicit re-check after each load
completes (browse-page.js:546, 377-385 — "the self-perpetuating pagination chain").
That's a guard the app owns today and keeps owning at v1. The reserved evolution
path, if evidence accumulates, is an options bag — `mode: 'latest' | 'drop' |
'queue'` (the ember-concurrency taxonomy, stable for a decade) — additive, default
`'latest'`, no contract change. An awaitable `createLock()` mutex for
strict-ordering cases is a possible utils.js candidate, but no lock-shaped code was
found in mrepo (drop-if-busy covered their needs), so it ships only when something
real asks for it.

### API

```javascript
class SearchPage extends Component {
    search = this.createTask(async (signal, query) => {
        const r = await fetch('/api/search?q=' + encodeURIComponent(query), { signal });
        this.state.hits = (await r.json()).hits;   // ← reached only if still current
    });

    onInput(e, value) { this.search.run(value); }

    template() {
        return html`
            ${when(this.search.pending, () => html`<cl-spinner></cl-spinner>`)}
            ${each(this.state.hits, hit => html`...`, h => h.id)}
        `;
    }
}
```

- `this.createTask(fn)` on Component: lifetime-bound (auto-cancelled at unmount).
  Standalone `createTask(fn)` export for stores/tests (manual `.dispose()`).
  Name settled: matches `createStore`/`createWindowing`/`createRowGestures`.
- Task shape: `{ run(...args), cancel(), pending, error }` — `pending`/`error` are
  reactive, so templates track them directly. **No `value`.**
- **Semantics (the part being frozen):** last-write-wins via abort propagation.
  - `run()` aborts the previous in-flight run and starts `fn(signal, ...args)`.
  - **Why direct state commits are safe:** supersession aborts, and abort *throws*.
    `fetch(url, { signal })` (and any abort-aware await) rejects with `AbortError`
    the moment the run is superseded, so the stale body's continuation dies before
    its commit lines. No commit gating needed — the stale code never gets there.
  - For a non-abort-aware await, the platform pattern is
    `signal.throwIfAborted()` immediately after it (documented; this is the one
    discipline point, and it's a standard DOM API).
  - `AbortError` is always swallowed by the task machinery — it's the mechanism,
    not a failure. It never lands on `task.error`.
  - `await task.run(q)` **never rejects**: resolves with the body's return value
    when the run completed and is current, `undefined` when superseded/aborted/
    failed (failures of the current run also set reactive `task.error`). The return
    path exists for call sites that compose rather than commit:
    `const d = await t.run(q); if (d === undefined) return;`
  - `pending` is true while the latest run is in flight; `error` clears when a new
    run starts.

### Why this shape

This is the guard mrepo hand-rolls ten times ("ignore results from a superseded
request"), and the router ships the same logic internally (`_navToken`). The split of
labor is clean: `awaitThen` renders a promise (declarative); `createTask` runs a
latest-wins operation that commits to real state (imperative, replacement semantics
— appends are out of scope per the litmus test above). Both use identity/abort for
staleness rather than manual tokens.

Won't-regret check: only latest-wins is frozen — queue/exhaust/debounce/retry can
arrive later as options without changing the contract. One error channel. And since
tasks hold no data, there's no cache/invalidation surface to regret: state ownership
stays entirely with the app.

### The kernel underneath: the settle gate (internal at v1)

Design insight (2026-07-11): the primitive under all of this is a **commit gate** —
an object with a delivery policy, fed promises, invoking callbacks per policy:

- `latest`: feeding a new promise supersedes the previous one; a superseded
  fulfillment is discarded by **identity comparison** (the same mechanism that makes
  `awaitThen` safe — no tokens). Slot-watching sugar makes *assignment the trigger*:
  watch `() => this.state.searchP`, and `this.state.searchP = doFetch(q)` IS the run.
- `queue`: fulfillments deliver in feed order regardless of settle order. Note this
  orders *commits*, not execution — fetches still race concurrently, which beats a
  mutex for loadMore-style appends (full concurrency, no holes). It also breaks the
  slot model (a slot holds one promise; a queue has several in flight), which is why
  the gate is an object, not a state convention.

`createTask` = the gate with `latest` policy + factory + AbortController + reactive
`pending`/`error`. Implement it that way. What the bare gate lacks (and why the
bundle ships first): identity discards stale *results* but can't cancel stale
*requests* (promises don't cancel — that's the gap AbortSignal exists to fill), and
pending/error revert to manual flag discipline.

**v1 posture:** the gate stays internal. Promote it to a public API (`onFulfill` /
slot-watch / queue) post-v1 once its shape survives internal use AND queue mode's
error policy is settled (when an earlier feed rejects: skip — accepting the hole —
or halt the line? Not a decision to freeze casually).

Consciously deferred: an "async computed" / `resource(depsFn, fetcher)` that
re-fetches when reactive deps change. It's replacement-only (can't express appends),
overlaps `awaitThen`, and is buildable on the gate additively post-v1 if a real
need shows up. Not freezing a third async idiom at v1.

### Testing: the shuffle harness

Port of a proven manual technique (a userscript that collected fetch calls in a
short window and randomized their resolution order to surface out-of-order bugs):
`tests/framework/` gets a test-only promise/fetch wrapper that collects settlements
inside a configurable window and releases them in **seeded**-random order (seeded so
a failing shuffle reproduces exactly). All gate/`createTask` tests run under it,
across many seeds — a green suite then demonstrates order-independence rather than
asserting it. Cheap to build, reusable for windowing/router async tests too.

---

## 4. Class-based stores

### API

```javascript
import { Store } from 'vdx/lib/framework.js';

class CartStore extends Store {
    constructor() {
        super();
        this.state = { items: [], coupon: null };   // reactive, like components
    }

    _audio = new AudioController(this);   // ordinary field: NOT reactive. This is
                                          // the thing the old shape couldn't do.

    add(item) { this.state.items.push(item); }      // methods on the instance
    get total() {                                    // getters = cached computeds,
        return this.state.items.reduce((s, i) => s + i.price, 0);
    }                                                // same rules as components
}

export const cartStore = new CartStore();
```

Consumption — the load-bearing design decision:

```javascript
class CartBadge extends Component {
    static stores = { cart: cartStore };
    template() {
        // State fields, getters, AND methods all hang off this.stores.cart:
        return html`
            <span>${this.stores.cart.total}</span>
            <button on-click="${() => this.stores.cart.add(item)}">Add</button>
        `;
    }
}
```

- The `Store` base class **promotes state fields onto the instance** as forwarding
  accessors: `store.items` reads/writes `store.state.items` reactively. So
  `this.stores.cart.items` in a template reads exactly like today's
  `this.stores.cart.items` (which is `store.state.items`) — **existing template
  syntax is unchanged**, but methods and computed getters are now reachable from the
  same object. The `store.state.method()` gotcha is retired: methods live on the
  store, state lives on `.state`, and both spellings of field access work.
- `subscribe(fn)` (fine-grained effect wrapper), `set()`, `update()` carry over from
  `createStore` unchanged.
- Component wiring: `static stores` detects `instanceof Store` → exposes the
  instance; legacy `createStore` objects keep the current `.state` aliasing.
  Both store kinds coexist in one component.

### Implementation notes

- Reuse the component-class prototype scan (component-class.js:140) for
  getter→computed conversion; computeds get the same synchronous-invalidation
  guarantee ("never stale").
- `this.state = {...}` works via an accessor on the base: first assignment filters
  dangerous keys (same `STORE_DANGEROUS_KEYS` guard as `createStore`), wraps with
  `reactive()`, and defines the promoted accessors for its top-level keys.
  Keys added later are reactive but not promoted — reach them via `store.state.x`
  (document: declare top-level keys up front, same guidance as components).
- Collision safety: a state key that shadows an existing instance/prototype member
  (`subscribe`, a method name, a getter) throws at construction. Fail loud, at
  startup, in the store author's face — not in a template at runtime.
- Auto-bind methods (like components) so `on-click="${store.add}"` works.

### Persistence (phase 2 of this item)

`localStore()` stays. Class stores get the equivalent via
`static persist = 'cart-v1'` (localStorage key) with opt-in cross-tab sync
(`static persistSync = true`) — folding in the storage-event listener mrepo
hand-rolled. Ship after the base class proves out; it's additive.

### Why this shape

Both mrepo stores are hand-built facades over `createStore` — a plain object of ~40
delegate methods next to a non-reactive controller holding audio nodes. That is this
API, built manually. Promotion (rather than making `this.stores.name` the raw
instance with state only under `.state`) is what keeps every existing template
working while adding methods to the same namespace.

Won't-regret check: the one risk is promotion itself (collisions, "two ways to read a
field"). Mitigations: loud construction-time collision errors, and docs that teach
`store.field` for templates / `this.state.field` inside store methods — mirroring
component conventions exactly. The old `createStore` remains supported and untouched
indefinitely, same posture as the options component format.

---

## After the four land

- Docs pass: FRAMEWORK.md, docs/reactivity.md (nextRender, versionedList, tasks),
  docs/components.md (whenMounted, task), docs/performance.md (versionedList replaces
  the manual counter in the strategy table), docs/routing.md unchanged, new store
  sections in docs/reactivity.md + tutorial ch8/ch15; demote the options component
  format to a passing mention in docs (tutorial already done).
- Then the release mechanics (separate work): `export const VERSION`, banner comment
  in dist bundles, CHANGELOG.md, git tag, targeted zips (core / +router+utils / ui /
  full), landing quickstart pointed at the zips.
