/**
 * Pre-registered example components for demos
 */
import { defineComponent, html, when, each, raw, untracked, memoEach, Component } from '../lib/framework.js';
import { createWindowing } from '../lib/windowing.js';
import { createRowGestures, groupReorderTargets } from '../lib/gestures.js';

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
import './overlay/action-menu.js';
import './overlay/context-menu.js';

import './button/button.js';
import './button/split-button.js';
import './button/menu.js';
import './button/breadcrumb.js';

import './misc/progressbar.js';
import './misc/fileupload.js';
import './misc/dropzone.js';
import './misc/divider.js';
import './misc/avatar.js';
import './misc/skeleton.js';
import './misc/empty.js';
import './misc/copy.js';
import './overlay/popover.js';
import './selection/segmented.js';
import './form/inplace.js';
import './form/rating.js';
import './form/otp.js';
import './data/timeline.js';
import './data/meter.js';
import './misc/colorpicker.js';
import './misc/spinner.js';
import './misc/badge.js';
import './misc/alert.js';
import './misc/error-boundary.js';
import './misc/error-boundary-demo.js';

// InputText Example
class ExampleInputText extends Component {
    constructor(props) {
        super(props);

        this.state = { value: '', email: '', pattern: '' };
    }

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
}

defineComponent('example-input-text', ExampleInputText);

// InputNumber Example
class ExampleInputNumber extends Component {
    constructor(props) {
        super(props);

        this.state = { value: 0, quantity: 1, price: 9.99, vertical: 5, amount: '100.00', width: 320 };
    }

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

                <cl-input-number
                    label="Vertical buttons"
                    orientation="vertical"
                    x-model="vertical">
                </cl-input-number>

                <cl-input-number
                    label="String decimal mode (step 0.01, exact)"
                    mode="string"
                    step="0.01"
                    x-model="amount">
                </cl-input-number>
                <small style="color: var(--text-muted, #666);">Value: "${this.state.amount}" (string)</small>

                <label class="cl-label" for="auto-width-range">Auto layout — drag the slider to resize</label>
                <input id="auto-width-range" type="range" min="90" max="360"
                    aria-label="Resize the auto-layout demo" x-model="width">
                <div style="width: ${this.state.width}px; max-width: 100%; border: 1px dashed #ccc; padding: 8px;">
                    <cl-input-number label="Auto (collapses when narrow)" x-model="quantity"></cl-input-number>
                </div>
            </div>
        `;
    }
}

defineComponent('example-input-number', ExampleInputNumber);

// TextArea Example
class ExampleTextarea extends Component {
    constructor(props) {
        super(props);

        this.state = { text: '', limited: '' };
    }

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
}

defineComponent('example-textarea', ExampleTextarea);

// Checkbox Example
class ExampleCheckbox extends Component {
    constructor(props) {
        super(props);

        this.state = { checked: false, terms: true };
    }

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
}

defineComponent('example-checkbox', ExampleCheckbox);

// RadioButton Example
class ExampleRadioButton extends Component {
    constructor(props) {
        super(props);

        this.state = { size: 'medium' };
    }

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
}

defineComponent('example-radio-button', ExampleRadioButton);

// Slider Example
class ExampleSlider extends Component {
    constructor(props) {
        super(props);

        this.state = { value: 50, volume: 75 };
    }

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
}

defineComponent('example-slider', ExampleSlider);

// Calendar Example
class ExampleCalendar extends Component {
    constructor(props) {
        super(props);

        this.state = { date: '', inline: new Date().toISOString().split('T')[0], rangeText: 'None' };
    }

    handleRange(e) {
        const v = e.detail && e.detail.value;
        this.state.rangeText = (v && v.start)
            ? `${v.start} → ${v.end || '…'}`
            : 'None';
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                <cl-calendar
                    label="Select Date"
                    x-model="date">
                </cl-calendar>

                <cl-calendar
                    label="Date Range"
                    selection-mode="range"
                    on-change="handleRange">
                </cl-calendar>

                <cl-calendar
                    label="Inline Calendar"
                    inline="true"
                    x-model="inline">
                </cl-calendar>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Selected: ${this.state.date || 'None'} &nbsp;·&nbsp; Range: ${this.state.rangeText}
                </div>
            </div>
        `;
    }
}

defineComponent('example-calendar', ExampleCalendar);

// Dropdown Example
class ExampleDropdown extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

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
}

defineComponent('example-dropdown', ExampleDropdown);

// MultiSelect Example
class ExampleMultiselect extends Component {
    constructor(props) {
        super(props);

        this.state = {
            selected: ['red', 'blue'],
            colors: [
                { label: 'Red', value: 'red' },
                { label: 'Green', value: 'green' },
                { label: 'Blue', value: 'blue' },
                { label: 'Yellow', value: 'yellow' },
                { label: 'Purple', value: 'purple' }
            ]
        };
    }

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
}

defineComponent('example-multiselect', ExampleMultiselect);

// AutoComplete Example
class ExampleAutocomplete extends Component {
    constructor(props) {
        super(props);

        this.state = {
            value: '',
            countries: ['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina',
                      'United Kingdom', 'France', 'Germany', 'Spain', 'Italy']
        };
    }

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
}

defineComponent('example-autocomplete', ExampleAutocomplete);

// Chips Example
class ExampleChips extends Component {
    constructor(props) {
        super(props);

        this.state = { tags: ['javascript', 'react', 'vue'] };
    }

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
}

defineComponent('example-chips', ExampleChips);

// DataTable Example
class ExampleDatatable extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

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
}

defineComponent('example-datatable', ExampleDatatable);

// Paginator Example
class ExamplePaginator extends Component {
    constructor(props) {
        super(props);

        this.state = { first: 0, rows: 10 };
    }

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
}

defineComponent('example-paginator', ExamplePaginator);

// Tree Example
class ExampleTree extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

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
}

defineComponent('example-tree', ExampleTree);

// OrderableList Example
class ExampleOrderableList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            items: ['First Item', 'Second Item', 'Third Item', 'Fourth Item', 'Fifth Item']
        };
    }

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
}

defineComponent('example-orderable-list', ExampleOrderableList);

// Accordion Example
class ExampleAccordion extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

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
}

defineComponent('example-accordion', ExampleAccordion);

