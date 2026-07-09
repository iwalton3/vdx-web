# VDX Framework Reference

Zero-dependency reactive web framework. No build step required.

## Component Pattern

```javascript
import { defineComponent, html, when, each } from 'vdx/lib/framework.js';

export default defineComponent('my-component', {
    props: { title: 'Default' },          // Observed attributes
    data() { return { count: 0 }; },      // Reactive state. this.props exists here (values arrive later)

    mounted() { /* DOM ready */ },
    unmounted() { /* cleanup timers/subscriptions */ },

    methods: {
        increment() { this.state.count++; }
    },

    computed: {                           // Lazy cached values, auto-disposed
        doubled() { return this.state.count * 2; }
    },

    template() {
        return html`
            <h1>${this.props.title}</h1>
            <p>Count: ${this.state.count} (doubled: ${this.doubled})</p>
            <button on-click="increment">+1</button>
        `;
    },

    styles: /*css*/`button { background: #007bff; color: white; }`
});
```

## Event Binding

**Always use `on-*` attributes:**
```javascript
<button on-click="handleClick">Click</button>
<form on-submit-prevent="handleSubmit">...</form>       // -prevent / -stop chain
<input on-change="handleChange">
<div on-custom-event="handleCustom">  // Any event name works
<div on-touchmove-passive="handleTouch">  // -passive: never blocks scrolling
<div on-click-outside="closeMenu">        // fires on clicks outside the element
```

`-passive` handlers must never call `preventDefault()` (ignored; the framework warns if combined with `-prevent`).

## Two-Way Binding (x-model)

```javascript
data() { return { name: '', age: 0, agreed: false }; },
template() {
    return html`
        <input type="text" x-model="name">
        <input type="number" x-model="age">       <!-- auto number -->
        <input type="checkbox" x-model="agreed">  <!-- auto boolean -->
    `;
}
```

**x-model on a custom element** binds to that component's `change` event and reads
`detail.value`. So a component you drive with `x-model` must call `this.emitChange(null, value)`
(which dispatches `change` on the host) to push its value out. x-model deliberately
**ignores** native `input`/`change` events that bubble up from an inner `<input>` inside the
component (they carry no `detail` and would clobber the bound state) - only the host's own
change is honored. Components that wrap a native input should therefore emit their own change.

**Chaining caveat:** if you put both `x-model` and `on-change` on the same custom element, the
`on-change` handler receives only `(e)` - the extracted `detail.value` is *not* passed as a 2nd
argument. Read `e.detail.value` inside the handler instead of relying on `(e, value)`.

## Template Helpers

```javascript
// Conditional (function form preferred - caches by condition)
${when(condition, () => html`<p>Yes</p>`, () => html`<p>No</p>`)}

// Lists
${each(items, item => html`<li>${item.name}</li>`)}

// Keyed lists (preserves DOM state)
${each(items, item => html`<li>${item.name}</li>`, item => item.id)}

// Memoized lists (performance). Windowed slices need trustKey; external
// state affecting all rows needs deps - see docs/performance.md
${memoEach(items.slice(a, b), item => html`<div>${item.name}</div>`, item => item.id, { trustKey: true })}

// Reactive boundary (isolates high-frequency updates from parent)
${contain(() => html`<div>${this.state.timer}</div>`)}

// Async data
${awaitThen(promise, data => html`<p>${data}</p>`, html`<p>Loading...</p>`)}

// Trusted HTML only
${raw(trustedHtml)}

// Fine-grained reactivity (auto-contain all expressions)
import { opt } from './lib/opt.js';
template: eval(opt(function() {
    return html`<p>${this.state.count}</p>`;  // Each ${} is isolated
}))
```

## Passing Props

Objects, arrays, and functions pass automatically:
```javascript
<child-component
    items="${this.state.items}"
    onSelect="${this.handleSelect}">
</child-component>
```

In static HTML (outside templates), camelCase props are set via kebab-case attributes:
```html
<unit-converter from-unit="liters" initial-value="10"></unit-converter>
<!-- from-unit="..." sets this.props.fromUnit (always a string) -->
```

## Children & Slots

```javascript
// Default children
template() {
    return html`<div class="wrapper">${this.props.children}</div>`;
}

// Named slots
const footer = this.props.slots.footer || [];
return html`
    <div>${this.props.children}</div>
    <footer>${footer}</footer>
`;

// Usage
<my-dialog>
    <p>Content</p>
    <div slot="footer"><button>OK</button></div>
</my-dialog>
```

## Refs

```javascript
template() {
    return html`<input ref="myInput" type="text">`;
},
methods: {
    focus() { this.refs.myInput.focus(); }
}
```

**Refs are for already-mounted nodes.** A `ref` on a node that is *conditionally shown this
tick* is not populated synchronously - even right after `flushSync(() => this.state.editing = true)`,
`this.refs.myInput` (and `this.querySelector('.my-input')`) can still be empty. To focus a
just-revealed input, defer to the next frame and query the light DOM:

```javascript
startEdit() {
    this.state.editing = true;
    requestAnimationFrame(() => {
        const input = this.querySelector('.my-input');
        if (input) { input.focus(); input.select(); }
    });
}
```

Prefer `this.querySelector(...)` over `this.refs` for nodes in a freshly-swapped template branch.

## Reactivity Rules

**sort()/reverse() are safe** - made atomic automatically:
```javascript
this.state.items.sort((a, b) => a.time - b.time)  // ✅ Works
this.state.items.reverse()  // ✅ Works
```

**Sets/Maps are automatically reactive:**
```javascript
data() { return { ids: new Set(), scores: new Map() }; }
this.state.ids.add(1);        // ✅ Triggers re-render
this.state.scores.set('a', 1); // ✅ Triggers re-render

