# Component Library

Professional UI components built with the framework. All components follow framework conventions and support `x-model` for two-way data binding.

## Table of Contents

- [Getting Started](#getting-started)
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

### cl-autocomplete

Text input with autocomplete suggestions.

```javascript
<cl-autocomplete
    label="Search"
    suggestions="${this.state.suggestions}"
    x-model="searchQuery">
</cl-autocomplete>
```

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