// TabView Example
class ExampleTabview extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

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
}

defineComponent('example-tabview', ExampleTabview);

// Card Example
class ExampleCard extends Component {
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
}

defineComponent('example-card', ExampleCard);

// Fieldset Example
class ExampleFieldset extends Component {
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
}

defineComponent('example-fieldset', ExampleFieldset);

// Splitter Example
class ExampleSplitter extends Component {
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
}

defineComponent('example-splitter', ExampleSplitter);

// Dialog Example with Footer Buttons
class ExampleDialog extends Component {
    constructor(props) {
        super(props);

        this.state = { basicVisible: false, confirmVisible: false, formVisible: false };
    }

    handleConfirm() {
        alert('Confirmed!');
        this.state.confirmVisible = false;
    }

    handleFormSubmit() {
        alert('Form submitted!');
        this.state.formVisible = false;
    }

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
}

defineComponent('example-dialog', ExampleDialog);

// Sidebar Example
class ExampleSidebar extends Component {
    constructor(props) {
        super(props);

        this.state = { visible: false, position: 'left' };
    }

    show(pos) {
        this.state.position = pos;
        this.state.visible = true;
    }

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
}

defineComponent('example-sidebar', ExampleSidebar);

// Toast Example
class ExampleToast extends Component {
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
}

defineComponent('example-toast', ExampleToast);

// Tooltip Example
class ExampleTooltip extends Component {
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
}

defineComponent('example-tooltip', ExampleTooltip);

// Action Menu Example
class ExampleActionMenu extends Component {
    handleAction(action) {
        console.log('Action:', action);
    }

    template() {
        const fileActions = [
            { label: 'New File', icon: '📄', action: () => this.handleAction('new') },
            { label: 'Open', icon: '📂', action: () => this.handleAction('open') },
            { label: 'Save', icon: '💾', action: () => this.handleAction('save'), shortcut: '⌘S' },
            { separator: true },
            { label: 'Export', icon: '📤', action: () => this.handleAction('export') },
            { label: 'Print', icon: '🖨️', action: () => this.handleAction('print'), disabled: true }
        ];

        const userActions = [
            { label: 'Profile', icon: '👤', action: () => this.handleAction('profile') },
            { label: 'Settings', icon: '⚙️', action: () => this.handleAction('settings') },
            { separator: true },
            { label: 'Logout', icon: '🚪', danger: true, action: () => this.handleAction('logout') }
        ];

        const simpleActions = [
            { label: 'Edit', action: () => this.handleAction('edit') },
            { label: 'Duplicate', action: () => this.handleAction('duplicate') },
            { separator: true },
            { label: 'Delete', danger: true, action: () => this.handleAction('delete') }
        ];

        return html`
            <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                <div>
                    <p style="margin-bottom: 8px; font-size: 14px; color: #666;">With icons and shortcuts:</p>
                    <cl-action-menu label="File" items="${fileActions}"></cl-action-menu>
                </div>

                <div>
                    <p style="margin-bottom: 8px; font-size: 14px; color: #666;">User menu:</p>
                    <cl-action-menu label="Account" icon="👤" items="${userActions}"></cl-action-menu>
                </div>

                <div>
                    <p style="margin-bottom: 8px; font-size: 14px; color: #666;">Ellipsis menu:</p>
                    <cl-action-menu items="${simpleActions}"></cl-action-menu>
                </div>

                <div>
                    <p style="margin-bottom: 8px; font-size: 14px; color: #666;">Disabled:</p>
                    <cl-action-menu label="Actions" items="${simpleActions}" disabled="${true}"></cl-action-menu>
                </div>
            </div>
        `;
    }
}

defineComponent('example-action-menu', ExampleActionMenu);

// Button Example
class ExampleButton extends Component {
    constructor(props) {
        super(props);

        this.state = { loading: false };
    }

    handleLoad() {
        this.state.loading = true;
        setTimeout(() => this.state.loading = false, 2000);
    }

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
}

defineComponent('example-button', ExampleButton);

// SplitButton Example
class ExampleSplitButton extends Component {
    constructor(props) {
        super(props);

        this.state = {
            items: [
                { label: 'Update', command: () => console.log('Update') },
                { label: 'Delete', command: () => console.log('Delete') },
                { label: 'Archive', command: () => console.log('Archive') }
            ]
        };
    }

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
}

defineComponent('example-split-button', ExampleSplitButton);

// Menu Example
class ExampleMenu extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

    template() {
        return html`
            <div style="max-width: 400px;">
                <cl-menu model="${this.state.items}"></cl-menu>
            </div>
        `;
    }
}

defineComponent('example-menu', ExampleMenu);

// Breadcrumb Example
class ExampleBreadcrumb extends Component {
    constructor(props) {
        super(props);

        this.state = {
            items: [
                { label: 'Electronics', url: '#' },
                { label: 'Computers', url: '#' },
                { label: 'Laptops', url: '#' }
            ],
            home: { icon: '🏠', url: '#' }
        };
    }

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
}

defineComponent('example-breadcrumb', ExampleBreadcrumb);

// ProgressBar Example
class ExampleProgressbar extends Component {
    constructor(props) {
        super(props);

        this.state = { value: 60 };
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 600px;">
                <cl-progressbar value="75"></cl-progressbar>
                <cl-progressbar value="${this.state.value}"></cl-progressbar>
                <cl-progressbar mode="indeterminate"></cl-progressbar>
            </div>
        `;
    }
}

defineComponent('example-progressbar', ExampleProgressbar);

// FileUpload Example
class ExampleFileupload extends Component {
    constructor(props) {
        super(props);

        this.state = { files: [] };
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 600px;">
                <cl-fileupload
                    multiple="true"
                    label="Choose Files"
                    on-change="${(e, val) => this.state.files = val}">
                </cl-fileupload>

                <cl-fileupload
                    dropzone="true"
                    multiple="true"
                    on-change="${(e, val) => this.state.files = val}">
                </cl-fileupload>
            </div>
        `;
    }
}

defineComponent('example-fileupload', ExampleFileupload);

// DropZone Example
class ExampleDropzone extends Component {
    constructor(props) {
        super(props);

        this.state = { last: 'Nothing dropped yet', rejected: '' };
    }

