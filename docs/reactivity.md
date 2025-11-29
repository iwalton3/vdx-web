# Reactive State Management

Complete guide to the reactivity system, stores, and computed properties.

## Table of Contents

- [Reactive State](#reactive-state)
- [Critical Gotchas](#critical-gotchas)
- [Stores](#stores)
- [Computed Properties](#computed-properties)
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

Memoized computed properties with automatic dependency tracking using the `computed()` helper:

```javascript
import { computed } from './lib/utils.js';

defineComponent('product-list', {
    data() {
        return {
            items: [...], // 1000 items
            searchQuery: '',
            sortBy: 'name',

            // Computed property - only recalculates when dependencies change
            filteredItems: computed((items, query) => {
                console.log('[Computed] Filtering...');  // Only logs when needed!
                return items.filter(item =>
                    item.name.toLowerCase().includes(query.toLowerCase())
                );
            })
        };
    },

    template() {
        // Call computed with current dependencies
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
- Subsequent calls: Returns cached result if dependencies haven't changed
- Dependency change: Executes function again and updates cache

**Perfect for:**
- Expensive filtering operations
- Sorting large lists
- Complex calculations
- Derived data transformations

**Example with sorting:**
```javascript
data() {
    return {
        items: [...],  // 1000 items
        sortBy: 'name',
        sortDirection: 'asc',

        sortedItems: computed((items, sortBy, direction) => {
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
styles: `
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
