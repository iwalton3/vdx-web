# VDX Fine-Grained Rendering Migration - Historical Record

> **Status: COMPLETED** - December 2025
>
> This document is preserved as a historical record of the fine-grained rendering migration.
> The migration has been successfully completed with all tests passing.

---

## Migration Summary

### Final Results

| Metric | Result |
|--------|--------|
| **Framework Tests** | 299/299 passing (100%) |
| **E2E Tests** | 13/13 passing (100%) |
| **Memory Tests** | 6/6 passing (cleanup verified) |
| **Bundle Size** | Reduced (~2KB savings from Preact removal) |

### Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Spike - Children/Slots | ✅ Completed |
| Phase 1 | Foundation + createMemo | ✅ Completed |
| Phase 2 | Control Flow | ✅ Completed |
| Phase 3 | Component Integration | ✅ Completed |
| Phase 4 | Children and Slots | ✅ Completed |
| Phase 5 | Component Library Migration | ✅ Completed |
| Phase 6 | Music App Migration | ✅ Verified (uses windowed rendering) |
| Phase 7 | Remove Preact | ✅ Completed |
| Phase 8 | Optimization and Cleanup | ✅ Completed |

### Key Architecture Changes

1. **Template Rendering**: Changed from Preact VDOM reconciliation to direct DOM manipulation with reactive effects
2. **Static Templates**: Pre-built DOM nodes at compile time, cloned via `document.importNode()` at runtime
3. **Reactivity Integration**: Each dynamic binding creates its own targeted effect (no more `trackAllDependencies`)
4. **Memory Safety**: DOM Nodes are now skipped from reactive proxy wrapping (prevents "Illegal invocation" errors)

### Files Changed

**New Files:**
- `lib/core/template-renderer.js` - Fine-grained DOM instantiation with effects

**Modified Files:**
- `lib/core/template-compiler.js` - Build static DOM instead of VNodes
- `lib/core/component.js` - Removed `USE_FINE_GRAINED` flag, uses fine-grained by default
- `lib/core/reactivity.js` - Added DOM Node skip in proxy handler
- `lib/core/template.js` - Updated empty template handling
- `lib/framework.js` - Removed Preact exports
- `lib/framework.d.ts` - Updated TypeScript definitions

**Removed Files:**
- `lib/vendor/preact/` - Entire vendored Preact directory

### Performance Characteristics

The fine-grained system provides:
- **Granular updates**: Only affected DOM nodes update (not entire component tree)
- **Reduced GC pressure**: Effects are stable, no VNode creation per render
- **Efficient lists**: `each()` and `memoEach()` only recreate changed items

### Virtual List Verification

Both component library and music player use optimized windowed rendering:
- Items are sliced to visible range before passing to `each()`/`memoEach()`
- Effects only created for visible items
- Proper cleanup on scroll via keyed reconciliation

### Memory Cleanup Verification

Added comprehensive memory profiling tests verifying:
- DOM nodes removed when list items removed
- `unmounted()` lifecycle called when components removed
- Conditional content properly cleaned up
- Rapid add/remove cycles don't leak DOM nodes
- `memoEach` updates correctly without stale DOM
- Event handlers cleaned up when elements removed

---

## Original Migration Plan

The sections below preserve the original planning document for historical reference.

---

## Executive Summary

Migrate VDX from Preact VDOM reconciliation to fine-grained reactive DOM updates, **building on the existing reactivity system**. The core `createEffect`, `track`, `trigger`, and `reactive` primitives are already production-ready and require no changes.

**Key insight:** VDX already has a global, fine-grained reactivity system. It's just not being used that way—`trackAllDependencies()` subscribes to everything, triggering full re-renders. The migration removes this blunt instrument and lets each template binding create its own targeted effect.

---

## Part 1: What We Kept (No Changes Needed)

### 1.1 The Entire Reactivity Core

These work exactly as needed for fine-grained updates:

```javascript
// reactivity.js - ALL OF THIS STAYS AS-IS
let activeEffect = null;
const effectStack = [];
const targetMap = new WeakMap();

export function createEffect(fn) { ... }  // ✅ Perfect
function track(target, key) { ... }        // ✅ Perfect
function trigger(target, key) { ... }      // ✅ Perfect
export function reactive(obj) { ... }      // ✅ Perfect
export function untracked(obj) { ... }     // ✅ Perfect
```

### 1.2 Stores

Stores already work globally. Any effect that reads `store.state.foo` automatically subscribes.

### 1.3 Component State

`this.state` is already a reactive proxy. Effects reading from it auto-subscribe.

### 1.4 Template Parsing

The HTML parser (`html-parser.js`) and template compilation (`compileTemplate`) remained largely unchanged.

---

## Part 2: What Was Removed

### 2.1 Preact

```javascript
// REMOVED these imports
import { render as preactRender } from '../vendor/preact/index.js';
import { h, Fragment } from '../vendor/preact/index.js';
```

### 2.2 The Blunt Reactivity Hammer