    onSelect(e) {
        this.state.last = e.detail.files.map(f => f.name).join(', ');
        this.state.rejected = '';
    }

    onReject(e) {
        this.state.rejected = e.detail.files
            .map(r => `${r.file.name} (${r.reason})`).join(', ');
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 600px;">
                <cl-dropzone
                    multiple="true"
                    paste="true"
                    on-select="onSelect"
                    on-reject="onReject">
                </cl-dropzone>

                <cl-dropzone
                    accept="image/*"
                    maxfilesize="${2 * 1024 * 1024}"
                    label="Drop an image (max 2 MB)"
                    hint="PNG, JPG or GIF"
                    on-select="onSelect"
                    on-reject="onReject">
                </cl-dropzone>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; font-size: 14px;">
                    <div>Accepted: ${this.state.last}</div>
                    ${when(this.state.rejected, html`
                        <div style="color: var(--error-color, #dc3545);">Rejected: ${this.state.rejected}</div>
                    `)}
                </div>
            </div>
        `;
    }
}

defineComponent('example-dropzone', ExampleDropzone);

// ColorPicker Example
class ExampleColorpicker extends Component {
    constructor(props) {
        super(props);

        this.state = { color: '#3498db', inlineColor: '#e74c3c' };
    }

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
}

defineComponent('example-colorpicker', ExampleColorpicker);

// Shell Example
import './layout/shell.js';

class ExampleShell extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

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
}

defineComponent('example-shell', ExampleShell);

// Complete Form Example
class ExampleCompleteForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

    handleSubmit() {
        console.log('Form submitted:', this.state.form);
        alert('Form submitted! Check console for data.');
    }

    handleReset() {
        this.state.form = {
            firstName: '', lastName: '', email: '', phone: '',
            birthDate: '', gender: 'other', country: null,
            interests: [], bio: '', newsletter: false,
            notifications: true, experience: 3
        };
    }

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
    }

    static styles = /*css*/`
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
}

defineComponent('example-complete-form', ExampleCompleteForm);

// Stepper Example
class ExampleStepper extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
    }

    handleStepChange(e) {
        const detail = e.detail || {};
        if (detail.step !== undefined) {
            this.state.currentStep = detail.step;
        }
    }

    handleValidate(e) {
        const detail = e.detail || {};
        const step = detail.step;
        if (step === 0 && !this.state.form.email) {
            const stepper = this.querySelector('cl-stepper');
            stepper.setError('Please enter an email address');
            e.preventDefault();
        }
    }

    handleComplete() {
        alert('Form completed! ' + JSON.stringify(this.state.form));
    }

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
}

defineComponent('example-stepper', ExampleStepper);

// Spinner Example
class ExampleSpinner extends Component {
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
}

defineComponent('example-spinner', ExampleSpinner);

// InputMask Example
class ExampleInputMask extends Component {
    constructor(props) {
        super(props);

        this.state = {
            phone: '',
            ssn: '',
            creditCard: '',
            date: ''
        };
    }

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
}

defineComponent('example-input-mask', ExampleInputMask);

// InputPassword Example
class ExampleInputPassword extends Component {
    constructor(props) {
        super(props);

        this.state = {
            password: '',
            confirmPassword: ''
        };
    }

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
}

defineComponent('example-input-password', ExampleInputPassword);

// Toggle Example
class ExampleToggle extends Component {
    constructor(props) {
        super(props);

        this.state = {
            notifications: true,
            darkMode: false,
            autoSave: true,
            // Size demos
            sizeSmall: true,
            sizeMedium: true,
            sizeLarge: true,
            // With labels demos
            onOff: true,
            leftLabel: false
        };
    }

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
                        <cl-toggle label="Small" size="small" x-model="sizeSmall"></cl-toggle>
                        <cl-toggle label="Medium" size="medium" x-model="sizeMedium"></cl-toggle>
                        <cl-toggle label="Large" size="large" x-model="sizeLarge"></cl-toggle>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 16px 0; color: var(--text-muted, #666);">With Labels</h4>
                    <div style="display: flex; gap: 32px; align-items: center; flex-wrap: wrap;">
                        <cl-toggle checkedLabel="ON" uncheckedLabel="OFF" x-model="onOff"></cl-toggle>
                        <cl-toggle label="Label on left" labelPosition="left" x-model="leftLabel"></cl-toggle>
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
}

defineComponent('example-toggle', ExampleToggle);

// InputSearch Example
class ExampleInputSearch extends Component {
    constructor(props) {
        super(props);

        this.state = {
            query: '',
            suggestions: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew']
        };
    }

    handleSearch(e) {
        console.log('Search:', e.detail.value);
    }

