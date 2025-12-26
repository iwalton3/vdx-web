# VDX Fine-Grained Rendering Migration Plan (v2)

## Executive Summary

Migrate VDX from Preact VDOM reconciliation to fine-grained reactive DOM updates, **building on the existing reactivity system**. The core `createEffect`, `track`, `trigger`, and `reactive` primitives are already production-ready and require no changes.

**Key insight:** VDX already has a global, fine-grained reactivity system. It's just not being used that way—`trackAllDependencies()` subscribes to everything, triggering full re-renders. The migration removes this blunt instrument and lets each template binding create its own targeted effect.

---

## Part 1: What We're Keeping (No Changes Needed)

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

Stores already work globally. Any effect that reads `store.state.foo` automatically subscribes:

```javascript
// This already works - no changes needed
offlineStore.state.favoriteSongs = newSet;  // Triggers any effect that read it
```

### 1.3 Component State

`this.state` is already a reactive proxy. Effects reading from it will auto-subscribe.

### 1.4 Template Parsing

The HTML parser (`html-parser.js`) and template compilation (`compileTemplate`) can largely stay. We're changing what `applyValues` produces, not how templates are parsed.

---

## Part 2: What We're Removing

### 2.1 Preact

```javascript
// REMOVE these imports
import { render as preactRender } from '../vendor/preact/index.js';
import { h, Fragment } from '../vendor/preact/index.js';
```

### 2.2 The Blunt Reactivity Hammer

```javascript
// REMOVE from component.js connectedCallback()
const { dispose: disposeRenderEffect } = createEffect(() => {
    trackAllDependencies(this.state);      // ❌ REMOVE
    trackAllDependencies(this.stores);     // ❌ REMOVE
    scheduleRootRender(this._getVdxRoot()); // ❌ REMOVE
});
```

### 2.3 Coordinated Root Rendering

The entire batching/root-rendering system becomes unnecessary:

```javascript
// REMOVE - no longer needed
let isRenderingTree = false;
let pendingRoots = null;
function scheduleRootRender(root) { ... }
function flushPendingRenders() { ... }
function performTreeRender(root) { ... }
function renderComponentTree(component) { ... }
```

### 2.4 VNode Generation

`applyValues` currently returns Preact VNodes. It will return DOM nodes instead.

---

## Part 3: New Architecture

### 3.1 Component Lifecycle (Simplified)

```javascript
connectedCallback() {
    this._isMounted = true;
    
    // Parse attributes, setup stores (same as before)
    this._parseAttributes();
    this._setupStoreSubscriptions();
    
    // ONE-TIME template instantiation (not per-render!)
    this._instantiateTemplate();
    
    // Lifecycle hook
    options.mounted?.call(this);
}

_instantiateTemplate() {
    const templateResult = options.template.call(this);
    
    // Convert compiled template to DOM with reactive bindings
    const { fragment, effects } = instantiateTemplate(
        templateResult._compiled,
        templateResult._values,
        this
    );
    
    // Track effects for cleanup
    this._effects = effects;
    
    // Mount DOM (once!)
    this.appendChild(fragment);
    
    // Inject styles (same as before)
    this._injectStyles();
}

disconnectedCallback() {
    // Dispose all effects
    for (const effect of this._effects) {
        effect.dispose();
    }
    this._effects = [];
    
    // Clear DOM
    this.innerHTML = '';
    
    options.unmounted?.call(this);
}
```

### 3.2 Template Instantiation (New)

```javascript
// template-renderer.js (NEW FILE)

import { createEffect } from './reactivity.js';

/**
 * Instantiate a compiled template into DOM with reactive bindings.
 * Called ONCE per component mount, not on every state change.
 * 
 * @param {Object} compiled - Compiled template from compileTemplate()
 * @param {Array} values - Expression values from template
 * @param {Object} component - Component instance
 * @returns {{ fragment: DocumentFragment, effects: Array }}
 */
export function instantiateTemplate(compiled, values, component) {
    const effects = [];
    const fragment = document.createDocumentFragment();
    
    instantiateNode(compiled, values, component, fragment, effects);
    
    return { fragment, effects };
}

function instantiateNode(node, values, component, parent, effects) {
    if (!node) return;
    
    switch (node.op) {
        case OP.STATIC:
            // Pre-built static content - clone and append
            parent.appendChild(cloneStaticNode(node.vnode));
            break;
            
        case OP.TEXT:
            parent.appendChild(document.createTextNode(node.value));
            break;
            
        case OP.SLOT:
            instantiateSlot(node, values, component, parent, effects);
            break;
            
        case OP.ELEMENT:
            instantiateElement(node, values, component, parent, effects);
            break;
            
        case OP.FRAGMENT:
            for (const child of node.children) {
                instantiateNode(child, values, component, parent, effects);
            }
            break;
    }
}
```

### 3.3 Static Content (Fast Path)

Currently you pre-build static VNodes. We'll pre-build actual DOM:

```javascript
// At compile time, for fully static subtrees:
function buildStaticDOM(node) {
    if (node.type === 'text') {
        return document.createTextNode(node.value);
    }
    
    if (node.type === 'element') {
        const el = document.createElement(node.tag);
        for (const [name, value] of Object.entries(node.staticProps)) {
            el.setAttribute(name, value);
        }
        for (const child of node.children) {
            el.appendChild(buildStaticDOM(child));
        }
        return el;
    }
    
    // Fragment
    const frag = document.createDocumentFragment();
    for (const child of node.children) {
        frag.appendChild(buildStaticDOM(child));
    }
    return frag;
}

// At runtime, just clone:
function cloneStaticNode(template) {
    return template.cloneNode(true);
}
```

### 3.4 Dynamic Slots (The Key Change)

Each dynamic expression becomes its own effect:

```javascript
function instantiateSlot(node, values, component, parent, effects) {
    const index = node.index;
    const anchor = document.createComment(`slot-${index}`);
    parent.appendChild(anchor);
    
    let currentNodes = [];
    
    const effect = createEffect(() => {
        // Get the expression - if it's a function, call it (this triggers tracking)
        let value = values[index];
        if (typeof value === 'function') {
            value = value();  // Dependency tracking happens HERE
        }
        
        // Convert value to nodes
        const newNodes = valueToNodes(value, component, effects);
        
        // Reconcile: remove old, insert new
        for (const node of currentNodes) {
            node.remove();
        }
        
        const frag = document.createDocumentFragment();
        for (const node of newNodes) {
            frag.appendChild(node);
        }
        anchor.parentNode.insertBefore(frag, anchor);
        
        currentNodes = newNodes;
    });
    
    effects.push(effect);
}

function valueToNodes(value, component, effects) {
    if (value == null || value === false) return [];
    
    // Nested template
    if (value && value._compiled) {
        const { fragment, effects: childEffects } = instantiateTemplate(
            value._compiled,
            value._values,
            component
        );
        effects.push(...childEffects);
        return [...fragment.childNodes];
    }
    
    // Array of values
    if (Array.isArray(value)) {
        return value.flatMap(v => valueToNodes(v, component, effects));
    }
    
    // Control flow result (when/each)
    if (value && value.__vdx_control) {
        return instantiateControl(value, component, effects);
    }
    
    // Primitive - text node
    return [document.createTextNode(String(value))];
}
```

### 3.5 Element Instantiation

```javascript
function instantiateElement(node, values, component, parent, effects) {
    const el = document.createElement(node.tag);
    
    // Static props (set once)
    for (const [name, value] of Object.entries(node.staticProps)) {
        setProperty(el, name, value);
    }
    
    // Dynamic props (each becomes an effect)
    for (const { name, def } of node.dynamicProps) {
        if (def.slot !== undefined) {
            // Expression-based prop
            const effect = createEffect(() => {
                let value = values[def.slot];
                if (typeof value === 'function') value = value();
                setProperty(el, name, value);
            });
            effects.push(effect);
        } else if (def.xModel !== undefined) {
            // Two-way binding
            setupXModel(el, def.xModel, component, effects);
        }
    }
    
    // Events (set once - they reference methods, not reactive values)
    for (const { name, def } of node.events) {
        const handler = resolveEventHandler(name, def, values, component);
        if (handler) {
            el.addEventListener(name, handler);
        }
    }
    
    // Refs
    if (node.ref) {
        component.refs[node.ref] = el;
        // Note: cleanup happens in disconnectedCallback
    }
    
    // Children
    for (const child of node.children) {
        instantiateNode(child, values, component, el, effects);
    }
    
    // Custom element children handling
    if (node.isCustomElement) {
        // Children are instantiated but passed as prop
        // The custom element's own template will use them
        // (This part needs more thought for the children/slots API)
    }
    
    parent.appendChild(el);
}

function setProperty(el, name, value) {
    if (name === 'className' || name === 'class') {
        el.className = value || '';
    } else if (name === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
    } else if (name in el) {
        el[name] = value;
    } else if (value === false || value == null) {
        el.removeAttribute(name);
    } else {
        el.setAttribute(name, value === true ? '' : value);
    }
}
```

