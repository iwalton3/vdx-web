# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**VDX - Vanilla Developer Experience** consists of:
- **vdx-web**: Core framework (in `/app/lib/`) - Zero-dependency reactive web framework
- **vdx-ui**: Component library (in `/app/componentlib/`) - Professional UI components (cl-* prefix)

The framework requires **no build step** - it runs directly in the browser using ES6 modules.

## Quick Start

```bash
cd app && python3 test-server.py
# Open http://localhost:9000/
```

## Running Tests

Both test suites require the test server running first.

```bash
# Framework unit tests (~480 tests)
cd componentlib-e2e && node run-framework-tests.js
# Or open http://localhost:9000/tests/

# Component library E2E tests (~260 tests)
# PREFER --only-errors: it runs the files in parallel (~10x faster) and only
# prints output from failing tests. Use the bare command only when you need the
# full passing-test output for debugging.
cd componentlib-e2e && node test-runner.js --only-errors

# Full output (slower, sequential)
node test-runner.js
```

## Required Reading (VERY IMPORTANT)

**You MUST read these docs before starting work** - this CLAUDE.md is a summary only:

| Before doing... | Read this first |
|-----------------|-----------------|
| Writing/modifying ANY VDX component | [FRAMEWORK.md](FRAMEWORK.md) |
| Working on componentlib (cl-*) | [docs/componentlib.md](docs/componentlib.md) |

**FRAMEWORK.md is essential** - it contains component construction, event binding, templates, reactivity, stores, and router patterns that are NOT in this file. Do not attempt component work without reading it first.

## Documentation Reference

| Doc File | When to Read |
|----------|--------------|
| [docs/components.md](docs/components.md) | Component lifecycle, props, children, slots |
| [docs/templates.md](docs/templates.md) | html\`\`, x-model, event binding, helpers |
| [docs/reactivity.md](docs/reactivity.md) | Reactive state, stores, computed properties |
| [docs/routing.md](docs/routing.md) | Router setup, redirects, params, navigation |
| [docs/security.md](docs/security.md) | XSS protection, input validation, CSRF |
| [docs/performance.md](docs/performance.md) | Large/editable lists, virtual scroll, memoEach invalidation, high-frequency state |
| [docs/testing.md](docs/testing.md) | Writing and running tests |
| [docs/optimization.md](docs/optimization.md) | Build-time optimizer, linting, source maps |
| [docs/componentlib.md](docs/componentlib.md) | cl-* UI components |
| [docs/typescript.md](docs/typescript.md) | TypeScript support and type checking |
| [docs/api-reference.md](docs/api-reference.md) | Complete API reference |
| [docs/tutorial.md](docs/tutorial.md) | Learning VDX from scratch |

## Key Framework Conventions

1. **New components are classes** - `class X extends Component` + `defineComponent('tag', X)`. The options-object format is legacy: fully supported, but don't write new code in it. Props go in `static props`, NEVER class fields; getters are cached computeds (read only state/stores/props)
2. **Use `on-*` for ALL events** - Never use inline `onclick` or `addEventListener`
3. **Use `x-model` for form inputs** - Two-way binding
4. **Use `when()` and `each()`** - Not ternaries or manual loops
5. **Call store methods on `.state`** - `store.state.method()`, not `store.method()`
6. **Clean up in `unmounted()`** - Unsubscribe from stores, clear timers
7. **Windowed lists**: use `createWindowing` (or `<cl-virtual-list>`) - never hand-roll spacer/range math
8. **Row gestures** (drag-reorder, long-press): use `createRowGestures` and respect its passive-safety table
9. **Touch/wheel handlers in scrollable UIs**: bind `-passive` unless the handler must preventDefault

## Common Gotchas

### Reactive Proxies
- **Identity is stable for repeated reads**: `state.x === state.x` holds (cached proxies), but a raw object captured before insertion `!==` its proxied read - compare primitives when mixing raw and proxied references
- **Can't be stored in IndexedDB**: Use `JSON.parse(JSON.stringify(data))` to strip proxy

### propsChanged Timing
Use `newValue` parameter directly, not `this.props` (may have old value):
```javascript
propsChanged(prop, newValue) {
    if (prop === 'data') this._process(newValue);  // ✅ not this.props.data
}
```

### data() and props (legacy options format only)
`this.props` exists during `data()` (safe for controller option factories like `itemHeight: () => this.props.itemHeight`), but attribute/property values arrive later - use function-form options, never read prop values eagerly in `data()`. Class components don't have this problem: the constructor runs at first connect and `constructor(props)` sees real values.

### Reactive Boundaries
Variables captured outside `contain()` won't update:
```javascript
// ❌ count captured before contain, won't react
const count = this.state.count;
${contain(() => html`<p>${count}</p>`)}

// ✅ Access state inside contain
${contain(() => html`<p>${this.state.count}</p>`)}
```

### Component-Level Router Outlets
Call `router.setOutlet()` in `mounted()` if component has its own `<router-outlet>`.

### Error Boundary Prop Availability
Props may be `null` in `renderError()` - use CustomEvents for recovery actions.

### No Shadow DOM
This framework does not use shadow DOM. Light-DOM children are captured at mount, exposed as `this.props.children` / `this.props.slots`, and rendered by the framework's own fine-grained template renderer (no virtual DOM library involved).

## Getting Help

- `/app/tests/` - Working examples
- `/app/lib/core/` - Framework internals (~6800 lines); `lib/windowing.js` + `lib/gestures.js` are the list controllers
- `/app/components/` - Component patterns
- `/app/componentlib/` - UI component library source
- Read the docs/ folder for detailed information
