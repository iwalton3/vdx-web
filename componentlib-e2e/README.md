# Test Suite

Comprehensive test suite for the framework and component library using Puppeteer.

## Test Suites

1. **Framework Unit Tests** (`run-framework-tests.js`) - 146 unit tests for the core framework
2. **Component E2E Tests** (`test-runner.js`) - 85+ E2E tests for the component library

## Test Coverage

### Framework Unit Tests (146 tests)
- **Reactivity System** - 13 tests
- **Store System** - 6 tests
- **Template Security** - 24 tests
- **Template Compiler** - 32 tests
- **Component System** - 12 tests
- **Authentication** - 8 tests
- **Router** - 9 tests
- **Utilities** - 15 tests
- **New Features** - 27 tests (x-model, computed, auto-bound methods, virtual list, etc.)

### Component E2E Tests (85 tests)
- **Button Components** (`button-components.test.js`) - 18 tests
- **Form Components** (`form-components.test.js`) - 18 tests
- **Selection Components** (`selection-components.test.js`) - 16 tests
- **Overlay Components** (`overlay-components.test.js`) - 13 tests
- **Data Components** (`data-components.test.js`) - 20 tests

**Total: 231 tests (144/146 unit passing + 85/85 E2E passing) - 99% overall** ✅

## Running Tests

### Prerequisites

1. Start the test server:
```bash
cd ../app
python3 test-server.py
# or
python3 -m http.server 9000
```

### Run All Tests (Framework + E2E)

```bash
npm test
# or
node test-all.js
```

### Run Framework Unit Tests Only

```bash
npm run test:framework
# or
node run-framework-tests.js
```

### Run Component E2E Tests Only

```bash
npm run test:e2e
# or
./test-runner.js
```

### Run Individual E2E Test Files

```bash
node showcase.test.js
node form-components.test.js
node selection-components.test.js
# ... etc
```

## Test Structure

Each test file uses the `TestHelper` class which provides:

- **Setup/Teardown** - Browser lifecycle management
- **Assertions** - `assert`, `assertEqual`, `assertExists`, etc.
- **Navigation** - `selectComponent`, `clickTab`, `searchComponents`
- **Helpers** - `getActiveComponent`, `countVisibleComponents`, etc.

## Example Test

```javascript
const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    await test.test('Component renders', async () => {
        await test.selectComponent('Button');
        await test.assertExists('cl-button');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
```

## What Tests Cover

### Rendering
- Components render without errors
- Required DOM elements exist
- Proper HTML structure

### Interactivity
- Buttons are clickable
- Inputs accept text
- Dropdowns open/close
- Forms validate

### Functionality
- State changes correctly
- Events fire properly
- Navigation works
- Search/filter functions

### UI/UX
- Active states apply
- Visual feedback works
- Animations complete
- Layouts render correctly

## Environment Variables

- `TEST_URL` - Base URL for tests (default: `http://localhost:9000/componentlib/`)

```bash
TEST_URL=http://localhost:8080/componentlib/ ./test-runner.js
```

## CI/CD Integration

These tests are designed to run in CI environments:

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: |
    cd componentlib-e2e
    npm install
    python3 -m http.server 9000 &
    sleep 2
    ./test-runner.js
```

## Debugging

To see what's happening:

1. **Screenshots** - Tests can take screenshots:
```javascript
await test.screenshot('component-name');
```

2. **Console Output** - Page errors are logged automatically

3. **Headful Mode** - Edit `test-helper.js` and change:
```javascript
headless: false  // instead of 'new'
```

## Adding New Tests

1. Create a new test file: `my-feature.test.js`
2. Use the TestHelper pattern
3. Test file will be auto-discovered by test runner
4. Follow the naming convention: `*.test.js`

## Notes

- Tests run in isolated browser instances
- Each test file is independent
- Browser state is reset between test files
- Tests should be deterministic and repeatable
