# Reactive State Management

Complete guide to the reactivity system, stores, and computed properties.

## Table of Contents

- [Reactive State](#reactive-state)
  - [Automatic Render Batching](#automatic-render-batching)
  - [flushSync() - Synchronous Rendering](#flushsync---synchronous-rendering)
  - [flushRenders() - For Testing](#flushrenders---for-testing)
- [Critical Gotchas](#critical-gotchas)
  - [Large Arrays - untracked()](#-large-arrays-cause-performance-issues)
- [Stores](#stores)
- [Computed Properties](#computed-properties)
- [Memo](#memo)
- [Memoize (Argument-Based)](#memoize-argument-based)
- [Watch](#watch)
- [Dark Theme](#dark-theme)
- [Notifications](#notifications)

## Reactive State

State changes automatically trigger re-renders through Vue 3-style proxy-based reactivity:

```javascript
data() {
    return {
        count: 0
    };
},

methods: {
    increment() {
        this.state.count++; // Auto re-renders
    }
}
```

### How Reactivity Works

1. **Proxy-based** - State wrapped in reactive proxies
2. **Automatic tracking** - Dependencies tracked during render
3. **Efficient updates** - Only changed components re-render
4. **Deep reactivity** - Nested objects are automatically reactive
5. **Automatic batching** - Multiple state changes in the same function are batched into a single render

```javascript
data() {
    return {
        user: {
            name: 'Alice',
            settings: {
                theme: 'dark'
            }
        }
    };
},

methods: {
    updateTheme() {
        // Deep reactivity - this triggers re-render
        this.state.user.settings.theme = 'light';
    }
}
```

### Automatic Render Batching

Multiple state changes within the same synchronous execution are automatically batched into a single render:

```javascript
methods: {
    updateMultiple() {
        // All these changes result in ONE render, not three
        this.state.a = 1;
        this.state.b = 2;
        this.state.c = 3;
        // Render happens after this function completes (via queueMicrotask)
    }
}
```

This batching happens automatically via `queueMicrotask`, so renders are deferred until the current synchronous code completes. This is similar to React 18's automatic batching.

### flushSync() - Synchronous Rendering

Sometimes you need the DOM to update immediately after a state change, such as when:
- Focusing an element that was just made visible
- Scrolling to an element that was just added
- Measuring an element after state change

Use `flushSync()` for these cases:

```javascript
import { defineComponent, html, flushSync } from './lib/framework.js';

defineComponent('my-component', {
    data() {
        return {
            showInput: false
        };
    },

    methods: {
        showAndFocus() {
            // Show the input and immediately render
            flushSync(() => {
                this.state.showInput = true;
            });
            // DOM is now updated, safe to focus
            this.refs.input.focus();
        },

        addItemAndScroll() {
            flushSync(() => {
                this.state.items.push(newItem);
            });
            // Scroll to bottom after item is rendered
            this.refs.container.scrollTop = this.refs.container.scrollHeight;
        }
    },

    template() {
        return html`
            <button on-click="showAndFocus">Show Input</button>
            ${when(this.state.showInput, html`
                <input ref="input" type="text">
            `)}
        `;
    }
});
```

**Use `flushSync()` sparingly** - it bypasses batching and forces immediate rendering, which can hurt performance if overused.

### flushRenders() - For Testing

In tests, you may need to verify DOM state immediately after state changes. Use `flushRenders()`:

```javascript
import { flushRenders } from './lib/framework.js';

// In a test:
component.state.count = 5;
flushRenders();  // Force pending renders to complete
expect(component.textContent).toBe('5');
```

In normal application code, you don't need `flushRenders()` - use `flushSync()` instead when you need synchronous DOM updates.

## Critical Gotchas

### ⚠️ NEVER Mutate Reactive Arrays with .sort()

**This causes infinite re-render loops!**

```javascript
// ✅ CORRECT - Create a copy before sorting
getSortedItems() {
    return [...this.state.items].sort((a, b) => a.time - b.time);
}

// ❌ WRONG - Mutates reactive array, triggers re-render loop!
getSortedItems() {
    return this.state.items.sort((a, b) => a.time - b.time);  // INFINITE LOOP!
}
```

**Why?** When you call `.sort()` on a reactive array during rendering:
1. Sort mutates the array
2. Mutation triggers reactivity
3. Reactivity triggers re-render
4. Re-render calls your method again
5. Loop repeats forever → Stack overflow

**Safe methods** (return new arrays):
- `.filter()` - Creates new array
- `.map()` - Creates new array
- `.slice()` - Creates new array
- `.concat()` - Creates new array

**Unsafe methods** (mutate in place):
- `.sort()` - Mutates array
- `.reverse()` - Mutates array
- `.splice()` - Mutates array
- `.push()`, `.pop()`, `.shift()`, `.unshift()` - OK in event handlers, NOT in getters

### ⚠️ Sets and Maps are NOT Reactive

**Must reassign to trigger updates:**

```javascript
// ✅ CORRECT
addItem(item) {
    const newSet = new Set(this.state.items);
    newSet.add(item);
    this.state.items = newSet;
}

// ❌ WRONG - Won't trigger re-render
addItem(item) {
    this.state.items.add(item);
}
```

**For Maps:**
```javascript
// ✅ CORRECT
updateMap(key, value) {
    const newMap = new Map(this.state.data);
    newMap.set(key, value);
    this.state.data = newMap;
}

// ❌ WRONG - Won't trigger re-render
updateMap(key, value) {
    this.state.data.set(key, value);
}
```

### Safe Array Mutations

**OK in event handlers** (not during render):
```javascript
methods: {
    addItem(item) {
        // ✅ OK - Mutation in event handler
        this.state.items.push(item);
    },

    removeItem(index) {
        // ✅ OK - Mutation in event handler
        this.state.items.splice(index, 1);
    }
}
```

**NOT OK in template getters:**
```javascript
// ❌ WRONG - Called during render, causes infinite loop
getSortedItems() {
    return this.state.items.sort((a, b) => a.time - b.time);
}

// ✅ CORRECT - Create copy first
getSortedItems() {
    return [...this.state.items].sort((a, b) => a.time - b.time);
}
```

### ⚠️ Large Arrays Cause Performance Issues

For arrays with hundreds or thousands of items, deep proxying becomes expensive.

**Use `untracked()` to prevent deep proxying:**

```javascript
import { defineComponent, html, untracked } from './lib/framework.js';

defineComponent('playlist-view', {
    data() {
        return {
            // Large array - only track when the whole array is replaced
            songs: untracked([]),
            // Small values - track normally
            currentIndex: 0,
            searchQuery: ''
        };
    },

    methods: {
        loadSongs(newSongs) {
            // Just assign - auto-applies untracked for keys marked initially
            this.state.songs = newSongs;
        },

        addSong(song) {
            // Reassign to trigger update
            this.state.songs = [...this.state.songs, song];
        }
    }
});
```

**How `untracked()` works:**

1. **Initial marking** - Mark a key with `untracked()` in `data()`
2. **Automatic propagation** - All future assignments to that key are automatically untracked
3. **Shallow tracking** - Only the array reference is tracked, not individual items
4. **Reassignment required** - Must reassign the array to trigger re-render

**When to use:**
- Arrays with 100+ items
- Objects with deeply nested structures you don't need to track
- Data from APIs where you only care about the whole response changing

**When NOT to use:**
- Small arrays (< 100 items)
- Objects where individual property changes should trigger updates
- Form data where you need two-way binding on nested properties

**Combine with `memoEach()` for optimal performance:**

For large lists, use both `untracked()` (to avoid expensive dependency tracking) and `memoEach()` (to cache rendered items):

```javascript
import { defineComponent, html, memoEach, untracked } from './lib/framework.js';

defineComponent('song-list', {
    data() {
        return {
            songs: untracked([]),  // Don't track 2000 items
            visibleStart: 0,
            visibleEnd: 50
        };
    },

    template() {
        const visible = this.state.songs.slice(
            this.state.visibleStart,
            this.state.visibleEnd
        );

        return html`
            ${memoEach(visible, song => html`
                <div class="song">${song.title}</div>
            `, song => song.uuid)}
        `;
    }
});
```

This combination:
- `untracked()` - Prevents expensive deep proxying of thousands of array items
- `memoEach()` - Caches rendered templates so unchanged items don't re-render

### withoutTracking() - Read Without Creating Dependencies

Use `withoutTracking()` to read reactive state without creating a dependency. The effect won't re-run when those values change.

```javascript
import { defineComponent, withoutTracking } from './lib/framework.js';

defineComponent('my-component', {
    data() {
        return { count: 0, name: '' };
    },

    mounted() {
        // Read initial value without tracking - effect won't re-run when count changes
        const initialCount = withoutTracking(() => this.state.count);
        console.log('Initial count:', initialCount);
    },

    methods: {
        logState() {
            // Log without creating dependencies
            withoutTracking(() => {
                console.log('Current state:', this.state.count, this.state.name);
            });
        }
    }
});
```

**When to use `withoutTracking()`:**
- Reading initial values in `mounted()` without subscribing to changes
- Logging/debugging without affecting reactivity
- Accessing state in event handlers where you don't want to create effect dependencies

### untracked() vs withoutTracking() - Key Differences

| | `untracked(obj)` | `withoutTracking(fn)` |
|---|---|---|
| **What it does** | Marks object to prevent deep proxying | Temporarily disables dependency tracking |
| **Scope** | Permanent (object-level) | Temporary (during fn execution) |
| **Use case** | Large arrays/objects | Reading without subscribing |
| **Affects** | How the object is stored | How reads are tracked |

```javascript
// untracked() - object won't be deeply proxied
data() {
    return {
        songs: untracked([])  // Array items won't become reactive proxies
    };
}

// withoutTracking() - reads won't create dependencies
mounted() {
    const value = withoutTracking(() => this.state.count);  // No dependency on count
}
```

## Stores

Reactive stores with pub/sub pattern and optional localStorage persistence.

### Creating a Store

```javascript
import { createStore } from './lib/framework.js';

const counterStore = createStore({
    count: 0
});
```

### Using Stores in Components

Always call methods on `store.state`, not the original object:

```javascript
import login from './auth/auth.js';

export default defineComponent('my-component', {
    data() {
        return {
            user: null
        };
    },

    // ✅ CORRECT
    async mounted() {
        // Subscribe to store updates
        this.unsubscribe = login.subscribe(state => {
            this.state.user = state.user;
        });
    },

    methods: {
        async logoff() {
            // Call methods on .state!
            await login.state.logoff();
        }
    },

    unmounted() {
        // Always cleanup subscriptions
        if (this.unsubscribe) this.unsubscribe();
    }
});
```

### Store Methods

**subscribe(callback)** - Listen to state changes:
```javascript
const unsubscribe = myStore.subscribe(state => {
    console.log('State changed:', state);
});

// Later: cleanup
unsubscribe();
```

**set(newState)** - Replace entire state:
```javascript
myStore.set({ count: 10 });
```

**update(fn)** - Update state via function:
```javascript
myStore.update(state => ({
    ...state,
    count: state.count + 1
}));
```

### localStorage Persistence

```javascript
import { localStore } from './lib/utils.js';

// Create persistent store (automatically syncs to localStorage)
const userPrefs = localStore('user-prefs', { theme: 'light' });

// Subscribe to changes
userPrefs.subscribe(state => {
    console.log('Preferences updated:', state);
});

// Update store (automatically persists)
userPrefs.state.theme = 'dark';
```

**Note:** `localStore()` creates a reactive store that automatically:
- Loads initial state from localStorage
- Saves changes to localStorage on every update
- Handles errors gracefully

## Computed Properties

The framework provides `computed()` for creating reactive computed values that automatically track dependencies:

```javascript
import { computed, reactive } from './lib/framework.js';

const state = reactive({ a: 1, b: 2 });

// Create a computed value - dependencies are auto-tracked
const sum = computed(() => state.a + state.b);

console.log(sum.get()); // 3

state.a = 5;
console.log(sum.get()); // 7 (automatically recomputed)

// Clean up when done
sum.dispose();
```

**Key features:**
- **Automatic dependency tracking** - No need to list dependencies manually
- **Lazy evaluation** - Only recomputes when `get()` is called and dependencies have changed
- **Cleanup** - Call `dispose()` when no longer needed to stop tracking

### Using computed() in Components

```javascript
import { defineComponent, html, computed, reactive } from './lib/framework.js';

defineComponent('counter-sum', {
    mounted() {
        // Create a computed value
        this._sum = computed(() => this.state.a + this.state.b);
    },

    unmounted() {
        // Clean up the computed value
        if (this._sum) this._sum.dispose();
    },

    data() {
        return { a: 1, b: 2 };
    },

    template() {
        return html`
            <div>
                <input type="number" x-model="a">
                <input type="number" x-model="b">
                <p>Sum: ${this._sum?.get() ?? 0}</p>
            </div>
        `;
    }
});
```

## Memo

The `memo()` function memoizes a function result based on an explicit dependency array:

```javascript
import { memo } from './lib/framework.js';

// Memoize based on explicit dependencies
const expensiveRender = memo(() => {
    console.log('Computing...');
    return someExpensiveOperation();
}, [dep1, dep2]);

expensiveRender(); // Logs "Computing..."
expensiveRender(); // No log - uses cached result
```

**Use case:** When you need explicit control over what triggers recomputation.

## Memoize (Argument-Based)

For memoization based on function arguments (not reactive dependencies), use `memoize()` from utils:

```javascript
import { memoize } from './lib/utils.js';

defineComponent('product-list', {
    data() {
        return {
            items: [...], // 1000 items
            searchQuery: '',

            // Memoize based on arguments passed at call time
            filteredItems: memoize((items, query) => {
                console.log('[Memoize] Filtering...');  // Only logs when args change!
                return items.filter(item =>
                    item.name.toLowerCase().includes(query.toLowerCase())
                );
            })
        };
    },

    template() {
        // Pass current values as arguments - cached if same as last call
        const filtered = this.state.filteredItems(
            this.state.items,
            this.state.searchQuery
        );

        return html`
            <input type="text" x-model="searchQuery" placeholder="Search...">
            <div>${filtered.length} items found</div>
            <ul>
                ${each(filtered, item => html`
                    <li>${item.name} - $${item.price}</li>
                `)}
            </ul>
        `;
    }
});
```

**How it works:**
- First call: Executes function and caches result
- Subsequent calls: Returns cached result if arguments haven't changed
- Argument change: Executes function again and updates cache

**Perfect for:**
- Expensive filtering operations
- Sorting large lists
- Complex calculations
- Derived data transformations

**Example with sorting:**
```javascript
import { memoize } from './lib/utils.js';

data() {
    return {
        items: [...],  // 1000 items
        sortBy: 'name',
        sortDirection: 'asc',

        sortedItems: memoize((items, sortBy, direction) => {
            const sorted = [...items].sort((a, b) => {
                if (a[sortBy] < b[sortBy]) return direction === 'asc' ? -1 : 1;
                if (a[sortBy] > b[sortBy]) return direction === 'asc' ? 1 : -1;
                return 0;
            });
            return sorted;
        })
    };
},

template() {
    const sorted = this.state.sortedItems(
        this.state.items,
        this.state.sortBy,
        this.state.sortDirection
    );

    return html`
        <select x-model="sortBy">
            <option value="name">Name</option>
            <option value="price">Price</option>
        </select>
        <button on-click="${() => this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc'}">
            Toggle Direction
        </button>
        <ul>
            ${each(sorted, item => html`
                <li>${item.name} - $${item.price}</li>
            `)}
        </ul>
    `;
}
```

### Choosing Between computed(), memo(), and memoize()

| Function | Import | Tracks | Best For |
|----------|--------|--------|----------|
| `computed()` | framework.js | Reactive dependencies automatically | Values derived from reactive state |
| `memo()` | framework.js | Explicit dependency array | When you control what triggers recompute |
| `memoize()` | utils.js | Arguments passed at call time | Caching expensive pure functions |

## Watch

The `watch()` function monitors reactive values and executes a callback when they change:

```javascript
import { watch, reactive } from './lib/framework.js';

const state = reactive({ count: 0 });

// Watch a value and react to changes
const stopWatching = watch(
    () => state.count,  // Getter function returning value to watch
    (newValue, oldValue) => {
        console.log(`Count changed from ${oldValue} to ${newValue}`);
    }
);

state.count = 5;  // Logs: Count changed from 0 to 5
state.count = 10; // Logs: Count changed from 5 to 10

// Stop watching when done
stopWatching();

state.count = 15; // No log - watcher has been disposed
```

### Use Cases

**1. Side Effects on State Changes**
```javascript
mounted() {
    this._unwatch = watch(
        () => this.state.selectedItem,
        async (itemId) => {
            if (itemId) {
                this.state.itemDetails = await fetchItemDetails(itemId);
            }
        }
    );
},

unmounted() {
    if (this._unwatch) this._unwatch();
}
```

**2. Cross-Component Coordination**
```javascript
import cartStore from './cart-store.js';

mounted() {
    this._unwatch = watch(
        () => cartStore.state.items.length,
        (count) => {
            if (count > 10) {
                notify('Cart is getting full!', 'warning');
            }
        }
    );
}
```

**3. Analytics/Logging**
```javascript
watch(
    () => router.currentRoute.state.path,
    (newPath) => {
        analytics.trackPageView(newPath);
    }
);
```

**4. Watching Nested Properties**
```javascript
const state = reactive({ user: { settings: { theme: 'light' } } });

watch(
    () => state.user.settings.theme,
    (newTheme) => {
        document.body.classList.toggle('dark', newTheme === 'dark');
    }
);
```

### Important Notes

- **Always dispose watchers** - Call the returned dispose function in `unmounted()` to prevent memory leaks
- **Prefer props for derived values** - Use props directly in templates for reactive URL params (automatic re-renders)
- **Avoid unnecessary watchers** - Computed properties are often better for derived values

## Dark Theme

Global dark theme store with automatic body class management:

```javascript
import { darkTheme } from './lib/utils.js';

methods: {
    toggleDarkMode() {
        darkTheme.update(s => ({ enabled: !s.enabled }));
    }
}
```

**In component styles:**
```javascript
styles: /*css*/`
    :host-context(body.dark) .element {
        background: #333;
        color: #ccc;
    }

    :host-context(body.dark) button {
        background: #444;
        border: 1px solid #666;
    }
`
```

**The dark theme store automatically:**
- Adds/removes `dark` class on `<body>`
- Persists preference to localStorage
- Applies theme on page load

## Notifications

Toast notification system with severity levels:

```javascript
import { notify } from './lib/utils.js';

methods: {
    async save() {
        try {
            await this.saveData();
            notify('Saved!', 'info', 3); // message, severity, seconds
        } catch (error) {
            notify('Error saving!', 'error', 5);
        }
    }
}
```

**Available severity levels:**
- `'info'` - Blue informational message
- `'success'` - Green success message
- `'warning'` - Yellow warning message
- `'error'` - Red error message

**Parameters:**
- `message` (string) - Notification text
- `severity` (string) - One of: 'info', 'success', 'warning', 'error'
- `ttl` (number) - Time to live in seconds (default: 3)

**Accessing notifications store:**
```javascript
import { notifications } from './lib/utils.js';

// Subscribe to all notifications
notifications.subscribe(notifs => {
    console.log('Current notifications:', notifs);
});
```

## Best Practices

### Use Reactive State for UI State

```javascript
// ✅ GOOD - Reactive state for UI
data() {
    return {
        isOpen: false,
        selectedTab: 'profile',
        loading: false
    };
}
```

### Use Stores for Shared State

```javascript
// ✅ GOOD - Store for shared state
const authStore = createStore({
    user: null,
    isAuthenticated: false
});
```

### Always Cleanup Subscriptions

```javascript
// ✅ GOOD - Cleanup in unmounted()
mounted() {
    this.unsubscribe = myStore.subscribe(state => {
        this.state.data = state.data;
    });
},

unmounted() {
    if (this.unsubscribe) this.unsubscribe();
}
```

### Avoid Reactive State for Constants

```javascript
// ❌ BAD - No need for reactivity
data() {
    return {
        API_URL: 'https://api.example.com'  // Constant, not reactive
    };
}

// ✅ GOOD - Use const outside component
const API_URL = 'https://api.example.com';

defineComponent('my-component', {
    methods: {
        async fetchData() {
            const response = await fetch(API_URL);
            // ...
        }
    }
});
```

## See Also

- [components.md](components.md) - Component development patterns
- [templates.md](templates.md) - Template system and helpers
- [api-reference.md](api-reference.md) - Complete API reference
