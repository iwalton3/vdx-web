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

import './selection/dropdown.js';
import './selection/multiselect.js';
import './selection/autocomplete.js';
import './selection/chips.js';

import './data/datatable.js';
import './data/paginator.js';
import './data/tree.js';
import './data/orderable-list.js';

import './panel/accordion.js';
import './panel/tabview.js';
import './panel/card.js';
import './panel/fieldset.js';
import './panel/splitter.js';

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

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px;">
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

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 8px;">
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

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px;">
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

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px;">
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

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 16px;">
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

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 16px;">
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

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 16px;">
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
                        <button style="padding: 8px 16px; cursor: pointer;">Buy</button>
                        <button style="padding: 8px 16px; cursor: pointer;">Details</button>
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
                <cl-splitter layout="horizontal" panelsizes="[60, 40]">
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

// Dialog Example
defineComponent('example-dialog', {
    data() {
        return { visible: false };
    },
    template() {
        return html`
            <div>
                <cl-button
                    label="Show Dialog"
                    on-click="${() => this.state.visible = true}">
                </cl-button>

                <cl-dialog
                    visible="${this.state.visible}"
                    header="Dialog Header"
                    modal="true"
                    closable="true"
                    style="width: 500px;"
                    on-change="${(e, val) => this.state.visible = val}">
                    <p>This is a modal dialog. Click outside or press the X to close.</p>
                    <p>You can put any content here.</p>
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