    handleSelect(e) {
        console.log('Selected:', e.detail.suggestion);
    }

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
}

defineComponent('example-input-search', ExampleInputSearch);

// VirtualList Example
class ExampleVirtualList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            items: untracked([]),  // Don't track 10000 items!
            selectedItem: null,
            scrollMode: 'self',  // 'self' | 'parent' | 'window'
            // Smaller list for the drag-to-reorder demo. The consumer owns the
            // array: the component never mutates props.items - it only emits a
            // 'reorder' event and we apply the change here.
            reorderItems: untracked([]),
            lastReorder: null
        };
    }

    mounted() {
        // Generate 10000 items
        this.state.items = Array.from({ length: 10000 }, (_, i) => ({
            id: i + 1,
            title: `Item ${i + 1}`,
            subtitle: `Description for item ${i + 1}`
        }));
        this.state.reorderItems = Array.from({ length: 500 }, (_, i) => ({
            id: i + 1,
            title: `Task ${i + 1}`,
            subtitle: `Drag to reorder task ${i + 1}`
        }));
    }

    handleSelect(e) {
        this.state.selectedItem = e.detail.item;
    }

    setScrollMode(mode) {
        this.state.scrollMode = mode;
    }

    // Apply a reorder: the event gives us both the raw gap and a
    // remove-then-insert `to` index - use `to` directly with splice.
    handleReorder(e) {
        const { from, to } = e.detail;
        const next = this.state.reorderItems.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        this.state.reorderItems = next;
        this.state.lastReorder = `Moved "${moved.title}" from ${from} to ${to}`;
    }

    // Custom key function for memoization
    getItemKey(item) {
        return item.id;
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <p style="color: var(--text-muted, #666); margin: 0;">
                    Displaying <strong>10,000 items</strong> with virtualization.
                    Only visible items are rendered for optimal performance.
                </p>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <cl-button
                        label="Self Scroll"
                        severity="${this.state.scrollMode === 'self' ? 'primary' : 'secondary'}"
                        on-click="${() => this.setScrollMode('self')}">
                    </cl-button>
                    <cl-button
                        label="Page Scroll"
                        severity="${this.state.scrollMode === 'window' ? 'primary' : 'secondary'}"
                        on-click="${() => this.setScrollMode('window')}">
                    </cl-button>
                </div>

                ${when(this.state.scrollMode === 'self', html`
                    <cl-virtual-list
                        items="${this.state.items}"
                        itemHeight="60"
                        height="400px"
                        scrollContainer="self"
                        keyFn="${this.getItemKey}"
                        selectable="true"
                        on-select="handleSelect">
                    </cl-virtual-list>
                `)}

                ${when(this.state.scrollMode === 'window', html`
                    <cl-virtual-list
                        items="${this.state.items}"
                        itemHeight="60"
                        scrollContainer="window"
                        keyFn="${this.getItemKey}"
                        selectable="true"
                        on-select="handleSelect">
                    </cl-virtual-list>
                `)}

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Selected: ${this.state.selectedItem ? this.state.selectedItem.title : 'None'}
                </div>

                <h4 style="margin: 8px 0 0;">Reorderable (drag to reorder)</h4>
                <p style="color: var(--text-muted, #666); margin: 0;">
                    <strong>500 items</strong>, drag-to-reorder enabled. Drag a row (or
                    its grip handle on touch); the consumer applies the change.
                </p>
                <cl-virtual-list
                    class="reorderable-demo"
                    items="${this.state.reorderItems}"
                    itemHeight="56"
                    height="320px"
                    scrollContainer="self"
                    keyFn="${this.getItemKey}"
                    reorderable="true"
                    on-reorder="handleReorder">
                </cl-virtual-list>
                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Last reorder: ${this.state.lastReorder || 'None'}
                </div>

                <p style="color: var(--text-muted, #666); font-size: 13px; margin: 0;">
                    <strong>scrollContainer options:</strong><br>
                    • "self" (default) - Component has its own scrollbar<br>
                    • "parent" - Tracks nearest scrollable parent<br>
                    • "window" - Tracks window/document scroll<br>
                    • CSS selector - Tracks a specific element
                </p>
            </div>
        `;
    }
}

defineComponent('example-virtual-list', ExampleVirtualList);

// Badge Example
class ExampleBadge extends Component {
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
}

defineComponent('example-badge', ExampleBadge);

// Alert Example
class ExampleAlert extends Component {
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
}

defineComponent('example-alert', ExampleAlert);

// ============================================================================
// ContextMenu Example - standalone, generic usage of cl-context-menu
// ============================================================================
class ExampleContextMenu extends Component {
    constructor(props) {
        super(props);

        this.state = {
            lastPick: null,
            // A deliberately long menu so the "taller than viewport" scroll path
            // can be exercised when opened near the bottom of a small viewport.
            menuItems: [
                { label: 'Edit', icon: '✏️' },
                { label: 'Duplicate', icon: '⧉' },
                { separator: true },
                { label: 'Cut', icon: '✂️', shortcut: '⌘X' },
                { label: 'Copy', icon: '📋', shortcut: '⌘C' },
                { label: 'Paste', icon: '📌', shortcut: '⌘V', disabled: true },
                { separator: true },
                { label: 'Delete', icon: '🗑️', danger: true }
            ]
        };
    }

    openMenu(e) {
        // openAtEvent reads the pointer coords, suppresses the native menu,
        // and opens here. The second arg is an opaque context echoed back.
        this.refs.menu.openAtEvent(e, { source: 'target-area' });
    }

    openProgrammatic() {
        // Open at a fixed spot near the top-left, no event needed.
        const rect = this.refs.target.getBoundingClientRect();
        this.refs.menu.open(rect.left + 20, rect.top + 20, { source: 'button' });
    }

    onPick(e) {
        this.state.lastPick = `${e.detail.item.label} (context: ${e.detail.context ? e.detail.context.source : 'none'})`;
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <p style="color: var(--text-muted, #666); margin: 0;">
                    A generic, viewport-overflow-aware context menu. Right-click the
                    target area (it flips/clamps so it never leaves the viewport, and
                    scrolls internally if taller than the screen), or open it
                    programmatically.
                </p>

                <div
                    ref="target"
                    class="ctx-target"
                    on-contextmenu="${(e) => this.openMenu(e)}">
                    Right-click anywhere in this box
                </div>

                <div>
                    <cl-button label="Open programmatically" severity="secondary"
                        on-click="${() => this.openProgrammatic()}"></cl-button>
                </div>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Last selection: ${this.state.lastPick || 'None'}
                </div>

                <cl-context-menu
                    ref="menu"
                    items="${this.state.menuItems}"
                    on-select="onPick">
                </cl-context-menu>
            </div>
        `;
    }

    static styles = /*css*/`
        .ctx-target {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 160px;
            border: 2px dashed var(--input-border, #ced4da);
            border-radius: 8px;
            color: var(--text-muted, #666);
            background: var(--hover-bg, #f8f9fa);
            user-select: none;
        }
    `
}

defineComponent('example-context-menu', ExampleContextMenu);

// ============================================================================
// Reorderable playground - INNER windowed list
//
// cl-virtual-list's selection is single-key, so it cannot express multiselect
// or group drag. Per componentlib.md / performance.md, the sanctioned pattern
// for that is to compose createWindowing + createRowGestures directly with a
// `selection` adapter - which is exactly what this component does. It owns no
// data: it renders `items` + `selectedIds` props and emits gesture events; the
// parent applies every change (consumer-owns-the-array contract).
// ============================================================================
class ExampleReorderList extends Component {
    static props = {
        items: [],
        selectedIds: [],
        selectionMode: false,
        itemHeight: 56
    }

