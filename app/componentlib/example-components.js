/**
 * Pre-registered example components for demos
 */
import { defineComponent, html, when, each, raw } from '../lib/framework.js';

// Import all component library components
import './form/input-text.js';
import './form/input-number.js';
import './form/textarea.js';
import './form/checkbox.js';
import './form/radio-button.js';
import './form/slider.js';
import './form/calendar.js';
import './form/input-mask.js';
import './form/input-password.js';
import './form/toggle.js';
import './form/input-search.js';

import './selection/dropdown.js';
import './selection/multiselect.js';
import './selection/autocomplete.js';
import './selection/chips.js';

import './data/datatable.js';
import './data/paginator.js';
import './data/tree.js';
import './data/orderable-list.js';
import './data/virtual-list.js';

import './panel/accordion.js';
import './panel/tabview.js';
import './panel/card.js';
import './panel/fieldset.js';
import './panel/splitter.js';
import './panel/stepper.js';

import './overlay/dialog.js';
import './overlay/sidebar.js';
import './overlay/toast.js';
import './overlay/tooltip.js';

import './button/button.js';
import './button/split-button.js';
import './button/menu.js';
import './button/breadcrumb.js';

import './misc/progressbar.js';
import './misc/fileupload.js';
import './misc/colorpicker.js';
import './misc/spinner.js';
import './misc/badge.js';
import './misc/alert.js';

// InputText Example
defineComponent('example-input-text', {
    data() {
        return { value: '', email: '', pattern: '' };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                <cl-input-text
                    label="Basic Input"
                    placeholder="Enter text..."
                    x-model="value">
                </cl-input-text>

                <cl-input-text
                    label="Email Validation"
                    placeholder="email@example.com"
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$"
                    required="true"
                    helptext="Enter a valid email address"
                    x-model="email">
                </cl-input-text>

                <cl-input-text
                    label="Min/Max Length"
                    minlength="5"
                    maxlength="20"
                    helptext="Between 5-20 characters"
                    x-model="pattern">
                </cl-input-text>
            </div>
        `;
    }
});

// InputNumber Example
defineComponent('example-input-number', {
    data() {
        return { value: 0, quantity: 1, price: 9.99 };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                <cl-input-number
                    label="Basic"
                    x-model="value">
                </cl-input-number>

                <cl-input-number
                    label="Min/Max (1-10)"
                    min="1"
                    max="10"
                    x-model="quantity">
                </cl-input-number>

                <cl-input-number
                    label="Step (0.01)"
                    step="0.01"
                    x-model="price">
                </cl-input-number>
            </div>
        `;
    }
});

// TextArea Example
defineComponent('example-textarea', {
    data() {
        return { text: '', limited: '' };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 600px;">
                <cl-textarea
                    label="Basic TextArea"
                    placeholder="Enter your message..."
                    rows="3"
                    x-model="text">
                </cl-textarea>

                <cl-textarea
                    label="With Character Count"
                    placeholder="Limited to 200 characters"
                    maxlength="200"
                    showcount="true"
                    autoresize="true"
                    x-model="limited">
                </cl-textarea>
            </div>
        `;
    }
});

// Checkbox Example
defineComponent('example-checkbox', {
    data() {
        return { checked: false, terms: true };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <cl-checkbox
                    label="Accept terms and conditions"
                    x-model="terms">
                </cl-checkbox>

                <cl-checkbox
                    label="Subscribe to newsletter"
                    x-model="checked">
                </cl-checkbox>

                <cl-checkbox
                    label="Disabled checkbox"
                    checked="true"
                    disabled="true">
                </cl-checkbox>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Terms: ${this.state.terms ? 'Accepted' : 'Not accepted'}
                </div>
            </div>
        `;
    }
});

// RadioButton Example
defineComponent('example-radio-button', {
    data() {
        return { size: 'medium' };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="font-weight: 600; margin-bottom: 8px;">Select Size:</div>

                <cl-radio-button
                    name="size"
                    value="small"
                    label="Small"
                    modelvalue="${this.state.size}"
                    on-change="${(e, val) => this.state.size = val}">
                </cl-radio-button>

                <cl-radio-button
                    name="size"
                    value="medium"
                    label="Medium"
                    modelvalue="${this.state.size}"
                    on-change="${(e, val) => this.state.size = val}">
                </cl-radio-button>

                <cl-radio-button
                    name="size"
                    value="large"
                    label="Large"
                    modelvalue="${this.state.size}"
                    on-change="${(e, val) => this.state.size = val}">
                </cl-radio-button>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; margin-top: 8px;">
                    Selected: ${this.state.size}
                </div>
            </div>
        `;
    }
});

// Slider Example
defineComponent('example-slider', {
    data() {
        return { value: 50, volume: 75 };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                <cl-slider
                    label="Basic Slider"
                    x-model="value">
                </cl-slider>

                <cl-slider
                    label="Volume (0-100)"
                    min="0"
                    max="100"
                    step="5"
                    x-model="volume">
                </cl-slider>
            </div>
        `;
    }
});

