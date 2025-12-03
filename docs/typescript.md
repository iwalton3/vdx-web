# TypeScript Support

VDX-Web provides first-class TypeScript support via `.d.ts` declaration files. This approach offers the benefits of type checking without requiring a build step or changing the framework's core philosophy.

## Installation

TypeScript has **zero npm dependencies** for end users. Install only the compiler:

```bash
# Global installation (recommended for simplicity)
npm install -g typescript

# Or local installation per-project
npm init -y
npm install typescript --save-dev
```

Verify installation:
```bash
tsc --version  # Should show version like "Version 5.x.x"
```

## Philosophy & Risk Analysis

### Why Declaration Files?

TypeScript has zero npm dependencies for end users - only development dependencies for the TypeScript compiler itself. This aligns perfectly with VDX's "zero dependencies, no build step required" philosophy:

1. **Zero Impact on JavaScript Users**: Declaration files (`.d.ts`) are completely ignored by JavaScript. JS users continue using the framework exactly as before.

2. **No Build Step Required for JS**: The framework still runs directly in the browser. TypeScript users can choose to compile or use type-checking only.

3. **Reversible Decision**: If a TypeScript user decides types aren't worth it, they can compile away all type annotations with `tsc --removeComments` and never worry about it again.

4. **Maintenance is Minimal**: We maintain `.d.ts` files alongside the JS code. No transpilation, no source maps for the framework itself.

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Types drift from implementation | JSDoc in source serves as documentation; types mirror JSDoc |
| Increased maintenance burden | Types are additive - can be updated incrementally |
| Users expect TS-first features | Clear docs that this is a JS framework with TS support |
| Complex generic types | Keep types pragmatic, not academically perfect |

### What TypeScript Support Provides

- **IntelliSense**: Full autocomplete for all framework APIs
- **Type Checking**: Catch errors at compile time
- **Documentation**: Hover documentation in editors
- **Refactoring**: Safe renames and refactors

### What TypeScript Support Does NOT Provide

- **Runtime Type Validation**: Types are erased at runtime (standard TS behavior)
- **Automatic Props Validation**: Props are still validated via JavaScript
- **Magic Type Inference for Templates**: `html` tagged templates return typed structures, but template content isn't parsed for types

## Quick Start

### For New TypeScript Projects

1. Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["app/**/*.ts"]
}
```

2. Import with types:

```typescript
import { defineComponent, html, reactive } from './lib/framework.js';
import type { ComponentOptions, ReactiveState } from './lib/framework.js';
```

### For Existing JavaScript Projects

Add type checking without changing any code:

1. Create a minimal `tsconfig.json`:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": false,
    "moduleResolution": "bundler"
  },
  "include": ["app/**/*.js"]
}
```

2. Add `// @ts-check` to individual files for gradual adoption:

```javascript
// @ts-check
import { defineComponent, html } from './lib/framework.js';

// Now this file is type-checked!
```

## Type Definitions

Type definitions are provided in `.d.ts` files alongside each module:

```
app/lib/
├── framework.js
├── framework.d.ts      # Types for core framework
├── router.js
├── router.d.ts         # Types for router
├── utils.js
├── utils.d.ts          # Types for utilities
└── componentlib.d.ts   # Types for UI components
```

## Typing Components

### Basic Component

```typescript
import { defineComponent, html } from './lib/framework.js';
import type { ComponentOptions } from './lib/framework.js';

interface CounterProps {
  title: string;
  initial: number;
}

interface CounterState {
  count: number;
}

const options: ComponentOptions<CounterProps, CounterState> = {
  props: {
    title: 'Counter',
    initial: 0
  },

  data() {
    return {
      count: this.props.initial
    };
  },

  methods: {
    increment() {
      this.state.count++;
    }
  },

  template() {
    return html`
      <div>
        <h1>${this.props.title}</h1>
        <p>Count: ${this.state.count}</p>
        <button on-click="increment">+1</button>
      </div>
    `;
  }
};

export default defineComponent('my-counter', options);
```

### With Stores

```typescript
import { defineComponent, html, createStore } from './lib/framework.js';
import type { Store } from './lib/framework.js';

interface AuthState {
  user: { name: string; email: string } | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const authStore: Store<AuthState> = createStore({
  user: null,
  isLoggedIn: false,
  async login(email: string, password: string) {
    // ... login logic
  },
  logout() {
    this.user = null;
    this.isLoggedIn = false;
  }
});

export default authStore;
```

### Using Stores in Components

When using the `stores` option, store states are accessed directly via `this.stores.storeName` (not `this.stores.storeName.state`). The framework automatically unwraps `Store<T>` to `T`.