    constructor(props) {
        super(props);

        // Windowing controller - host ('self') is the scroller, so touch-drag
        // geometry (host rect + scrollTop) maps directly to absolute indices.
        this._win = createWindowing(this, {
            itemHeight: () => Number(this.props.itemHeight) || 56,
            count: () => (this.props.items || []).length,
            fallbackHeight: () => 420
        });

        // Row-gesture controller with a selection adapter so a drag that starts
        // on a selected row moves the WHOLE selection (group drag).
        this._gestures = createRowGestures(this, {
            itemHeight: () => Number(this.props.itemHeight) || 56,
            windowing: this._win,
            count: () => (this.props.items || []).length,
            scrollContainer: () => this,
            // The checkbox is its own control: touches starting on it must
            // arm neither tap/long-press nor drag, or its click handler and
            // the row's onTap double-toggle the selection (net no-op).
            excludeSelector: '.rl-check',
            selection: {
                isSelected: (i) => {
                    const item = (this.props.items || [])[i];
                    return item ? this._selectedSet().has(item.id) : false;
                },
                indices: () => {
                    const sel = this._selectedSet();
                    const out = [];
                    (this.props.items || []).forEach((it, idx) => {
                        if (sel.has(it.id)) out.push(idx);
                    });
                    return out;
                }
            },
            onReorder: (fromIndices, gap) => {
                this.dispatchEvent(new CustomEvent('reorder', {
                    bubbles: true, composed: true,
                    detail: { fromIndices, gap }
                }));
            },
            onTap: (i) => {
                const item = (this.props.items || [])[i];
                this.dispatchEvent(new CustomEvent('row-tap', {
                    bubbles: true, composed: true,
                    detail: { index: i, id: item ? item.id : null }
                }));
            },
            onLongPress: (i) => {
                const item = (this.props.items || [])[i];
                const pt = this._lastTouch || { x: 0, y: 0 };
                this.dispatchEvent(new CustomEvent('row-menu', {
                    bubbles: true, composed: true,
                    detail: { index: i, id: item ? item.id : null, clientX: pt.x, clientY: pt.y }
                }));
            }
        });

        this.state = {};
    }

    mounted() {
        this._win.attach();
        this._win.setScrollContainer('self');
    }

    unmounted() {
        this._win.detach();
        this._gestures.cancel();
    }

    propsChanged(prop) {
        if (prop === 'items' || prop === 'itemHeight') {
            this._win.refresh();
        }
    }

    _selectedSet() {
        return new Set(this.props.selectedIds || []);
    }

    _onContextMenu(index, e) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        const item = (this.props.items || [])[index];
        this.dispatchEvent(new CustomEvent('row-menu', {
            bubbles: true, composed: true,
            detail: { index, id: item ? item.id : null, clientX: e.clientX, clientY: e.clientY }
        }));
    }

    _onCheck(item, e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        this.dispatchEvent(new CustomEvent('toggle-select', {
            bubbles: true, composed: true,
            detail: { id: item.id }
        }));
    }

    _renderRow(item, isSelected, absIndex, selectionMode, itemHeight, g) {
        // Selection-UX rules learned from production:
        //  - In selection mode, ONLY selected rows are drag handles; unselected
        //    rows scroll / tap-select. Outside selection mode every row drags.
        //  - A touch that starts on the checkbox never starts a drag (the
        //    checkbox is not the drag handle, and it stops propagation).
        const isHandle = !selectionMode || isSelected;
        const draggable = !g.isTouchDevice() && isHandle;

        return html`
                <div
                    class="rl-row ${isSelected ? 'selected' : ''}"
                    style="height: ${itemHeight}px;"
                    data-index="${absIndex}"
                    data-id="${item.id}"
                    draggable="${draggable}"
                    on-click="${(e) => g.click(absIndex, e)}"
                    on-contextmenu="${(e) => this._onContextMenu(absIndex, e)}"
                    on-touchstart-passive="${(e) => { const t = e.touches && e.touches[0]; if (t) this._lastTouch = { x: t.clientX, y: t.clientY }; g.touchStart(absIndex, e); }}"
                    on-touchmove-passive="${(e) => g.touchMove(e)}"
                    on-touchend="${(e) => g.touchEnd(absIndex, e)}"
                    on-dragstart="${(e) => g.dragStart(absIndex, e)}"
                    on-dragover="${(e) => g.dragOver(absIndex, e)}"
                    on-dragleave="${(e) => g.dragLeave(e)}"
                    on-drop="${(e) => g.drop(absIndex, e)}"
                    on-dragend="${(e) => g.dragEnd(e)}">
                    ${when(selectionMode, () => html`
                        <input
                            type="checkbox"
                            class="rl-check"
                            checked="${isSelected}"
                            on-click="${(e) => this._onCheck(item, e)}">
                    `)}
                    ${when(isHandle, () => html`
                        <span
                            class="rl-handle"
                            aria-hidden="true"
                            on-touchstart="${(e) => g.handleTouchStart(absIndex, e)}"
                            on-touchmove="${(e) => g.handleTouchMove(e)}"
                            on-touchend="${(e) => g.handleTouchEnd(e)}">⣿</span>
                    `)}
                    <div class="rl-content">
                        <div class="rl-title">${item.title}</div>
                        <div class="rl-sub">${item.subtitle}</div>
                    </div>
                </div>
            `;
    }

    template() {
        const win = this._win;
        const g = this._gestures;
        const items = this.props.items || [];
        const selectionMode = !!this.props.selectionMode;
        const itemHeight = Number(this.props.itemHeight) || 56;
        // Read selection OUTSIDE mapFn so the template tracks it and the composite
        // key below recomputes when it changes.
        const sel = this._selectedSet();

        // Only mount the memoEach once there are rows. Rendering an *empty*
        // memoEach first and then growing it to N goes through the framework's
        // keyed-update path, which does not populate an empty list; keeping the
        // first memoEach render a non-empty initial render avoids that (this is
        // the same empty-branch strategy cl-virtual-list uses).
        if (items.length === 0) {
            return html`<div class="rl-empty">No items</div>`;
        }

        return html`
            <div class="rl-container">
            <div class="rl-spacer" style="height: ${win.totalHeight}px;"></div>
            <div class="rl-window" style="transform: translateY(${win.offsetY}px);">
                ${memoEach(items.slice(win.visibleStart, win.visibleEnd), (item, i) => {
                    const absIndex = win.visibleStart + i;
                    const isSelected = sel.has(item.id);
                    return this._renderRow(item, isSelected, absIndex, selectionMode, itemHeight, g);
                }, (item, i) => {
                    // Composite key: per-row selection bit + mode bit + absolute
                    // index. Toggling one row's selection changes only that row's
                    // key, so unaffected rows keep their DOM nodes. The absolute
                    // index (invariant under pure scroll) busts moved rows after a
                    // reorder so their data-index / bound handlers refresh.
                    const absIndex = win.visibleStart + i;
                    const isSelected = sel.has(item.id);
                    return `${item.id}-${isSelected ? 's' : 'n'}-${selectionMode ? 'm' : 'x'}-i${absIndex}`;
                }, { trustKey: true })}
            </div>
            </div>
        `;
    }

    static styles = /*css*/`
        :host {
            display: block;
            position: relative;
            height: 420px;
            overflow-y: auto;
            overflow-x: hidden;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 6px;
            background: var(--input-bg, #fff);
        }

        .rl-container { position: relative; width: 100%; }

        .rl-spacer { width: 100%; pointer-events: none; }

        .rl-window {
            position: absolute;
            top: 0; left: 0; right: 0;
            will-change: transform;
        }

        .rl-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 14px;
            border-bottom: 1px solid var(--border-color, #eee);
            box-sizing: border-box;
            width: 100%;
            cursor: pointer;
            transition: background-color 0.15s;
        }

        .rl-row:hover { background: var(--hover-bg, #f5f5f5); }

        .rl-row.selected { background: var(--selected-bg, #e7f3ff); }

        .rl-row.dragging { opacity: 0.5; }

        .rl-row.group-dragging { opacity: 0.5; }

        .rl-row.drag-over { box-shadow: inset 0 2px 0 0 var(--primary-color, #007bff); }

        .rl-row.drag-over-below { box-shadow: inset 0 -2px 0 0 var(--primary-color, #007bff); }

        .rl-check {
            flex: 0 0 auto;
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .rl-handle {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            min-height: 32px;
            margin-left: -6px;
            color: var(--text-muted, #999);
            font-size: 15px;
            line-height: 1;
            cursor: grab;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
        }

        .rl-handle:active { cursor: grabbing; }

        .rl-content { flex: 1; min-width: 0; }

        .rl-title {
            font-weight: 500;
            font-size: 14px;
            color: var(--text-color, #333);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .rl-sub {
            font-size: 12px;
            color: var(--text-muted, #666);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
        }
    `
}