// Calendar Example
defineComponent('example-calendar', {
    data() {
        return { date: '', inline: new Date().toISOString().split('T')[0] };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                <cl-calendar
                    label="Select Date"
                    x-model="date">
                </cl-calendar>

                <cl-calendar
                    label="Inline Calendar"
                    inline="true"
                    x-model="inline">
                </cl-calendar>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Selected: ${this.state.date || 'None'}
                </div>
            </div>
        `;
    }
});

// Dropdown Example
defineComponent('example-dropdown', {
    data() {
        return {
            selected: 'javascript',
            cities: ['New York', 'London', 'Paris', 'Tokyo', 'Sydney'],
            selectedCity: null,
            languages: [
                { label: 'JavaScript', value: 'javascript' },
                { label: 'Python', value: 'python' },
                { label: 'Java', value: 'java' },
                { label: 'C++', value: 'cpp' }
            ]
        };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                <cl-dropdown
                    label="Programming Language"
                    options="${this.state.languages}"
                    x-model="selected">
                </cl-dropdown>

                <cl-dropdown
                    label="City (with filter)"
                    options="${this.state.cities}"
                    filter="true"
                    placeholder="Select a city"
                    x-model="selectedCity">
                </cl-dropdown>
            </div>
        `;
    }
});

// MultiSelect Example
defineComponent('example-multiselect', {
    data() {
        return {
            selected: ['red', 'blue'],
            colors: [
                { label: 'Red', value: 'red' },
                { label: 'Green', value: 'green' },
                { label: 'Blue', value: 'blue' },
                { label: 'Yellow', value: 'yellow' },
                { label: 'Purple', value: 'purple' }
            ]
        };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 600px;">
                <cl-multiselect
                    label="Select Colors"
                    options="${this.state.colors}"
                    filter="true"
                    x-model="selected">
                </cl-multiselect>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Selected: ${this.state.selected.join(', ') || 'None'}
                </div>
            </div>
        `;
    }
});

// AutoComplete Example
defineComponent('example-autocomplete', {
    data() {
        return {
            value: '',
            countries: ['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina',
                      'United Kingdom', 'France', 'Germany', 'Spain', 'Italy']
        };
    },
    template() {
        return html`
            <div style="max-width: 500px;">
                <cl-autocomplete
                    label="Country"
                    placeholder="Start typing..."
                    suggestions="${this.state.countries}"
                    x-model="value">
                </cl-autocomplete>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; margin-top: 16px;">
                    Value: ${this.state.value || 'None'}
                </div>
            </div>
        `;
    }
});

// Chips Example
defineComponent('example-chips', {
    data() {
        return { tags: ['javascript', 'react', 'vue'] };
    },
    template() {
        return html`
            <div style="max-width: 600px;">
                <cl-chips
                    label="Tags"
                    placeholder="Add tag..."
                    x-model="tags">
                </cl-chips>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; margin-top: 16px;">
                    Tags: ${(this.state.tags || []).join(', ')}
                </div>
            </div>
        `;
    }
});

// DataTable Example
defineComponent('example-datatable', {
    data() {
        return {
            selected: null,
            products: [
                { id: 1, name: 'Laptop', category: 'Electronics', price: 999 },
                { id: 2, name: 'Phone', category: 'Electronics', price: 599 },
                { id: 3, name: 'Desk', category: 'Furniture', price: 299 },
                { id: 4, name: 'Chair', category: 'Furniture', price: 199 },
                { id: 5, name: 'Monitor', category: 'Electronics', price: 399 }
            ],
            columns: [
                { field: 'name', header: 'Name', sortable: true },
                { field: 'category', header: 'Category', sortable: true },
                { field: 'price', header: 'Price', sortable: true }
            ]
        };
    },
    template() {
        return html`
            <div>
                <cl-datatable
                    value="${this.state.products}"
                    columns="${this.state.columns}"
                    selectionmode="single"
                    selection="${this.state.selected}"
                    on-change="${(e, val) => this.state.selected = val}">
                </cl-datatable>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; margin-top: 16px;">
                    Selected: ${this.state.selected ? this.state.selected.name : 'None'}
                </div>
            </div>
        `;
    }
});

// Paginator Example
defineComponent('example-paginator', {
    data() {
        return { first: 0, rows: 10 };
    },
    template() {
        return html`
            <div>
                <cl-paginator
                    totalrecords="120"
                    rows="${this.state.rows}"
                    first="${this.state.first}"
                    on-change="${(e, val) => this.state.first = val.first}">
                </cl-paginator>
            </div>
        `;
    }
});

// Tree Example
defineComponent('example-tree', {
    data() {
        return {
            selected: null,
            nodes: [
                {
                    key: '0',
                    label: 'Documents',
                    icon: '📁',
                    children: [
                        { key: '0-0', label: 'Work', icon: '📄' },
                        { key: '0-1', label: 'Home', icon: '📄' }
                    ]
                },
                {
                    key: '1',
                    label: 'Photos',
                    icon: '📁',
                    children: [
                        { key: '1-0', label: 'Vacation', icon: '🖼️' },
                        { key: '1-1', label: 'Family', icon: '🖼️' }
                    ]
                }
            ]
        };
    },
    template() {
        return html`
            <div style="max-width: 500px;">
                <cl-tree
                    value="${this.state.nodes}"
                    selectionmode="single"
                    selection="${this.state.selected}"
                    on-change="${(e, val) => this.state.selected = val}">
                </cl-tree>
            </div>
        `;
    }
});

// OrderableList Example
defineComponent('example-orderable-list', {
    data() {
        return {
            items: ['First Item', 'Second Item', 'Third Item', 'Fourth Item', 'Fifth Item']
        };
    },
    template() {
        return html`
            <div style="max-width: 500px;">
                <cl-orderable-list
                    header="Reorder Items"
                    value="${this.state.items}"
                    on-change="${(e, val) => this.state.items = val}">
                </cl-orderable-list>
            </div>
        `;
    }
});

// Accordion Example
defineComponent('example-accordion', {
    data() {
        return {
            tabs: [
                {
                    header: 'What is Lorem Ipsum?',
                    content: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
                },
                {
                    header: 'Why do we use it?',
                    content: 'It is a long established fact that a reader will be distracted by the readable content.'
                },
                {
                    header: 'Where does it come from?',
                    content: 'Contrary to popular belief, Lorem Ipsum is not simply random text.'
                }
            ]
        };
    },
    template() {
        return html`
            <div style="max-width: 700px;">
                <cl-accordion
                    tabs="${this.state.tabs}"
                    activeindex="0">
                </cl-accordion>
            </div>
        `;
    }
});

// TabView Example
defineComponent('example-tabview', {
    data() {
        return {
            tabs: [
                {
                    header: 'Profile',
                    content: '<h3>User Profile</h3><p>Manage your account settings and preferences.</p>'
                },
                {
                    header: 'Settings',
                    content: '<h3>Settings</h3><p>Configure application settings.</p>'
                },
                {
                    header: 'Help',
                    content: '<h3>Help & Support</h3><p>Get help and support.</p>'
                }
            ]
        };
    },
    template() {
        return html`
            <div style="max-width: 700px;">
                <cl-tabview
                    tabs="${this.state.tabs}"
                    activeindex="0">
                </cl-tabview>
            </div>
        `;
    }
});

// Card Example
defineComponent('example-card', {
    template() {
        return html`
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <cl-card
                    header="Simple Card"
                    subheader="Card subtitle">
                    <p>This is the card content area. You can put any content here.</p>
                </cl-card>

                <cl-card
                    header="Product Card">
                    <p><strong>$99.99</strong></p>
                    <p>High quality product with great features.</p>
                    <div slot="footer" style="display: flex; gap: 8px;">
                        <cl-button label="Buy" severity="primary"></cl-button>
                        <cl-button label="Details" severity="secondary" outlined="true"></cl-button>
                    </div>
                </cl-card>
            </div>
        `;
    }
});

// Fieldset Example
defineComponent('example-fieldset', {
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 600px;">
                <cl-fieldset legend="User Information">
                    <p>Name: John Doe</p>
                    <p>Email: john@example.com</p>
                    <p>Role: Administrator</p>
                </cl-fieldset>

                <cl-fieldset legend="Advanced Options" toggleable="true">
                    <p>These are advanced configuration options.</p>
                    <p>Click the legend to toggle visibility.</p>
                </cl-fieldset>
            </div>
        `;
    }
});