### 3.6 x-model Binding

```javascript
function setupXModel(el, statePath, component, effects) {
    const isCheckbox = el.type === 'checkbox';
    const isRadio = el.type === 'radio';
    const isNumber = el.type === 'number' || el.type === 'range';

    // State → DOM (effect)
    const effect = createEffect(() => {
        const value = getNestedValue(component.state, statePath);

        if (isCheckbox) {
            el.checked = !!value;
        } else if (isRadio) {
            el.checked = el.value === value;
        } else {
            el.value = value ?? '';
        }
    });
    effects.push(effect);

    // DOM → State (event listener)
    const eventType = (isCheckbox || isRadio) ? 'change' : 'input';
    el.addEventListener(eventType, () => {
        let value;
        if (isCheckbox) {
            value = el.checked;
        } else if (isRadio) {
            if (!el.checked) return;
            value = el.value;
        } else if (isNumber) {
            value = el.valueAsNumber;
            if (isNaN(value)) value = el.value;
        } else {
            value = el.value;
        }
        setNestedValue(component.state, statePath, value);
    });
}
```

### 3.7 Form State Preservation (Why Fine-Grained is BETTER)

A key motivation for using VDOM was preserving form state (cursor position, selection, undo history). **Fine-grained rendering actually improves this.**

#### Why VDOM Sometimes Loses State

```
1. User types "abc|def" (cursor at |)
2. External state change triggers re-render
3. Preact patches input.value = "abcdef"
4. Cursor jumps to end ✗
```

Or worse:
```
1. Conditional rendering changes structure
2. Preact can't match the element (key/type mismatch)
3. Element is REMOVED and recreated
4. All state lost: cursor, selection, undo history ✗
```

#### Why Fine-Grained Preserves State

**Key insight:** DOM elements are created ONCE and never recreated. Updates happen via effects that modify existing nodes.

```
1. Mount: <input> created, x-model effect created
2. User types → browser updates input.value → input event fires
3. Event handler: state.value = input.value (they already match!)
4. Effect runs: input.value !== state.value? NO → skip update
5. Cursor stays in place ✓
```

#### Smart x-model Implementation

```javascript
function setupXModel(el, statePath, component, effects) {
    const effect = createEffect(() => {
        const stateValue = getNestedValue(component.state, statePath);

        // CRITICAL: Only update DOM if value actually differs
        // This preserves cursor position for typed input
        if (el.value !== stateValue) {
            // Optional: preserve selection for transformed values
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const hadFocus = document.activeElement === el;

            el.value = stateValue ?? '';

            // Restore cursor if element has focus
            if (hadFocus && el.setSelectionRange) {
                el.setSelectionRange(
                    Math.min(start, el.value.length),
                    Math.min(end, el.value.length)
                );
            }
        }
    });
    effects.push(effect);
    // ... event listener unchanged
}
```

#### When State IS Lost (Same as VDOM)

| Scenario | Behavior | Mitigation |
|----------|----------|------------|
| `when()` branch switch | Old branch removed, new created | Use CSS `display:none` for tabs |
| `each()` item removed | Item's DOM removed | Expected behavior |
| `each()` key changes | Item recreated | Use stable keys |

These are fundamental DOM behaviors. Both VDOM and fine-grained behave identically.

#### Summary

| Aspect | VDOM | Fine-Grained |
|--------|------|--------------|
| Element recreation | Can happen on structure changes | Never (created once) |
| Value updates | Always patches | Only if changed |
| Cursor preservation | Sometimes lost | Preserved by default |
| Selection preservation | Manual work needed | Built into x-model |

---

## Part 4: Control Flow Primitives

### 4.1 `when()` - Conditional Rendering

```javascript
// template.js

export function when(condition, truthyContent, falsyContent = null) {
    return {
        __vdx_control: 'when',
        condition,
        truthy: truthyContent,
        falsy: falsyContent
    };
}

// template-renderer.js

function instantiateWhen(def, component, effects) {
    const anchor = document.createComment('when');
    let currentBranch = null;
    let currentNodes = [];
    let branchEffects = [];
    
    const effect = createEffect(() => {
        // Evaluate condition - triggers dependency tracking
        const condValue = typeof def.condition === 'function' 
            ? def.condition() 
            : def.condition;
        
        const branch = condValue ? def.truthy : def.falsy;
        
        // Only update if branch changed
        if (branch !== currentBranch) {
            // Cleanup old branch
            for (const node of currentNodes) node.remove();
            for (const eff of branchEffects) eff.dispose();
            
            currentBranch = branch;
            currentNodes = [];
            branchEffects = [];
            
            // Instantiate new branch
            if (branch != null) {
                const content = typeof branch === 'function' ? branch() : branch;
                
                if (content && content._compiled) {
                    const { fragment, effects: childEffects } = instantiateTemplate(
                        content._compiled,
                        content._values,
                        component
                    );
                    currentNodes = [...fragment.childNodes];
                    branchEffects = childEffects;
                    anchor.parentNode.insertBefore(fragment, anchor);
                }
            }
        }
    });
    
    effects.push(effect);
    
    // Return anchor for placement
    return [anchor];
}
```

### 4.2 `each()` - List Rendering

```javascript
// template.js

export function each(items, renderFn, keyFn = null) {
    return {
        __vdx_control: 'each',
        items,
        renderFn,
        keyFn
    };
}

// template-renderer.js

function instantiateEach(def, component, effects) {
    const anchor = document.createComment('each');
    
    // Map: key → { nodes: Node[], effects: Effect[], item: any }
    const itemMap = new Map();
    let currentKeys = [];
    
    const effect = createEffect(() => {
        // Get items - triggers dependency tracking
        const items = typeof def.items === 'function' ? def.items() : def.items;
        const itemArray = items || [];
        
        // Build new key list
        const newKeys = itemArray.map((item, i) => 
            def.keyFn ? def.keyFn(item) : i
        );
        const newKeySet = new Set(newKeys);
        
        // 1. Remove items no longer present
        for (const key of currentKeys) {
            if (!newKeySet.has(key)) {
                const entry = itemMap.get(key);
                if (entry) {
                    entry.nodes.forEach(n => n.remove());
                    entry.effects.forEach(e => e.dispose());
                    itemMap.delete(key);
                }
            }
        }
        
        // 2. Add/reorder items
        let insertBefore = anchor;
        
        // Process in reverse for correct insertion order
        for (let i = itemArray.length - 1; i >= 0; i--) {
            const item = itemArray[i];
            const key = newKeys[i];
            
            if (itemMap.has(key)) {
                // Existing item - move if needed
                const entry = itemMap.get(key);
                const firstNode = entry.nodes[0];
                
                if (firstNode && firstNode !== insertBefore.previousSibling) {
                    // Move nodes
                    for (const node of entry.nodes) {
                        anchor.parentNode.insertBefore(node, insertBefore);
                    }
                }
                insertBefore = entry.nodes[0] || insertBefore;
            } else {
                // New item - render
                const content = def.renderFn(item, i);
                
                if (content && content._compiled) {
                    const { fragment, effects: childEffects } = instantiateTemplate(
                        content._compiled,
                        content._values,
                        component
                    );
                    const nodes = [...fragment.childNodes];
                    
                    anchor.parentNode.insertBefore(fragment, insertBefore);
                    insertBefore = nodes[0] || insertBefore;
                    
                    itemMap.set(key, { nodes, effects: childEffects, item });
                }
            }
        }
        
        currentKeys = newKeys;
    });
    
    effects.push(effect);
    return [anchor];
}
```

### 4.3 `memoEach()` - Now Just an Alias

With fine-grained rendering, `memoEach` behavior is the default:

```javascript
// template.js

// memoEach is now just an alias for each - the behavior is automatic
export function memoEach(items, renderFn, keyFn = null, _cache = null) {
    // The _cache parameter is ignored - caching happens automatically
    // via the effect system (items that don't change don't re-render)
    return each(items, renderFn, keyFn);
}
```

