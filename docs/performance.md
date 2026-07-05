# Performance Guide

Patterns for large lists, virtual scrolling, and high-frequency updates. The framework's defaults are fine for most UIs - this guide is for the hard cases: thousands of editable items, 60fps state, unbounded data. Everything here was distilled from a production music player (windowed browsing of a full library, a drag-reorderable queue of thousands of songs, a WebGL visualizer), so these are battle-tested patterns rather than theory.

## Table of Contents

- [The Performance Ladder](#the-performance-ladder)
- [Choosing a memoEach Invalidation Strategy](#choosing-a-memoeach-invalidation-strategy)
- [Windowed (Virtual) Scrolling](#windowed-virtual-scrolling)
- [High-Frequency State](#high-frequency-state)
- [Keeping Large Data Out of the Proxy System](#keeping-large-data-out-of-the-proxy-system)
- [Events at Scale](#events-at-scale)
- [How Updates Are Scheduled](#how-updates-are-scheduled)
- [Optimizer Interactions](#optimizer-interactions)

## The Performance Ladder

The framework provides a graded sequence of escape hatches. Start at the top; move down a rung only when you've measured a problem.

1. **Default deep reactivity** - correct for most components. Fine-grained rendering already means state changes update only the bindings that read them.
2. **Keyed `each()` / `memoEach()`** - when list rendering itself is the cost. Keys preserve DOM; memoization skips re-running item templates.
3. **`untracked()`** - when proxying a large array costs more than it buys. The array's contents stop being reactive; you update by replacing the array (or bumping an explicit version).
4. **`contain()`** - when one high-frequency value (playback position, progress) would otherwise re-run an expensive template.
5. **`flushSync()`** - when a batch of updates must hit the DOM in the current frame (virtual scroll window commits, measure-after-write).
6. **Non-reactive islands** - for 60fps+ render loops (WebGL, canvas, DSP visualization), skip reactivity entirely: read `store.state` directly without subscribing, and update the few DOM nodes you own with `querySelector`. The framework deliberately supports opting out - components are the boundary, and inside your own island you own the DOM.

Each rung trades convenience for control. The rungs compose: a windowed list typically uses 2 + 3 + 5 together.

## Choosing a memoEach Invalidation Strategy

`memoEach(array, mapFn, keyFn, options)` caches each rendered item by key and skips `mapFn` when the cached entry is still valid. "Valid" means: same key AND same item reference (or same key alone with `trustKey`). When rendering depends on more than the item object itself, you must tell the cache - state read inside `mapFn` is **not tracked** (the callback runs deferred). Pick the cheapest tool that matches your situation:

| Situation | Tool |
|-----------|------|
| Immutable updates - editing an item replaces it | Plain `keyFn`; nothing extra needed |
| Same logical items, fresh object references each render (slices, wrappers, refetches) | `{ trustKey: true }` |
| External state affects a FEW items (selection, now-playing highlight) | Composite key |
| External state affects ALL items (display mode, edit mode, theme) | `{ deps: [...] }` |
| In-place structural edits at scale (drag-reorder, splice) | Version counter in the key |

**Composite key** - fold the per-item flag into the key so exactly the affected rows re-render (when selection moves, only the newly-selected and newly-deselected rows recompute):

```javascript
const selectedKey = this.state.selectedKey;  // read OUTSIDE mapFn

${memoEach(visibleItems, item => {
    const isSelected = keyFn(item) === selectedKey;
    return html`<div class="${isSelected ? 'selected' : ''}">...</div>`;
}, item => {
    const key = keyFn(item);
    return key === selectedKey ? `${key}-selected` : key;
}, { trustKey: true })}
```

**`deps`** - bust every item's cache when any dep changes. Simple, but re-renders the whole window; use when the change really does affect every row:

```javascript
${memoEach(items, item => html`...`, keyFn, { deps: [this.state.displayMode] })}
```

**Version counter** - for editable windowed lists where immutable updates are too expensive (you cannot afford to copy a 5,000-item array on every drag-over event). Keep the array `untracked()`, mutate it in place, and bump an integer on every structural change; fold it into the key:

```javascript
data() {
    return {
        songs: untracked([]),   // large, mutated in place
        listVersion: 0          // bumped on reorder/insert/delete
    };
},

methods: {
    moveSong(from, to) {
        const [song] = this.state.songs.splice(from, 1);
        this.state.songs.splice(to, 0, song);
        this.state.listVersion++;   // invalidates every cached row
    }
},

// In the template:
${memoEach(visible, song => html`...`,
    (song, i) => `${song.uuid}-${i}-${this.state.listVersion}`,
    { trustKey: true })}
```

This looks like manual dependency tracking - and it is. It's the sanctioned pattern for this case, not a hack: a windowed, drag-editable list over thousands of items is exactly where automatic deep reactivity costs more than hand-managed invalidation. The version counter is one integer standing in for "the list's structure changed"; everything else stays fine-grained.

**Keep the version counter for STRUCTURAL changes only.** It is tempting to
bump it for every list-adjacent change (selection, highlight, mode) because it
always works - but each bump replaces every rendered row. Fold per-row state
into the key instead (composite key, above) so a selection toggle re-renders
one row, not the whole window. This is not just wasted work: replacing every
rendered row in a scroll container triggers **browser scroll anchoring**
adjustments (worst on Android Chrome), which can walk the scroll position up
by the entire rendered window per toggle. A real bug: a playlist page keyed
rows as `uuid-index-version` and bumped the version on selection toggles - on
Android, each checkbox tap scrolled the view up by ~55 rows (visible + buffer,
i.e. exactly the rows that were torn down).

**The mapFn tracking rule** (worth repeating): `memoEach` defers `mapFn`, so reactive state read inside the callback does NOT become a dependency of the component. Read external state into a local *before* the `memoEach` call and use the captured value inside - that read is what makes the template re-evaluate.

## Windowed (Virtual) Scrolling

For lists past ~50-100 items, render only the visible window. Use [`cl-virtual-list`](componentlib.md) when its feature set fits (fixed item height; self/parent/window scroll modes; keyboard nav; selection). When you need custom markup, gestures, or loading behavior, use **`createWindowing()`** from `lib/windowing.js` - the shared windowing math (range calculation, bottom-locking, frame-atomic commits, scroll-mode plumbing, `scrollToIndex`) with your own template. cl-virtual-list itself is built on it.

```javascript
import { createWindowing } from './lib/windowing.js';

defineComponent('song-list', {
    data() {
        // Created in data() so windowing state exists for the first render
        this._win = createWindowing(this, {
            itemHeight: 52,
            buffer: 10,
            count: () => this.state.songs.length,
            scrollContainer: 'self',    // 'self' | 'parent' | 'window' | selector
            onRange: (start, end) => this.maybeLoadMore(end)  // on-demand loading hook
        });
        return { songs: untracked([]) };
    },

    unmounted() {
        this._win.destroy();
    },

    template() {
        const win = this._win;
        return html`
            <div class="spacer" style="height: ${win.totalHeight}px;"></div>
            <div class="window" style="transform: translateY(${win.offsetY}px);">
                ${memoEach(this.state.songs.slice(win.visibleStart, win.visibleEnd),
                    song => html`<div class="row" style="height: 52px;">${song.title}</div>`,
                    song => song.uuid,
                    { trustKey: true })}
            </div>
        `;
    }
});
```

The controller's getters (`visibleStart`, `visibleEnd`, `offsetY`, `totalHeight`) are reactive - reading them in the template tracks them. Call `refresh()` after changing an `untracked()` item source (reactive sources are tracked automatically through `count()`); `scrollToIndex`/`scrollToTop`/`scrollToBottom` handle position math per scroll mode; `setScrollContainer()` re-wires the scroll mode; `attach()`/`detach()` support element reconnection (`destroy()` is full teardown).

**Scroll anchoring**: windowed rows are constantly replaced, and browser
scroll anchoring (worst on Android Chrome) compensates for replaced anchor
content by moving the scroll position. The controller defends automatically:
it sets `overflow-anchor: none` on element scroll targets AND on the measured
items container (`measureElement`, defaulting to the host) - the latter
excludes the whole row subtree from anchor candidacy even when the real
scroller is unknown to it. One case still deserves app attention: with
`scrollContainer: 'window'`, if an intermediate `overflow: auto` ancestor is
the actual scroller, put `overflow-anchor: none` on that scroller too so
non-row content changes near the list can't anchor-shift it.

**What the controller does for you** (and the rules to follow if you ever hand-roll):

- **rAF-throttled scroll handling** - at most one range update per frame.
- **`flushSync` range commits** - the scroll handler runs inside an animation frame. State writes flush on a microtask (before paint), but *attribute-only* DOM updates batch to the NEXT animation frame - so without `flushSync`, the `translateY` can land a frame behind the row contents, which reads as tearing/jitter during fast scroll. `flushSync` guarantees position and contents commit together in the current frame.
- **Bottom-locking** - clamps the window start so the rendered range never extends past the list end (prevents blank space and scroll-height jumps at the bottom).
- **Passive scroll listeners** and ResizeObserver-driven re-measurement.

Two rules stay on your side:

- **`trustKey: true`** - `.slice()` produces fresh wrapper positions each render; trust the key so unchanged rows keep their DOM.
- **Inline the `slice()` in the `memoEach` call** - do not hoist it to a local variable if you use the build-time optimizer (see [Optimizer Interactions](#optimizer-interactions)).

**Sparse arrays and on-demand loading.** For unbounded lists (a whole music library), don't fetch everything: allocate a sparse array of the known total length, fetch chunks as the window approaches them, and render placeholders for missing rows:

```javascript
// The controller's onRange hook triggers loading as the window approaches the frontier:
onRange: (start, end) => {
    if (end >= this._loadedCount - 50) {
        this.loadMoreItems();   // cursor-paginated fetch filling the sparse array
    }
}

// In mapFn - item may not have arrived yet:
item => item ? html`<div>${item.title}</div>` : html`<div class="placeholder">Loading…</div>`
```

Guard async fills against staleness: capture a request id (or route epoch) before the fetch and discard the response if it no longer matches - a slow chunk from the previous album must not clobber a new sparse array.

## High-Frequency State

Values that change many times per second (audio position, progress, animation state) must never be read in an expensive template's main body - every change re-runs `template()`. Quarantine them with `contain()`:

```javascript
template() {
    // currentTime is accessed ONLY inside contain() blocks below -
    // never in this outer template body
    return html`
        ${memoEach(this.state.queue, song => html`...`, s => s.uuid)}

        ${contain(() => {
            const t = this.stores.player.currentTime;   // read INSIDE the boundary
            return html`<div class="time">${formatTime(t)}</div>`;
        })}
    `;
}
```

Each `contain()` block re-renders independently; the queue above never re-renders on a time tick. Give the seek bar and the time display their own separate boundaries so they update independently too.

**Beyond ~10-20 updates/sec, leave reactivity entirely.** A WebGL visualizer or canvas render loop should not flow through the framework at all:

- Do NOT `subscribe()` to the store - subscriptions re-run on changes and will interrupt your animation loop.
- Read `store.state.whatever` directly inside your `requestAnimationFrame` loop - plain non-reactive reads (outside any effect) cost a proxy `get` and nothing more.
- Update the few DOM nodes you own imperatively (`this.refs.fps.textContent = ...`). This is safe for nodes whose content the template never binds.

This is a supported mode, not a workaround. The component boundary is the contract: inside your island, you own the DOM.

## Keeping Large Data Out of the Proxy System

- **`untracked(bigArray)`** - contents are not proxied or tracked; only replacing the whole value (or an explicit version counter) signals change. Use for arrays of hundreds+ items where per-item reactivity buys nothing. Assignments to a key that started untracked stay untracked automatically.
- **Proxy identity is stable** - repeated reads like `state.items[0] === state.items[0]` return the same cached proxy (and `memo()`/`memoEach` rely on this for reference checks). If you're on an older vendored build and see identity-based caches missing, update the bundle before adding wrapper-object workarounds.
- **Strip proxies before structured clone** - IndexedDB, `postMessage`, and Web Workers can't serialize proxies. `JSON.parse(JSON.stringify(data))` is the blunt reliable tool for snapshots.
- **O(1) list tracking** - iterating a reactive array tracks its `length`, not each index, so rendering 5,000 items creates one dependency. `trackMutations(obj)` gives an O(1) "anything in here changed" dependency when you need coarse invalidation without walking properties.

## Events at Scale

- **Listeners attach once and stay attached.** Handlers that come from template slots resolve the *current* closure at dispatch time, so re-renders neither rebind listeners nor capture stale state. Inline arrows per row (`on-click="${() => this.play(song)}"`) are fine within a window.
- **Prefer string method names when no per-item closure is needed** (`on-dragend="handleDragEnd"`) - one bound method instead of a fresh closure per row per render.
- **Windowing is the listener budget.** Fifty visible rows with ten handlers each is trivial; the same list unwindowed at 5,000 rows is 50,000 listeners and, worse, 5,000 row instantiations. Window first - event costs follow.
- **Touch handlers on scrollable lists**: listeners are currently registered non-passive, meaning the browser waits for your `touchstart`/`touchmove` handler before it scrolls. Keep those handlers trivial (read coordinates, set a flag) and defer real work; gate native drag-and-drop off for touch devices to avoid gesture conflicts.
- **`on-click-outside`** attaches one capture-phase document listener per element and cleans up on unmount - use freely for menus/popovers; don't hand-roll document listeners.

## How Updates Are Scheduled

Understanding the pipeline explains when you need `flushSync`:

1. **State write** → dependent effects are queued; computed invalidation runs immediately (computed reads are never stale).
2. **Microtask** → all queued effects run once, batched (multiple writes in one handler = one flush). This uses a microtask, not rAF, so **effects keep running in background tabs** - which is why audio state keeps flowing when the tab is hidden.
3. **DOM commit** → if the flush created new elements, attribute/text updates apply immediately (keeps new rows and their positions in sync). If it was attribute/text-only, updates batch to the **next animation frame**.
4. **`flushSync(fn)`** → runs `fn`, then forces steps 2-3 synchronously. Use inside rAF-driven code (scroll handlers) and before reading layout (measure after write).

## Optimizer Interactions

The build-time optimizer (`optimize.js`) wraps template expressions in `contain()` boundaries. Two rules keep windowed lists safe under optimization:

- **Keep windowing expressions inline.** Write `memoEach(this.state.items.slice(this.state.visibleStart, this.state.visibleEnd), ...)` directly in the template expression. Hoisting the slice into a local `const` outside the expression can become a dead capture after optimization - the boundary re-renders but re-reads the stale local.
- **Run the linter** (`node optimize.js -i ./src -l`) - it catches the captured-variable class of bugs before they ship. See [optimization.md](optimization.md).

## See Also

- [reactivity.md](reactivity.md) - reactive state, computed, untracked
- [templates.md](templates.md) - memoEach, contain, when/each
- [componentlib.md](componentlib.md) - cl-virtual-list
- [optimization.md](optimization.md) - build-time optimizer and linting