// Splitter Example
defineComponent('example-splitter', {
    template() {
        return html`
            <div style="height: 400px;">
                <cl-splitter layout="horizontal" panelsizes="${[60, 40]}">
                    <div slot="panel-1" style="padding: 20px;">
                        <h3>Left Panel</h3>
                        <p>Drag the divider to resize.</p>
                    </div>
                    <div slot="panel-2" style="padding: 20px;">
                        <h3>Right Panel</h3>
                        <p>This panel adjusts automatically.</p>
                    </div>
                </cl-splitter>
            </div>
        `;
    }
});

// Dialog Example with Footer Buttons
defineComponent('example-dialog', {
    data() {
        return { basicVisible: false, confirmVisible: false, formVisible: false };
    },
    methods: {
        handleConfirm() {
            alert('Confirmed!');
            this.state.confirmVisible = false;
        },
        handleFormSubmit() {
            alert('Form submitted!');
            this.state.formVisible = false;
        }
    },
    template() {
        return html`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <!-- Basic Dialog -->
                <cl-button label="Basic Dialog" on-click="${() => this.state.basicVisible = true}"></cl-button>

                <!-- Confirmation Dialog -->
                <cl-button label="Confirmation" severity="warning" on-click="${() => this.state.confirmVisible = true}"></cl-button>

                <!-- Form Dialog -->
                <cl-button label="Form Dialog" severity="success" on-click="${() => this.state.formVisible = true}"></cl-button>

                <!-- Basic Dialog -->
                <cl-dialog visible="${this.state.basicVisible}" header="Basic Dialog" style="width: 500px;"
                    on-change="${(e, val) => this.state.basicVisible = val}">
                    <p>This is a basic dialog with just content.</p>
                </cl-dialog>

                <!-- Confirmation Dialog with Footer -->
                <cl-dialog visible="${this.state.confirmVisible}" header="Confirm Action" style="width: 400px;"
                    on-change="${(e, val) => this.state.confirmVisible = val}">
                    <p>Are you sure you want to proceed with this action?</p>
                    <div slot="footer">
                        <cl-button label="Cancel" severity="secondary" on-click="${() => this.state.confirmVisible = false}"></cl-button>
                        <cl-button label="Confirm" severity="primary" on-click="handleConfirm"></cl-button>
                    </div>
                </cl-dialog>

                <!-- Form Dialog with Footer -->
                <cl-dialog visible="${this.state.formVisible}" header="Edit Profile" style="width: 500px;"
                    on-change="${(e, val) => this.state.formVisible = val}">
                    <cl-input-text label="Name" placeholder="Enter name..."></cl-input-text>
                    <cl-input-text label="Email" placeholder="Enter email..." style="margin-top: 16px;"></cl-input-text>
                    <div slot="footer">
                        <cl-button label="Cancel" severity="secondary" text="true" on-click="${() => this.state.formVisible = false}"></cl-button>
                        <cl-button label="Save Changes" severity="primary" on-click="handleFormSubmit"></cl-button>
                    </div>
                </cl-dialog>
            </div>
        `;
    }
});