**Migration note:** Existing `memoEach` calls continue to work. The `selectionVersion` pattern becomes unnecessary—remove it for cleaner code.

### 4.4 `awaitThen()` - Async Content

```javascript
// template.js

export function awaitThen(promise, resolved, pending = null, rejected = null) {
    return {
        __vdx_control: 'await',
        promise,
        resolved,
        pending,
        rejected
    };
}

// template-renderer.js

function instantiateAwait(def, component, effects) {
    const anchor = document.createComment('await');
    let currentNodes = [];
    let currentEffects = [];
    let currentPromise = null;
    
    function renderBranch(content, value) {
        // Cleanup
        currentNodes.forEach(n => n.remove());
        currentEffects.forEach(e => e.dispose());
        currentNodes = [];
        currentEffects = [];
        
        if (content == null) return;
        
        const evaluated = typeof content === 'function' ? content(value) : content;
        
        if (evaluated && evaluated._compiled) {
            const { fragment, effects: childEffects } = instantiateTemplate(
                evaluated._compiled,
                evaluated._values,
                component
            );
            currentNodes = [...fragment.childNodes];
            currentEffects = childEffects;
            anchor.parentNode.insertBefore(fragment, anchor);
        }
    }
    
    const effect = createEffect(() => {
        // Get promise - might be reactive
        const promise = typeof def.promise === 'function' ? def.promise() : def.promise;
        
        if (promise !== currentPromise) {
            currentPromise = promise;
            
            if (!promise) {
                renderBranch(def.pending, null);
                return;
            }
            
            // Show pending state
            renderBranch(def.pending, null);
            
            promise
                .then(value => {
                    // Only update if this is still the current promise
                    if (promise === currentPromise) {
                        renderBranch(def.resolved, value);
                    }
                })
                .catch(error => {
                    if (promise === currentPromise) {
                        renderBranch(def.rejected, error);
                    }
                });
        }
    });
    
    effects.push(effect);
    return [anchor];
}
```

---

## Part 5: Computed Values and Auto-Wrapping

### 5.1 Existing Computed/Memo APIs

The framework **already has** memoization primitives in `reactivity.js`:

```javascript
// computed() - Lazy cached value with auto dependency tracking
const sum = computed(() => state.a + state.b);
console.log(sum.get());  // 3
state.a = 5;
console.log(sum.get());  // 7 (recomputed)
sum.dispose();  // Cleanup

// memo() - Memoized function with explicit deps (React-style)
const memoized = memo(() => expensiveCalc(), [dep1, dep2]);
memoized();  // Returns cached value if deps unchanged
```

**No new API needed.** The existing `computed()` is equivalent to Solid's `createMemo`.

### 5.2 The Getter Pattern Problem

```javascript
template() {
    const data = this.getPaginatedData();  // Called once at mount
    return html`${each(data, row => html`...`)}`;
}
```

With fine-grained, `template()` runs once. The `data` variable is captured with its initial value and never updates.

### 5.3 Solution: Auto-Wrapping Function Calls

**Key insight:** The template compiler can detect function calls and auto-wrap them.

When the template system sees `${expression}`, it can:
1. If expression is a simple property access → track directly
2. If expression is a function call → wrap in a function for re-evaluation

```javascript
// Developer writes:
template() {
    const data = this.getPaginatedData();
    return html`${each(data, row => html`...`)}`;
}

// Template compiler treats each() source as reactive:
// Internally: each(() => data, row => ...)  -- NO, data is already evaluated

// ACTUAL solution: wrap the template expression
// The html`` tag receives the VALUE, but each() can accept a function
```

**The real fix:** Make `each()`, `when()`, and slot expressions accept both values AND functions:

```javascript
// In template-renderer.js instantiateSlot():
const effect = createEffect(() => {
    let value = values[index];

    // If value is a function, call it (triggers tracking)
    if (typeof value === 'function') {
        value = value();
    }

    // Rest of rendering...
});
```

**Developer pattern for dynamic values:**

```javascript
// Works today (VDOM) - getter called every render
template() {
    const data = this.getPaginatedData();
    return html`${each(data, row => ...)}`;
}

// Works with fine-grained - explicit function wrapper
template() {
    return html`${each(() => this.getPaginatedData(), row => ...)}`;
}
```

### 5.4 Pragmatic Migration Path

1. **Template expressions that are direct state access work automatically:**
   ```javascript
   ${this.state.items}  // Already reactive
   ${this.props.value}  // Already reactive
   ```

2. **Method calls need function wrapper OR computed():**
   ```javascript
   // Option A: Function wrapper (simple, re-calls method each time)
   ${each(() => this.getFilteredItems(), item => ...)}

   // Option B: computed() (caches result, only recomputes when deps change)
   mounted() {
       this._filtered = computed(() => this.getFilteredItems());
   }
   template() {
       return html`${each(() => this._filtered.get(), item => ...)}`;
   }
   ```

3. **For performance-critical getters, use computed():**
   ```javascript
   // Expensive computation - cache it
   mounted() {
       this._sortedData = computed(() => {
           return [...this.props.data].sort(/* expensive */);
       });
   }
   ```

### 5.5 Component Library Impact: Minimal

Most getter methods are simple derivations. The function wrapper approach means:

| Original Code | Migration |
|---------------|-----------|
| `${this.getLabel()}` | `${() => this.getLabel()}` |
| `${each(this.getData(), ...)}` | `${each(() => this.getData(), ...)}` |

This is a **find-and-replace migration**, not a rewrite. Many components may work without changes if they only use direct state/prop access.

---

## Part 6: Children and Slots

> **⚠️ SPIKE REQUIRED:** This area has significant complexity. Before committing to the timeline, implement a proof-of-concept covering the scenarios in §6.5.

### 6.1 The Challenge

Currently, children are passed as VNodes and Preact handles composition. Without Preact, we need explicit slot management.

**Current flow:**
1. Parent template includes `<child-component><p>Hello</p></child-component>`
2. Parser sees children, converts to VNodes
3. VNodes passed via `_vdxChildren` prop
4. Child component renders `${this.props.children}` into its template
5. Preact reconciles everything

