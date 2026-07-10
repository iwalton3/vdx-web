# Component Library

Professional UI components built with the framework. All components follow framework conventions and support `x-model` for two-way data binding.

## Table of Contents

- [Getting Started](#getting-started)
- [Theming & Dark Mode](#theming--dark-mode)
- [Form Components](#form-components)
- [Selection Components](#selection-components)
- [Data Components](#data-components)
- [Panel Components](#panel-components)
- [Overlay Components](#overlay-components)
- [Button Components](#button-components)
- [Miscellaneous Components](#miscellaneous-components)

## Getting Started

### Viewing the Showcase

```bash
cd app
python3 test-server.py
```

Then open: **http://localhost:9000/componentlib/**

### Importing Components

Import individual components as needed:

```javascript
// Import specific components
import './componentlib/form/input-text.js';
import './componentlib/button/button.js';
import './componentlib/overlay/dialog.js';
```

All components use the `cl-` prefix (Component Library).

## Theming & Dark Mode

The component library uses CSS custom properties (variables) for theming. All components automatically support light and dark themes.

### Enabling Dark Mode

Toggle dark mode by adding the `dark` class to the body:

```javascript
// Toggle dark mode
document.body.classList.toggle('dark');
```

### CSS Variables

Define theme variables in your CSS. Here are the available variables:

```css
:root {
    /* Primary colors */
    --primary-color: #007bff;
    --primary-hover: #0056b3;

    /* Text colors */
    --text-color: #333;
    --text-secondary: #666;
    --text-tertiary: #999;
    --text-muted: #6c757d;

    /* Input styling */
    --input-bg: #fff;
    --input-border: #ced4da;
    --input-text: #333;

    /* Background colors */
    --hover-bg: #f8f9fa;
    --selected-bg: #e7f3ff;
    --table-header-bg: #f8f9fa;
    --disabled-bg: #e9ecef;
    --border-color: #eee;
    --card-bg: white;

    /* Shell layout */
    --shell-bg: #f5f5f5;
    --sidebar-bg: white;
    --topbar-bg: #1976d2;
    --topbar-text: white;

    /* Status colors */
    --success-color: #28a745;
    --error-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;

    /* Alert backgrounds */
    --info-bg: #e7f3ff;
    --info-text: #0066cc;
    --success-bg: #d4edda;
    --success-text: #155724;
    --success-border: #c3e6cb;
    --error-bg: #ffe7e7;
    --error-text: #dc3545;
    --warning-bg: #fff3cd;
    --warning-text: #856404;

    /* Button colors (for input-number, etc) */
    --button-bg: #f8f9fa;
    --button-hover-bg: #e9ecef;
    --button-active-bg: #dee2e6;
}

/* Dark theme */
body.dark {
    --primary-color: #0d6efd;
    --primary-hover: #0a58ca;

    --text-color: #ccc;
    --text-secondary: #aaa;
    --text-tertiary: #777;
    --text-muted: #888;

    --input-bg: #2d2d2d;
    --input-border: #444;
    --input-text: #ccc;

    --hover-bg: #383838;
    --selected-bg: #1e3a5f;
    --table-header-bg: #2d2d2d;
    --disabled-bg: #333;
    --border-color: #444;
    --card-bg: #252525;

    --shell-bg: #1a1a1a;
    --sidebar-bg: #252525;
    --topbar-bg: #1a365d;
    --topbar-text: #e0e0e0;

    --success-color: #28a745;
    --error-color: #f88;
    --warning-color: #d4b846;
    --info-color: #6db3f2;

    --info-bg: #1a3a5c;
    --info-text: #6db3f2;
    --success-bg: #1a3d1a;
    --success-text: #6dd36d;
    --success-border: #2d5a2d;
    --error-bg: #4a2020;
    --error-text: #f88;
    --warning-bg: #4a3d10;
    --warning-text: #d4b846;

    --button-bg: #383838;
    --button-hover-bg: #444;
    --button-active-bg: #505050;
}
```

### Creating Custom Themes

You can create custom themes by overriding the CSS variables:

```css
/* Custom blue theme */
body.theme-ocean {
    --primary-color: #0077b6;
    --primary-hover: #023e8a;
    --card-bg: #e8f4fc;
    --table-header-bg: #caf0f8;
}
```

### Component Showcase

The component library showcase at `/componentlib/` includes a dark mode toggle button for testing themes. The toggle button is in the top bar.

## Form Components

### cl-input-text

Text input with validation support.

```javascript
<cl-input-text
    label="Username"
    placeholder="Enter username..."
    required="true"
    minlength="3"
    maxlength="20"
    pattern="[a-zA-Z0-9_-]+"
    helptext="Alphanumeric characters only"
    x-model="username">
</cl-input-text>
```

**Props:**
- `label` - Input label
- `placeholder` - Placeholder text
- `required` - Whether input is required
- `minlength` / `maxlength` - Length constraints
- `pattern` - Regex validation pattern
- `helptext` - Help text below input
- `value` - Current value (use x-model for binding)

### cl-input-number

Number input with increment/decrement buttons.

```javascript
<cl-input-number
    label="Quantity"
    min="1"
    max="100"
    step="1"
    x-model="quantity">
</cl-input-number>
```

**Props:**
- `label` - Input label
- `min` / `max` - Value range
- `step` - Increment step
- `value` - Current value

### cl-textarea

Multi-line text input with character count.

```javascript
<cl-textarea
    label="Comments"
    placeholder="Enter comments..."
    rows="5"
    maxlength="500"
    showcount="true"
    x-model="comments">
</cl-textarea>
```

**Props:**
- `label` - Input label
- `rows` - Number of visible rows
- `maxlength` - Maximum character count
- `showcount` - Show character counter

### cl-checkbox

Checkbox input with label.

```javascript
<cl-checkbox
    label="Accept terms and conditions"
    x-model="agreed">
</cl-checkbox>
```

### cl-toggle

Toggle/switch component with keyboard accessibility.

```javascript
<cl-toggle
    label="Enable notifications"
    size="medium"
    x-model="notificationsEnabled">
</cl-toggle>
```

**Props:**
- `label` - Toggle label text
- `labelPosition` - `'left'` or `'right'` (default: `'right'`)
- `size` - `'small'`, `'medium'`, or `'large'`
- `checkedLabel` / `uncheckedLabel` - Status text shown on toggle
- `disabled` - Disable the toggle

**Accessibility:** `role="switch"`, `aria-checked`, keyboard support (Enter/Space to toggle)

### cl-radio-button

Radio button input.

```javascript
<cl-radio-button name="size" value="small" label="Small" x-model="selectedSize"></cl-radio-button>
<cl-radio-button name="size" value="medium" label="Medium" x-model="selectedSize"></cl-radio-button>
<cl-radio-button name="size" value="large" label="Large" x-model="selectedSize"></cl-radio-button>
```

### cl-slider

Range slider input.

```javascript
<cl-slider
    label="Volume"
    min="0"
    max="100"
    step="5"
    x-model="volume">
</cl-slider>
```

### cl-calendar

Date picker component. Masked typeable input, month/year picker, and inline mode.

```javascript
<cl-calendar
    label="Select Date"
    x-model="selectedDate">
</cl-calendar>
```

**Range selection** with `selection-mode="range"`: click a start date, then an end date
(in-between days highlight on hover). Emits `change` with `{ start, end }` (ISO date strings):

```javascript
<cl-calendar
    label="Date Range"
    selection-mode="range"
    on-change="${(e) => this.state.range = e.detail.value}">
</cl-calendar>
<!-- initial value: object { start, end } or "YYYY-MM-DD/YYYY-MM-DD" -->
```

### cl-inplace

Click-to-edit text. Shows a value; click (or Enter/Space) to edit; Enter/blur commits, Escape cancels.

```javascript
<cl-inplace x-model="title" empty-text="Add a title…"></cl-inplace>
```

### cl-rating

Star rating input/display with hover preview. `precision="0.5"` enables half stars; `readonly` for display.

```javascript
<cl-rating x-model="score" max="5"></cl-rating>
<cl-rating value="4.5" precision="0.5" readonly="true"></cl-rating>
```

### cl-otp

One-time-code / PIN input: a row of single-character boxes with auto-advance, backspace-to-previous,
arrow navigation, and paste distribution. Emits `complete` when every box is filled.

```javascript
<cl-otp length="6" type="number" x-model="code"
    on-complete="${(e) => verify(e.detail.value)}"></cl-otp>
<cl-otp length="4" type="number" mask="true"></cl-otp>   <!-- password dots -->
```

## Selection Components

All selection components include comprehensive accessibility support:
- ARIA attributes (`role`, `aria-expanded`, `aria-selected`, `aria-activedescendant`)
- Full keyboard navigation (Arrow keys, Enter, Escape, Home, End)
- Proper label associations
- Screen reader announcements

### cl-dropdown

Single select dropdown with optional filtering.

```javascript
state = {
    selected: '',
    options: [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
        { label: 'Option 3', value: 'opt3' }
    ]
};

template() {
    return html`
        <cl-dropdown
            label="Select Option"
            options="${this.state.options}"
            filter="true"
            placeholder="Choose..."
            x-model="selected">
        </cl-dropdown>
    `;
}
```

**Props:**
- `label` - Dropdown label
- `options` - Array of `{ label, value }` objects
- `filter` - Enable search filtering
- `placeholder` - Placeholder text

**Keyboard:** ArrowDown opens, Arrow keys navigate, Enter selects, Escape closes

### cl-multiselect

Multi-select dropdown with chips display.

```javascript
<cl-multiselect
    label="Tags"
    options="${this.state.tagOptions}"
    filter="true"
    x-model="selectedTags">
</cl-multiselect>
```

**Keyboard:** ArrowDown opens, Arrow keys navigate, Enter/Space toggles selection, Escape closes

### cl-autocomplete

Text input with autocomplete suggestions.

```javascript
<cl-autocomplete
    label="Search"
    suggestions="${this.state.suggestions}"
    x-model="searchQuery">
</cl-autocomplete>
```

**Keyboard:** Arrow keys navigate suggestions, Enter selects, Escape closes

### cl-chips

Tag input component for managing a list of values.

```javascript
<cl-chips
    label="Tags"
    placeholder="Add tag..."
    x-model="tags">
</cl-chips>
```

### cl-segmented

Segmented control / select-button for one-of-few choices (view switches, filters). x-model compatible.
Options may be strings or `{ label, value, icon }`.

```javascript
<cl-segmented
    options="${[{ label: 'List', value: 'list' }, { label: 'Grid', value: 'grid' }]}"
    x-model="view">
</cl-segmented>
```

## Data Components

### cl-datatable

Advanced data table with sorting and selection.

```javascript
state = {
    data: [
        { id: 1, name: 'Alice', role: 'Admin' },
        { id: 2, name: 'Bob', role: 'User' }
    ],
    columns: [
        { field: 'id', header: 'ID' },
        { field: 'name', header: 'Name', sortable: true },
        { field: 'role', header: 'Role', sortable: true }
    ],
    selected: null
};

template() {
    return html`
        <cl-datatable
            value="${this.state.data}"
            columns="${this.state.columns}"
            selectionmode="single"
            selection="${this.state.selected}"
            on-change="${(e) => this.state.selected = e.detail.value}">
        </cl-datatable>
    `;
}
```

**Props:**
- `value` - Array of data objects
- `columns` - Column definitions `[{ field, header, sortable }]`
- `selectionmode` - `'single'`, `'multiple'`, or `'none'`
- `selection` - Currently selected row(s)

### cl-paginator

Pagination controls.

```javascript
<cl-paginator
    totalrecords="100"
    rows="10"
    first="${this.state.first}"
    on-change="${(e, val) => this.state.first = val.first}">
</cl-paginator>
```

The change event detail is `{ value: { first, page, rows } }` - custom-element handlers receive `detail.value` as the second argument.

### cl-tree

Hierarchical tree view with selection.

```javascript
state = {
    nodes: [
        {
            key: '1',
            label: 'Documents',
            children: [
                { key: '1-1', label: 'Work' },
                { key: '1-2', label: 'Personal' }
            ]
        }
    ]
};

template() {
    return html`
        <cl-tree
            value="${this.state.nodes}"
            selectionmode="single">
        </cl-tree>
    `;
}
```

### cl-orderable-list

Drag and drop reorderable list.

```javascript
<cl-orderable-list
    header="Tasks"
    value="${this.state.items}"
    on-change="${(e) => this.state.items = e.detail.value}">
</cl-orderable-list>
```

### cl-virtual-list

Efficiently renders large lists by only rendering visible items. Supports self-scrolling, parent scrolling, or window scrolling.

This component packages the windowing patterns proven in a production music player. If you need features it doesn't provide (sparse lazily-loaded arrays, conditional windowing, gesture-heavy custom rows), build inline windowing with the same skeleton - see [performance.md](performance.md#windowed-virtual-scrolling).

```javascript
state = {
    items: Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        subtitle: `Description for item ${i}`
    })),
    selected: null
};

handleSelect(e) {
    this.state.selected = e.detail.item;
}

getItemKey(item) {
    return item.id;
}

template() {
    return html`
        <!-- Self-scrolling (default) -->
        <cl-virtual-list
            items="${this.state.items}"
            itemHeight="60"
            height="400px"
            keyFn="${this.getItemKey}"
            selectable="true"
            on-select="handleSelect">
        </cl-virtual-list>

        <!-- Parent scrolling - tracks a scrollable parent -->
        <div style="height: 500px; overflow-y: auto;">
            <cl-virtual-list
                items="${this.state.items}"
                itemHeight="60"
                scrollContainer="parent"
                keyFn="${this.getItemKey}">
            </cl-virtual-list>
        </div>
    `;
}
```

**Props:**
- `items` - Array of items to render
- `itemHeight` - Height of each item in pixels (default: 50)
- `bufferSize` - Extra items to render above/below viewport (default: 10)
- `renderItem` - Custom render function `(item, index) => html\`...\``
- `keyFn` - Function to get unique key for memoization `(item) => item.id`
- `height` - Container height (only for scrollContainer="self")
- `scrollContainer` - Scroll mode:
  - `"self"` (default) - Component has its own scrollbar
  - `"parent"` - Tracks nearest scrollable parent
  - `"window"` - Tracks window/document scroll
  - CSS selector - Tracks a specific element
- `selectable` - Enable selection (default: false)
- `selectedKey` - Key of the currently selected item (as returned by `keyFn`)
- `selectedIndex` - Currently selected index (deprecated - use `selectedKey`)
- `emptyMessage` - Message when list is empty
- `loading` - Show loading spinner
- `reorderable` - Enable drag-to-reorder (default: false). See below.

**Events:**
- `select` - Fired when item is selected: `{ item, index }`
- `item-click` - Fired when item is clicked: `{ item, index }`
- `reorder` - Fired when a row is dropped in a new position (only when `reorderable`): `{ fromIndices, gap, from, to }`

**Methods:**
- `scrollToIndex(index)` - Scroll to a specific item
- `scrollToTop()` - Scroll to first item
- `scrollToBottom()` - Scroll to last item

#### Drag-to-reorder (`reorderable`)

Set `reorderable="true"` to make rows drag-reorderable. This composes the framework's
windowing controller (already powering the virtual scroll) with the row-gestures
controller, giving you the full gesture suite: whole-row HTML5 drag-and-drop on desktop
(with pointer-midpoint gap targeting and before/after insertion indicators) and touch
drag via a rendered grip handle (`span.drag-handle`, only present when `reorderable`).

**The component never mutates `props.items`** - the array belongs to you. On drop it emits
a `reorder` event describing the move; you apply it and pass the new `items` back down.

The `reorder` detail carries the move in two forms so you can use whichever fits your API:

- `fromIndices` - the moving row(s), always an array (single drag = `[i]`).
- `gap` - the raw **insertion gap** (`0..items.length`): the slot between rows the item
  lands in (`gap 0` = before the first row, `gap length` = after the last). Use this for
  gap-semantic store APIs (`gapToGapIndex`).
- `from` - `fromIndices[0]` (the source index).
- `to` - the **remove-then-insert** index, i.e. `gapToRemoveInsertIndex(from, gap)`. Use
  this directly with a `splice(from, 1)` + `splice(to, 0, moved)` sequence.

```javascript
state = {
    items: [/* ... your items ... */]
};

handleReorder(e) {
    // `to` is already the remove-then-insert index - splice straight in.
    const { from, to } = e.detail;
    const next = this.state.items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.state.items = next;   // pass the new array back down
}

template() {
    return html`
        <cl-virtual-list
            items="${this.state.items}"
            itemHeight="56"
            reorderable="true"
            keyFn="${(item) => item.id}"
            on-reorder="handleReorder">
        </cl-virtual-list>
    `;
}
```

The raw `gap` is provided for stores whose reorder API already treats the target as an
insertion gap (import `gapToGapIndex`/`gapToRemoveInsertIndex` from `lib/gestures.js` if
you want the intent explicit at the call site rather than a bare `gap`).

**Single-item drags only.** The component's selection is single-key, so there is no
multi-select set to move as a group. If you need **group drag** (moving a whole selection
at once), compose `createWindowing` + `createRowGestures` directly and pass the gesture
controller a `selection` adapter - see `lib/gestures.js`.

### cl-timeline

Vertical event timeline with status markers - activity feeds, order history, audit logs.
Data-driven: `items = [{ title, description, time, icon, color, status }]`. `align="alternate"` for a two-sided layout.

```javascript
<cl-timeline items="${[
    { time: '09:00', title: 'Order placed', icon: '✓', status: 'success' },
    { time: '11:30', title: 'Processing', icon: '⚙' },
    { time: '—', title: 'Delivered', status: 'muted' }
]}"></cl-timeline>
```

### cl-meter

Dashboard gauge for a single value in a range. `variant="linear"` (bar) or `"radial"` (ring).
Recolors by `thresholds` (lower-bounds) as the value rises; or a fixed `color`. `min`/`max`/`unit`/`label`.

```javascript
<cl-meter label="Memory" value="72" unit="%"
    thresholds="${[{ value: 70, color: '#f5b301' }, { value: 90, color: '#dc3545' }]}">
</cl-meter>
<cl-meter variant="radial" value="8" min="0" max="10" label="Score" color="#28a745"></cl-meter>
```

## Panel Components

### cl-accordion

Collapsible accordion panels.

```javascript
state = {
    tabs: [
        { header: 'Section 1', content: 'Content for section 1' },
        { header: 'Section 2', content: 'Content for section 2' }
    ]
};

template() {
    return html`
        <cl-accordion
            tabs="${this.state.tabs}"
            activeindex="0"
            multiple="false">
        </cl-accordion>
    `;
}
```

### cl-tabview

Tabbed interface component.

```javascript
<cl-tabview
    tabs="${this.state.tabs}"
    activeindex="0"
    on-change="${(e, index) => this.state.activeTab = index}">
</cl-tabview>
```

### cl-card

Content card container with optional header/footer.

```javascript
<cl-card header="Card Title" subheader="Subtitle">
    <p>Card body content goes here.</p>
    <div slot="footer">
        <button>Action</button>
    </div>
</cl-card>
```

### cl-fieldset

Fieldset with legend and optional toggle.

```javascript
<cl-fieldset legend="Settings" toggleable="true" collapsed="false">
    <p>Fieldset content here.</p>
</cl-fieldset>
```

### cl-splitter

Resizable split panel.

```javascript
<cl-splitter layout="horizontal" panelsizes="[60, 40]">
    <div slot="panel-1">Left panel content</div>
    <div slot="panel-2">Right panel content</div>
</cl-splitter>
```

**Props:**
- `layout` - `'horizontal'` or `'vertical'`
- `panelsizes` - Array of initial panel sizes (percentages)

## Overlay Components

### cl-dialog

Modal dialog component.

```javascript
state = { visible: false };

template() {
    return html`
        <cl-button
            label="Open Dialog"
            on-click="${() => this.state.visible = true}">
        </cl-button>

        <cl-dialog
            visible="${this.state.visible}"
            header="Dialog Title"
            modal="true"
            closable="true"
            style="width: 500px;"
            on-change="${(e, val) => this.state.visible = val}">
            <p>Dialog content here.</p>
            <div slot="footer">
                <cl-button label="Cancel" on-click="${() => this.state.visible = false}"></cl-button>
                <cl-button label="Save" severity="primary"></cl-button>
            </div>
        </cl-dialog>
    `;
}
```

**Props:**
- `visible` - Whether dialog is shown
- `header` - Dialog title
- `modal` - Show modal backdrop
- `closable` - Show close button

### cl-sidebar

Slide-out sidebar panel.

```javascript
<cl-sidebar
    visible="${this.state.sidebarVisible}"
    position="left"
    header="Menu"
    on-change="${(e, val) => this.state.sidebarVisible = val}">
    <nav>
        <a href="#">Link 1</a>
        <a href="#">Link 2</a>
    </nav>
</cl-sidebar>
```

**Props:**
- `position` - `'left'`, `'right'`, `'top'`, or `'bottom'`

### cl-toast

Toast notification component (position on page once).

```javascript
// In your page template
<cl-toast position="top-right"></cl-toast>

// Show toast programmatically
const toast = document.querySelector('cl-toast');
toast.show({
    severity: 'success',
    summary: 'Success',
    detail: 'Operation completed',
    life: 3000
});
```

**Severity options:** `'success'`, `'info'`, `'warn'`, `'error'`

### cl-tooltip

Tooltip component that wraps content.

```javascript
<cl-tooltip text="This is helpful information" position="top">
    <cl-button label="Hover me"></cl-button>
</cl-tooltip>
```

**Props:**
- `text` - Tooltip text
- `position` - `'top'`, `'right'`, `'bottom'`, `'left'`

### cl-context-menu

A generic, viewport-overflow-aware popup menu that opens at arbitrary `(x, y)`
coordinates. Unlike `cl-action-menu` (a button that drops a menu below itself),
`cl-context-menu` is not tied to any trigger element - drive it from a
`contextmenu` (right-click) event, a long-press gesture, or programmatically.
It keeps itself fully inside the viewport (flip / clamp / internal scroll) and
only one instance is ever open at a time.

```javascript
state = {
    menuItems: [
        { label: 'Edit', icon: '✏️' },
        { label: 'Copy', icon: '📋', shortcut: '⌘C' },
        { separator: true },
        { label: 'Delete', icon: '🗑️', danger: true }
    ]
};

// Wire any element's contextmenu event to open the menu at the pointer.
openMenu(e, row) {
    this.refs.menu.openAtEvent(e, row);   // second arg = context echoed back
}

onPick(e) {
    console.log('chose', e.detail.item.label, 'for', e.detail.context);
}

template() {
    return html`
        <div on-contextmenu="${(e) => this.openMenu(e, this.state.row)}">
            Right-click me
        </div>

        <cl-context-menu
            ref="menu"
            items="${this.state.menuItems}"
            on-select="onPick">
        </cl-context-menu>
    `;
}
```

**Items** (`items` prop) - array of objects; the primary content path (same
shape as `cl-action-menu`):
- `label` - text shown for the item
- `icon` - optional emoji / character icon
- `shortcut` - optional keyboard-shortcut hint (right-aligned)
- `disabled` - `true` to disable (not selectable)
- `danger` - `true` for destructive actions (red)
- `separator` - `true` for a divider (no label)
- `action(context)` / `command(context)` - optional callback invoked on select

Slotted children are also rendered inside the menu surface, for fully custom
content when the `items` shape doesn't fit. Slotted controls are the consumer's
responsibility to wire (and should call `close()` themselves); the `select`
event and auto-close on selection apply to `items`-prop entries.

**Props:**
- `items` - Array of menu items (see above)
- `padding` - Gap (px) kept between the menu and every viewport edge (default: 8)
- `minWidth` - Minimum width of the menu surface in px (default: 200)

**Methods:**
- `open(x, y, context?)` - Open anchored at viewport coordinates `(x, y)`. `context` is stored and echoed back in the `select` event.
- `openAtEvent(event, context?)` - Convenience: reads the pointer coordinates from a `contextmenu`/pointer/touch event, calls `preventDefault()`, and opens.
- `close()` - Close the menu.
- `isOpen()` - Whether the menu is currently open.

**Events:**
- `select` - Fired when an `items`-prop entry is chosen: `{ item, context }`. The menu closes automatically.

**Overflow handling.** After render the menu is measured, then: opened to the
right of / below the anchor; flipped to the left / above when it would overflow
that edge; clamped so it never crosses the viewport padding; and, when it is
taller than the viewport, pinned to the top with a `max-height` so it scrolls
internally instead of overflowing. It closes on Escape, outside click/tap, page
scroll, and window resize.

**Touch / long-press.** The component itself only needs `open(x, y)`. For list
rows, wire it to `createRowGestures` from `lib/gestures.js`: pass an
`onLongPress: (i, e) => this.refs.menu.open(touchX, touchY, ctx)` handler
(long-press is passive-safe and does not block scrolling). The showcase's
**Reorder Playground** (Data category) demonstrates this end to end - a windowed
list combining drag-reorder, multiselect checkboxes, group drag, and this
context menu with correct `memoEach` keying.

### cl-popover

Click- or hover-triggered panel anchored to a trigger element, holding arbitrary content
(distinct from `cl-tooltip`, which is hover + text only). Default children are the trigger;
`slot="content"` is the panel body. Closes on outside click and Escape. Public methods: `show()`, `hide()`, `toggle()`.

```javascript
<cl-popover position="bottom">
    <cl-button label="Open"></cl-button>
    <div slot="content">...menus, forms, details...</div>
</cl-popover>

<cl-popover position="right" trigger="hover">
    <cl-button label="Info"></cl-button>
    <div slot="content">Rich hover content</div>
</cl-popover>
```

## Button Components

### cl-button

Styled button with multiple variants.

```javascript
// Severity variants
<cl-button label="Primary" severity="primary"></cl-button>
<cl-button label="Secondary" severity="secondary"></cl-button>
<cl-button label="Success" severity="success"></cl-button>
<cl-button label="Danger" severity="danger"></cl-button>
<cl-button label="Warning" severity="warning"></cl-button>
<cl-button label="Info" severity="info"></cl-button>

// Style variants
<cl-button label="Outlined" severity="primary" outlined="true"></cl-button>
<cl-button label="Text" severity="primary" text="true"></cl-button>

// States
<cl-button label="Disabled" disabled="true"></cl-button>
<cl-button label="Loading" loading="${this.state.loading}"></cl-button>

// With icon
<cl-button label="Save" icon="💾" severity="primary"></cl-button>
<cl-button label="Next" icon="→" iconpos="right"></cl-button>
```

**Props:**
- `label` - Button text
- `severity` - Color variant
- `outlined` - Outlined style
- `text` - Text-only style
- `disabled` - Disabled state
- `loading` - Show loading spinner
- `icon` - Icon (emoji or character)
- `iconpos` - `'left'` or `'right'`

### cl-split-button

Button with dropdown menu.

```javascript
<cl-split-button
    label="Save"
    model="${this.state.menuItems}"
    severity="primary"
    on-click="${this.handleSave}">
</cl-split-button>
```

### cl-menu

Menu component.

```javascript
<cl-menu model="${this.state.menuItems}"></cl-menu>

// menuItems format:
[
    { label: 'New', icon: '📄', command: () => {} },
    { separator: true },
    { label: 'Open', icon: '📂', items: [...] }  // Nested menu
]
```

### cl-breadcrumb

Breadcrumb navigation.

```javascript
<cl-breadcrumb
    model="${[
        { label: 'Home', url: '/' },
        { label: 'Products', url: '/products/' },
        { label: 'Details' }
    ]}"
    separator="/">
</cl-breadcrumb>
```

## Miscellaneous Components

### cl-progressbar

Progress indicator.

```javascript
// Determinate (known progress)
<cl-progressbar value="75" showvalue="true"></cl-progressbar>

// Indeterminate (unknown progress)
<cl-progressbar mode="indeterminate"></cl-progressbar>
```

### cl-fileupload

File upload component. Set `dropzone="true"` to render a drag & drop area (it composes
`cl-dropzone`) instead of the choose button.

```javascript
<cl-fileupload
    multiple="true"
    accept=".pdf,.jpg,.png"
    maxfilesize="1048576"
    on-upload="${this.handleUpload}">
</cl-fileupload>

<!-- Drag & drop area -->
<cl-fileupload dropzone="true" multiple="true"
    on-change="${(e, files) => this.state.files = files}">
</cl-fileupload>
```

**Props:**
- `multiple` - Allow multiple files
- `accept` - Accepted file types
- `maxfilesize` - Max file size in bytes
- `dropzone` - Render a drag & drop area instead of a choose button

### cl-dropzone

A focused drag & drop (and paste, and click-to-browse) file capture target. Validates against
`accept` / `maxfilesize` and emits the accepted and rejected sets - it keeps no file list of its
own (pair it with `cl-fileupload`, or handle `select` yourself).

```javascript
<cl-dropzone
    multiple="true"
    accept="image/*"
    maxfilesize="${2 * 1024 * 1024}"
    paste="true"
    on-select="${(e) => upload(e.detail.files)}"       // File[] that passed validation
    on-reject="${(e) => warn(e.detail.files)}">         // [{ file, reason: 'size' | 'type' }]
</cl-dropzone>
```

### cl-colorpicker

Color picker component.

```javascript
// Popup mode
<cl-colorpicker
    label="Pick Color"
    x-model="color">
</cl-colorpicker>

// Inline mode
<cl-colorpicker
    label="Color"
    inline="true"
    x-model="color">
</cl-colorpicker>
```

## Additional Components

These components exist in `app/componentlib/` and are used the same way; see their source files for full props:

- **cl-alert** (`misc/alert.js`) - Inline alert box; `severity`, `title`, `closable`, `outline`
- **cl-badge** (`misc/badge.js`) - Badge/pill; `value`, `severity`, `size`, `rounded`, `dot`, `removable`
- **cl-spinner** (`misc/spinner.js`) - Loading spinner; `size`, `variant` (`border`/`dots`/`bars`/`pulse`), `label`
- **cl-error-boundary** (`misc/error-boundary.js`) - Error fallback UI for `renderError()`; `error`, `title`, `showDetails`, `showRetry`
- **cl-input-mask** (`form/input-mask.js`) - Masked input (e.g. `mask="(999) 999-9999"`); `slotChar`, standard form props
- **cl-input-password** (`form/input-password.js`) - Password input with visibility toggle; standard form props
- **cl-input-search** (`form/input-search.js`) - Search input with `suggestions`, `minChars`, `debounce`, `loading`
- **cl-stepper** (`panel/stepper.js`) - Step wizard; `steps`, `activeIndex`, `linear`, `orientation`
- **cl-shell** (`layout/shell.js`) - App shell layout with sidebar; `title`, `logo`, `menuItems`, `activeItem`
- **cl-action-menu** (`overlay/action-menu.js`) - Dropdown action menu button; `label`, `items`, `position`
- **cl-avatar** (`misc/avatar.js`) - User avatar with image, initials fallback, and status dot; `src`, `label`, `size`, `shape`, `status`. Also **cl-avatar-group** - overlapping stack with `avatars`, `max` (+N overflow)
- **cl-skeleton** (`misc/skeleton.js`) - Loading placeholder; `variant` (`text`/`rect`/`circle`), `width`, `height`, `lines`, `animation` (`wave`/`pulse`/`none`)
- **cl-empty** (`misc/empty.js`) - Empty-state placeholder; `icon`, `title`, `description`, `size`; default slot renders action buttons
- **cl-divider** (`misc/divider.js`) - Separator; `orientation` (`horizontal`/`vertical`), `label`, `align`, `variant` (`solid`/`dashed`/`dotted`)
- **cl-copy** (`misc/copy.js`) - Copy-to-clipboard control; `value`, `variant` (`button`/`icon`/`inline`), `label`, `copiedLabel`; emits `copy`

## Using x-model with Component Library

All form-like components support `x-model` for two-way data binding:

```javascript
state = {
    username: '',
    age: 18,
    agreed: false,
    selectedOption: '',
    tags: []
};

template() {
    return html`
        <cl-input-text label="Username" x-model="username"></cl-input-text>
        <cl-input-number label="Age" x-model="age"></cl-input-number>
        <cl-checkbox label="Agree" x-model="agreed"></cl-checkbox>
        <cl-dropdown options="${options}" x-model="selectedOption"></cl-dropdown>
        <cl-chips x-model="tags"></cl-chips>
    `;
}
```

## See Also

- [components.md](components.md) - Building custom components
- [templates.md](templates.md) - Template system and x-model
- [api-reference.md](api-reference.md) - Complete API reference