defineComponent('example-reorder-list', ExampleReorderList);

// ============================================================================
// Reorderable playground - OUTER component
//
// Owns the data + selection + mode; wires the inner list to cl-context-menu.
// Demonstrates, in one list: drag-reorder (desktop + touch), multiselect with
// checkboxes, group drag of the selection, and a right-click / long-press
// context menu whose actions operate on the selection.
// ============================================================================
class ExampleReorderPlayground extends Component {
    constructor(props) {
        super(props);

        this.state = {
            // untracked contents (replaced immutably on every structural change,
            // which re-renders the outer template and pushes new items down).
            items: untracked([]),
            selectedIds: [],       // array of ids (new ref on every change)
            selectionMode: false,
            lastAction: null,
            _nextId: 1,
            menuItems: [
                { label: 'Duplicate', icon: '⧉', action: (ctx) => this.duplicateRows(ctx) },
                { label: 'Remove', icon: '🗑️', danger: true, action: (ctx) => this.removeRows(ctx) },
                { separator: true },
                { label: 'Clear selection', icon: '✖', action: () => this.clearSelection() }
            ]
        };
    }

    mounted() {
        const items = [];
        for (let i = 1; i <= 300; i++) {
            items.push({ id: i, title: `Task ${i}`, subtitle: `Drag, select, or right-click task ${i}` });
        }
        this.state._nextId = 301;
        this.state.items = items;
    }

    get selectedCount() {
        return this.state.selectedIds.length;
    }

    _idsSet() {
        return new Set(this.state.selectedIds);
    }

    toggleMode() {
        this.state.selectionMode = !this.state.selectionMode;
    }

    selectAll() {
        this.state.selectionMode = true;
        this.state.selectedIds = this.state.items.map(it => it.id);
    }

    clearSelection() {
        this.state.selectedIds = [];
    }

    toggleId(id) {
        const s = this._idsSet();
        if (s.has(id)) s.delete(id); else s.add(id);
        this.state.selectedIds = [...s];
    }

    onRowTap(e) {
        if (this.state.selectionMode) {
            this.toggleId(e.detail.id);
        }
    }

    onToggleSelect(e) {
        this.toggleId(e.detail.id);
    }

    onReorder(e) {
        const { fromIndices, gap } = e.detail;
        const items = this.state.items.slice();
        const sorted = [...fromIndices].sort((a, b) => a - b);
        const moving = sorted.map(i => items[i]);
        // Remove from highest index down so lower indices stay valid.
        for (let k = sorted.length - 1; k >= 0; k--) items.splice(sorted[k], 1);
        const { target } = groupReorderTargets(sorted, gap);
        items.splice(target, 0, ...moving);
        this.state.items = items;
        this.state.lastAction = moving.length > 1
            ? `Moved ${moving.length} rows to position ${target}`
            : `Moved "${moving[0].title}" to position ${target}`;
    }

    onRowMenu(e) {
        const { id, clientX, clientY } = e.detail;
        const sel = this._idsSet();
        // If the right-clicked row is part of a selection, act on the whole
        // selection; otherwise act on just that row.
        const ids = (sel.size > 0 && sel.has(id)) ? [...sel] : [id];
        this.refs.menu.open(clientX, clientY, { ids });
    }

    // NB: NOT named `remove` - that would shadow the native Element.remove()
    // the framework calls when detaching this element during re-render.
    removeRows(ctx) {
        const ids = new Set(ctx.ids);
        this.state.items = this.state.items.filter(it => !ids.has(it.id));
        this.state.selectedIds = this.state.selectedIds.filter(id => !ids.has(id));
        this.state.lastAction = `Removed ${ctx.ids.length} row(s)`;
    }