**Complexity factors:**
- Children may have their own reactive bindings (from parent's state)
- Children may be conditionally rendered
- Named slots need separate handling
- Deeply nested custom elements compound the issue
- `raw()` within children needs dangerouslySetInnerHTML handling

### 6.2 Solution: Deferred Instantiation

Children remain as template descriptors until the parent renders them:

```javascript
// When parsing a custom element with children:
// <my-dialog><p>Hello</p></my-dialog>

// The parent component's template references children:
// template() {
//     return html`<div class="dialog">${this.props.children}</div>`;
// }

// At instantiation time, this.props.children contains template descriptors
// When the slot is processed, we instantiate them into that location
```

### 5.3 Implementation

```javascript
function instantiateElement(node, values, component, parent, effects) {
    const el = document.createElement(node.tag);
    
    // ... props, events setup ...
    
    if (node.isCustomElement) {
        // Don't instantiate children into the element directly
        // Instead, pass them as props for the custom element to render
        
        const childTemplates = [];
        const slotTemplates = {};
        
        for (const child of node.children) {
            // Collect child templates without instantiating
            // The custom element will instantiate them when it renders
            if (child.slot) {
                slotTemplates[child.slot] = slotTemplates[child.slot] || [];
                slotTemplates[child.slot].push({ compiled: child, values });
            } else {
                childTemplates.push({ compiled: child, values });
            }
        }
        
        // These will be available as this.props.children and this.props.slots
        el._pendingChildren = childTemplates;
        el._pendingSlots = slotTemplates;
    } else {
        // Regular element - instantiate children normally
        for (const child of node.children) {
            instantiateNode(child, values, component, el, effects);
        }
    }
    
    parent.appendChild(el);
}
```

In the child component, when rendering `${this.props.children}`:

```javascript
function instantiateSlot(node, values, component, parent, effects) {
    const value = values[node.index];

    // Check if this is a children/slots reference
    if (Array.isArray(value) && value[0]?.compiled) {
        // These are deferred child templates - instantiate them now
        for (const { compiled, values: childValues } of value) {
            const { fragment, effects: childEffects } = instantiateTemplate(
                compiled,
                childValues,
                component  // Use current component as context
            );
            effects.push(...childEffects);
            parent.appendChild(fragment);
        }
        return;
    }

    // ... rest of slot handling
}
```

### 6.4 Key Design Decision: Parent vs Child Context

**Question:** When a child template references `${this.state.foo}`, whose `this` is it?

**Answer:** The **parent's** context. Children are defined in the parent's template, so their bindings track parent state.

```javascript
// parent-component template:
html`
    <child-component>
        <p>${this.state.message}</p>  <!-- this = parent -->
    </child-component>
`

// When message changes:
// 1. Parent's effect for this binding re-runs
// 2. Updates the <p> inside child-component
// 3. Child component is NOT re-instantiated
```

**Implication:** Child templates must capture parent component reference at parse time.

### 6.5 Current Implementation Analysis

**Current flow (Preact):**
```
1. Parent template: <wrapper><p>${this.state.msg}</p></wrapper>
2. Parser sees <wrapper> with children
3. Children compiled as part of parent's template
4. At render time: children → VNodes
5. VNodes passed via _vdxChildren prop
6. Custom element renders ${this.props.children}
7. Preact reconciles everything
```

**Fine-grained flow (proposed):**
```
1. Parent template: <wrapper><p>${this.state.msg}</p></wrapper>
2. Parser sees <wrapper> with children
3. Children stored as deferred template descriptors
4. Descriptors passed to custom element
5. When custom element renders ${this.props.children}:
   a. Instantiate child templates with PARENT context
   b. Create effects for dynamic bindings
   c. Insert resulting DOM nodes
6. Parent state changes → effects in children re-run
```

### 6.6 Key Challenges

| Challenge | Description | Solution |
|-----------|-------------|----------|
| **Context preservation** | `${this.state.x}` in child must refer to parent | Store parent component ref in descriptor |
| **Effect ownership** | Who disposes child effects on unmount? | Child component tracks all nested effects |
| **Named slots** | Route `slot="foo"` to correct location | Parse at compile time, separate in descriptor |
| **Control flow in children** | `<wrapper>${when(cond, ...)}</wrapper>` | Deferred templates handle control flow naturally |
| **Nested forwarding** | `<outer><inner><p>Hi</p></inner></outer>` | Each level defers to next, context chain maintained |
| **Light DOM capture** | Root components with static HTML children | Parse innerHTML once at mount, convert to descriptors |

### 6.7 Spike Requirements

Before committing to timeline, prove these scenarios work:

1. **Basic children** - `<wrapper><p>Hello</p></wrapper>`
2. **Reactive children** - `<wrapper><p>${this.state.msg}</p></wrapper>` (parent state)
3. **Named slots** - `<dialog><div slot="footer">OK</div></dialog>`
4. **Control flow in children** - `<wrapper>${when(cond, html`<p>...</p>`)}</wrapper>`
5. **Nested custom elements** - `<outer><inner><p>Deep</p></inner></outer>`
6. **Children with raw()** - `<card>${raw(this.state.html)}</card>`
7. **Dynamic children list** - `<tabs>${each(tabs, t => html`<tab>...</tab>`)}</tabs>`
8. **State preservation (CSS hide)** - Tab switching with stateful children (from tests)
9. **Template as prop** - `<template-prop renderContent="${this.getTemplate()}">`
10. **Mixed content** - Text nodes + elements mixed as children

### 6.8 Existing Test Coverage

The `app/tests/children.test.js` provides 10 test scenarios that MUST pass:
- Basic children rendering
- Multiple children
- Conditional children (show prop)
- Named slots (header/footer)
- Nested component forwarding
- Empty children handling
- State preservation with CSS hide
- Template props (HOC pattern)
- Conditional with when()
- Mixed content (text + elements)

### 6.9 Spike Results (COMPLETED)

**Date:** December 2024
**Status:** ✅ All tests pass (12/12 browser, 7/7 Node)

#### Files Created

| File | Purpose |
|------|---------|
| `app/lib/core/template-renderer-spike.js` | Core fine-grained instantiation (~490 lines) |
| `app/tests/children-spike.test.js` | Browser-based tests (12 scenarios) |
| `app/tests/children-spike.html` | Test runner HTML |
| `app/tests/spike-validate.mjs` | Node.js core logic validation |
| `componentlib-e2e/run-spike-tests.js` | Puppeteer test runner |

#### Core Implementation

```javascript
// Deferred child descriptor - captures parent context for later instantiation
const DEFERRED_CHILDREN = Symbol('vdx:deferred-children');

export function createDeferredChild(compiled, values, parentComponent) {
    return {
        [DEFERRED_CHILDREN]: true,
        compiled,
        values,
        parentComponent,  // KEY: Parent reference for reactive context
        slotName: null
    };
}

// During instantiation, children use PARENT's component for effects:
const { fragment, effects } = instantiateTemplate(
    compiled,
    childValues,
    parentComponent  // Parent context, not wrapper's context
);
```

#### Validated Behaviors

1. **Context Preservation Chain** - Children at any nesting depth maintain reference to original parent state
2. **Reactive Updates** - Parent state changes propagate through deferred children correctly
3. **Effect Cleanup** - All effects dispose properly on cleanup()
4. **Child Ordering** - Multiple children maintain correct order
5. **Slot Routing** - Named slots (`slot="footer"`) route to correct locations

#### Key Bug Fixed During Spike

**Issue:** Children inserted in reverse order
**Cause:** Using `placeholder.after()` for each child puts them all immediately after placeholder
**Fix:** Track `insertPoint` and advance after each insertion

```javascript
// BEFORE (broken):
for (const item of value) {
    placeholder.after(fragment);  // Each goes right after placeholder = reverse
}

// AFTER (fixed):
let insertPoint = placeholder;
for (const item of value) {
    insertPoint.after(fragment);
    insertPoint = nodes[nodes.length - 1];  // Advance insertion point
}
```

#### Confidence Level: HIGH

The spike proves the core mechanism works. Remaining implementation work is mechanical:
- Integrate with existing template compiler
- Handle `each()` and `when()` control flow
- Implement custom element `_vdxChildren`/`_vdxSlots` handoff
- Add comprehensive test coverage

---

## Part 7: Virtual List Integration

### 7.1 The Problem

`virtual-list.js` is critical for music app performance (1000+ items). The current implementation:

1. Renders only visible items (windowing)
2. Uses `memoEach` with complex keys
3. Recycles DOM nodes on scroll
4. Passes `renderItem` callback prop

**Concern:** The naive `each()` implementation creates effects for ALL items upfront. For 1000 items = 1000 effects, even if only 20 are visible.

### 7.2 Solution: Virtualized `each()` Variant

```javascript
// template.js - NEW HELPER

/**
 * Virtualized list rendering - only creates effects for visible items.
 * Designed for use with virtual-list component.
 *
 * @param {Array|Function} items - Items array or getter
 * @param {Function} renderFn - Item render function
 * @param {Function} keyFn - Key extractor
 * @param {Object} options - Virtualization options
 * @returns {Object} Control flow descriptor
 */
export function virtualEach(items, renderFn, keyFn, options = {}) {
    return {
        __vdx_control: 'virtual-each',
        items,
        renderFn,
        keyFn,
        options  // { getVisibleRange: () => [start, end] }
    };
}
```

### 7.3 Virtual List Implementation

```javascript
// template-renderer.js

function instantiateVirtualEach(def, component, effects) {
    const container = document.createElement('div');
    container.style.position = 'relative';

    // Track: key → { nodes, effects, item, index }
    const itemMap = new Map();
    let visibleKeys = new Set();

    const effect = createEffect(() => {
        const items = typeof def.items === 'function' ? def.items() : def.items;
        const [start, end] = def.options.getVisibleRange?.() || [0, items.length];

        // Determine which items should be visible
        const newVisibleKeys = new Set();
        for (let i = start; i < end && i < items.length; i++) {
            const key = def.keyFn(items[i]);
            newVisibleKeys.add(key);
        }

        // Remove items no longer visible (dispose effects, keep nodes for recycling)
        for (const key of visibleKeys) {
            if (!newVisibleKeys.has(key)) {
                const entry = itemMap.get(key);
                if (entry) {
                    entry.effects.forEach(e => e.dispose());
                    entry.nodes.forEach(n => n.remove());
                    itemMap.delete(key);
                }
            }
        }

        // Add/update visible items
        for (let i = start; i < end && i < items.length; i++) {
            const item = items[i];
            const key = def.keyFn(item);

            if (!itemMap.has(key)) {
                // New visible item - create
                const content = def.renderFn(item, i);
                if (content?._compiled) {
                    const { fragment, effects: childEffects } = instantiateTemplate(
                        content._compiled,
                        content._values,
                        component
                    );
                    const nodes = [...fragment.childNodes];
                    container.appendChild(fragment);
                    itemMap.set(key, { nodes, effects: childEffects, item, index: i });
                }
            }
        }

        visibleKeys = newVisibleKeys;
    });

    effects.push(effect);
    return [container];
}
```

### 7.4 Music App Integration

The `virtual-list.js` component needs updates:

```javascript
// Before: passes renderItem callback, internal memoEach
// After: uses virtualEach internally with scroll-based visibility

export default defineComponent('virtual-list', {
    props: {
        items: [],
        renderItem: null,
        itemHeight: 40
    },

    mounted() {
        this._visibleRange = createMemo(() => {
            const scrollTop = this.state.scrollTop;
            const containerHeight = this.state.containerHeight;
            const start = Math.floor(scrollTop / this.props.itemHeight);
            const end = start + Math.ceil(containerHeight / this.props.itemHeight) + 1;
            return [start, Math.min(end, this.props.items.length)];
        });
    },

    template() {
        return html`
            <div class="virtual-list" on-scroll="handleScroll">
                <div class="spacer" style="height: ${() => this.props.items.length * this.props.itemHeight}px">
                    ${virtualEach(
                        () => this.props.items,
                        (item, i) => this.props.renderItem(item, i),
                        item => item.id || item.uuid,
                        { getVisibleRange: () => this._visibleRange() }
                    )}
                </div>
            </div>
        `;
    }
});
```

---

## Part 8: Lifecycle and Hook Semantics

### 8.1 `flushSync()` - Precise Definition

**Before (VDOM):**
```javascript
flushSync(() => {
    this.state.showInput = true;
});
// Forces immediate tree render, DOM is updated
this.refs.input.focus();
```

**After (Fine-grained):**
```javascript
flushSync(() => {
    this.state.showInput = true;
});
// Immediately runs all pending effects triggered by the state change
this.refs.input.focus();
```

**Implementation:**

```javascript
// reactivity.js

let pendingEffects = new Set();
let isFlushing = false;

export function flushSync(fn) {
    // Run the function
    fn?.();

    // Immediately execute any pending effects
    isFlushing = true;
    for (const effect of pendingEffects) {
        effect.run();
    }
    pendingEffects.clear();
    isFlushing = false;
}

// In createEffect, queue effects instead of running immediately:
function scheduleEffect(effect) {
    if (isFlushing) {
        effect.run();
    } else {
        pendingEffects.add(effect);
        queueMicrotask(flushEffects);
    }
}
```

### 8.2 `afterRender()` Hook

**Question:** When does `afterRender()` run if template only executes once?

**Answer:** `afterRender()` becomes `afterMount()` semantically, but we keep the name for compatibility.

**Behavior:**
- Called once after initial template instantiation
- Called after DOM is fully built and attached
- NOT called on state changes (no re-renders)

**For post-update DOM access**, use effects:

```javascript
// Before (VDOM) - afterRender called every render
afterRender() {
    this.refs.list.scrollTop = this.refs.list.scrollHeight;
}

// After (Fine-grained) - use effect for reactive updates
mounted() {
    // Create effect that runs when messages change
    this._scrollEffect = createEffect(() => {
        // Access reactive state to track it
        const messageCount = this.state.messages.length;
        // Then do DOM operation
        if (messageCount > 0) {
            this.refs.list.scrollTop = this.refs.list.scrollHeight;
        }
    });
},

unmounted() {
    this._scrollEffect?.dispose();
}
```

**Migration path:** Components using `afterRender()` for reactive DOM updates need review.

### 8.3 Error Boundaries

**Before (VDOM):** Tree rendering provided natural error isolation:
```javascript
try {
    renderComponentTree(component);
} catch (error) {
    component.renderError?.(error);
}
```

**After (Fine-grained):** Each effect needs error handling:

```javascript
// In createEffect wrapper
function createSafeEffect(fn, component) {
    return createEffect(() => {
        try {
            fn();
        } catch (error) {
            if (component?.options?.renderError) {
                // Render error UI in place of failed content
                const errorUI = component.options.renderError.call(component, error);
                // ... handle error UI rendering
            } else {
                console.error('Effect error in', component?.tagName, error);
                throw error;  // Re-throw if no handler
            }
        }
    });
}
```

**Component-level error boundary:**

```javascript
export default defineComponent('my-component', {
    renderError(error) {
        // Called when ANY effect in this component throws
        return html`<div class="error">${error.message}</div>`;
    },

    template() { /* ... */ }
});
```

---

## Part 9: Event Listener Cleanup

### 9.1 The Problem

Event listeners added during instantiation must be removed on unmount:

```javascript
// Current: listeners added but not tracked
el.addEventListener(name, handler);

// Problem: No way to remove them on component unmount
```

### 9.2 Solution: Tracked Listener Registry

```javascript
// template-renderer.js

function instantiateElement(node, values, component, parent, effects) {
    const el = document.createElement(node.tag);

    // Track listeners for cleanup
    const listeners = [];

    // Events
    for (const { name, def } of node.events) {
        const handler = resolveEventHandler(name, def, values, component);
        if (handler) {
            el.addEventListener(name, handler);
            listeners.push({ name, handler });
        }
    }

    // x-model listener
    if (hasXModel) {
        const eventType = isCheckbox ? 'change' : 'input';
        const handler = createXModelHandler(el, statePath, component);
        el.addEventListener(eventType, handler);
        listeners.push({ name: eventType, handler });
    }

    // Create cleanup effect (disposed on unmount)
    if (listeners.length > 0) {
        const cleanup = {
            dispose() {
                for (const { name, handler } of listeners) {
                    el.removeEventListener(name, handler);
                }
            }
        };
        effects.push(cleanup);
    }

    // ... rest of element setup
}
```

### 9.3 Custom Events via Ref Callbacks

Current pattern for hyphenated events:
```javascript
function createCustomEventsRef(events) {
    return (el) => {
        for (const { name, handler } of events) {
            el.addEventListener(name, handler);
        }
    };
}
```

**Updated pattern with cleanup:**
```javascript
function setupCustomEvents(el, events, effects) {
    for (const { name, handler } of events) {
        el.addEventListener(name, handler);
    }

    effects.push({
        dispose() {
            for (const { name, handler } of events) {
                el.removeEventListener(name, handler);
            }
        }
    });
}
```

---

## Part 10: `untracked()` Behavior

### 10.1 Current Purpose

`untracked()` prevents deep reactivity for large arrays:

```javascript
data() {
    return {
        songs: untracked([]),  // Don't create proxies for 1000+ items
    };
}
```

### 10.2 Fine-Grained Implications

**Good news:** With fine-grained reactivity, the concern changes:

| Aspect | VDOM Approach | Fine-Grained Approach |
|--------|--------------|----------------------|
| Tracking overhead | Deep proxy on every item | Only tracked when read in effect |
| Update cost | Diff entire array | Only effects that read changed item |
| Memory | Proxy per nested object | Effect per binding |

**Recommendation:** `untracked()` remains useful for:
1. Arrays where you replace the whole array (not mutate items)
2. Objects with many properties you don't need reactive
3. Third-party objects that shouldn't be proxied

**New guidance:**
```javascript
data() {
    return {
        // Use untracked when:
        // 1. Array is replaced wholesale, items aren't individually mutated
        songs: untracked([]),

        // 2. Object with many unused properties
        config: untracked({ /* big config */ }),

        // DON'T use untracked when:
        // 1. You need to track individual item changes
        // selectedSongs: [],  // Need to track .add()/.delete()
    };
}
```

---

## Part 11: Migration Strategy

> **Note:** Timeline estimates removed. Focus on phases and dependencies.

### Phase 0: Spike - Children/Slots (FIRST)

> **⚠️ BLOCKING:** Do this before committing to full migration.

**Goal:** Prove the children/slots architecture works.

**Deliverables:**
- Minimal proof-of-concept for all 7 scenarios in §6.5
- Document any design changes needed
- Identify breaking changes (if any)

**Decision gate:** If spike reveals fundamental issues, reconsider approach.

### Phase 1: Foundation + createMemo

**New files:**
- `lib/core/template-renderer.js` - DOM instantiation with effects

**Changes to reactivity.js:**
- Add `createMemo()` function
- Add `flushSync()` with precise semantics (§8.1)
- Add effect error handling wrapper

**Scope:**
- `instantiateTemplate()` - main entry point
- `instantiateNode()` - dispatcher
- `instantiateElement()` - element creation + static props + event cleanup
- `instantiateSlot()` - dynamic content with effects
- `cloneStaticNode()` - fast path for static content

**Tests:**
- Static template renders correctly
- Dynamic text binding updates
- Attribute binding updates
- Basic element nesting
- `createMemo()` caches and invalidates correctly
- Event listeners cleaned up on unmount

**Milestone:** Simple templates render without Preact + `createMemo` available

### Phase 2: Control Flow

**Additions to template-renderer.js:**
- `instantiateWhen()` - conditional rendering with effect cleanup
- `instantiateEach()` - list rendering with keyed reconciliation
- `instantiateAwait()` - async content
- `instantiateVirtualEach()` - virtualized list rendering (§7)

**Changes to template.js:**
- `memoEach` becomes alias for `each`
- Add `virtualEach()` helper

**Tests:**
- `when()` switches branches correctly
- `when()` disposes old branch effects
- `each()` handles add/remove/reorder
- `each()` disposes removed item effects
- `awaitThen()` shows pending/resolved/rejected states
- Nested control flow works
- `virtualEach()` only creates effects for visible items

**Milestone:** All control flow works without VDOM

### Phase 3: Component Integration

**Changes to component.js:**
- Remove `trackAllDependencies` usage
- Remove coordinated root rendering
- Replace `_doRender()` with `_instantiateTemplate()`
- Update lifecycle (mount once, effects handle updates)
- `afterRender()` called once after mount (§8.2)
- Error boundaries wrap effects (§8.3)

**Scope:**
- Store subscriptions continue to work (they update reactive state)
- Props changes trigger appropriate effects
- Refs work
- Lifecycle hooks work
- `flushSync()` works as documented

**Tests:**
- Component mounts and renders
- State changes update only affected bindings
- Store changes propagate
- Props changes work
- `flushSync()` forces immediate effect execution
- Error boundaries catch effect errors
- All existing component tests pass

**Milestone:** Components work with fine-grained rendering

### Phase 4: Children and Slots

**Changes:**
- Deferred child instantiation for custom elements
- Named slot support
- Parent context preservation for child bindings
- Light DOM capture for root components

**Tests:**
- All 7 spike scenarios pass (§6.5)
- Children render in custom elements
- Named slots work
- Nested custom elements work
- Reactive children update correctly
- Light DOM children captured and rendered

**Milestone:** Full component composition works

### Phase 5: Component Library Migration (Two-Stage)

#### Stage 5a: Quick Migration (Function Wrappers)

> **Goal:** Get all tests passing with minimal changes.

**Migration pattern (find-and-replace):**
```javascript
// Before (VDOM)
template() {
    const data = this.getPaginatedData();
    return html`${each(data, row => ...)}`;
}

// After (Fine-grained) - wrap in function
template() {
    return html`${each(() => this.getPaginatedData(), row => ...)}`;
}
```

**Components needing function wrappers:**
- `datatable.js` - `each(data, ...)` → `each(() => this.getPaginatedData(), ...)`
- `dropdown.js` - `each(options, ...)` → `each(() => this.getFilteredOptions(), ...)`
- `multiselect.js` - similar pattern
- `calendar.js` - similar pattern

**Tests:**
- All component library E2E tests pass (~150 tests)

**Milestone:** Component library works with fine-grained rendering

#### Stage 5b: Idiomatic Cleanup (Post-Verification)

> **Goal:** After tests pass, refactor to optimal patterns.

**Review each component for:**

1. **Expensive getters → `computed()`**
   ```javascript
   // Before (Stage 5a - works but recalculates every access)
   ${each(() => this.getSortedData(), row => ...)}

   // After (Stage 5b - cached, only recalculates when deps change)
   mounted() {
       this._sortedData = computed(() => this.getSortedData());
   }
   template() {
       return html`${each(() => this._sortedData.get(), row => ...)}`;
   }
   ```

2. **Multiple calls to same getter → single computed()**
   ```javascript
   // Before (getter called 3x per update)
   ${this.getLabel()} ... ${this.getLabel()} ... ${this.getLabel()}

   // After (computed once, accessed 3x)
   mounted() {
       this._label = computed(() => this.getLabel());
   }
   ```

3. **Cleanup unused patterns**
   - Remove `selectionVersion` workarounds
   - Remove manual cache invalidation
   - Simplify `memoEach` → `each` where appropriate

**Deliverable:** Componentlib as idiomatic example of fine-grained patterns

### Phase 6: Music App Migration

**Changes:**
- Remove `selectionVersion` pattern from `now-playing.js`
- Update `virtual-list` usage to new API
- Verify `untracked()` still appropriate for song arrays
- Update any `afterRender()` usage to effect pattern

**Specific files:**
- `pages/now-playing.js` - Remove selectionVersion, update queue rendering
- `components/mini-player.js` - Verify reactive bindings
- `stores/player-store.js` - No changes expected (store system unchanged)

**Tests:**
- Music app functions correctly
- Queue with 1000+ songs performs well
- Selection mode works without version bumping
- Offline mode works

**Milestone:** Music app works with fine-grained rendering

### Phase 7: Remove Preact

**Deletions:**
- `lib/vendor/preact/` directory
- All Preact imports
- VNode-related code in template-compiler.js
- `h()`, `Fragment` usage

**Changes:**
- `applyValues()` removed or repurposed
- Build static DOM instead of static VNodes

**Tests:**
- All 187 framework tests pass
- All 150 component library tests pass
- No Preact references remain
- Bundle size reduced

**Milestone:** Zero-dependency framework

### Phase 8: Optimization and Cleanup

**Tasks:**
- Performance benchmarks vs VDOM version
- Memory usage profiling
- Documentation updates
- Remove deprecated APIs (`trackAllDependencies`, etc.)
- Update TypeScript definitions

**Tests:**
- Performance benchmarks show improvement
- Large list performance acceptable
- Memory usage reduced
- No regressions in any test suite

**Milestone:** Production-ready fine-grained VDX

---

## Part 12: Design Decisions Required

### Decision 1: Children Context Ownership

**Question:** When child content has reactive bindings, should effects run in parent or child context?

**Options:**
| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| **A: Parent context** | `${this.state.x}` in child refers to parent | Intuitive, matches JSX | Complex implementation |
| **B: Child context** | Children can't access parent state | Simpler implementation | Breaking change, less useful |
| **C: Explicit prop passing** | Parent must pass data as props | Most explicit | Verbose, migration work |

**Recommendation:** Option A (parent context) - matches current behavior and user expectations.

**Implementation cost:** Medium - need to capture parent reference at template parse time.

### Decision 2: Virtual List API

**Question:** Should `virtualEach()` be a separate helper or integrated into `each()`?

**Options:**
| Option | API | Pros | Cons |
|--------|-----|------|------|
| **A: Separate helper** | `virtualEach(items, fn, key, opts)` | Explicit, clear intent | Two APIs to learn |
| **B: Option on each** | `each(items, fn, key, { virtual: true })` | Single API | Implicit behavior |
| **C: Component handles it** | `<virtual-list>` does its own thing | No framework changes | Component must manage effects |

**Recommendation:** Option A - explicit is better, and virtualization is an advanced use case.

### Decision 3: afterRender() Deprecation

**Question:** Should `afterRender()` be deprecated or kept with new semantics?

**Options:**
| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| **A: Keep, runs once** | Called after initial mount only | No breaking change | Confusing name |
| **B: Rename to afterMount** | Same as A but clearer name | Clear semantics | Migration needed |
| **C: Deprecate** | Remove, use effects | Clean API | Breaking change |

**Recommendation:** Option A for now - keep `afterRender()` running once after mount. Document that reactive DOM updates should use effects. Consider Option B in future major version.

### Decision 4: Effect Error Propagation

**Question:** When an effect throws, what should happen?

**Options:**
| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| **A: Log + continue** | Console error, other effects run | Resilient | Errors hidden |
| **B: Component error boundary** | Call `renderError()`, stop component | Contained failure | Partial render |
| **C: Throw** | Unhandled, bubbles up | Explicit | Breaks everything |

**Recommendation:** Option B - use existing `renderError()` hook, but only for template effects. User-created effects in `mounted()` should throw normally.

---

## Part 13: Potential Show-Stoppers

### ~~Show-Stopper 1: Children/Slots Complexity~~ (RESOLVED)

**Original concern:** The deferred instantiation model for children may not handle all edge cases.

**Resolution:** Phase 0 spike completed successfully (12/12 tests pass). Validated scenarios:

| Scenario | Status | Notes |
|----------|--------|-------|
| Basic children rendering | ✅ Pass | Static children render correctly inside wrapper |
| Reactive children (parent state) | ✅ Pass | `${this.state.x}` updates when parent state changes |
| Named slots routing | ✅ Pass | Children with `slot="name"` route correctly |
| Control flow in children (`when`) | ✅ Pass | Conditional children show/hide reactively |
| Nested custom elements | ✅ Pass | Deep nesting preserves context chain |
| Multiple children ordering | ✅ Pass | Children render in correct order |
| Mixed content (text + elements) | ✅ Pass | Interspersed text and elements work |
| Empty children | ✅ Pass | No errors with empty children array |
| Effect cleanup | ✅ Pass | Effects disposed on cleanup() |
| Context preservation chain | ✅ Pass | 3-level nesting maintains parent state binding |

**Spike implementation:** `app/lib/core/template-renderer-spike.js`
**Test files:** `app/tests/children-spike.test.js`, `app/tests/spike-validate.mjs`

**Key insight:** Deferred child descriptors with parent component reference work exactly as designed. The `parentComponent` reference in `createDeferredChild()` preserves reactive context through any level of nesting.

### ~~Show-Stopper 2: Component Library Effort~~ (RESOLVED)

**Original concern:** 81+ getter method migrations could introduce bugs.

**Resolution:** Function wrapper pattern (`() => this.getter()`) is a simple find-and-replace. No `createMemo` required for most components. `computed()` is optional performance optimization.

### ~~Show-Stopper 3: afterRender() Usage~~ (RESOLVED)

**Original concern:** Components relying on `afterRender()` per-update calls.

**Resolution:** Only 3 usages in codebase:
- `eq-response-canvas.js` - Pure init, runs-once is fine
- `textarea.js` - Needs effect for auto-resize (trivial migration)
- `qnote.js` - Needs effect for auto-expand (trivial migration)

**Migration effort:** ~10 lines of code total.

### Show-Stopper 2: Performance Regression with Many Effects

**Risk:** Components with many dynamic bindings create many effects.

**Specific concerns:**
- A component with 100 dynamic bindings = 100 effects
- Effect overhead per update might exceed VDOM diff savings

**Mitigation:**
- Benchmark early with realistic component complexity
- Consider effect batching/coalescing if needed
- Profile memory usage

### Show-Stopper 3: Form State Edge Cases

**Risk:** Edge cases in form state preservation not covered by smart x-model.

**Specific concerns:**
- Contenteditable elements
- Rich text editors
- File inputs
- Third-party form libraries

**Mitigation:**
- Test x-model with all input types
- Document edge cases and workarounds
- Provide escape hatch for manual DOM management

---

## Part 14: API Changes Summary

### New APIs

```javascript
// New export from template.js (optional, for virtual lists)
export { virtualEach } from './core/template.js';

// Already exists in reactivity.js (no change needed):
// - computed() - for cached derived values
// - memo() - for memoized functions
// - watch() - for side effects on value changes
```

### Breaking Changes: None Expected

All public APIs remain the same:
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
| `flushSync()` | Forces render | Flushes effects (simpler) |
| `afterRender()` | Called every render | Called once after mount |

### Deprecated (Remove in Future)

```javascript
trackAllDependencies()  // No longer needed
scheduleRootRender()    // No longer exists
performTreeRender()     // No longer exists
```

---

## Part 15: File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `lib/core/template-renderer.js` | DOM instantiation with effects |

### Modified Files

| File | Changes |
|------|---------|
| `lib/core/reactivity.js` | Update `flushSync()` semantics (minor) |
| `lib/core/component.js` | Remove VDOM rendering, use template-renderer |
| `lib/core/template.js` | `memoEach` → alias, add `virtualEach()` |
| `lib/core/template-compiler.js` | Build static DOM instead of VNodes |
| `lib/framework.js` | Update exports (add `virtualEach`) |

### Removed Files

| File | Reason |
|------|--------|
| `lib/vendor/preact/` | No longer needed |

### Unchanged Files

| File | Reason |
|------|--------|
| `lib/core/html-parser.js` | Parsing unchanged |
| `lib/core/store.js` | Works as-is |
| `lib/router.js` | Independent of rendering |
| `lib/utils.js` | Independent of rendering |

---

## Part 16: Performance Expectations

### Update Performance

| Scenario | Before (VDOM) | After (Fine-grained) |
|----------|---------------|----------------------|
| Single text binding | Re-render component → diff → patch | Run 1 effect → set textContent |
| Toggle class | Re-render → diff → patch | Run 1 effect → toggle class |
| Update 1 item in list of 1000 | Diff 1000 vnodes | Run 1 effect |
| Add item to list | Diff all + create 1 | Create 1 + insert |

### Memory

| Metric | Before | After |
|--------|--------|-------|
| Per-component overhead | VNode tree | Effect list |
| Per-binding overhead | VNode in tree | 1 effect (~100 bytes) |
| GC pressure | High (new VNodes each render) | Low (effects are stable) |

### Bundle Size

| Component | Before | After | Delta |
|-----------|--------|-------|-------|
| Preact | ~4KB | 0 | -4KB |
| Template renderer | 0 | ~2KB | +2KB |
| **Total** | ~4KB | ~2KB | **-2KB** |

---

## Part 17: Benchmarking Strategy

### 17.1 Benchmark Applications

Use real applications for meaningful performance comparison:

| App | Location | Characteristics |
|-----|----------|-----------------|
| **Shop** | `app/apps/shop/` | Routing, store, list rendering, cart updates |
| **Music** | `app/apps/music/` | Large lists (1000+ songs), virtual scroll, frequent updates |
| **Componentlib** | `app/componentlib/` | Complex components, many bindings per component |

### 17.2 Benchmark Scenarios

#### Scenario 1: Initial Render Performance
Measure time from component creation to fully rendered DOM.

```javascript
// Test harness
async function benchmarkInitialRender(componentTag, iterations = 100) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const el = document.createElement(componentTag);
        document.body.appendChild(el);
        await waitForRender();  // Wait for effects to settle
        times.push(performance.now() - start);
        document.body.removeChild(el);
    }

    return {
        mean: times.reduce((a, b) => a + b) / times.length,
        median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
        p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
    };
}
```

**Components to test:**
- `cl-datatable` with 100 rows
- `cl-dropdown` with 50 options
- `shop-products-page` with 20 products
- `now-playing` with 100 songs

#### Scenario 2: State Update Performance
Measure time from state change to DOM update complete.

```javascript
async function benchmarkStateUpdate(el, updateFn, iterations = 100) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        updateFn(el);
        await waitForRender();
        times.push(performance.now() - start);
    }

    return { mean, median, p95 };
}
```

**Updates to test:**
- Datatable: sort column change
- Dropdown: filter text change
- Music queue: song selection toggle
- Cart: add/remove item

#### Scenario 3: List Update Performance
Measure time to add/remove/reorder items in lists.

```javascript
// Test cases:
// 1. Append 100 items to empty list
// 2. Prepend 1 item to 1000-item list
// 3. Remove item from middle of 1000-item list
// 4. Reorder (shuffle) 100-item list
```

**Lists to test:**
- `each()` with datatable rows
- `each()` with dropdown options
- `memoEach()` with music queue
- `virtualEach()` with virtual list

#### Scenario 4: Effect Count and Memory
Measure effect overhead.

```javascript
function countEffects(component) {
    // Count effects created by component and children
    return component._effects?.length || 0;
}

function measureMemory() {
    if (performance.memory) {
        return performance.memory.usedJSHeapSize;
    }
    return null;
}
```

**Metrics:**
- Effects per component
- Memory per 1000 list items
- Memory after 1000 state updates (check for leaks)

### 17.3 Baseline Measurements (VDOM) - CAPTURED

**Date:** December 2024
**Environment:** Headless Chrome via Puppeteer
**Results file:** `app/benchmarks/benchmark-results-2025-12-26T02-10-53-238Z.json`

#### List Rendering (Initial)

| Benchmark | Mean | P95 |
|-----------|------|-----|
| Simple list (100 items) | 5.73ms | 7.30ms |
| Simple list (500 items) | 11.17ms | 12.50ms |
| Simple list (1000 items) | 14.53ms | 36.00ms |
| Complex list (100 items) | 9.30ms | 22.10ms |
| Complex list (500 items) | 21.03ms | 57.30ms |
| Memoized list (100 items) | 6.40ms | 10.90ms |
| Memoized list (500 items) | 12.22ms | 31.40ms |

#### List Updates

| Benchmark | Mean | P95 |
|-----------|------|-----|
| Append 1 to 100 items | 5.27ms | 6.70ms |
| Append 1 to 500 items | 7.82ms | 13.50ms |
| Prepend 1 to 100 items | 5.43ms | 7.40ms |
| Remove middle from 100 | 5.47ms | 9.10ms |
| Update 1 item in 100 | 5.05ms | 6.90ms |
| Update 10 items in 100 | 5.49ms | 9.10ms |
| Replace all 100 items | 5.46ms | 6.70ms |
| Shuffle 100 items | 6.10ms | 13.50ms |

#### Component Rendering

| Benchmark | Mean | P95 |
|-----------|------|-----|
| 20 bindings (initial) | 4.24ms | 4.40ms |
| 20 bindings (update 1) | 4.28ms | 4.60ms |
| 20 bindings (update all) | 4.30ms | 4.50ms |
| when() 5 conditions | 4.35ms | 4.50ms |
| when() toggle 1 | 4.39ms | 5.00ms |
| when() toggle all | 4.27ms | 4.50ms |
| Nested 5 levels | 4.87ms | 6.50ms |
| Nested 10 levels | 5.33ms | 6.20ms |
| Nested 20 levels | 5.61ms | 7.50ms |

#### Grid/Table

| Benchmark | Mean | P95 |
|-----------|------|-----|
| Grid 10x10 (initial) | 6.26ms | 9.30ms |
| Grid 50x10 (initial) | 10.29ms | 31.30ms |
| Grid 100x10 (initial) | 13.37ms | 27.50ms |
| Grid 100x10 (update cell) | 7.14ms | 13.90ms |
| Grid 100x10 (update row) | 7.75ms | 9.40ms |

#### Key Observations

1. **Update cost ≈ Initial cost**: Updating 1 item in a 100-item list (5.05ms) costs nearly as much as initial render (5.73ms). This is the VDOM overhead we aim to eliminate.

2. **Complexity scales**: Complex list items (with conditionals, multiple bindings) take ~1.6x longer than simple items.

3. **memoEach helps slightly**: Memoized lists are ~10% faster than regular lists for initial render.

4. **Nested components add overhead**: Each nesting level adds ~0.1ms (minimal impact).

### 17.4 Comparison Points

| Metric | VDOM Expectation | Fine-Grained Target |
|--------|------------------|---------------------|
| Initial render | Baseline | Within 20% (may be slower due to effect creation) |
| Single state update | Baseline | 2-5x faster (no full re-render) |
| Bulk state updates | Baseline | 5-10x faster (each update is O(1)) |
| List append | Baseline | 2x faster (no diff needed) |
| List reorder | Baseline | Similar (keyed reconciliation still needed) |
| Memory per item | Baseline | Within 50% (effects have overhead) |
| Effect count | 1 per component | 1 per dynamic binding |

### 17.5 Performance Gates

Migration MUST achieve:

1. **Initial render**: No more than 50% slower than VDOM
2. **State updates**: At least 2x faster than VDOM
3. **Memory**: No more than 2x memory per component
4. **No memory leaks**: Stable memory after 10,000 updates

### 17.6 Benchmark Implementation

```bash
# Create benchmark suite
app/benchmarks/
├── harness.js          # Timing utilities, statistics
├── baseline-vdom.js    # Run before migration
├── fine-grained.js     # Run after migration
├── compare.js          # Generate comparison report
└── scenarios/
    ├── datatable.js
    ├── dropdown.js
    ├── music-queue.js
    └── shop-cart.js
```

---

## Part 18: Testing Strategy

### 18.1 Unit Tests (template-renderer.js)

```javascript
describe('instantiateTemplate', () => {
    test('static text renders', () => { ... });
    test('dynamic text binding updates', () => { ... });
    test('attribute binding updates', () => { ... });
    test('class binding updates', () => { ... });
    test('style binding updates', () => { ... });
    test('event handlers fire', () => { ... });
    test('x-model two-way binding', () => { ... });
    test('refs are captured', () => { ... });
});

describe('when()', () => {
    test('renders truthy branch', () => { ... });
    test('renders falsy branch', () => { ... });
    test('switches branches on condition change', () => { ... });
    test('cleans up old branch effects', () => { ... });
});

describe('each()', () => {
    test('renders list items', () => { ... });
    test('adds new items', () => { ... });
    test('removes items', () => { ... });
    test('reorders items', () => { ... });
    test('keyed reconciliation preserves DOM', () => { ... });
    test('cleans up removed item effects', () => { ... });
});
```

### 18.2 Integration Tests

All existing 187 tests should pass unchanged—they test the public API.

### 18.3 Performance Tests

```javascript
// Benchmark: Update single binding in component
// Benchmark: Update 1 item in list of 1000
// Benchmark: Add item to list of 1000
// Benchmark: Remove item from list of 1000
// Benchmark: Reorder list of 1000
// Benchmark: Toggle when() condition with large subtree
```

---

## Part 19: Rollback Strategy

### Feature Flag Approach

```javascript
// lib/core/config.js
export const USE_FINE_GRAINED = true;

// lib/core/component.js
import { USE_FINE_GRAINED } from './config.js';

connectedCallback() {
    if (USE_FINE_GRAINED) {
        this._instantiateTemplate();  // New path
    } else {
        this._setupVDOMRendering();   // Old path (keep during migration)
    }
}
```

### Incremental Rollout

1. Implement fine-grained renderer alongside existing
2. Test with feature flag on
3. Run full test suite
4. Enable by default
5. Remove old code path after stabilization

---

## Appendix A: Effect Cleanup Pattern

```javascript
// Effects created during template instantiation are tracked
const effects = [];

// When component unmounts:
disconnectedCallback() {
    for (const effect of this._effects) {
        effect.dispose();  // Cleans up subscriptions
    }
    this._effects = [];
    this.innerHTML = '';  // Clear DOM
}

// When control flow branch changes:
function instantiateWhen(...) {
    let branchEffects = [];
    
    createEffect(() => {
        // On branch change:
        for (const eff of branchEffects) eff.dispose();
        branchEffects = [];
        
        // Create new branch effects...
    });
}
```

---

## Appendix B: Why selectionVersion Becomes Unnecessary

**Before (VDOM):**
```javascript
// memoEach caches by key - need to bust cache when selection changes
${memoEach(items, item => html`
    <div class="${this.isSelected(item.id) ? 'selected' : ''}">
`, item => `${item.id}-${this.state.selectionVersion}`)}
//                        ^^^^^^^^^^^^^^^^^^^^^^^^ cache buster

// On selection change:
this.state.selectedIndices = newSet;
this.state.selectionVersion++;  // Force memoEach to re-render
```

**After (Fine-grained):**
```javascript
// Each item has its own effect
${each(items, item => html`
    <div class="${() => this.isSelected(item.id) ? 'selected' : ''}">
`, item => item.id)}

// isSelected reads this.state.selectedIndices
// When selectedIndices changes, effects that read it re-run
// Only affected items update - no cache busting needed
```

---

## Appendix C: Handling Dynamic Template Structures

Some components conditionally return different templates:

```javascript
template() {
    if (this.state.error) {
        return html`<div class="error">${this.state.error}</div>`;
    }
    return html`<div class="content">...</div>`;
}
```

**Solution:** Wrap in `when()` inside a single template:

```javascript
template() {
    return html`
        ${when(this.state.error,
            () => html`<div class="error">${this.state.error}</div>`,
            () => html`<div class="content">...</div>`
        )}
    `;
}
```

This is already the recommended pattern and works perfectly with fine-grained rendering.

---

## Appendix D: Quick Reference - Before/After

### Component Rendering

**Before:**
```javascript
// State change → trackAllDependencies sees it → scheduleRootRender
// → queueMicrotask → performTreeRender → _doRender
// → template() → applyValues → VNodes → preactRender → diff → patch
```

**After:**
```javascript
// State change → effect that reads this state re-runs → updates DOM directly
```

### Effect Count

**Before:** 1 effect per component (tracks everything)

**After:** ~N effects per component (N = number of dynamic bindings)

### Template Execution

**Before:** `template()` runs on every state change

**After:** `template()` runs once at mount; effects handle updates