```typescript
import { defineComponent, html } from './lib/framework.js';
import authStore from './stores/auth.js';

// Define stores as a const - TypeScript infers the unwrapped types
const stores = { auth: authStore };

defineComponent('user-profile', {
  stores,  // Clean - no casting needed!

  template() {
    // Access state directly - TypeScript knows this is AuthState
    const user = this.stores.auth.user;

    return html`
      <div>
        <p>Welcome, ${user?.name || 'Guest'}</p>
        <button on-click="${() => this.stores.auth.logout()}">
          Logout
        </button>
      </div>
    `;
  }
});
```

**How it works:** The framework provides `UnwrapStores<T>` utility type that converts `{ auth: Store<AuthState> }` to `{ auth: AuthState }` automatically. By defining stores as a const outside the component, TypeScript infers the correct types.

**Alternative - explicit typing:**
```typescript
import type { UnwrapStores } from './lib/framework.js';

// If you need explicit type annotation
const stores = { auth: authStore, theme: themeStore };
type MyStores = UnwrapStores<typeof stores>;
// MyStores = { auth: AuthState; theme: ThemeState }
```

### With Router

```typescript
import { enableRouting, Router } from './lib/router.js';
import type { RouteConfig, RouteParams } from './lib/router.js';

const routes: Record<string, RouteConfig> = {
  '/': {
    component: 'home-page',
    load: () => import('./pages/home.js')
  },
  '/users/:id/': {
    component: 'user-profile',
    meta: { requiresAuth: true }
  }
};

const router = enableRouting(
  document.querySelector('router-outlet')!,
  routes
);

// Type-safe navigation
router.navigate('/users/123/', { tab: 'settings' });
```

## Development Workflow

### Type-Check Only (Recommended for Development)

```bash
# Check types without emitting files
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### Compile TypeScript to JavaScript

For production or when you want `.js` output:

```bash
npx tsc
```

### Using the TypeScript Dev Server

The included `dev-server-ts.py` provides automatic TypeScript compilation with file watching:

```bash
cd app
python3 dev-server-ts.py
```

This server:
- Watches `.ts` files for changes
- Compiles them to `.js` on save
- Serves the application at http://localhost:9000/
- Shows compilation errors in the terminal

## Best Practices

### 1. Type Your Props and State

```typescript
interface MyProps {
  items: Array<{ id: string; name: string }>;
  onSelect: (item: { id: string; name: string }) => void;
}

interface MyState {
  selectedId: string | null;
  isLoading: boolean;
}
```

### 2. Use Strict Mode Gradually

Start with relaxed settings, then tighten:

```json
{
  "compilerOptions": {
    "strict": false,           // Start here
    "noImplicitAny": true,     // Add this first
    "strictNullChecks": true,  // Then this
    "strict": true             // Finally enable all
  }
}
```

### 3. Type External Data

```typescript
interface ApiUser {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<ApiUser> {
  const response = await fetch(`/api/users/${id}`);
  return response.json() as Promise<ApiUser>;
}
```

### 4. Use Type Guards for Runtime Checks

```typescript
function isApiError(error: unknown): error is { message: string; code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}
```

## Function References for Better Type Safety

The framework supports both string-based and function-based event handlers. **Using function references provides limited type checking**, as TypeScript can verify the function exists:

### String-Based (No Type Checking)

```typescript
// TypeScript can't verify "handleClick" exists
template() {
  return html`<button on-click="handleClick">Click</button>`;
}
```

### Function Reference (Type-Checked)

```typescript
// TypeScript verifies this.handleClick exists and is callable
template() {
  return html`<button on-click="${this.handleClick}">Click</button>`;
}
```

### Inline Functions (Full Type Safety)

```typescript
template() {
  return html`
    <!-- Full type safety - TypeScript checks the entire expression -->
    <button on-click="${(e: Event) => this.handleClick(e)}">Click</button>

    <!-- Type-safe with closure over typed data -->
    ${each(this.state.items, (item) => html`
      <div on-click="${() => this.selectItem(item)}">${item.name}</div>
    `)}
  `;
}
```

### Prop Passing with Function References

```typescript
// Type-checked: TypeScript verifies this.renderItem exists
template() {
  return html`
    <cl-virtual-list
      items="${this.state.items}"
      renderitem="${this.renderItem}">
    </cl-virtual-list>
  `;
}

// vs string-based (no checking)
template() {
  return html`
    <cl-virtual-list
      items="${this.state.items}"
      renderitem="renderItem">  <!-- Can't verify this -->
    </cl-virtual-list>
  `;
}
```

**Recommendation**: For maximum type safety, prefer function references (`${this.method}`) or inline functions (`${() => this.method()}`) over string-based handlers (`"method"`). The verbosity trade-off is worth it for complex applications.

## Advanced TypeScript Patterns

### Computed Properties

Use `computed()` from utils for memoized calculations:

```typescript
import { defineComponent, html } from './lib/framework.js';
import { computed } from './lib/utils.js';

interface Item {
  id: string;
  name: string;
  price: number;
}

defineComponent('product-list', {
  data() {
    return {
      items: [] as Item[],
      searchQuery: '',
      // Typed computed property
      filteredItems: computed((items: Item[], query: string) => {
        return items.filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase())
        );
      })
    };
  },

