# Testing

Complete guide to running and writing tests for the framework.

## Table of Contents

- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Assertion API](#assertion-api)
- [Test Structure](#test-structure)
- [Adding New Tests](#adding-new-tests)

## Running Tests

The framework has two test suites:
1. **Framework Unit Tests** (~190 tests) - Core framework functionality
2. **Component Library E2E Tests** (~175 tests) - UI component testing with Puppeteer

Both require the test server running first:

```bash
cd app
python3 test-server.py
```

### Framework Unit Tests (Browser)

Open in browser: http://localhost:9000/tests/

Tests will run automatically and display results in a clean UI.

### Framework Unit Tests (Headless)

```bash
cd componentlib-e2e
node run-framework-tests.js
```

### Component Library E2E Tests

```bash
cd componentlib-e2e
node test-runner.js

# Only show output from failing tests (quieter for CI)
node test-runner.js --only-errors
```

E2E tests include:
- Form components (input, textarea, checkbox, toggle, slider, etc.)
- Selection components (dropdown, multiselect, autocomplete)
- Data components (datatable, tree, paginator)
- Panel components (accordion, tabview, fieldset)
- Overlay components (dialog, sidebar, toast)
- **Accessibility tests** (axe-core WCAG compliance, ARIA attributes, keyboard navigation)

## Test Coverage

All 125 tests pass, covering:

### Reactivity System (`reactivity.test.js`)
- ✅ Creates reactive proxies
- ✅ Tracks dependencies with effects
- ✅ Handles nested reactive objects
- ✅ Only triggers on actual value changes
- ✅ Computed values with lazy evaluation
- ✅ Watch callbacks with old/new values
- ✅ Array mutations
- ✅ Proxy reuse for already-reactive objects
- ✅ Primitive value handling

### Store System (`store.test.js`)
- ✅ Initial state creation
- ✅ State updates via `set()` and `update()`
- ✅ Subscriber notifications
- ✅ Unsubscribe functionality
- ✅ Multiple subscribers

### Template Security (`template.test.js`)
- ✅ HTML content escaping (`<script>` tags)
- ✅ HTML attribute escaping (quote injection)
- ✅ URL sanitization (javascript: protocol)
- ✅ Dangerous URL schemes (data:, vbscript:, etc.)
- ✅ Safe URL schemes (https:, mailto:, tel:)
- ✅ Explicit raw HTML with `raw()`
- ✅ Unicode normalization (BOM removal)
- ✅ Special character escaping (&, <, >, ", ', /)
- ✅ Null/undefined handling
- ✅ Number and boolean handling
- ✅ HTML entity decoding in URL detection

### Component System (`component.test.js`)
- ✅ Component registration
- ✅ Props system
- ✅ Lifecycle hooks
- ✅ Event binding
- ✅ Template rendering
- ✅ Auto-bound methods

### Router System (`router.test.js`)
- ✅ Hash routing
- ✅ HTML5 routing
- ✅ Route parameters
- ✅ Navigation
- ✅ Lazy loading
- ✅ Route guards

## Writing Tests

Tests use a simple describe/it API similar to Jest/Mocha:

```javascript
import { describe, assert } from './test-runner.js';
import { myFunction } from '../core/mymodule.js';

describe('My Module', function(it) {
    it('does something', () => {
        const result = myFunction(5);
        assert.equal(result, 10, 'Should double the input');
    });

    it('handles edge cases', () => {
        assert.throws(() => myFunction(null), Error);
    });

    it('works asynchronously', async () => {
        const result = await asyncFunction();
        assert.equal(result, 'expected');
    });
});
```

## Assertion API

### assert.equal(actual, expected, message)
Strict equality check (`===`):

```javascript
assert.equal(result, 10, 'Should be 10');
assert.equal(user.name, 'Alice', 'Name should be Alice');
```

### assert.deepEqual(actual, expected, message)
Deep object/array equality:

```javascript
assert.deepEqual(
    { name: 'Alice', age: 30 },
    { name: 'Alice', age: 30 },
    'Objects should match'
);

assert.deepEqual(
    [1, 2, 3],
    [1, 2, 3],
    'Arrays should match'
);
```

### assert.ok(value, message)
Truthy value check:

```javascript
assert.ok(user, 'User should exist');
assert.ok(result > 0, 'Result should be positive');
```

### assert.throws(fn, expectedError, message)
Function throws expected error:

```javascript
assert.throws(
    () => myFunction(null),
    Error,
    'Should throw Error for null input'
);

assert.throws(
    () => myFunction(-1),
    RangeError,
    'Should throw RangeError for negative input'
);
```

### assert.rejects(promise, expectedError, message)
Promise rejects with expected error:

```javascript
await assert.rejects(
    asyncFunction(null),
    Error,
    'Should reject for null input'
);
```

### assert.isType(value, type, message)
Type checking:

```javascript
assert.isType(user, 'object', 'User should be object');
assert.isType(count, 'number', 'Count should be number');
assert.isType(name, 'string', 'Name should be string');
```

### assert.includes(array, value, message)
Array includes value:

```javascript
assert.includes([1, 2, 3], 2, 'Array should include 2');
assert.includes(['a', 'b', 'c'], 'b', 'Array should include b');
```

### assert.isNull(value, message)
Value is null:

```javascript
assert.isNull(result, 'Result should be null');
```

### assert.isNotNull(value, message)
Value is not null:

```javascript
assert.isNotNull(user, 'User should not be null');
```

## Test Structure

```
tests/
├── index.html           # Test runner page
├── test-runner.js       # Test framework (~190 lines)
├── reactivity.test.js   # Reactivity tests
├── store.test.js        # Store tests
├── template.test.js     # Template/security tests
├── component.test.js    # Component tests
├── router.test.js       # Router tests
└── README.md            # This file
```

## Adding New Tests

1. Create a new test file in `tests/` directory:
   ```javascript
   // tests/myfeature.test.js
   import { describe, assert } from './test-runner.js';
   import { myFeature } from '../core/myfeature.js';

   describe('My Feature', function(it) {
       it('works correctly', () => {
           assert.ok(myFeature());
       });

       it('handles errors', () => {
           assert.throws(() => myFeature(null), Error);
       });
   });
   ```

2. Import it in `tests/index.html`:
   ```html
   <script type="module">
       import './test-runner.js';
       import './reactivity.test.js';
       import './store.test.js';
       import './template.test.js';
       import './myfeature.test.js';  <!-- Add your test -->
   </script>
   ```

3. Refresh the browser - tests run automatically!

## Example Tests

### Testing Reactive State

```javascript
import { describe, assert } from './test-runner.js';
import { reactive } from '../core/reactivity.js';

describe('Reactivity', function(it) {
    it('creates reactive proxy', () => {
        const state = reactive({ count: 0 });
        assert.equal(state.count, 0);
        state.count = 5;
        assert.equal(state.count, 5);
    });

    it('handles nested objects', () => {
        const state = reactive({
            user: { name: 'Alice' }
        });
        state.user.name = 'Bob';
        assert.equal(state.user.name, 'Bob');
    });
});
```

### Testing Components

```javascript
import { describe, assert } from './test-runner.js';
import { defineComponent } from '../core/component.js';

describe('Component', function(it) {
    it('defines custom element', () => {
        defineComponent('test-component', {
            template() {
                return html`<div>Hello</div>`;
            }
        });

        const el = document.createElement('test-component');
        document.body.appendChild(el);

        assert.ok(el.textContent === 'Hello', 'Should render template');
        document.body.removeChild(el);
    });
});
```

### Testing Templates

```javascript
import { describe, assert } from './test-runner.js';
import { html, raw } from '../core/template.js';

describe('Template', function(it) {
    it('escapes HTML', () => {
        const userInput = '<script>alert("XSS")</script>';
        const template = html`<div>${userInput}</div>`;

        // Template should escape the script tag
        assert.ok(!template.toString().includes('<script>'));
    });

    it('allows raw HTML for trusted content', () => {
        const trusted = '<strong>Bold</strong>';
        const template = html`<div>${raw(trusted)}</div>`;

        assert.ok(template.toString().includes('<strong>'));
    });
});
```

## Philosophy

This test suite follows the same zero-dependency philosophy as the framework:
- No npm packages required
- No build step needed
- Works directly in the browser
- Fast and simple to use
- Easy to debug with browser DevTools

## Best Practices

### 1. Test One Thing per Test

```javascript
// ✅ GOOD - Tests one specific behavior
it('increments counter', () => {
    const state = reactive({ count: 0 });
    state.count++;
    assert.equal(state.count, 1);
});

// ❌ BAD - Tests multiple things
it('handles counter', () => {
    const state = reactive({ count: 0 });
    state.count++;
    assert.equal(state.count, 1);
    state.count += 5;
    assert.equal(state.count, 6);
    state.count = 0;
    assert.equal(state.count, 0);
});
```

### 2. Use Descriptive Test Names

```javascript
// ✅ GOOD - Clear what's being tested
it('throws error for negative input', () => {
    assert.throws(() => myFunction(-1), Error);
});

// ❌ BAD - Vague
it('handles errors', () => {
    assert.throws(() => myFunction(-1), Error);
});
```

### 3. Clean Up After Tests

```javascript
it('creates element in DOM', () => {
    const el = document.createElement('test-element');
    document.body.appendChild(el);

    // ... test code ...

    // ✅ GOOD - Cleanup
    document.body.removeChild(el);
});
```

### 4. Test Edge Cases

```javascript
describe('myFunction', function(it) {
    it('handles normal input', () => {
        assert.equal(myFunction(5), 10);
    });

    it('handles zero', () => {
        assert.equal(myFunction(0), 0);
    });

    it('handles negative numbers', () => {
        assert.throws(() => myFunction(-1), Error);
    });

    it('handles null', () => {
        assert.throws(() => myFunction(null), Error);
    });
});
```

## See Also

- [components.md](components.md) - Component development patterns
- [security.md](security.md) - Security best practices and XSS protection
- [api-reference.md](api-reference.md) - Complete API reference