// Sidebar Example
defineComponent('example-sidebar', {
    data() {
        return { visible: false, position: 'left' };
    },
    methods: {
        show(pos) {
            this.state.position = pos;
            this.state.visible = true;
        }
    },
    template() {
        return html`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <cl-button label="Left" on-click="${() => this.show('left')}"></cl-button>
                <cl-button label="Right" on-click="${() => this.show('right')}"></cl-button>
                <cl-button label="Top" on-click="${() => this.show('top')}"></cl-button>
                <cl-button label="Bottom" on-click="${() => this.show('bottom')}"></cl-button>

                <cl-sidebar
                    visible="${this.state.visible}"
                    position="${this.state.position}"
                    header="Sidebar Menu"
                    on-change="${(e, val) => this.state.visible = val}">
                    <p>Sidebar content from the ${this.state.position}.</p>
                    <p>Click outside to close.</p>
                </cl-sidebar>
            </div>
        `;
    }
});

// Toast Example
defineComponent('example-toast', {
    methods: {
        showToast(severity) {
            const toast = this.querySelector('cl-toast');
            const messages = {
                success: { severity: 'success', summary: 'Success', detail: 'Operation completed successfully' },
                info: { severity: 'info', summary: 'Info', detail: 'This is an informational message' },
                warn: { severity: 'warn', summary: 'Warning', detail: 'Please proceed with caution' },
                error: { severity: 'error', summary: 'Error', detail: 'Something went wrong' }
            };
            toast.show(messages[severity]);
        }
    },
    template() {
        return html`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <cl-button label="Success" severity="success" on-click="${() => this.showToast('success')}"></cl-button>
                <cl-button label="Info" severity="info" on-click="${() => this.showToast('info')}"></cl-button>
                <cl-button label="Warn" severity="warning" on-click="${() => this.showToast('warn')}"></cl-button>
                <cl-button label="Error" severity="danger" on-click="${() => this.showToast('error')}"></cl-button>

                <cl-toast position="top-right"></cl-toast>
            </div>
        `;
    }
});

// Tooltip Example
defineComponent('example-tooltip', {
    template() {
        return html`
            <div style="display: flex; gap: 24px; flex-wrap: wrap; align-items: center;">
                <cl-tooltip text="Tooltip on top" position="top">
                    <cl-button label="Top"></cl-button>
                </cl-tooltip>

                <cl-tooltip text="Tooltip on right" position="right">
                    <cl-button label="Right"></cl-button>
                </cl-tooltip>

                <cl-tooltip text="Tooltip on bottom" position="bottom">
                    <cl-button label="Bottom"></cl-button>
                </cl-tooltip>

                <cl-tooltip text="Tooltip on left" position="left">
                    <cl-button label="Left"></cl-button>
                </cl-tooltip>
            </div>
        `;
    }
});

// Button Example
defineComponent('example-button', {
    data() {
        return { loading: false };
    },
    methods: {
        handleLoad() {
            this.state.loading = true;
            setTimeout(() => this.state.loading = false, 2000);
        }
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <cl-button label="Primary" severity="primary"></cl-button>
                    <cl-button label="Secondary" severity="secondary"></cl-button>
                    <cl-button label="Success" severity="success"></cl-button>
                    <cl-button label="Danger" severity="danger"></cl-button>
                    <cl-button label="Warning" severity="warning"></cl-button>
                    <cl-button label="Info" severity="info"></cl-button>
                </div>

                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <cl-button label="Outlined" severity="primary" outlined="true"></cl-button>
                    <cl-button label="Text" severity="primary" text="true"></cl-button>
                    <cl-button label="Disabled" disabled="true"></cl-button>
                    <cl-button
                        label="Loading"
                        loading="${this.state.loading}"
                        on-click="handleLoad">
                    </cl-button>
                </div>

                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <cl-button label="With Icon" icon="📄" severity="primary"></cl-button>
                    <cl-button label="Icon Right" icon="→" iconpos="right" severity="success"></cl-button>
                </div>
            </div>
        `;
    }
});

// SplitButton Example
defineComponent('example-split-button', {
    data() {
        return {
            items: [
                { label: 'Update', command: () => console.log('Update') },
                { label: 'Delete', command: () => console.log('Delete') },
                { label: 'Archive', command: () => console.log('Archive') }
            ]
        };
    },
    template() {
        return html`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <cl-split-button
                    label="Save"
                    model="${this.state.items}"
                    severity="primary">
                </cl-split-button>

                <cl-split-button
                    label="Actions"
                    model="${this.state.items}"
                    severity="success">
                </cl-split-button>
            </div>
        `;
    }
});

// Menu Example
defineComponent('example-menu', {
    data() {
        return {
            items: [
                {
                    label: 'File',
                    icon: '📁',
                    items: [
                        { label: 'New', icon: '➕' },
                        { label: 'Open', icon: '📂' },
                        { label: 'Save', icon: '💾' }
                    ]
                },
                {
                    label: 'Edit',
                    icon: '✏️',
                    items: [
                        { label: 'Cut', icon: '✂️' },
                        { label: 'Copy', icon: '📋' },
                        { label: 'Paste', icon: '📄' }
                    ]
                },
                { label: 'Help', icon: '❓' }
            ]
        };
    },
    template() {
        return html`
            <div style="max-width: 400px;">
                <cl-menu model="${this.state.items}"></cl-menu>
            </div>
        `;
    }
});

// Breadcrumb Example
defineComponent('example-breadcrumb', {
    data() {
        return {
            items: [
                { label: 'Electronics', url: '#' },
                { label: 'Computers', url: '#' },
                { label: 'Laptops', url: '#' }
            ],
            home: { icon: '🏠', url: '#' }
        };
    },
    template() {
        return html`
            <div>
                <cl-breadcrumb
                    model="${this.state.items}"
                    home="${this.state.home}">
                </cl-breadcrumb>
            </div>
        `;
    }
});

// ProgressBar Example
defineComponent('example-progressbar', {
    data() {
        return { value: 60 };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 600px;">
                <cl-progressbar value="75"></cl-progressbar>
                <cl-progressbar value="${this.state.value}"></cl-progressbar>
                <cl-progressbar mode="indeterminate"></cl-progressbar>
            </div>
        `;
    }
});