  template() {
    // Call with dependencies - result is cached until they change
    const filtered = this.state.filteredItems(
      this.state.items,
      this.state.searchQuery
    );

    return html`
      <input type="text" x-model="searchQuery">
      <p>${filtered.length} items</p>
    `;
  }
});
```

### Custom x-model Components

Create components that work with `x-model` using `emitChange`:

```typescript
import { defineComponent, html } from './lib/framework.js';

interface RatingProps {
  value: number;
  max: number;
}

defineComponent('star-rating', {
  props: {
    value: 0,
    max: 5
  } as RatingProps,

  methods: {
    setRating(rating: number): void {
      // emitChange makes the component x-model compatible
      // Parameters: (event, newValue, propName)
      this.emitChange(null, rating, 'value');
    }
  },

  template() {
    const stars = Array.from({ length: this.props.max }, (_, i) => i + 1);

    return html`
      <div class="stars">
        ${stars.map(n => html`
          <span
            class="star ${n <= this.props.value ? 'filled' : ''}"
            on-click="${() => this.setRating(n)}">
            ${n <= this.props.value ? '★' : '☆'}
          </span>
        `)}
      </div>
    `;
  }
});

// Usage with x-model - automatically syncs value
// <star-rating x-model="userRating" max="5"></star-rating>
```

### Watch for Side Effects

```typescript
import { defineComponent, watch } from './lib/framework.js';

defineComponent('user-loader', {
  data() {
    return {
      userId: null as string | null,
      userData: null as { name: string; email: string } | null
    };
  },

  mounted() {
    // Watch returns a cleanup function
    this._unwatch = watch(
      () => this.state.userId,
      async (newId: string | null, oldId: string | null) => {
        if (newId && newId !== oldId) {
          this.state.userData = await this.fetchUser(newId);
        }
      }
    );
  },

  unmounted() {
    this._unwatch?.();
  },

  methods: {
    async fetchUser(id: string): Promise<{ name: string; email: string }> {
      const res = await fetch(`/api/users/${id}`);
      return res.json();
    }
  }
});
```

## Limitations

1. **Template String Content**: The `html` tagged template returns a typed `HtmlTemplate` object, but the HTML content itself isn't parsed for type errors. Use your IDE's HTML/CSS extensions for that.

2. **Event Handler Strings**: When using `on-click="methodName"`, TypeScript can't verify that `methodName` exists. Use function references (see above) for type-checked handlers.

3. **Props Passed via Attributes**: When passing props as HTML attributes, TypeScript can't verify the types. Use JSDoc comments in your HTML for documentation.

4. **Custom Events**: The `on-*` syntax only supports standard events (`on-click`, `on-change`, `on-input`, etc.). Custom event names like `on-my-event` won't work. Use one of these patterns instead:

   **Pattern A: Use standard `change` event with action type:**
   ```typescript
   // Child component
   handleAction(type: string, data?: any): void {
     this.dispatchEvent(new CustomEvent('change', {
       bubbles: true,
       detail: { type, ...data }
     }));
   }

   // Parent listens with on-change
   <child-component on-change="${(e: CustomEvent) => this.handleChildAction(e)}">

   handleChildAction(e: CustomEvent): void {
     if (e.detail.type === 'delete') { /* ... */ }
     if (e.detail.type === 'status') { /* ... */ }
   }
   ```

   **Pattern B: Pass callback functions as props (for simple cases):**
   ```typescript
   // Works for renderItem, etc. but NOT for event-like callbacks
   <virtual-list renderItem="${this.renderItem}">
   ```

## Demo Application

A complete TypeScript demo application is included in `app/ts-demo/`. It's a task manager that demonstrates:

- Typed components with props, state, and stores
- Typed routing with URL parameters
- Type-safe event handlers using function references
- Centralized state management with typed stores

### Running the Demo

```bash
# Install TypeScript if needed
npm install -g typescript

# Compile and run
cd app/ts-demo
npx tsc
python3 dev-server.py

# Opens at http://localhost:9001/
```

The dev server watches `.ts` files and recompiles automatically on save.

### Demo Structure

```
ts-demo/
├── main.ts           # Router setup
├── stores/tasks.ts   # Typed store
├── pages/
│   ├── home.ts       # Stats dashboard
│   ├── tasks.ts      # Task list with CRUD
│   └── task-detail.ts # Single task view
└── components/
    └── task-item.ts  # Reusable task component
```

## Migrating from JavaScript

1. **Rename files**: `.js` → `.ts` (or keep `.js` with `// @ts-check`)
2. **Add types incrementally**: Start with `any`, then refine
3. **Fix errors gradually**: Enable strict mode settings one at a time
4. **Type public APIs first**: Focus on exported functions and component props
