# VDX TypeScript Demo - Task Manager

A demonstration of VDX framework with TypeScript support. This task manager app showcases:

- **Typed Components**: Props, state, and stores with full type safety
- **Typed Router**: Route parameters and navigation
- **Typed Stores**: Centralized state management
- **Function References**: Type-checked event handlers

## Quick Start

### 1. Install TypeScript

```bash
cd app/ts-demo

# Install dependencies (TypeScript)
npm install
```

Or install globally: `npm install -g typescript`

### 2. Compile TypeScript

```bash
cd app/ts-demo

# Compile once
npx tsc

# Or watch mode
npx tsc --watch
```

### 3. Run the Demo

Option A: Use the TypeScript dev server (auto-compiles on save):
```bash
cd app/ts-demo
python3 dev-server.py
# Opens at http://localhost:9001/
```

Option B: Use the main test server (after compiling):
```bash
cd app
python3 test-server.py
# Then navigate to http://localhost:9000/ts-demo/
```

## Project Structure

```
ts-demo/
├── index.html           # Entry point
├── main.ts              # App initialization with router
├── tsconfig.json        # TypeScript configuration
├── dev-server.py        # Development server with watch mode
├── lib -> ../lib        # Symlink to framework
├── stores/
│   └── tasks.ts         # Task store with typed state
├── pages/
│   ├── home.ts          # Home page component
│   ├── tasks.ts         # Task list page
│   └── task-detail.ts   # Task detail page
└── components/
    └── task-item.ts     # Task item component
```

## Key TypeScript Patterns

### Typed Store

```typescript
import { createStore } from './lib/framework.js';
import type { Store } from './lib/framework.js';

interface TasksState {
    tasks: Task[];
    filter: TaskStatus | 'all';
}

const store: Store<TasksState> = createStore({
    tasks: [],
    filter: 'all'
});
```

### Typed Component

```typescript
interface MyProps {
    title: string;
    items: Item[];
}

interface MyState {
    selectedId: string | null;
}

defineComponent('my-component', {
    props: { title: '', items: [] } as MyProps,

    data(): MyState {
        return { selectedId: null };
    },

    methods: {
        handleClick(item: Item): void {
            this.state.selectedId = item.id;
        }
    },

    template() {
        return html`...`;
    }
});
```

### Type-Safe Event Handlers

```typescript
// Function reference - TypeScript verifies method exists
template() {
    return html`
        <button on-click="${this.handleClick}">Click</button>
        <input on-input="${(e: Event) => this.handleInput(e)}">
    `;
}
```

## Learn More

- [TypeScript Documentation](../docs/typescript.md) - Full TypeScript guide
- [Framework Documentation](../CLAUDE.md) - VDX framework overview
- [API Reference](../docs/api-reference.md) - Complete API docs