// FileUpload Example
defineComponent('example-fileupload', {
    data() {
        return { files: [] };
    },
    template() {
        return html`
            <div style="max-width: 600px;">
                <cl-fileupload
                    multiple="true"
                    label="Choose Files"
                    on-change="${(e, val) => this.state.files = val}">
                </cl-fileupload>
            </div>
        `;
    }
});

// ColorPicker Example
defineComponent('example-colorpicker', {
    data() {
        return { color: '#3498db', inlineColor: '#e74c3c' };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                <cl-colorpicker
                    label="Pick Color"
                    x-model="color">
                </cl-colorpicker>

                <cl-colorpicker
                    label="Inline Color Picker"
                    inline="true"
                    x-model="inlineColor">
                </cl-colorpicker>

                <div style="padding: 40px; background: ${this.state.color}; border-radius: 8px; color: white; text-align: center; font-weight: 600;">
                    Selected Color
                </div>
            </div>
        `;
    }
});

// Shell Example
import './layout/shell.js';

defineComponent('example-shell', {
    data() {
        return {
            activeItem: 'dashboard',
            menuItems: [
                {
                    label: 'Main',
                    icon: '🏠',
                    key: 'main',
                    items: [
                        { label: 'Dashboard', key: 'dashboard' },
                        { label: 'Analytics', key: 'analytics' }
                    ]
                },
                {
                    label: 'Settings',
                    icon: '⚙️',
                    key: 'settings',
                    items: [
                        { label: 'Profile', key: 'profile' },
                        { label: 'Preferences', key: 'preferences' }
                    ]
                },
                { label: 'Help', icon: '❓', key: 'help' }
            ]
        };
    },
    template() {
        return html`
            <div style="height: 500px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <cl-shell
                    title="Demo App"
                    subtitle="Dashboard"
                    menuItems="${this.state.menuItems}"
                    activeItem="${this.state.activeItem}"
                    on-change="${(e, key) => this.state.activeItem = key}">

                    <div slot="topbar" style="display: flex; gap: 8px;">
                        <button style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">🔔</button>
                        <button style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">👤</button>
                    </div>

                    <div style="background: var(--card-bg, white); padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h2 style="margin: 0 0 16px 0; color: var(--text-color, #333);">Welcome to ${this.state.activeItem}</h2>
                        <p style="color: var(--text-muted, #666);">This is the main content area. Try resizing your browser to see the responsive hamburger menu!</p>
                        <p style="color: var(--text-muted, #666);">Current page: <strong>${this.state.activeItem}</strong></p>
                    </div>
                </cl-shell>
            </div>
        `;
    }
});

// Complete Form Example
defineComponent('example-complete-form', {
    data() {
        return {
            form: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                birthDate: '',
                gender: 'other',
                country: null,
                interests: [],
                bio: '',
                newsletter: false,
                notifications: true,
                experience: 3
            },
            countries: [
                { label: 'United States', value: 'us' },
                { label: 'United Kingdom', value: 'uk' },
                { label: 'Canada', value: 'ca' },
                { label: 'Australia', value: 'au' },
                { label: 'Germany', value: 'de' }
            ],
            interestOptions: [
                { label: 'Technology', value: 'tech' },
                { label: 'Design', value: 'design' },
                { label: 'Business', value: 'business' },
                { label: 'Science', value: 'science' }
            ]
        };
    },
    methods: {
        handleSubmit() {
            console.log('Form submitted:', this.state.form);
            alert('Form submitted! Check console for data.');
        },
        handleReset() {
            this.state.form = {
                firstName: '', lastName: '', email: '', phone: '',
                birthDate: '', gender: 'other', country: null,
                interests: [], bio: '', newsletter: false,
                notifications: true, experience: 3
            };
        }
    },
    template() {
        return html`
            <cl-card header="User Registration">
                <div class="form-grid">
                    <!-- Row 1: Name -->
                    <cl-input-text label="First Name" required="true" x-model="form.firstName"></cl-input-text>
                    <cl-input-text label="Last Name" required="true" x-model="form.lastName"></cl-input-text>

                    <!-- Row 2: Contact -->
                    <cl-input-text label="Email" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" required="true" x-model="form.email"></cl-input-text>
                    <cl-input-text label="Phone" placeholder="+1 (555) 000-0000" x-model="form.phone"></cl-input-text>

                    <!-- Row 3: Date & Country -->
                    <cl-calendar label="Birth Date" x-model="form.birthDate"></cl-calendar>
                    <cl-dropdown label="Country" options="${this.state.countries}" placeholder="Select country" x-model="form.country"></cl-dropdown>

                    <!-- Row 4: Gender -->
                    <div class="form-full">
                        <label class="form-label">Gender</label>
                        <div class="radio-group">
                            <cl-radio-button name="gender" value="male" label="Male" modelvalue="${this.state.form.gender}" on-change="${(e, v) => this.state.form.gender = v}"></cl-radio-button>
                            <cl-radio-button name="gender" value="female" label="Female" modelvalue="${this.state.form.gender}" on-change="${(e, v) => this.state.form.gender = v}"></cl-radio-button>
                            <cl-radio-button name="gender" value="other" label="Other" modelvalue="${this.state.form.gender}" on-change="${(e, v) => this.state.form.gender = v}"></cl-radio-button>
                        </div>
                    </div>

                    <!-- Row 5: Interests -->
                    <div class="form-full">
                        <cl-multiselect label="Interests" options="${this.state.interestOptions}" x-model="form.interests"></cl-multiselect>
                    </div>

                    <!-- Row 6: Bio -->
                    <div class="form-full">
                        <cl-textarea label="Bio" rows="3" maxlength="500" showcount="true" x-model="form.bio"></cl-textarea>
                    </div>

                    <!-- Row 7: Experience -->
                    <div class="form-full">
                        <cl-slider label="Years of Experience" min="0" max="20" x-model="form.experience"></cl-slider>
                    </div>

                    <!-- Row 8: Checkboxes -->
                    <div class="form-full checkbox-group">
                        <cl-checkbox label="Subscribe to newsletter" x-model="form.newsletter"></cl-checkbox>
                        <cl-checkbox label="Enable notifications" x-model="form.notifications"></cl-checkbox>
                    </div>
                </div>

                <div slot="footer" class="form-actions">
                    <cl-button label="Reset" severity="secondary" text="true" on-click="handleReset"></cl-button>
                    <cl-button label="Submit" severity="primary" icon="✓" on-click="handleSubmit"></cl-button>
                </div>
            </cl-card>
        `;
    },
    styles: /*css*/`
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .form-full {
            grid-column: 1 / -1;
        }

        .form-label {
            display: block;
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--text-color, #333);
        }

        .radio-group {
            display: flex;
            gap: 24px;
        }

        .checkbox-group {
            display: flex;
            gap: 24px;
        }

        .form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }

        @media (max-width: 600px) {
            .form-grid {
                grid-template-columns: 1fr;
            }

            .radio-group,
            .checkbox-group {
                flex-direction: column;
                gap: 12px;
            }
        }
    `
});

// Stepper Example
defineComponent('example-stepper', {
    data() {
        return {
            steps: [
                { label: 'Account', icon: '👤' },
                { label: 'Profile', icon: '📝' },
                { label: 'Confirm', icon: '✓' }
            ],
            currentStep: 0,
            form: {
                email: '',
                password: '',
                name: '',
                bio: ''
            }
        };
    },
    methods: {
        handleStepChange(e) {
            const detail = e.detail || {};
            if (detail.step !== undefined) {
                this.state.currentStep = detail.step;
            }
        },
        handleValidate(e) {
            const detail = e.detail || {};
            const step = detail.step;
            if (step === 0 && !this.state.form.email) {
                const stepper = this.querySelector('cl-stepper');
                stepper.setError('Please enter an email address');
                e.preventDefault();
            }
        },
        handleComplete() {
            alert('Form completed! ' + JSON.stringify(this.state.form));
        }
    },
    template() {
        return html`
            <div style="max-width: 700px;">
                <cl-stepper
                    steps="${this.state.steps}"
                    activeIndex="${this.state.currentStep}"
                    linear="true"
                    on-change="handleStepChange"
                    on-validate="handleValidate"
                    on-complete="handleComplete">

                    <div slot="step-0" style="padding: 20px;">
                        <h3 style="margin-top: 0;">Create Your Account</h3>
                        <cl-input-text label="Email" placeholder="Enter email..." x-model="form.email" style="margin-bottom: 16px;"></cl-input-text>
                        <cl-input-text label="Password" placeholder="Enter password..." x-model="form.password"></cl-input-text>
                    </div>

                    <div slot="step-1" style="padding: 20px;">
                        <h3 style="margin-top: 0;">Your Profile</h3>
                        <cl-input-text label="Full Name" placeholder="Enter your name..." x-model="form.name" style="margin-bottom: 16px;"></cl-input-text>
                        <cl-textarea label="Bio" placeholder="Tell us about yourself..." x-model="form.bio" rows="3"></cl-textarea>
                    </div>

                    <div slot="step-2" style="padding: 20px;">
                        <h3 style="margin-top: 0;">Review Your Information</h3>
                        <div style="background: var(--table-header-bg, #f8f9fa); padding: 16px; border-radius: 8px;">
                            <p><strong>Email:</strong> ${this.state.form.email || '(not set)'}</p>
                            <p><strong>Name:</strong> ${this.state.form.name || '(not set)'}</p>
                            <p><strong>Bio:</strong> ${this.state.form.bio || '(not set)'}</p>
                        </div>
                    </div>
                </cl-stepper>
            </div>
        `;
    }
});

// Spinner Example
defineComponent('example-spinner', {
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 32px;">
                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Variants</h4>
                    <div style="display: flex; gap: 48px; align-items: flex-start; flex-wrap: wrap;">
                        <cl-spinner variant="border" label="Border"></cl-spinner>
                        <cl-spinner variant="dots" label="Dots"></cl-spinner>
                        <cl-spinner variant="bars" label="Bars"></cl-spinner>
                        <cl-spinner variant="pulse" label="Pulse"></cl-spinner>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Sizes</h4>
                    <div style="display: flex; gap: 48px; align-items: flex-end; flex-wrap: wrap;">
                        <cl-spinner size="small" label="Small"></cl-spinner>
                        <cl-spinner size="medium" label="Medium"></cl-spinner>
                        <cl-spinner size="large" label="Large"></cl-spinner>
                        <cl-spinner size="80px" label="Custom (80px)"></cl-spinner>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Colors</h4>
                    <div style="display: flex; gap: 48px; align-items: flex-start; flex-wrap: wrap;">
                        <cl-spinner color="#007bff" label="Primary"></cl-spinner>
                        <cl-spinner color="#28a745" label="Success"></cl-spinner>
                        <cl-spinner color="#dc3545" label="Danger"></cl-spinner>
                        <cl-spinner color="#ffc107" label="Warning"></cl-spinner>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Label Position</h4>
                    <div style="display: flex; gap: 48px; align-items: flex-start; flex-wrap: wrap;">
                        <cl-spinner label="Bottom (default)" labelposition="bottom"></cl-spinner>
                        <cl-spinner label="Right side" labelposition="right"></cl-spinner>
                    </div>
                </div>
            </div>
        `;
    }
});

