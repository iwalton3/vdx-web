# Reactive State Management

Complete guide to the reactivity system, stores, and computed properties.

## Table of Contents

- [Reactive State](#reactive-state)
  - [Automatic Render Batching](#automatic-render-batching)
  - [nextRender() - Waiting for the DOM](#nextrender---waiting-for-the-dom)
  - [flushSync() - Synchronous Rendering](#flushsync---synchronous-rendering)
  - [flushRenders() - For Testing](#flushrenders---for-testing)
- [Effect System](#effect-system)
  - [createEffect with Cleanup](#createeffect-with-cleanup)
  - [Effect Ownership](#effect-ownership)
  - [createRoot for Scopes](#createroot-for-scopes)
  - [Error Handling](#error-handling)
- [Critical Gotchas](#critical-gotchas)
  - [Large Arrays - untracked()](#untracked---skip-reactive-proxying)
  - [versionedList() - Reactive Structure, Raw Items](#versionedlist---reactive-structure-raw-items)
- [Stores](#stores)
  - [Class Stores (Store)](#class-stores-store)
  - [createStore() - Factory Stores](#createstore---factory-stores)
- [Computed Properties](#computed-properties)
- [Memo](#memo)
- [Memoize (Argument-Based)](#memoize-argument-based)
- [Watch](#watch)
- [Dark Theme](#dark-theme)
- [Notifications](#notifications)

## Reactive State

State changes automatically trigger re-renders through Vue 3-style proxy-based reactivity:

```javascript
state = {
    count: 0
};

increment() {
    this.state.count++; // Auto re-renders
}
```

### How Reactivity Works

1. **Proxy-based** - State wrapped in reactive proxies
2. **Automatic tracking** - Dependencies tracked during render
3. **Efficient updates** - Only changed components re-render
4. **Deep reactivity** - Nested objects are automatically reactive
5. **Automatic batching** - Multiple state changes in the same function are batched into a single render

```javascript
state = {
    user: {
        name: 'Alice',
        settings: {
            theme: 'dark'
        }
    }
};

updateTheme() {
    // Deep reactivity - this triggers re-render
    this.state.user.settings.theme = 'light';
}
```

### Automatic Render Batching

Multiple state changes within the same synchronous execution are automatically batched into a single render:

```javascript
updateMultiple() {
    // All these changes result in ONE render, not three
    this.state.a = 1;
    this.state.b = 2;
    this.state.c = 3;
    // Render happens after this function completes (via queueMicrotask)
}
```

This batching happens automatically via `queueMicrotask`, so renders are deferred until the current synchronous code completes. This is similar to React 18's automatic batching.

### nextRender() - Waiting for the DOM

When you need to touch the DOM your state change just produced - focus an element that was just made visible, scroll to a row that was just added, measure something after an update - the default tool is `await nextRender()`. It resolves after the effect flush AND the DOM commit, **including newly mounted conditional branches**:

```javascript
import { defineComponent, Component, html, when, nextRender } from './lib/framework.js';

class MyComponent extends Component {
    state = {
        showInput: false
    };

    async showAndFocus() {
        this.state.showInput = true;
        await nextRender();               // DOM committed, new branches mounted
        this.querySelector('input').focus();
    }

    template() {
        return html`
            <button on-click="showAndFocus">Show Input</button>
            ${when(this.state.showInput, html`
                <input type="text">
            `)}
        `;
    }
}

defineComponent('my-component', MyComponent);
```

**Key points:**
- If no flush is pending, one is scheduled - `mutate; await nextRender()` always works.
- Newly mounted conditional branches are present when the promise resolves. This is what `flushSync()` can NOT give you (see below).
- Also available as `this.nextRender()` on components. It delegates to the global function - rendering is globally batched, so there is no per-component variant.
- Prefer `this.querySelector(...)` over `this.refs` for nodes in a freshly shown branch (see [Refs in components.md](components.md#refs-dom-references)).
- To wait for a **child component** (including one whose definition lazy-loads), use `this.whenMounted('child-tag')` instead - see [components.md](components.md#waiting-for-the-dom-nextrender--whenmounted).

### flushSync() - Synchronous Rendering

`flushSync()` forces the pending render to commit before it returns. Use it for genuinely **synchronous** needs - code that cannot yield to the event loop, such as rAF-driven scroll handlers that must commit position and contents in the same frame, or measure-after-write sequences. For ordinary "update then touch the DOM" flows, prefer `await nextRender()`.

```javascript
import { defineComponent, Component, html, flushSync } from './lib/framework.js';

class MyList extends Component {
    state = { items: [] };

    addItemAndScroll(newItem) {
        flushSync(() => {
            this.state.items.push(newItem);
        });
        // Scroll to bottom after item is rendered
        this.refs.container.scrollTop = this.refs.container.scrollHeight;
    }
}

defineComponent('my-list', MyList);
```

**⚠️ flushSync does NOT mount new conditional branches.** A node shown by `when()` this tick is re-instantiated on a microtask after the flush - even right after `flushSync(() => this.state.editing = true)`, the branch's nodes (and their refs) can still be missing. Use `await nextRender()` whenever the state change reveals new template branches.

**Use `flushSync()` sparingly** - it bypasses batching and forces immediate rendering, which can hurt performance if overused.

### flushRenders() - For Testing

In tests, you may need to verify DOM state immediately after state changes. Use `flushRenders()`:

```javascript
import { flushRenders } from './lib/framework.js';

// In a test:
component.state.count = 5;
flushRenders();  // Force pending renders to complete
expect(component.textContent).toBe('5');
```

In normal application code, you don't need `flushRenders()` - use `await nextRender()` (or `flushSync()` for genuinely synchronous needs) instead.

## Effect System

The framework uses a fine-grained effect system for reactive updates. Effects track dependencies and re-run when those dependencies change.

### createEffect with Cleanup

Effects can return a cleanup function that runs before the effect re-runs or when it's disposed:

```javascript
import { createEffect, reactive } from './lib/framework.js';

const state = reactive({ count: 0 });

const { dispose } = createEffect(() => {
    // Setup
    const timer = setInterval(() => console.log(state.count), 1000);

    // Return cleanup function (optional)
    return () => {
        clearInterval(timer);
        console.log('Cleaned up!');
    };
});

state.count = 5;  // Cleanup runs, then effect runs again with new interval

dispose();  // Final cleanup runs, effect stops tracking
```

**When to use cleanup:**
- Clearing timers and intervals
- Removing event listeners
- Canceling network requests
- Cleaning up subscriptions

**In components**, cleanup in `unmounted()` is still recommended for most cases. Effect cleanup is useful for effects that need to reset when their dependencies change.

### Effect Ownership

Effects form a parent-child tree. When a parent effect is disposed, all its children are automatically disposed:

```javascript
const { dispose: disposeParent } = createEffect(() => {
    console.log('Parent running');

    // Child effect - automatically becomes a child of the parent
    createEffect(() => {
        console.log('Child running');
    });
});

// Disposing parent also disposes child
disposeParent();  // Both effects are cleaned up
```

**This is automatic** - effects created while another effect is running become children of that effect. Component effects use this to ensure all template effects are cleaned up when the component unmounts.

### createRoot for Scopes

Use `createRoot()` to create an isolated scope for effects. All effects created inside the callback become children of the root and are disposed together:

```javascript
import { createRoot, createEffect, reactive } from './lib/framework.js';

const state = reactive({ count: 0 });

// Create a scope for multiple effects
const disposeAll = createRoot(() => {
    createEffect(() => {
        console.log('Effect 1:', state.count);
    });

    createEffect(() => {
        console.log('Effect 2:', state.count * 2);
    });
});

state.count = 5;  // Both effects run

// Dispose all effects in the scope at once
disposeAll();
```

**Use cases:**
- Grouping related effects for batch disposal
- Creating isolated effect scopes in modules
- Testing - easily clean up all effects after each test

### Error Handling

Effects catch errors and report them without breaking other effects. You can set a global error handler:

```javascript
import { setEffectErrorHandler, createEffect, reactive } from './lib/framework.js';

// Set global error handler
setEffectErrorHandler((error, context) => {
    console.error(`Effect ${context} failed:`, error);
    // context is 'effect' or 'cleanup'
    errorReportingService.report(error);
});

const state = reactive({ value: 0 });

// This effect will error but won't break other effects
createEffect(() => {
    if (state.value > 0) {
        throw new Error('Something went wrong');
    }
});

// This effect continues to work normally
createEffect(() => {
    console.log('Value:', state.value);
});

state.value = 1;
// Error is logged, but second effect still runs
```

**Per-effect error handling:**

```javascript
createEffect(() => {
    // Effect code that might throw
    riskyOperation();
}, {
    onError: (error, context) => {
        // Handle error for just this effect
        console.warn('Expected error:', error);
    }
});
```

**Note:** Errors are caught and reported, but the effect continues tracking dependencies. This prevents one broken effect from cascading failures to unrelated effects.

## Critical Gotchas

### Array .sort() and .reverse() are Atomic

**Good news:** `.sort()` and `.reverse()` on reactive arrays are automatically made atomic and safe!

```javascript
// ✅ Both work correctly now
this.state.items.sort((a, b) => a.time - b.time);  // Atomic - one update
this.state.items.reverse();  // Atomic - one update

// ✅ Also still works (creates a copy)
const sorted = [...this.state.items].sort((a, b) => a.time - b.time);
```

The framework automatically copies, sorts, and commits back in a single operation to prevent infinite loops.

**Safe methods** (return new arrays):
- `.filter()`, `.map()`, `.slice()`, `.concat()` - Always safe, create new arrays

**Mutating methods** (trigger updates):
- `.sort()`, `.reverse()` - Safe, made atomic automatically
- `.push()`, `.pop()`, `.shift()`, `.unshift()`, `.splice()` - OK in event handlers

### Reactive Sets and Maps

**Sets and Maps are automatically reactive!** When you use a Set or Map in reactive state, the framework automatically wraps them to trigger updates on mutations:

```javascript
import { defineComponent, Component, html } from './lib/framework.js';

class MyComponent extends Component {
    state = {
        selectedIds: new Set(),      // ✅ Auto-wrapped as reactive!
        userScores: new Map()        // ✅ Auto-wrapped as reactive!
    };

    toggleSelection(id) {
        // ✅ Automatically triggers re-render!
        if (this.state.selectedIds.has(id)) {
            this.state.selectedIds.delete(id);
        } else {
            this.state.selectedIds.add(id);
        }
    }

    updateScore(userId, score) {
        // ✅ Automatically triggers re-render!
        this.state.userScores.set(userId, score);
    }

    template() {
        return html`
            <p>Selected: ${this.state.selectedIds.size}</p>
            <p>Alice's score: ${this.state.userScores.get('alice') || 0}</p>
        `;
    }
}

defineComponent('my-component', MyComponent);
```

**Supported operations (all trigger re-renders):**
- Set: `add`, `delete`, `has`, `clear`, `size`, `forEach`, `keys()`, `values()`, `entries()`, `for...of`, `[...set]`
- Map: `set`, `get`, `delete`, `has`, `clear`, `size`, `forEach`, `keys()`, `values()`, `entries()`, `for...of`, `[...map]`

**Batch operations (single trigger for multiple items):**

Use these when adding/removing multiple items to avoid triggering multiple re-renders:

```javascript
// ✅ Set batch operations - triggers once, not N times
this.state.selectedIds.addAll([1, 2, 3, 4, 5]);
this.state.selectedIds.deleteAll([2, 3]);

// ✅ Map batch operations - triggers once, not N times
this.state.userScores.setAll([['alice', 100], ['bob', 85], ['carol', 92]]);
this.state.userScores.deleteAll(['alice', 'bob']);
```

**API:**
- `set.addAll(iterable)` - Add multiple values, returns the set
- `set.deleteAll(iterable)` - Delete multiple values, returns count deleted
- `map.setAll(entries)` - Set multiple key-value pairs, returns the map
- `map.deleteAll(keys)` - Delete multiple keys, returns count deleted

**Opt-out with `untracked()`:**

If you have a large Set/Map that doesn't need reactivity, wrap it with `untracked()`:

```javascript
import { defineComponent, Component, html, untracked } from './lib/framework.js';

class MyComponent extends Component {
    state = {
        // Large Set - not reactive, must reassign to trigger updates
        cachedIds: untracked(new Set()),
    };

    updateCache(newIds) {
        // Must reassign to trigger re-render
        this.state.cachedIds = untracked(new Set(newIds));
    }
}

defineComponent('my-component', MyComponent);
```

**Advanced: Manual wrapping with `reactiveSet()` / `reactiveMap()`:**

These explicit functions are available for advanced use cases (e.g., creating reactive collections outside of component state):

```javascript
import { reactiveSet, reactiveMap, createEffect } from './lib/framework.js';

// Create reactive collections outside components
const globalSelectedIds = reactiveSet([1, 2, 3]);
const globalScores = reactiveMap([['alice', 100]]);

// Effects will track and re-run on changes
createEffect(() => {
    console.log('Selected count:', globalSelectedIds.size);
});

globalSelectedIds.add(4);  // Effect re-runs
```

### Safe Array Mutations

**OK in event handlers** (not during render):
```javascript
addItem(item) {
    // ✅ OK - Mutation in event handler
    this.state.items.push(item);
}

removeItem(index) {
    // ✅ OK - Mutation in event handler
    this.state.items.splice(index, 1);
}
```

**NOT OK in template getters:**
```javascript
// ❌ WRONG - Called during render, causes infinite loop
getSortedItems() {
    return this.state.items.sort((a, b) => a.time - b.time);
}

// ✅ CORRECT - Create copy first
getSortedItems() {
    return [...this.state.items].sort((a, b) => a.time - b.time);
}
```

### Array Iteration is O(1)

Array index access is optimized to track `length` instead of individual indices. This means iterating over large arrays during rendering is efficient:

```javascript
// Iterating 2000 items creates 1 dependency (on 'length'), not 2000
each(this.state.items, item => html`<div>${item.name}</div>`)
```

You no longer need `untracked()` just for array iteration performance.

### untracked() - Skip Reactive Proxying

Use `untracked()` when you want to **completely skip reactive proxying** for an object:

```javascript
import { defineComponent, Component, html, untracked } from './lib/framework.js';

class PlaylistView extends Component {
    state = {
        // Skip proxying: 2000 items × 50 properties = expensive
        songs: untracked([]),

        // Normal reactivity for simple values
        currentIndex: 0
    };

    loadSongs(newSongs) {
        // Reassign to trigger update (items aren't individually reactive)
        this.state.songs = newSongs;
    }
}

defineComponent('playlist-view', PlaylistView);
```

**When to use `untracked()`:**
- Large arrays where items have many properties you never read individually
- Third-party objects with custom getters/proxies (avoid double-proxying)
- Immutable API responses where you replace the whole object on change

**When NOT to use:**
- Normal arrays - iteration is already O(1)
- Objects where you need `item.property = value` to trigger updates
- Form data with two-way binding on nested properties

**How it works:**
1. Mark a key with `untracked()` in your initial state
2. Future assignments to that key are auto-untracked
3. Items aren't wrapped in reactive proxies
4. Must reassign the whole array/object to trigger updates

> **Frozen objects:** auto-untracking works by defining a hidden marker property on the assigned value, which throws for `Object.freeze()`d objects. If you assign frozen data to an untracked key, call `untracked(obj)` on it *before* freezing (already-marked objects are skipped).

### versionedList() - Reactive Structure, Raw Items

For large arrays you mutate **in place**, `versionedList()` is the preferred middle ground between full reactivity and `untracked()`. It wraps a raw array in a thin proxy: structural edits (mutating methods like `push`/`splice`/`sort`, index or length writes, `delete`) bump a single reactive version, and reads of `length`, numeric indices, and iteration subscribe to it. Items are returned **raw** - item fields are not proxied or tracked, which is the same performance contract as `untracked()`:

```javascript
import { defineComponent, Component, html, versionedList } from './lib/framework.js';

class PlaylistView extends Component {
    state = {
        songs: versionedList([]),   // structure reactive, items raw
        currentIndex: 0
    };

    addSong(track) {
        this.state.songs.push(track);        // structural edit -> auto version bump
    }

    moveSong(from, to) {
        const [song] = this.state.songs.splice(from, 1);
        this.state.songs.splice(to, 0, song);  // re-renders, no manual counter
    }

    renameSong(i, title) {
        this.state.songs[i].title = title;   // item fields NOT tracked...
        this.state.songs.touch();            // ...bump manually
    }

    loadSongs(newSongs) {
        this.state.songs.replace(newSongs);  // wholesale swap, single bump
    }
}

defineComponent('playlist-view', PlaylistView);
```

**Wrapper API** (everything else behaves like the array):
- `.touch()` - manual version bump, for in-place item-field edits
- `.replace(arr)` - replace all contents in one operation with a single bump (safe at 100k+ items, where spreading `push(...arr)` would overflow the call stack)
- `.version` - the reactive version integer; rarely read directly (its main use is `memoEach` keys like `item.id + ':' + list.version` - see [performance.md](performance.md#choosing-a-memoeach-invalidation-strategy))

This packages the older hand-rolled "untracked array + manual version counter" pattern into an object that can't be half-applied - no forgotten bump, no forced version read, no forgotten windowing refresh. Windowing integration is automatic: `count: () => this.state.songs.length` is now a reactive read, so `createWindowing` picks up structural changes with no manual `refresh()` call.

**Choosing between the two escape hatches:**
- `untracked()` - data you update by **replacing the whole value** (immutable API responses, snapshots)
- `versionedList()` - large lists you **mutate in place** (push, splice, drag-reorder)

### memoEach() for Cached Rendering

For large lists, use `memoEach()` to cache rendered items:

```javascript
import { defineComponent, Component, html, memoEach } from './lib/framework.js';

class SongList extends Component {
    state = {
        songs: [],  // Normal reactive array is fine now
        visibleStart: 0,
        visibleEnd: 50
    };

    template() {
        const visible = this.state.songs.slice(
            this.state.visibleStart,
            this.state.visibleEnd
        );

        return html`
            ${memoEach(visible, song => html`
                <div class="song">${song.title}</div>
            `, song => song.uuid)}
        `;
    }
}

defineComponent('song-list', SongList);
```

`memoEach()` caches rendered templates so unchanged items don't re-render. Combined with O(1) array tracking, large lists are efficient by default.

### withoutTracking() - Read Without Creating Dependencies

Use `withoutTracking()` to read reactive state without creating a dependency. The effect won't re-run when those values change.

```javascript
import { defineComponent, Component, withoutTracking } from './lib/framework.js';

class MyComponent extends Component {
    state = { count: 0, name: '' };

    mounted() {
        // Read initial value without tracking - effect won't re-run when count changes
        const initialCount = withoutTracking(() => this.state.count);
        console.log('Initial count:', initialCount);
    }

    logState() {
        // Log without creating dependencies
        withoutTracking(() => {
            console.log('Current state:', this.state.count, this.state.name);
        });
    }
}

defineComponent('my-component', MyComponent);
```

**When to use `withoutTracking()`:**
- Reading initial values in `mounted()` without subscribing to changes
- Logging/debugging without affecting reactivity
- Accessing state in event handlers where you don't want to create effect dependencies

### untracked() vs withoutTracking() - Key Differences

| | `untracked(obj)` | `withoutTracking(fn)` |
|---|---|---|
| **What it does** | Marks object to prevent deep proxying | Temporarily disables dependency tracking |
| **Scope** | Permanent (object-level) | Temporary (during fn execution) |
| **Use case** | Large arrays/objects | Reading without subscribing |
| **Affects** | How the object is stored | How reads are tracked |

```javascript
// untracked() - object won't be deeply proxied
state = {
    songs: untracked([])  // Array items won't become reactive proxies
};

// withoutTracking() - reads won't create dependencies
mounted() {
    const value = withoutTracking(() => this.state.count);  // No dependency on count
}
```

## Stores

Stores hold reactive state shared across components, with pub/sub and optional localStorage persistence. There are two authoring forms: **class stores** (extend `Store` - the primary form for new code) and the older **`createStore()` factory**. Both wire into components via `static stores` and coexist in the same app.

### Class Stores (Store)

Author stores as classes: methods on the instance, reactive data in `this.state`, ordinary fields for non-reactive internals (audio nodes, sockets):

```javascript
import { Store } from './lib/framework.js';

class UserStore extends Store {
    constructor() {
        super();
        this.state = { name: '', capabilities: [] };   // reactive, like a component
    }

    _client = new ApiClient();   // plain field: NOT reactive

    async logout() {
        await this._client.logout();
        this.state.name = '';
    }

    get isAdmin() {              // getter -> cached computed
        return this.state.capabilities.includes('admin');
    }
}

export const userStore = new UserStore();
```

**State promotion.** The first `this.state = {...}` assignment wraps the object reactively and promotes each top-level key onto the instance as a forwarding accessor (`userStore.name` reads/writes `userStore.state.name`). Existing template syntax is unchanged - and state fields, computed getters, AND methods now all hang off the same object:

```javascript
class MyComponent extends Component {
    static stores = { user: userStore };

    template() {
        return html`
            <p>${this.stores.user.name}</p>
            ${when(this.stores.user.isAdmin, () => html`<admin-tools></admin-tools>`)}
            <button on-click="${() => this.stores.user.logout()}">Log out</button>
        `;
    }
}
```

**Rules:**

- **Assign `this.state` in the constructor - never as a class field.** A `state = {...}` CLASS FIELD uses `[[Define]]` semantics, silently shadowing the reactive setter and skipping the reactive wrapping entirely. The framework detects this and **throws at first use**:

  ```javascript
  // ❌ THROWS at first use - class field bypasses the reactive setter
  class BadStore extends Store {
      state = { count: 0 };
  }

  // ✅ CORRECT - assign in the constructor
  class GoodStore extends Store {
      constructor() {
          super();
          this.state = { count: 0 };
      }
  }
  ```

- **Declare top-level keys up front.** Keys added later are reactive but not promoted onto the instance - reach them via `store.state.x`. (Same discipline as component state.)
- **Collisions throw at construction.** A state key that would shadow an existing member - a method, a getter, or a reserved name (`state`, `subscribe`, `set`, `update`, `dispose`) - throws immediately, loud and early. Rename the state field or the member.
- **Getters are cached computeds** - lazy, invalidated synchronously on dependency writes, never stale. A getter that tracks no reactive dependency at all is re-evaluated on every read instead of cached. A setter paired with a getter is ignored with a warning - computed store getters are read-only.
- **Methods are auto-bound** to the instance, so `on-click="${store.add}"` works detached.
- Subsequent `this.state = {...}` assignments merge into the existing reactive state (like `set()`), keeping the promoted accessors valid.

Class stores keep the full store API: `subscribe(fn)` returns an unsubscribe function (fine-grained - the callback re-runs only when state it actually reads changes), plus `set(newState)`, `update(fn)`, and `dispose()` (disposes the computed getters; rarely needed since stores are usually singletons).

### createStore() - Factory Stores

The older factory form. It still works unchanged and coexists with class stores; the key practical difference is that its methods are defined in the initial state object, so they live on `.state`:

```javascript
import { createStore } from './lib/framework.js';

const counterStore = createStore({
    count: 0
});
```

### Using Factory Stores in Components

For factory stores, always call methods on `store.state`, not the original object (class store methods live on the instance instead):

```javascript
import login from './auth/auth.js';

class MyComponent extends Component {
    state = {
        user: null
    };

    // ✅ CORRECT
    async mounted() {
        // Subscribe to store updates
        this.unsubscribe = login.subscribe(state => {
            this.state.user = state.user;
        });
    }

    async logoff() {
        // Call methods on .state!
        await login.state.logoff();
    }

    unmounted() {
        // Always cleanup subscriptions
        if (this.unsubscribe) this.unsubscribe();
    }
}

export default defineComponent('my-component', MyComponent);
```

### Store Methods

**subscribe(callback)** - Listen to state changes. The callback also runs once immediately when you subscribe. Factory stores pass the state; class stores pass the store instance (equivalent reads in practice, since state keys are promoted onto it):
```javascript
const unsubscribe = myStore.subscribe(state => {
    console.log('State:', state);  // Runs now, then on every change
});

// Later: cleanup
unsubscribe();
```

**set(newState)** - Merge new values into state (keys not in `newState` are kept):
```javascript
myStore.set({ count: 10 });
```

**update(fn)** - Update state via function:
```javascript
myStore.update(state => ({
    ...state,
    count: state.count + 1
}));
```

### localStorage Persistence

```javascript
import { localStore } from './lib/utils.js';

// Create persistent store (automatically syncs to localStorage)
const userPrefs = localStore('user-prefs', { theme: 'light' });

// Subscribe to changes
userPrefs.subscribe(state => {
    console.log('Preferences updated:', state);
});

// Update store (automatically persists)
userPrefs.state.theme = 'dark';
```

**Note:** `localStore()` creates a reactive store that automatically:
- Loads initial state from localStorage
- Saves changes to localStorage on every update
- Handles errors gracefully

## Computed Properties

The framework provides `computed()` for creating reactive computed values that automatically track dependencies:

```javascript
import { computed, reactive } from './lib/framework.js';

const state = reactive({ a: 1, b: 2 });

// Create a computed value - dependencies are auto-tracked
const sum = computed(() => state.a + state.b);

console.log(sum.get()); // 3

state.a = 5;
console.log(sum.get()); // 7 (automatically recomputed)

// Clean up when done
sum.dispose();
```

**Key features:**
- **Automatic dependency tracking** - No need to list dependencies manually
- **Lazy evaluation** - Only recomputes when `get()` is called and dependencies have changed
- **Always consistent** - Invalidation happens synchronously on dependency writes, so reading a computed immediately after a mutation is never stale (safe for "mutate then emit event with derived value" patterns)
- **Cleanup** - Call `dispose()` when no longer needed to stop tracking

### Using Computed Values in Components

The easiest way is a `get` accessor - lifecycle (creation, disposal) is handled automatically and values are exposed as plain instance properties:

```javascript
import { defineComponent, Component, html } from './lib/framework.js';

class CounterSum extends Component {
    state = { a: 1, b: 2 };

    get sum() { return this.state.a + this.state.b; }

    template() {
        return html`
            <div>
                <input type="number" x-model="a">
                <input type="number" x-model="b">
                <p>Sum: ${this.sum}</p>
            </div>
        `;
    }
}

defineComponent('counter-sum', CounterSum);
```

Computed properties are lazy and cached (the getter only re-runs when a dependency changed and the value is read again), invalidate on state, store, and prop changes, and are disposed on unmount. (In the legacy options format, the equivalent is the `computed: { sum() {...} }` option, which requires plain functions rather than `get` accessors.)

You can also use the standalone `computed()` manually when you need explicit control:

```javascript
import { defineComponent, Component, html, computed } from './lib/framework.js';

class CounterSumManual extends Component {
    state = { a: 1, b: 2 };

    template() {
        // Note: mounted() runs after the first render, so guard the access
        return html`<p>Sum: ${this._sum?.get() ?? 0}</p>`;
    }

    mounted() {
        this._sum = computed(() => this.state.a + this.state.b);
    }

    unmounted() {
        if (this._sum) this._sum.dispose();
    }
}

defineComponent('counter-sum-manual', CounterSumManual);
```

## Memo

The `memo()` function memoizes a function result based on explicit dependencies. Pass a **function returning the dependency array** - it is re-evaluated on every call, so current state is compared each time:

```javascript
import { memo } from './lib/framework.js';

// Memoize based on explicit dependencies
const expensiveRender = memo(() => {
    console.log('Computing...');
    return someExpensiveOperation();
}, () => [this.state.items, this.state.filter]);

expensiveRender(); // Logs "Computing..."
expensiveRender(); // No log - uses cached result
// After this.state.items is reassigned:
expensiveRender(); // Logs "Computing..." - dependency changed
```

**Use case:** When you need explicit control over what triggers recomputation.

> **Note:** Passing a plain array (`memo(fn, [dep1, dep2])`) snapshots the values once at creation and never sees later changes. Use the function form for anything reactive.

## Memoize (Argument-Based)

For memoization based on function arguments (not reactive dependencies), use `memoize()` from utils:

```javascript
import { memoize } from './lib/utils.js';

class ProductList extends Component {
    state = {
        items: [...], // 1000 items
        searchQuery: '',

        // Memoize based on arguments passed at call time
        filteredItems: memoize((items, query) => {
            console.log('[Memoize] Filtering...');  // Only logs when args change!
            return items.filter(item =>
                item.name.toLowerCase().includes(query.toLowerCase())
            );
        })
    };

    template() {
        // Pass current values as arguments - cached if same as last call
        const filtered = this.state.filteredItems(
            this.state.items,
            this.state.searchQuery
        );

        return html`
            <input type="text" x-model="searchQuery" placeholder="Search...">
            <div>${filtered.length} items found</div>
            <ul>
                ${each(filtered, item => html`
                    <li>${item.name} - $${item.price}</li>
                `)}
            </ul>
        `;
    }
}

defineComponent('product-list', ProductList);
```

**How it works:**
- First call: Executes function and caches result
- Subsequent calls: Returns cached result if arguments haven't changed
- Argument change: Executes function again and updates cache

**Perfect for:**
- Expensive filtering operations
- Sorting large lists
- Complex calculations
- Derived data transformations

**Example with sorting:**
```javascript
import { memoize } from './lib/utils.js';

state = {
    items: [...],  // 1000 items
    sortBy: 'name',
    sortDirection: 'asc',

    sortedItems: memoize((items, sortBy, direction) => {
        const sorted = [...items].sort((a, b) => {
            if (a[sortBy] < b[sortBy]) return direction === 'asc' ? -1 : 1;
            if (a[sortBy] > b[sortBy]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    })
};

template() {
    const sorted = this.state.sortedItems(
        this.state.items,
        this.state.sortBy,
        this.state.sortDirection
    );

    return html`
        <select x-model="sortBy">
            <option value="name">Name</option>
            <option value="price">Price</option>
        </select>
        <button on-click="${() => this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc'}">
            Toggle Direction
        </button>
        <ul>
            ${each(sorted, item => html`
                <li>${item.name} - $${item.price}</li>
            `)}
        </ul>
    `;
}
```

### Choosing Between computed(), memo(), and memoize()

| Function | Import | Tracks | Best For |
|----------|--------|--------|----------|
| `computed()` | framework.js | Reactive dependencies automatically | Values derived from reactive state |
| `memo()` | framework.js | Explicit dependency array | When you control what triggers recompute |
| `memoize()` | utils.js | Arguments passed at call time | Caching expensive pure functions |

## Watch

The `watch()` function monitors reactive values and executes a callback when they change:

```javascript
import { watch, reactive } from './lib/framework.js';

const state = reactive({ count: 0 });

// Watch a value and react to changes
const stopWatching = watch(
    () => state.count,  // Getter function returning value to watch
    (newValue, oldValue) => {
        console.log(`Count changed from ${oldValue} to ${newValue}`);
    }
);

state.count = 5;  // Logs: Count changed from 0 to 5
state.count = 10; // Logs: Count changed from 5 to 10

// Stop watching when done
stopWatching();

state.count = 15; // No log - watcher has been disposed
```

### Use Cases

**1. Side Effects on State Changes**
```javascript
mounted() {
    this._unwatch = watch(
        () => this.state.selectedItem,
        async (itemId) => {
            if (itemId) {
                this.state.itemDetails = await fetchItemDetails(itemId);
            }
        }
    );
}

unmounted() {
    if (this._unwatch) this._unwatch();
}
```

**2. Cross-Component Coordination**
```javascript
import cartStore from './cart-store.js';

mounted() {
    this._unwatch = watch(
        () => cartStore.state.items.length,
        (count) => {
            if (count > 10) {
                notify('Cart is getting full!', 'warning');
            }
        }
    );
}
```

**3. Analytics/Logging**
```javascript
watch(
    () => router.currentRoute.state.path,
    (newPath) => {
        analytics.trackPageView(newPath);
    }
);
```

**4. Watching Nested Properties**
```javascript
const state = reactive({ user: { settings: { theme: 'light' } } });

watch(
    () => state.user.settings.theme,
    (newTheme) => {
        document.body.classList.toggle('dark', newTheme === 'dark');
    }
);
```

### Important Notes

- **Always dispose watchers** - Call the returned dispose function in `unmounted()` to prevent memory leaks
- **Prefer props for derived values** - Use props directly in templates for reactive URL params (automatic re-renders)
- **Avoid unnecessary watchers** - Computed properties are often better for derived values

## Dark Theme

Global dark theme store with automatic body class management:

```javascript
import { darkTheme } from './lib/utils.js';

toggleDarkMode() {
    darkTheme.update(s => ({ enabled: !s.enabled }));
}
```

**In component styles:**
```javascript
static styles = /*css*/`
    :host-context(body.dark) .element {
        background: #333;
        color: #ccc;
    }

    :host-context(body.dark) button {
        background: #444;
        border: 1px solid #666;
    }
`;
```

**The dark theme store automatically:**
- Adds/removes `dark` class on `<body>`
- Persists preference to localStorage
- Applies theme on page load

## Notifications

Toast notification system with severity levels:

```javascript
import { notify } from './lib/utils.js';

async save() {
    try {
        await this.saveData();
        notify('Saved!', 'info', 3); // message, severity, seconds
    } catch (error) {
        notify('Error saving!', 'error', 5);
    }
}
```

**Available severity levels:**
- `'info'` - Blue informational message
- `'success'` - Green success message
- `'warning'` - Yellow warning message
- `'error'` - Red error message

**Parameters:**
- `message` (string) - Notification text
- `severity` (string) - One of: 'info', 'success', 'warning', 'error'
- `ttl` (number) - Time to live in seconds (default: 5)

**Accessing notifications store:**
```javascript
import { notifications } from './lib/utils.js';

// Subscribe to all notifications
notifications.subscribe(notifs => {
    console.log('Current notifications:', notifs);
});
```

## Best Practices

### Use Reactive State for UI State

```javascript
// ✅ GOOD - Reactive state for UI
state = {
    isOpen: false,
    selectedTab: 'profile',
    loading: false
};
```

### Use Stores for Shared State

```javascript
// ✅ GOOD - Store for shared state
class AuthStore extends Store {
    constructor() {
        super();
        this.state = { user: null, isAuthenticated: false };
    }
}
export const authStore = new AuthStore();
```

### Always Cleanup Subscriptions

```javascript
// ✅ GOOD - Cleanup in unmounted()
mounted() {
    this.unsubscribe = myStore.subscribe(state => {
        this.state.data = state.data;
    });
}

unmounted() {
    if (this.unsubscribe) this.unsubscribe();
}
```

### Avoid Reactive State for Constants

```javascript
// ❌ BAD - No need for reactivity
state = {
    API_URL: 'https://api.example.com'  // Constant, not reactive
};

// ✅ GOOD - Use const outside component
const API_URL = 'https://api.example.com';

class MyComponent extends Component {
    async fetchData() {
        const response = await fetch(API_URL);
        // ...
    }
}

defineComponent('my-component', MyComponent);
```

## See Also

- [components.md](components.md) - Component development patterns
- [templates.md](templates.md) - Template system and helpers
- [api-reference.md](api-reference.md) - Complete API reference