// Batch operations (single trigger):
this.state.ids.addAll([1, 2, 3]);
this.state.scores.setAll([['a', 1], ['b', 2]]);
```

**Array iteration is O(1)** - large arrays work efficiently:
```javascript
// Iterating 2000 items creates 1 dependency, not 2000
each(this.state.items, item => html`<div>${item.name}</div>`)
```

**contain()/opt() require reactive access INSIDE the closure:**
```javascript
// ❌ BAD - Variable captured before template, won't update
const count = this.state.count;
return html`<p>${count}</p>`;  // contain(() => count) has no dependencies!

// ✅ GOOD - Reactive access inside template
return html`<p>${this.state.count}</p>`;  // contain(() => this.state.count) works

// ✅ GOOD - Use the computed: option (lazy, cached, auto-disposed; read as a property)
computed: {
    doubled() { return this.state.count * 2; }
},
template() {
    return html`<p>${this.doubled}</p>`;  // Tracked inside contain()
}

// ✅ ALSO GOOD - Plain methods (NOT get accessors - they break method binding)
methods: {
    doubled() { return this.state.count * 2; }
},
template() {
    return html`<p>${this.doubled()}</p>`;  // Called inside contain()
}
```

**Same applies to when()/each() function callbacks** (they create reactive boundaries):
```javascript
// ❌ BAD - isAdmin captured before callback
const isAdmin = this.stores.auth.isAdmin;
${when(isAdmin, () => html`<admin-panel></admin-panel>`)}

// ✅ GOOD - Access inside callback
${when(this.stores.auth.isAdmin, () => html`<admin-panel></admin-panel>`)}
```

**Optional: untracked() to skip proxying entirely:**
```javascript
import { untracked } from 'vdx/lib/framework.js';
data() { return { songs: untracked([]) }; }  // Items aren't reactive
```

**Computed values are never stale** - invalidation is synchronous on writes, so reading a computed right after mutating its deps is safe (mutate-then-emit-event patterns):
```javascript
this.state.items.push(item);
this.emitChange(null, this.total);  // computed `total` is already fresh
```

**Proxy identity is stable** - `state.items[0] === state.items[0]` holds (cached proxies). But a raw object captured before insertion !== its proxied read; compare primitives when mixing raw and proxied references.

**Immediate DOM updates:**
```javascript
import { flushSync } from 'vdx/lib/framework.js';
flushSync(() => { this.state.showInput = true; });
this.refs.input.focus();
```

## Stores

```javascript
// Auto-subscribe pattern (recommended)
import userStore from './stores/user.js';

defineComponent('my-component', {
    stores: { userStore },
    template() {
        return html`<p>${this.stores.userStore.name}</p>`;
    },
    methods: {
        logout() { userStore.state.logout(); }  // Call methods on .state
    }
});
```

## Router

```javascript
import { enableRouting } from 'vdx/lib/router.js';

// A second enableRouting call warns and merges routes into the existing router
enableRouting(outlet, {
    '/': { component: 'home-page' },
    '/users/:id/': { component: 'user-page' },   // params in this.props.params
    '/files/:path*/': { component: 'file-page' }, // wildcard: multi-segment param
    '/admin/': { component: 'admin-page', require: 'admin' }  // fails closed
}, {
    // Routes with `require` are DENIED unless this approves
    checkCapability: (required) => auth.state.capabilities.includes(required)
});

// Navigation
<router-link to="/users/123/">View User</router-link>
```

## Error Boundaries

```javascript
defineComponent('my-component', {
    template() { /* may throw */ },
    renderError(error) {
        return html`<cl-error-boundary error="${error}" showRetry="true"></cl-error-boundary>`;
    }
});
```

## Component Library (cl-*)

Common components from `vdx/componentlib/`:

```javascript
// Buttons
<cl-button label="Save" on-click="save"></cl-button>
<cl-button label="Delete" severity="danger"></cl-button>

// Form inputs
<cl-input-text x-model="name" label="Name"></cl-input-text>
<cl-select-box options="${options}" x-model="selected"></cl-select-box>
<cl-checkbox x-model="agreed" label="I agree"></cl-checkbox>

// Dialogs
<cl-dialog visible="${showDialog}" header="Confirm" on-hide="closeDialog">
    <p>Are you sure?</p>
</cl-dialog>

// Tables
<cl-datatable items="${rows}" columns="${cols}"></cl-datatable>
```

## Virtual Scrolling (createWindowing)

```javascript
import { createWindowing } from 'vdx/lib/windowing.js';