// InputMask Example
defineComponent('example-input-mask', {
    data() {
        return {
            phone: '',
            ssn: '',
            creditCard: '',
            date: ''
        };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                <cl-input-mask
                    label="Phone Number"
                    mask="(999) 999-9999"
                    placeholder="(555) 123-4567"
                    x-model="phone">
                </cl-input-mask>

                <cl-input-mask
                    label="Social Security Number"
                    mask="999-99-9999"
                    placeholder="123-45-6789"
                    x-model="ssn">
                </cl-input-mask>

                <cl-input-mask
                    label="Credit Card"
                    mask="9999 9999 9999 9999"
                    placeholder="1234 5678 9012 3456"
                    x-model="creditCard">
                </cl-input-mask>

                <cl-input-mask
                    label="Date (MM/DD/YYYY)"
                    mask="99/99/9999"
                    placeholder="01/15/2024"
                    x-model="date">
                </cl-input-mask>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    <strong>Values:</strong><br>
                    Phone: ${this.state.phone || '(empty)'}<br>
                    SSN: ${this.state.ssn || '(empty)'}<br>
                    Card: ${this.state.creditCard || '(empty)'}<br>
                    Date: ${this.state.date || '(empty)'}
                </div>
            </div>
        `;
    }
});

// InputPassword Example
defineComponent('example-input-password', {
    data() {
        return {
            password: '',
            confirmPassword: ''
        };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                <cl-input-password
                    label="Password"
                    placeholder="Enter password..."
                    showStrength="true"
                    helptext="Use a strong password with mixed characters"
                    x-model="password">
                </cl-input-password>

                <cl-input-password
                    label="Confirm Password"
                    placeholder="Confirm password..."
                    x-model="confirmPassword">
                </cl-input-password>

                <cl-input-password
                    label="Simple Password (no toggle)"
                    placeholder="Enter password..."
                    showToggle="false">
                </cl-input-password>
            </div>
        `;
    }
});