    duplicateRows(ctx) {
        const ids = new Set(ctx.ids);
        const out = [];
        let nextId = this.state._nextId;
        for (const it of this.state.items) {
            out.push(it);
            if (ids.has(it.id)) {
                out.push({ id: nextId, title: `${it.title} (copy)`, subtitle: it.subtitle });
                nextId++;
            }
        }
        this.state._nextId = nextId;
        this.state.items = out;
        this.state.lastAction = `Duplicated ${ctx.ids.length} row(s)`;
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <p style="color: var(--text-muted, #666); margin: 0;">
                    One list combining <strong>drag-reorder</strong> (desktop + touch),
                    <strong>multiselect with checkboxes</strong>, <strong>group drag</strong>
                    of the selection, and a <strong>right-click / long-press context menu</strong>
                    whose actions operate on the selection. Toggle selection mode, tick some
                    rows, then drag a selected row to move them all - or right-click for actions.
                </p>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <cl-button
                        label="${this.state.selectionMode ? 'Exit selection mode' : 'Selection mode'}"
                        severity="${this.state.selectionMode ? 'primary' : 'secondary'}"
                        on-click="${() => this.toggleMode()}"></cl-button>
                    <cl-button label="Select all" severity="secondary"
                        on-click="${() => this.selectAll()}"></cl-button>
                    <cl-button label="Clear" severity="secondary"
                        on-click="${() => this.clearSelection()}"></cl-button>
                    <span style="color: var(--text-muted, #666); font-size: 14px;">
                        ${this.selectedCount} selected
                    </span>
                </div>

                <example-reorder-list
                    class="playground-list"
                    items="${this.state.items}"
                    selectedIds="${this.state.selectedIds}"
                    selectionMode="${this.state.selectionMode}"
                    itemHeight="56"
                    on-reorder="onReorder"
                    on-row-tap="onRowTap"
                    on-toggle-select="onToggleSelect"
                    on-row-menu="onRowMenu">
                </example-reorder-list>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Last action: ${this.state.lastAction || 'None'}
                </div>

                <cl-context-menu ref="menu" items="${this.state.menuItems}"></cl-context-menu>
            </div>
        `;
    }
}

defineComponent('example-reorder-playground', ExampleReorderPlayground);

// ============ Tier 1 display components ============

// Divider Example
class ExampleDivider extends Component {
    template() {
        return html`
            <div style="max-width: 520px;">
                <p style="margin: 0;">Content above the divider.</p>
                <cl-divider></cl-divider>
                <p style="margin: 0;">A plain horizontal rule separates sections.</p>

                <cl-divider label="OR" variant="dashed"></cl-divider>
                <p style="margin: 0;">Dashed divider with a centered label.</p>

                <cl-divider label="Left aligned" align="left"></cl-divider>

                <div style="display: flex; align-items: center; height: 40px; margin-top: 16px;">
                    <span>Home</span>
                    <cl-divider orientation="vertical"></cl-divider>
                    <span>Profile</span>
                    <cl-divider orientation="vertical"></cl-divider>
                    <span>Settings</span>
                </div>
            </div>
        `;
    }
}

defineComponent('example-divider', ExampleDivider);

// Avatar Example
class ExampleAvatar extends Component {
    constructor(props) {
        super(props);

        this.state = {
            team: [
                { label: 'Ada Lovelace', status: 'online' },
                { label: 'Alan Turing', status: 'busy' },
                { label: 'Grace Hopper' },
                { label: 'Katherine Johnson', status: 'away' },
                { label: 'Edsger Dijkstra' }
            ]
        };
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <cl-avatar label="Ada Lovelace" size="sm"></cl-avatar>
                    <cl-avatar label="Alan Turing" size="md" status="online"></cl-avatar>
                    <cl-avatar label="Grace Hopper" size="lg" status="busy"></cl-avatar>
                    <cl-avatar label="Katherine Johnson" size="xl" shape="square"></cl-avatar>
                    <cl-avatar src="/does-not-exist.png" label="Fallback User" size="lg"></cl-avatar>
                </div>

                <div>
                    <div style="font-size: 13px; color: var(--text-muted,#6c757d); margin-bottom: 8px;">Avatar group (max 3)</div>
                    <cl-avatar-group avatars="${this.state.team}" max="3" size="md"></cl-avatar-group>
                </div>
            </div>
        `;
    }
}

defineComponent('example-avatar', ExampleAvatar);

// Skeleton Example
class ExampleSkeleton extends Component {
    constructor(props) {
        super(props);

        this.state = { loading: true };
    }

    toggle() { this.state.loading = !this.state.loading; }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 420px;">
                <cl-button label="${this.state.loading ? 'Show content' : 'Show skeleton'}" on-click="toggle"></cl-button>

                ${when(this.state.loading, html`
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <cl-skeleton variant="circle" width="48px"></cl-skeleton>
                        <div style="flex: 1;">
                            <cl-skeleton variant="text" width="40%"></cl-skeleton>
                            <cl-skeleton variant="text" lines="2"></cl-skeleton>
                        </div>
                    </div>
                    <cl-skeleton variant="rect" height="120px" animation="pulse"></cl-skeleton>
                `, html`
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <cl-avatar label="Grace Hopper" size="48"></cl-avatar>
                        <div>
                            <strong>Grace Hopper</strong>
                            <div style="color: var(--text-muted,#6c757d);">Compiler pioneer. Coined the term "debugging".</div>
                        </div>
                    </div>
                    <div style="height: 120px; background: var(--primary-light, rgba(0,123,255,0.1)); border-radius: 8px; display: flex; align-items: center; justify-content: center;">Loaded content</div>
                `)}
            </div>
        `;
    }
}

defineComponent('example-skeleton', ExampleSkeleton);

// Empty Example
class ExampleEmpty extends Component {
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 480px;">
                <div style="border: 1px solid var(--input-border,#dee2e6); border-radius: 8px;">
                    <cl-empty
                        title="No results found"
                        description="Try adjusting your search or filters to find what you're looking for.">
                        <cl-button label="Clear filters" severity="secondary"></cl-button>
                        <cl-button label="Add item"></cl-button>
                    </cl-empty>
                </div>

                <div style="border: 1px solid var(--input-border,#dee2e6); border-radius: 8px;">
                    <cl-empty icon="🗂️" size="sm" title="Your inbox is empty"></cl-empty>
                </div>
            </div>
        `;
    }
}

defineComponent('example-empty', ExampleEmpty);

