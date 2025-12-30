# Optimization & Linting Guide

This guide covers how to use the VDX optimizer for build-time transformations, linting, and production builds.

## Quick Reference

```bash
# Development linting - find all issues
node optimize.js -i ./app -l

# CI linting - fail on unfixable issues only
node optimize.js -i ./app -l --strict

# Auto-fix simple issues
node optimize.js -i ./app --auto-fix

# Build with optimization
node optimize.js -i ./app -o ./dist

# Build with minification + source maps
node optimize.js -i ./app -o ./dist -m -s
```

## What the Optimizer Does

The optimizer transforms your code for fine-grained reactivity without requiring runtime `eval()`:

1. **Wraps reactive expressions** - Transforms `${expr}` in `html`` templates to `${html.contain(() => expr)}`
2. **Fixes early dereferences** - Inlines `const x = this.state.y` into template expressions
3. **Strips eval(opt())** - Removes redundant runtime wrappers
4. **Optionally minifies** - JavaScript minification with source maps

### Before Optimization
```javascript
template() {
    const { count } = this.state;
    return html`<div>${count}</div>`;
}
```

### After Optimization
```javascript
template() {
    return html`<div>${html.contain(() => (this.state.count))}</div>`;
}
```

## CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--input` | `-i` | Input directory (required) |
| `--output` | `-o` | Output directory (required for build) |
| `--minify` | `-m` | Minify JavaScript output |
| `--sourcemap` | `-s` | Generate source maps (implies --minify) |
| `--wrapped-only` | | Only optimize `eval(opt())` wrapped templates |
| `--lint-only` | `-l` | Check for issues without transforming |
| `--strict` | | With --lint-only: only show unfixable issues |
| `--auto-fix` | | Fix simple patterns in-place |
| `--verbose` | `-v` | Show detailed processing info |
| `--dry-run` | | Preview without writing files |
| `--help` | `-h` | Show help message |

## Linting Modes

### Development Linting

Check all files for issues that break reactivity:

```bash
node optimize.js -i ./app -l
```

This shows both:
- **Fixable issues** - The optimizer will fix these automatically
- **Unfixable issues** - You must fix these manually

Exit codes:
- `0` - No issues
- `1` - Fixable issues found
- `2` - Unfixable issues found

### CI/Strict Linting

For CI pipelines, use `--strict` to only fail on issues the optimizer can't fix:

```bash
node optimize.js -i ./app -l --strict
```

Exit codes:
- `0` - No unfixable issues (code is ready for optimization)
- `1` - Unfixable issues found (must fix manually)

### Auto-Fix

Automatically fix simple early dereference patterns:

```bash
# Preview fixes
node optimize.js -i ./app --auto-fix --dry-run

# Apply fixes
node optimize.js -i ./app --auto-fix
```

Auto-fix handles:
- `const x = this.state.y` → replaced with `this.state.y`
- `const { x, y } = this.state` → replaced with `this.state.x`, `this.state.y`

Auto-fix **cannot** handle:
- Computed expressions: `const x = this.state.y + 1`
- Logical operations: `const x = this.state.y || default`
- Function calls: `const x = fn(this.state.y)`

## Error Categories

### 1. Early Dereferences (Fixable)

Variables extracted from state before the template:

```javascript
// ⚠️ FIXABLE - optimizer will inline
const { count } = this.state;
return html`<div>${count}</div>`;
```

### 2. Captured Variables in Callbacks (Fixable)

Variables captured in arrow functions lose reactivity:

```javascript
// ⚠️ FIXABLE - optimizer will inline
const { count } = this.state;
${when(condition, () => html`<span>${count}</span>`)}
```

### 3. Stale Arguments (UNFIXABLE)

Computed values passed to helpers become stale:

```javascript
// ❌ UNFIXABLE - must refactor manually
const items = data.slice(this.state.start, this.state.end);
${memoEach(items, item => html`<div>${item.name}</div>`)}
```

**Fix:** Move the computation inside the helper or use a different pattern:

```javascript
// ✅ CORRECT - computation inside each iteration
${memoEach(
    this.state.data,
    (item, idx) => {
        if (idx < this.state.start || idx >= this.state.end) return null;
        return html`<div>${item.name}</div>`;
    },
    item => item.id
)}
```

### 4. Complex Dereferences (UNFIXABLE)

Computed expressions can't be automatically inlined:

```javascript
// ❌ UNFIXABLE - expression is computed
const displayName = this.state.user?.name || 'Guest';
return html`<div>${displayName}</div>`;
```

**Fix:** Move computation into template:

```javascript
// ✅ CORRECT - expression in template
return html`<div>${this.state.user?.name || 'Guest'}</div>`;
```

## Build Commands

### Development Build

Optimize without minification:

```bash
node optimize.js -i ./app -o ./dist
```

### Production Build

Optimize with minification and source maps:

```bash
node optimize.js -i ./app -o ./dist -m -s
```

### Wrapped-Only Mode

Only optimize templates explicitly wrapped in `eval(opt())`:

```bash
node optimize.js -i ./app -o ./dist --wrapped-only
```

Use this when migrating incrementally or when some templates shouldn't be optimized.

## Runtime vs Build-Time Optimization

### Runtime (`eval(opt())`)

For development without a build step:

```javascript
import { opt } from './lib/opt.js';

template: eval(opt(() => html`<div>${this.state.count}</div>`))
```

**Requires:** `'unsafe-eval'` in Content-Security-Policy

### Build-Time (Recommended)

Run the optimizer as a build step:

```bash
node optimize.js -i ./src -o ./dist -m -s
```

**Benefits:**
- No `'unsafe-eval'` CSP requirement
- Smaller bundle (no runtime optimizer)
- Better error detection at build time

## Workflow Recommendations

### Development

1. Write code normally with `this.state.x` in templates
2. Run linting periodically: `node optimize.js -i ./app -l`
3. Fix unfixable issues as they arise

### Pre-Commit

Add to your pre-commit hook:

```bash
node optimize.js -i ./app -l --strict || exit 1
```

### CI/CD

```yaml
# In your CI config
- run: node optimize.js -i ./app -l --strict
- run: node optimize.js -i ./app -o ./dist -m -s
```

## Source Maps

When using `--sourcemap`:

1. Source maps are generated alongside minified files (`.js.map`)
2. Original source is embedded in `sourcesContent`
3. Identifier names are tracked in the `names` array for debugger support
4. Debuggers can map minified code back to original source

**Validation:** Use the included validation tool to check source maps:

```bash
node validate-sourcemaps.js                    # Validate all dist/ files
node validate-sourcemaps.js --verbose file.js  # Detailed validation
```

**To use source maps in the browser:**
- Chrome/Firefox DevTools automatically load `.map` files
- Enable "Enable JavaScript source maps" in DevTools settings

### Source Map Trade-offs

When `--sourcemap` is enabled:

- JavaScript code is fully minified
- Whitespace in `html`` templates is collapsed (multiple spaces/newlines → single space)
- CSS in `styles:` blocks remains readable (full CSS minification skipped)
- Source maps accurately point to original source positions

Without `--sourcemap`, all content (JS, CSS, HTML templates) is fully minified for smallest size.

## Troubleshooting

### "Unfixable early dereference" Error

The optimizer can't inline computed expressions. Refactor to keep reactive expressions in templates:

```javascript
// ❌ Can't fix
const x = this.state.count * 2;
return html`<div>${x}</div>`;

// ✅ Fixed
return html`<div>${this.state.count * 2}</div>`;
```

### CSP "unsafe-eval" Required

If using runtime `eval(opt())`, you need:

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval'">
```

To avoid this, use build-time optimization instead.

## See Also

- [docs/reactivity.md](reactivity.md) - Reactive state patterns
- [docs/templates.md](templates.md) - Template syntax and helpers
- [docs/bundles.md](bundles.md) - Pre-bundled framework files