// Toggle Example
defineComponent('example-toggle', {
    data() {
        return {
            notifications: true,
            darkMode: false,
            autoSave: true
        };
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px;">
                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Basic Toggle</h4>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <cl-toggle
                            label="Enable notifications"
                            x-model="notifications">
                        </cl-toggle>

                        <cl-toggle
                            label="Dark mode"
                            x-model="darkMode">
                        </cl-toggle>

                        <cl-toggle
                            label="Auto-save"
                            x-model="autoSave">
                        </cl-toggle>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Sizes</h4>
                    <div style="display: flex; gap: 32px; align-items: center; flex-wrap: wrap;">
                        <cl-toggle label="Small" size="small" checked="true"></cl-toggle>
                        <cl-toggle label="Medium" size="medium" checked="true"></cl-toggle>
                        <cl-toggle label="Large" size="large" checked="true"></cl-toggle>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">With Labels</h4>
                    <div style="display: flex; gap: 32px; align-items: center; flex-wrap: wrap;">
                        <cl-toggle checkedLabel="ON" uncheckedLabel="OFF" checked="true"></cl-toggle>
                        <cl-toggle label="Label on left" labelPosition="left"></cl-toggle>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">States</h4>
                    <div style="display: flex; gap: 32px; align-items: center; flex-wrap: wrap;">
                        <cl-toggle label="Disabled (off)" disabled="true"></cl-toggle>
                        <cl-toggle label="Disabled (on)" disabled="true" checked="true"></cl-toggle>
                    </div>
                </div>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Notifications: ${this.state.notifications ? 'On' : 'Off'} |
                    Dark Mode: ${this.state.darkMode ? 'On' : 'Off'} |
                    Auto-save: ${this.state.autoSave ? 'On' : 'Off'}
                </div>
            </div>
        `;
    }
});

// InputSearch Example
defineComponent('example-input-search', {
    data() {
        return {
            query: '',
            suggestions: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew']
        };
    },
    methods: {
        handleSearch(e) {
            console.log('Search:', e.detail.value);
        },
        handleSelect(e) {
            console.log('Selected:', e.detail.suggestion);
        }
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                <cl-input-search
                    label="Basic Search"
                    placeholder="Search..."
                    x-model="query"
                    on-search="handleSearch">
                </cl-input-search>

                <cl-input-search
                    label="With Suggestions"
                    placeholder="Search fruits..."
                    suggestions="${this.state.suggestions}"
                    on-select="handleSelect">
                </cl-input-search>

                <cl-input-search
                    label="Loading State"
                    placeholder="Searching..."
                    loading="true">
                </cl-input-search>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Search query: ${this.state.query || '(empty)'}
                </div>
            </div>
        `;
    }
});