// Popover Example
class ExamplePopover extends Component {
    template() {
        return html`
            <div style="display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start;">
                <cl-popover position="bottom">
                    <cl-button label="Click menu"></cl-button>
                    <div slot="content" style="display: flex; flex-direction: column; gap: 8px; min-width: 180px;">
                        <strong>Account</strong>
                        <div style="color: var(--text-muted,#6c757d); font-size: 13px;">Signed in as grace@example.com</div>
                        <cl-divider></cl-divider>
                        <cl-button label="Settings" severity="secondary"></cl-button>
                        <cl-button label="Sign out" severity="danger"></cl-button>
                    </div>
                </cl-popover>

                <cl-popover position="right" trigger="hover">
                    <cl-button label="Hover for info" severity="secondary"></cl-button>
                    <div slot="content" style="max-width: 220px;">
                        This popover opens on hover and can hold any rich content, unlike a plain tooltip.
                    </div>
                </cl-popover>
            </div>
        `;
    }
}

defineComponent('example-popover', ExamplePopover);

// ============ Tier 2 components ============

// Segmented Example
class ExampleSegmented extends Component {
    constructor(props) {
        super(props);

        this.state = {
            view: 'list',
            range: 'week',
            sizes: [
                { label: 'Day', value: 'day' },
                { label: 'Week', value: 'week' },
                { label: 'Month', value: 'month' }
            ]
        };
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
                <cl-segmented
                    options="${[{ label: 'List', value: 'list', icon: '☰' }, { label: 'Grid', value: 'grid', icon: '▦' }, { label: 'Board', value: 'board', icon: '▤' }]}"
                    x-model="view">
                </cl-segmented>

                <cl-segmented options="${this.state.sizes}" size="small" x-model="range"></cl-segmented>

                <cl-segmented options="${['Off', 'On']}" value="On" disabled="true"></cl-segmented>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    View: ${this.state.view} · Range: ${this.state.range}
                </div>
            </div>
        `;
    }
}

defineComponent('example-segmented', ExampleSegmented);

// Inplace Example
class ExampleInplace extends Component {
    constructor(props) {
        super(props);

        this.state = { name: 'Grace Hopper', title: '' };
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 16px; max-width: 420px;">
                <div>Name: <cl-inplace x-model="name"></cl-inplace></div>
                <div>Title: <cl-inplace x-model="title" empty-text="Add a title…"></cl-inplace></div>
                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Stored name: ${this.state.name} · title: ${this.state.title || '(empty)'}
                </div>
            </div>
        `;
    }
}

defineComponent('example-inplace', ExampleInplace);

// Rating Example
class ExampleRating extends Component {
    constructor(props) {
        super(props);

        this.state = { score: 3, halfScore: 2.5 };
    }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>Interactive: <cl-rating x-model="score"></cl-rating> (${this.state.score})</div>
                <div>Half steps: <cl-rating x-model="halfScore" precision="0.5"></cl-rating> (${this.state.halfScore})</div>
                <div>Read-only: <cl-rating value="4" readonly="true"></cl-rating></div>
            </div>
        `;
    }
}

defineComponent('example-rating', ExampleRating);

// OTP Example
class ExampleOtp extends Component {
    constructor(props) {
        super(props);

        this.state = { code: '' };
    }

    template() {
        const complete = this.state.code.length === 6;
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <cl-otp length="6" type="number" x-model="code"></cl-otp>
                <div>Masked PIN: <cl-otp length="4" type="number" mask="true"></cl-otp></div>
                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    ${complete ? 'Complete: ' + this.state.code : 'Waiting for code…'}
                </div>
            </div>
        `;
    }
}

defineComponent('example-otp', ExampleOtp);

// Copy Example
class ExampleCopy extends Component {
    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 20px; align-items: flex-start;">
                <cl-copy value="npm install vdx-web" label="Copy command"></cl-copy>
                <cl-copy variant="inline" value="vdx_demo_a1b2c3d4e5f6"></cl-copy>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>API key</span>
                    <cl-copy variant="icon" value="a1b2c3d4e5f6"></cl-copy>
                </div>
            </div>
        `;
    }
}

defineComponent('example-copy', ExampleCopy);

// Timeline Example
class ExampleTimeline extends Component {
    constructor(props) {
        super(props);

        this.state = {
            events: [
                { time: '09:00', title: 'Order placed', description: 'Payment confirmed.', icon: '✓', status: 'success' },
                { time: '11:30', title: 'Processing', description: 'Items picked and packed.', icon: '⚙' },
                { time: '14:15', title: 'Shipped', description: 'Handed to carrier.', icon: '🚚', status: 'warning' },
                { time: '—', title: 'Delivered', description: 'Awaiting delivery.', status: 'muted' }
            ]
        };
    }

    template() {
        return html`
            <div style="max-width: 480px;">
                <cl-timeline items="${this.state.events}"></cl-timeline>
            </div>
        `;
    }
}

defineComponent('example-timeline', ExampleTimeline);

// Meter Example
class ExampleMeter extends Component {
    constructor(props) {
        super(props);

        this.state = {
            cpu: 72,
            thresholds: [{ value: 70, color: '#f5b301' }, { value: 90, color: '#dc3545' }]
        };
    }

    setCpu(e) { this.state.cpu = Number(e.target.value); }

    template() {
        return html`
            <div style="display: flex; flex-direction: column; gap: 28px; max-width: 520px;">
                <div style="display: flex; flex-direction: column; gap: 18px;">
                    <cl-meter label="Disk usage" value="42" unit="%"></cl-meter>
                    <cl-meter label="Memory" value="${this.state.cpu}" unit="%" thresholds="${this.state.thresholds}"></cl-meter>
                    <input type="range" min="0" max="100" value="${this.state.cpu}" on-input="setCpu" style="width: 100%;">
                </div>

                <div style="display: flex; gap: 32px; flex-wrap: wrap;">
                    <cl-meter variant="radial" value="${this.state.cpu}" unit="%" label="CPU" thresholds="${this.state.thresholds}"></cl-meter>
                    <cl-meter variant="radial" value="8" min="0" max="10" label="Score" size="120" color="#28a745"></cl-meter>
                </div>
            </div>
        `;
    }
}

defineComponent('example-meter', ExampleMeter);