```javascript
// REMOVED from component.js connectedCallback()
const { dispose: disposeRenderEffect } = createEffect(() => {
    trackAllDependencies(this.state);      // ❌ REMOVED
    trackAllDependencies(this.stores);     // ❌ REMOVED
    scheduleRootRender(this._getVdxRoot()); // ❌ REMOVED
});
```

### 2.3 Coordinated Root Rendering

The entire batching/root-rendering system became unnecessary.

### 2.4 VNode Generation

`applyValues` was replaced with direct DOM instantiation.

---

## Part 3: New Architecture

### 3.1 Template Instantiation

```javascript
// template-renderer.js (NEW FILE)

import { createEffect } from './reactivity.js';

/**
 * Instantiate a compiled template into DOM with reactive bindings.
 * Called ONCE per component mount, not on every state change.
 */
export function instantiateTemplate(compiled, values, component) {
    const effects = [];
    const fragment = document.createDocumentFragment();

    instantiateNode(compiled, values, component, fragment, effects);

    return { fragment, effects };
}
```

### 3.2 Static Content (Fast Path)

Pre-built DOM at compile time, cloned via `document.importNode()`:

```javascript
function buildStaticDOM(node) {
    // Creates actual DOM nodes using DOM API
    return buildDOMNode(node);
}

// At runtime:
function instantiateStatic(node, parent) {
    if (node.template) {
        const clone = document.importNode(node.template, true);
        parent.appendChild(clone);
    }
}
```

### 3.3 Dynamic Slots

Each dynamic expression becomes its own effect:

```javascript
function instantiateSlot(node, values, component, parent, effects) {
    const placeholder = document.createComment(`slot:${index}`);
    parent.appendChild(placeholder);

    let currentNodes = [];

    const { dispose } = createEffect(() => {
        let value = values[index];
        if (typeof value === 'function') {
            value = value();  // Dependency tracking happens HERE
        }

        // Reconcile: remove old, insert new
        // ... DOM manipulation
    });

    effects.push({ dispose });
}
```

---

## Part 4: Control Flow Primitives

### 4.1 `when()` - Conditional Rendering

Works by creating/disposing branch effects on condition change.

### 4.2 `each()` - List Rendering

Keyed reconciliation with effect tracking per item.

### 4.3 `memoEach()` - Now Optimized by Default

With fine-grained rendering, memoization behavior is automatic.

---

## Part 5: Children and Slots (Spike Results)

**Date:** December 2025
**Status:** ✅ All tests pass

Validated scenarios:
- Basic children rendering
- Reactive children (parent state)
- Named slots routing
- Control flow in children
- Nested custom elements
- Multiple children ordering
- Mixed content (text + elements)
- Effect cleanup

Key implementation: Deferred child descriptors with parent component reference preserve reactive context through any level of nesting.

---

## Part 6: Virtual List Integration

### Resolution

The existing virtual list implementations already use the optimal pattern:
1. Slice visible items based on scroll position
2. Pass sliced array to `each()`/`memoEach()`
3. Effects only created for visible items

No special `virtualEach()` helper was needed.

---

## Part 7: API Changes Summary

### Breaking Changes: None

All public APIs remained the same:
- `defineComponent()` - same signature
- `html\`\`` - same usage
- `when()`, `each()`, `memoEach()` - same signatures
- `this.state`, `this.props`, `this.stores` - same access patterns
- `x-model`, `on-*`, `ref` - same template syntax

### Behavioral Changes

| Aspect | Before | After |
|--------|--------|-------|
| Update granularity | Whole component | Per-binding |
| `template()` calls | Every state change | Once at mount |
| `memoEach()` | Manual optimization | Automatic (alias for `each`) |
| `selectionVersion` | Needed for cache busting | Unnecessary |

### Deprecated (Removed)

```javascript
trackAllDependencies()  // No longer needed
scheduleRootRender()    // No longer exists
performTreeRender()     // No longer exists
USE_FINE_GRAINED        // Feature flag removed
```

---

## Part 8: Performance Results

### Baseline VDOM Benchmarks (Captured)

| Benchmark | Mean | P95 |
|-----------|------|-----|
| Simple list (100 items) | 5.73ms | 7.30ms |
| Simple list (1000 items) | 14.53ms | 36.00ms |
| Update 1 item in 100 | 5.05ms | 6.90ms |
| Grid 100x10 (update cell) | 7.14ms | 13.90ms |

### Fine-Grained Results

Performance benchmarks showed favorable results:
- Single binding updates are faster (no full re-render)
- List updates scale better (only affected items)
- Memory usage is stable (effects properly cleaned up)

---

## Lessons Learned

1. **DOM Nodes can't be proxied**: Added check to skip DOM Nodes from reactive proxy wrapping
2. **`importNode` vs `cloneNode`**: Use `document.importNode()` for cross-document cloning
3. **Template element pattern**: Considered but not needed - direct DOM nodes with `importNode` work well
4. **Text escaping not needed**: With DOM-based rendering using `createTextNode`, all content goes to textContent (inherently XSS-safe)

---

## Conclusion

The fine-grained rendering migration was successful, achieving:
- Zero breaking changes to public API
- Improved performance for granular updates
- Reduced bundle size (Preact removed)
- Proper memory cleanup verified through tests
- All existing tests passing
