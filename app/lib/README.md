# Framework Library

Source code for the zero-dependency reactive web framework.

## Structure

```
lib/
├── framework.js         # Barrel export: Component system, reactivity, templates, stores
├── router.js            # Router system (moved from core/)
├── utils.js             # Utilities (moved from core/)
├── core/                # Framework internals (use barrel exports instead)
│   ├── component.js     # Component definition system
│   ├── reactivity.js    # Reactive proxy system
│   ├── template.js      # Template helpers (html, when, each, raw)
│   ├── template-compiler.js # Template → Preact VNode compiler
│   └── store.js         # State management
└── vendor/
    └── preact/          # Vendored Preact 10.x (~4KB, zero npm dependencies)
```

## Usage

**Import from barrel exports:**
```javascript
// ✅ CORRECT - Use barrel exports
import { defineComponent, html, when } from './lib/framework.js';
import { Router, defineRouterOutlet } from './lib/router.js';
import { notify, darkTheme } from './lib/utils.js';
```

**Don't import from core/ directly (unless testing internals):**
```javascript
// ❌ WRONG - Don't import from core/ directly
import { html } from './lib/core/template.js';
import { defineComponent } from './lib/core/component.js';
```

## Framework API

### `framework.js`
**Components:**
- `defineComponent(name, options)` - Define a custom element component

**Templates:**
- `html`` ` - Tagged template for HTML with auto-escaping
- `when(condition, then, else)` - Conditional rendering
- `each(array, mapFn)` - List rendering
- `raw(htmlString)` - Unsafe HTML (use sparingly)
- `pruneTemplateCache()` - Clear template compilation cache

**Reactivity:**
- `reactive(obj)` - Create reactive proxy
- `createEffect(fn)` - Run function when dependencies change
- `computed(fn)` - Create computed value
- `isReactive(value)` - Check if value is reactive
- `watch(fn, callback)` - Watch reactive dependencies
- `memo(fn, deps)` - Memoize function result
- `trackAllDependencies(obj)` - Deep dependency tracking

**Stores:**
- `createStore(initial)` - Create reactive store with pub/sub

**Preact (advanced):**
- `h, Fragment, render, Component, createContext` - Preact primitives

### `router.js`
- `Router(routes)` - Create router instance
- `defineRouterOutlet()` - Define `<router-outlet>` element
- `defineRouterLink(router)` - Define `<router-link>` element

### `utils.js`
- `notify(message, severity, ttl)` - Show toast notification
- `notifications` - Reactive store of current notifications
- `darkTheme` - Reactive dark theme store
- `localStore(key, initial)` - localStorage-backed reactive store

## Examples

See:
- `../components/` - Example components
- `../playground/` - Interactive demos
- `../tests/` - Comprehensive test suite
- `../dist/` - Standalone bundled versions