data() {
    // Created in data() so window state exists for the first render
    this._win = createWindowing(this, {
        itemHeight: 52,
        count: () => this.state.items.length,
        scrollContainer: 'self',   // 'self' | 'parent' | 'window' | selector
        onRange: (start, end) => this.maybeLoadMore(end)   // optional
    });
    return { items: untracked([]) };
},
unmounted() { this._win.destroy(); },
template() {
    const win = this._win;
    return html`
        <div class="spacer" style="height: ${win.totalHeight}px;"></div>
        <div class="window" style="transform: translateY(${win.offsetY}px);">
            ${memoEach(this.state.items.slice(win.visibleStart, win.visibleEnd),
                item => html`...`, item => item.id, { trustKey: true })}
        </div>
    `;
}
```

Call `this._win.refresh()` after replacing an `untracked()` item source or a programmatic scroll. Or just use `<cl-virtual-list>`. Full guide: [docs/performance.md](docs/performance.md).

## List Gestures (createRowGestures)

Drag-reorder, long-press, and touch-drag for list rows - composes with windowing:

```javascript
import { createRowGestures } from 'vdx/lib/gestures.js';

data() {
    this._g = createRowGestures(this, {
        itemHeight: 52,
        windowing: this._win,                       // optional composition
        onReorder: (fromIndices, gap) => { ... },   // gap pre-clamped, no-ops filtered
        onTap: (i, e) => { ... }, onLongPress: (i, e) => { ... }
    });
    ...
}
```

Rows bind thin delegations (`on-dragover="${(e) => this._g.dragOver(index, e)}"` etc.). Passive-safety is a module invariant: `touchStart`/`touchMove` never preventDefault (bind `-passive`); `touchEnd` and the drag-handle `handleTouch*` suite may (bind non-passive). Translate the gap with the pure helpers: `gapToRemoveInsertIndex(from, gap)` for splice APIs, `gapToGapIndex` for gap-semantic APIs, `groupReorderTargets` for batches. `<cl-virtual-list reorderable>` is the packaged version (emits `reorder` with `{ fromIndices, gap, from, to }`; the consumer applies the change).

## Reactive Boundaries (Critical for Performance)

Templates re-evaluate as a single unit - you can't track individual `${}` slots separately. For frequently updating values mixed with expensive content, use reactive boundaries:

```javascript
// ❌ ANTIPATTERN: High-frequency updates in large templates
// Every currentTime update re-evaluates the entire template including memoEach
template() {
    return html`
        <div class="time">${this.stores.player.currentTime}</div>
        ${memoEach(this.state.songs, song => html`...`, song => song.uuid)}
    `;
}

// ✅ CORRECT: Isolate high-frequency updates with contain()
template() {
    return html`
        ${contain(() => html`<div class="time">${this.stores.player.currentTime}</div>`)}
        ${memoEach(this.state.songs, song => html`...`, song => song.uuid)}
    `;
}
```

**When to use reactive boundaries:**
- `contain()` - Isolate frequently updating values (timers, progress, animations)
- Child components - Moving content to a child naturally isolates its updates

**Note:** `when()` and `each()` do NOT create boundaries by default - they work like regular JavaScript.

**The rule:** If a template has both high-frequency updates AND expensive content (large lists, complex rendering), use `contain()` or move content to child components.

For virtual scrolling, memoEach invalidation strategies (composite keys, deps, version counters), and 60fps non-reactive islands, see [docs/performance.md](docs/performance.md). For drag-reorder/long-press/touch-drag list gestures, use `createRowGestures` from `lib/gestures.js` (composes with `createWindowing`).

## Build-Time Optimizer

The optimizer applies fine-grained reactivity transformations at build time:

```bash
# Optimize for production
node optimize.js -i ./app -o ./dist

# Check for issues the optimizer CAN'T fix (CI integration)
node optimize.js -i ./app --lint-only
```

**Lint mode (`--lint-only`)** - Detects patterns that break reactivity inside `contain()`:
```javascript
// ❌ DETECTED: contain() callback captures dead value
const { count } = this.state;
${contain(() => html`<p>${count}</p>`)}  // count never updates!

// ✅ SAFE: Access state inside contain()
${contain(() => html`<p>${this.state.count}</p>`)}

// ✅ SAFE: when/each work fine with captured variables (no boundaries)
const { items } = this.state;
${each(items, item => html`...`)}  // works - parent re-renders when items change
```

**Coding assistants should run lint mode to verify contain() callbacks access state correctly.**

## Anti-Patterns

```javascript
// DON'T use onclick - use on-click
<button onclick="...">  // WRONG
<button on-click="..."> // CORRECT

// DON'T stringify objects
options="${JSON.stringify(items)}"  // WRONG
options="${items}"                   // CORRECT

// DON'T manually bind methods - they're auto-bound
this._bound = this.method.bind(this)  // WRONG
renderItem="${this.method}"           // CORRECT

```

---

## Using This File

Projects using VDX can reference this in their CLAUDE.md:

```markdown
## Framework

This project uses the VDX framework. See [FRAMEWORK.md](path/to/vdx/FRAMEWORK.md) for patterns.
```