// VirtualList Example
defineComponent('example-virtual-list', {
    data() {
        return {
            items: [],
            selectedItem: null
        };
    },
    mounted() {
        // Generate 10000 items
        this.state.items = Array.from({ length: 10000 }, (_, i) => ({
            id: i + 1,
            title: `Item ${i + 1}`,
            subtitle: `Description for item ${i + 1}`
        }));
    },
    methods: {
        handleSelect(e) {
            this.state.selectedItem = e.detail.item;
        }
    },
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <p style="color: var(--text-muted, #666); margin: 0;">
                    Displaying <strong>10,000 items</strong> with virtualization.
                    Only visible items are rendered for optimal performance.
                </p>

                <cl-virtual-list
                    items="${this.state.items}"
                    itemHeight="60"
                    height="400px"
                    selectable="true"
                    on-select="handleSelect">
                </cl-virtual-list>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Selected: ${this.state.selectedItem ? this.state.selectedItem.title : 'None'}
                </div>
            </div>
        `;
    }
});

// Badge Example
defineComponent('example-badge', {
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px;">
                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Severities</h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <cl-badge value="Primary" severity="primary"></cl-badge>
                        <cl-badge value="Secondary" severity="secondary"></cl-badge>
                        <cl-badge value="Success" severity="success"></cl-badge>
                        <cl-badge value="Danger" severity="danger"></cl-badge>
                        <cl-badge value="Warning" severity="warning"></cl-badge>
                        <cl-badge value="Info" severity="info"></cl-badge>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Sizes</h4>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <cl-badge value="Small" size="small"></cl-badge>
                        <cl-badge value="Medium" size="medium"></cl-badge>
                        <cl-badge value="Large" size="large"></cl-badge>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Pill Style</h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <cl-badge value="New" severity="primary" rounded="true"></cl-badge>
                        <cl-badge value="99+" severity="danger" rounded="true"></cl-badge>
                        <cl-badge value="Active" severity="success" rounded="true"></cl-badge>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">With Icons</h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <cl-badge value="Messages" icon="📧" severity="primary"></cl-badge>
                        <cl-badge value="Alerts" icon="⚠️" severity="warning"></cl-badge>
                        <cl-badge value="Complete" icon="✓" severity="success"></cl-badge>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Dot Indicators</h4>
                    <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
                        <span>Online <cl-badge dot="true" severity="success"></cl-badge></span>
                        <span>Away <cl-badge dot="true" severity="warning"></cl-badge></span>
                        <span>Busy <cl-badge dot="true" severity="danger"></cl-badge></span>
                        <span>Offline <cl-badge dot="true" severity="secondary"></cl-badge></span>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">Removable</h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <cl-badge value="Tag 1" severity="primary" removable="true"></cl-badge>
                        <cl-badge value="Tag 2" severity="success" removable="true"></cl-badge>
                        <cl-badge value="Tag 3" severity="info" removable="true"></cl-badge>
                    </div>
                </div>
            </div>
        `;
    }
});

// Alert Example
defineComponent('example-alert', {
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 16px; max-width: 600px;">
                <cl-alert severity="info" title="Information">
                    This is an informational message. It provides helpful context.
                </cl-alert>

                <cl-alert severity="success" title="Success">
                    Your changes have been saved successfully!
                </cl-alert>

                <cl-alert severity="warning" title="Warning">
                    Please review your input before submitting.
                </cl-alert>

                <cl-alert severity="error" title="Error">
                    Something went wrong. Please try again later.
                </cl-alert>

                <h4 style="margin: 24px 0 8px 0; color: var(--text-muted, #666);">Closable Alerts</h4>

                <cl-alert severity="info" closable="true">
                    This alert can be dismissed by clicking the X button.
                </cl-alert>

                <h4 style="margin: 24px 0 8px 0; color: var(--text-muted, #666);">Outline Style</h4>

                <cl-alert severity="info" outline="true">
                    Outlined info alert for a lighter appearance.
                </cl-alert>

                <cl-alert severity="success" outline="true">
                    Outlined success alert.
                </cl-alert>

                <h4 style="margin: 24px 0 8px 0; color: var(--text-muted, #666);">Without Title</h4>

                <cl-alert severity="info">
                    A simple alert without a title, just the message content.
                </cl-alert>
            </div>
        `;
    }
});
