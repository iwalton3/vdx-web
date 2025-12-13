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

Date picker component.

```javascript
<cl-calendar
    label="Select Date"
    x-model="selectedDate">
</cl-calendar>
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
data() {
    return {
        selected: '',
        options: [
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' },
            { label: 'Option 3', value: 'opt3' }
        ]
    };
},

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

## Data Components

### cl-datatable

Advanced data table with sorting and selection.

```javascript
data() {
    return {
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
},

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
    on-change="${(e) => this.state.first = e.detail.first}">
</cl-paginator>
```

### cl-tree

Hierarchical tree view with selection.

```javascript
data() {
    return {
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
},

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

```javascript
data() {
    return {
        items: Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            title: `Item ${i}`,
            subtitle: `Description for item ${i}`
        })),
        selected: null
    };
},

methods: {
    handleSelect(e) {
        this.state.selected = e.detail.item;
    },
    getItemKey(item) {
        return item.id;
    }
},

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
- `selectedIndex` - Currently selected index
- `emptyMessage` - Message when list is empty
- `loading` - Show loading spinner

**Events:**
- `select` - Fired when item is selected: `{ item, index }`
- `item-click` - Fired when item is clicked: `{ item, index }`

**Methods:**
- `scrollToIndex(index)` - Scroll to a specific item
- `scrollToTop()` - Scroll to first item
- `scrollToBottom()` - Scroll to last item

## Panel Components

### cl-accordion

Collapsible accordion panels.

```javascript
data() {
    return {
        tabs: [
            { header: 'Section 1', content: 'Content for section 1' },
            { header: 'Section 2', content: 'Content for section 2' }
        ]
    };
},

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
    on-change="${(e) => this.state.activeTab = e.detail.index}">
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
data() {
    return { visible: false };
},

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

File upload component.

```javascript
<cl-fileupload
    multiple="true"
    accept=".pdf,.jpg,.png"
    maxfilesize="1048576"
    on-upload="${this.handleUpload}">
</cl-fileupload>
```

**Props:**
- `multiple` - Allow multiple files
- `accept` - Accepted file types
- `maxfilesize` - Max file size in bytes

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

## Using x-model with Component Library

All form-like components support `x-model` for two-way data binding:

```javascript
data() {
    return {
        username: '',
        age: 18,
        agreed: false,
        selectedOption: '',
        tags: []
    };
},

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
