/**
 * Component Examples - Simplified demos
 */

export const componentExamples = {
    // FORM COMPONENTS
    inputText: {
        id: 'inputText',
        name: 'InputText',
        category: 'form',
        description: 'Text input with validation support',
        demo: `<example-input-text></example-input-text>`,
        source: `defineComponent('example-input-text', {
    data() {
        return { value: '', email: '', pattern: '' };
    },
    template() {
        return html\`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                <cl-input-text
                    label="Basic Input"
                    placeholder="Enter text..."
                    x-model="value">
                </cl-input-text>

                <cl-input-text
                    label="Email Validation"
                    placeholder="email@example.com"
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\\\.[a-z]{2,}$"
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
        \`;
    }
});`
    },

    inputNumber: {
        id: 'inputNumber',
        name: 'InputNumber',
        category: 'form',
        description: 'Number input with increment/decrement buttons',
        demo: `<example-input-number></example-input-number>`,
        source: `defineComponent('example-input-number', {
    data() {
        return { value: 0, quantity: 1, price: 9.99 };
    },
    template() {
        return html\`
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
        \`;
    }
});`
    },

    textarea: {
        id: 'textarea',
        name: 'TextArea',
        category: 'form',
        description: 'Multi-line text input with auto-resize',
        demo: `<example-textarea></example-textarea>`,
        source: `defineComponent('example-textarea', {
    data() {
        return { text: '', limited: '' };
    },
    template() {
        return html\`
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
        \`;
    }
});`
    },

    checkbox: {
        id: 'checkbox',
        name: 'Checkbox',
        category: 'form',
        description: 'Checkbox input with label',
        demo: `<example-checkbox></example-checkbox>`,
        source: `defineComponent('example-checkbox', {
    data() {
        return { checked: false, terms: true };
    },
    template() {
        return html\`
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
                    Terms: \${this.state.terms ? 'Accepted' : 'Not accepted'}
                </div>
            </div>
        \`;
    }
});`
    },

    radioButton: {
        id: 'radioButton',
        name: 'RadioButton',
        category: 'form',
        description: 'Radio button input',
        demo: `<example-radio-button></example-radio-button>`,
        source: `defineComponent('example-radio-button', {
    data() {
        return { size: 'medium' };
    },
    template() {
        return html\`
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="font-weight: 600; margin-bottom: 8px;">Select Size:</div>

                <cl-radio-button
                    name="size"
                    value="small"
                    label="Small"
                    modelvalue="\${this.state.size}"
                    on-change="\${(e, val) => this.state.size = val}">
                </cl-radio-button>

                <cl-radio-button
                    name="size"
                    value="medium"
                    label="Medium"
                    modelvalue="\${this.state.size}"
                    on-change="\${(e, val) => this.state.size = val}">
                </cl-radio-button>

                <cl-radio-button
                    name="size"
                    value="large"
                    label="Large"
                    modelvalue="\${this.state.size}"
                    on-change="\${(e, val) => this.state.size = val}">
                </cl-radio-button>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; margin-top: 8px;">
                    Selected: \${this.state.size}
                </div>
            </div>
        \`;
    }
});`
    },

    slider: {
        id: 'slider',
        name: 'Slider',
        category: 'form',
        description: 'Range slider input',
        demo: `<example-slider></example-slider>`,
        source: `defineComponent('example-slider', {
    data() {
        return { value: 50, volume: 75 };
    },
    template() {
        return html\`
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
        \`;
    }
});`
    },

    calendar: {
        id: 'calendar',
        name: 'Calendar',
        category: 'form',
        description: 'Date picker with masked input, month/year picker, and inline mode',
        demo: `<example-calendar></example-calendar>`,
        source: `defineComponent('example-calendar', {
    data() {
        return { date: '', inline: new Date().toISOString().split('T')[0] };
    },
    template() {
        return html\`
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
                    Selected: \${this.state.date || 'None'}
                </div>
            </div>
        \`;
    }
});`
    },

    // SELECTION COMPONENTS
    dropdown: {
        id: 'dropdown',
        name: 'Dropdown',
        category: 'selection',
        description: 'Single select dropdown with search',
        demo: `<example-dropdown></example-dropdown>`,
        source: `defineComponent('example-dropdown', {
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
        return html\`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                <cl-dropdown
                    label="Programming Language"
                    options="\${this.state.languages}"
                    x-model="selected">
                </cl-dropdown>

                <cl-dropdown
                    label="City (with filter)"
                    options="\${this.state.cities}"
                    filter="true"
                    placeholder="Select a city"
                    x-model="selectedCity">
                </cl-dropdown>
            </div>
        \`;
    }
});`
    },

    multiselect: {
        id: 'multiselect',
        name: 'MultiSelect',
        category: 'selection',
        description: 'Multi-select dropdown with chips',
        demo: `<example-multiselect></example-multiselect>`,
        source: `defineComponent('example-multiselect', {
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
        return html\`
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 600px;">
                <cl-multiselect
                    label="Select Colors"
                    options="\${this.state.colors}"
                    filter="true"
                    x-model="selected">
                </cl-multiselect>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Selected: \${this.state.selected.join(', ') || 'None'}
                </div>
            </div>
        \`;
    }
});`
    },

    autocomplete: {
        id: 'autocomplete',
        name: 'AutoComplete',
        category: 'selection',
        description: 'Text input with autocomplete suggestions',
        demo: `<example-autocomplete></example-autocomplete>`,
        source: `defineComponent('example-autocomplete', {
    data() {
        return {
            value: '',
            countries: ['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina',
                      'United Kingdom', 'France', 'Germany', 'Spain', 'Italy']
        };
    },
    template() {
        return html\`
            <div style="max-width: 500px;">
                <cl-autocomplete
                    label="Country"
                    placeholder="Start typing..."
                    suggestions="\${this.state.countries}"
                    x-model="value">
                </cl-autocomplete>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; margin-top: 16px;">
                    Value: \${this.state.value || 'None'}
                </div>
            </div>
        \`;
    }
});`
    },

    chips: {
        id: 'chips',
        name: 'Chips',
        category: 'selection',
        description: 'Tag input component',
        demo: `<example-chips></example-chips>`,
        source: `defineComponent('example-chips', {
    data() {
        return { tags: ['javascript', 'react', 'vue'] };
    },
    template() {
        return html\`
            <div style="max-width: 600px;">
                <cl-chips
                    label="Tags"
                    placeholder="Add tag..."
                    x-model="tags">
                </cl-chips>

                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 16px;">
                    Tags: \${(this.state.tags || []).join(', ')}
                </div>
            </div>
        \`;
    }
});`
    },

    // DATA COMPONENTS
    datatable: {
        id: 'datatable',
        name: 'DataTable',
        category: 'data',
        description: 'Advanced data table with sorting and selection',
        demo: `<example-datatable></example-datatable>`,
        source: `defineComponent('example-datatable', {
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
        return html\`
            <div>
                <cl-datatable
                    value="\${this.state.products}"
                    columns="\${this.state.columns}"
                    selectionmode="single"
                    selection="\${this.state.selected}"
                    on-change="\${(e, val) => this.state.selected = val}">
                </cl-datatable>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px; margin-top: 16px;">
                    Selected: \${this.state.selected ? this.state.selected.name : 'None'}
                </div>
            </div>
        \`;
    }
});`
    },

    paginator: {
        id: 'paginator',
        name: 'Paginator',
        category: 'data',
        description: 'Pagination controls',
        demo: `<example-paginator></example-paginator>`,
        source: `defineComponent('example-paginator', {
    data() {
        return { first: 0, rows: 10 };
    },
    template() {
        return html\`
            <div>
                <cl-paginator
                    totalrecords="120"
                    rows="\${this.state.rows}"
                    first="\${this.state.first}"
                    on-change="\${(e, val) => this.state.first = val.first}">
                </cl-paginator>
            </div>
        \`;
    }
});`
    },

    tree: {
        id: 'tree',
        name: 'Tree',
        category: 'data',
        description: 'Hierarchical tree view',
        demo: `<example-tree></example-tree>`,
        source: `defineComponent('example-tree', {
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
        return html\`
            <div style="max-width: 500px;">
                <cl-tree
                    value="\${this.state.nodes}"
                    selectionmode="single"
                    selection="\${this.state.selected}"
                    on-change="\${(e, val) => this.state.selected = val}">
                </cl-tree>
            </div>
        \`;
    }
});`
    },

    orderableList: {
        id: 'orderableList',
        name: 'OrderableList',
        category: 'data',
        description: 'Drag and drop reorderable list',
        demo: `<example-orderable-list></example-orderable-list>`,
        source: `defineComponent('example-orderable-list', {
    data() {
        return {
            items: ['First Item', 'Second Item', 'Third Item', 'Fourth Item', 'Fifth Item']
        };
    },
    template() {
        return html\`
            <div style="max-width: 500px;">
                <cl-orderable-list
                    header="Reorder Items"
                    value="\${this.state.items}"
                    on-change="\${(e, val) => this.state.items = val}">
                </cl-orderable-list>
            </div>
        \`;
    }
});`
    },

    // PANEL COMPONENTS
    accordion: {
        id: 'accordion',
        name: 'Accordion',
        category: 'panel',
        description: 'Collapsible accordion panels',
        demo: `<example-accordion></example-accordion>`,
        source: `defineComponent('example-accordion', {
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
        return html\`
            <div style="max-width: 700px;">
                <cl-accordion
                    tabs="\${this.state.tabs}"
                    activeindex="0">
                </cl-accordion>
            </div>
        \`;
    }
});`
    },

    tabview: {
        id: 'tabview',
        name: 'TabView',
        category: 'panel',
        description: 'Tabbed interface component',
        demo: `<example-tabview></example-tabview>`,
        source: `defineComponent('example-tabview', {
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
        return html\`
            <div style="max-width: 700px;">
                <cl-tabview
                    tabs="\${this.state.tabs}"
                    activeindex="0">
                </cl-tabview>
            </div>
        \`;
    }
});`
    },

    card: {
        id: 'card',
        name: 'Card',
        category: 'panel',
        description: 'Content card container',
        demo: `<example-card></example-card>`,
        source: `defineComponent('example-card', {
    template() {
        return html\`
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
        \`;
    }
});`
    },

    fieldset: {
        id: 'fieldset',
        name: 'Fieldset',
        category: 'panel',
        description: 'Fieldset with legend and toggle',
        demo: `<example-fieldset></example-fieldset>`,
        source: `<cl-fieldset
    legend="Section Title"
    toggleable="true"
    collapsed="false">
    Content here
</cl-fieldset>`
    },

    splitter: {
        id: 'splitter',
        name: 'Splitter',
        category: 'panel',
        description: 'Resizable split panel',
        demo: `<example-splitter></example-splitter>`,
        source: `defineComponent('example-splitter', {
    template() {
        return html\`
            <div style="height: 400px;">
                <cl-splitter layout="horizontal" panelsizes="\${[60, 40]}">
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
        \`;
    }
});`
    },

    stepper: {
        id: 'stepper',
        name: 'Stepper',
        category: 'panel',
        description: 'Multi-step wizard/form component with validation',
        demo: `<example-stepper></example-stepper>`,
        source: `defineComponent('example-stepper', {
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
        handleStepChange(e, detail) {
            this.state.currentStep = detail.step;
        },
        handleValidate(e) {
            const step = e.detail.step;
            if (step === 0 && !this.state.form.email) {
                alert('Please enter an email');
                e.preventDefault();
            }
        },
        handleComplete() {
            alert('Form completed! ' + JSON.stringify(this.state.form));
        }
    },
    template() {
        return html\`
            <cl-stepper
                steps="\${this.state.steps}"
                activeIndex="\${this.state.currentStep}"
                linear="true"
                on-change="handleStepChange"
                on-validate="handleValidate"
                on-complete="handleComplete">

                <div slot="step-0" style="padding: 20px;">
                    <h3>Create Account</h3>
                    <cl-input-text label="Email" x-model="form.email" style="margin-bottom: 16px;"></cl-input-text>
                    <cl-input-text label="Password" x-model="form.password"></cl-input-text>
                </div>

                <div slot="step-1" style="padding: 20px;">
                    <h3>Your Profile</h3>
                    <cl-input-text label="Full Name" x-model="form.name" style="margin-bottom: 16px;"></cl-input-text>
                    <cl-textarea label="Bio" x-model="form.bio" rows="3"></cl-textarea>
                </div>

                <div slot="step-2" style="padding: 20px;">
                    <h3>Review</h3>
                    <p><strong>Email:</strong> \${this.state.form.email}</p>
                    <p><strong>Name:</strong> \${this.state.form.name}</p>
                    <p><strong>Bio:</strong> \${this.state.form.bio}</p>
                </div>
            </cl-stepper>
        \`;
    }
});`
    },

    // OVERLAY COMPONENTS
    dialog: {
        id: 'dialog',
        name: 'Dialog',
        category: 'overlay',
        description: 'Modal dialog component with optional footer buttons',
        demo: `<example-dialog></example-dialog>`,
        source: `defineComponent('example-dialog', {
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
        return html\`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <!-- Basic Dialog -->
                <cl-button label="Basic Dialog" on-click="\${() => this.state.basicVisible = true}"></cl-button>

                <!-- Confirmation Dialog -->
                <cl-button label="Confirmation" severity="warning" on-click="\${() => this.state.confirmVisible = true}"></cl-button>

                <!-- Form Dialog -->
                <cl-button label="Form Dialog" severity="success" on-click="\${() => this.state.formVisible = true}"></cl-button>

                <!-- Basic Dialog -->
                <cl-dialog visible="\${this.state.basicVisible}" header="Basic Dialog" style="width: 500px;"
                    on-change="\${(e, val) => this.state.basicVisible = val}">
                    <p>This is a basic dialog with just content.</p>
                </cl-dialog>

                <!-- Confirmation Dialog with Footer -->
                <cl-dialog visible="\${this.state.confirmVisible}" header="Confirm Action" style="width: 400px;"
                    on-change="\${(e, val) => this.state.confirmVisible = val}">
                    <p>Are you sure you want to proceed with this action?</p>
                    <div slot="footer">
                        <cl-button label="Cancel" severity="secondary" on-click="\${() => this.state.confirmVisible = false}"></cl-button>
                        <cl-button label="Confirm" severity="primary" on-click="handleConfirm"></cl-button>
                    </div>
                </cl-dialog>

                <!-- Form Dialog with Footer -->
                <cl-dialog visible="\${this.state.formVisible}" header="Edit Profile" style="width: 500px;"
                    on-change="\${(e, val) => this.state.formVisible = val}">
                    <cl-input-text label="Name" placeholder="Enter name..."></cl-input-text>
                    <cl-input-text label="Email" placeholder="Enter email..." style="margin-top: 16px;"></cl-input-text>
                    <div slot="footer">
                        <cl-button label="Cancel" severity="secondary" text="true" on-click="\${() => this.state.formVisible = false}"></cl-button>
                        <cl-button label="Save Changes" severity="primary" on-click="handleFormSubmit"></cl-button>
                    </div>
                </cl-dialog>
            </div>
        \`;
    }
});`
    },

    sidebar: {
        id: 'sidebar',
        name: 'Sidebar',
        category: 'overlay',
        description: 'Slide-out sidebar panel',
        demo: `<example-sidebar></example-sidebar>`,
        source: `defineComponent('example-sidebar', {
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
        return html\`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <cl-button label="Left" on-click="\${() => this.show('left')}"></cl-button>
                <cl-button label="Right" on-click="\${() => this.show('right')}"></cl-button>
                <cl-button label="Top" on-click="\${() => this.show('top')}"></cl-button>
                <cl-button label="Bottom" on-click="\${() => this.show('bottom')}"></cl-button>

                <cl-sidebar
                    visible="\${this.state.visible}"
                    position="\${this.state.position}"
                    header="Sidebar Menu"
                    on-change="\${(e, val) => this.state.visible = val}">
                    <p>Sidebar content from the \${this.state.position}.</p>
                    <p>Click outside to close.</p>
                </cl-sidebar>
            </div>
        \`;
    }
});`
    },

    toast: {
        id: 'toast',
        name: 'Toast',
        category: 'overlay',
        description: 'Toast notification component',
        demo: `<example-toast></example-toast>`,
        source: `defineComponent('example-toast', {
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
        return html\`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <cl-button label="Success" severity="success" on-click="\${() => this.showToast('success')}"></cl-button>
                <cl-button label="Info" severity="info" on-click="\${() => this.showToast('info')}"></cl-button>
                <cl-button label="Warn" severity="warning" on-click="\${() => this.showToast('warn')}"></cl-button>
                <cl-button label="Error" severity="danger" on-click="\${() => this.showToast('error')}"></cl-button>

                <cl-toast position="top-right"></cl-toast>
            </div>
        \`;
    }
});`
    },

    tooltip: {
        id: 'tooltip',
        name: 'Tooltip',
        category: 'overlay',
        description: 'Tooltip component',
        demo: `<example-tooltip></example-tooltip>`,
        source: `defineComponent('example-tooltip', {
    template() {
        return html\`
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
        \`;
    }
});`
    },

    'action-menu': {
        id: 'action-menu',
        name: 'Action Menu',
        category: 'overlay',
        description: 'Dropdown menu for actions (more options, context menus)',
        demo: `<example-action-menu></example-action-menu>`,
        source: `<cl-action-menu
    label="Actions"
    items="\${[
        { label: 'Edit', icon: 'pencil', action: () => edit() },
        { label: 'Duplicate', icon: 'copy', action: () => duplicate() },
        { separator: true },
        { label: 'Delete', icon: 'trash', danger: true, action: () => remove() }
    ]}">
</cl-action-menu>

// Items can have:
// - label: Text to display
// - icon: Emoji or text icon
// - action: Function to call on click
// - shortcut: Keyboard shortcut text
// - danger: true for destructive actions (red text)
// - disabled: true to disable the item
// - active: true to highlight as selected
// - separator: true for a divider line`
    },

    // BUTTON COMPONENTS
    button: {
        id: 'button',
        name: 'Button',
        category: 'button',
        description: 'Styled button component',
        demo: `<example-button></example-button>`,
        source: `defineComponent('example-button', {
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
        return html\`
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
                        loading="\${this.state.loading}"
                        on-click="handleLoad">
                    </cl-button>
                </div>

                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <cl-button label="With Icon" icon="📄" severity="primary"></cl-button>
                    <cl-button label="Icon Right" icon="→" iconpos="right" severity="success"></cl-button>
                </div>
            </div>
        \`;
    }
});`
    },

    splitButton: {
        id: 'splitButton',
        name: 'SplitButton',
        category: 'button',
        description: 'Button with dropdown menu',
        demo: `<example-split-button></example-split-button>`,
        source: `defineComponent('example-split-button', {
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
        return html\`
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <cl-split-button
                    label="Save"
                    model="\${this.state.items}"
                    severity="primary">
                </cl-split-button>

                <cl-split-button
                    label="Actions"
                    model="\${this.state.items}"
                    severity="success">
                </cl-split-button>
            </div>
        \`;
    }
});`
    },

    menu: {
        id: 'menu',
        name: 'Menu',
        category: 'button',
        description: 'Menu component',
        demo: `<example-menu></example-menu>`,
        source: `defineComponent('example-menu', {
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
        return html\`
            <div style="max-width: 400px;">
                <cl-menu model="\${this.state.items}"></cl-menu>
            </div>
        \`;
    }
});`
    },

    breadcrumb: {
        id: 'breadcrumb',
        name: 'Breadcrumb',
        category: 'button',
        description: 'Breadcrumb navigation',
        demo: `<example-breadcrumb></example-breadcrumb>`,
        source: `defineComponent('example-breadcrumb', {
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
        return html\`
            <div>
                <cl-breadcrumb
                    model="\${this.state.items}"
                    home="\${this.state.home}">
                </cl-breadcrumb>
            </div>
        \`;
    }
});`
    },

    // MISC COMPONENTS
    progressbar: {
        id: 'progressbar',
        name: 'ProgressBar',
        category: 'misc',
        description: 'Progress indicator',
        demo: `<example-progressbar></example-progressbar>`,
        source: `defineComponent('example-progressbar', {
    data() {
        return { value: 60 };
    },
    template() {
        return html\`
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 600px;">
                <cl-progressbar value="75"></cl-progressbar>
                <cl-progressbar value="\${this.state.value}"></cl-progressbar>
                <cl-progressbar mode="indeterminate"></cl-progressbar>
            </div>
        \`;
    }
});`
    },

    fileupload: {
        id: 'fileupload',
        name: 'FileUpload',
        category: 'misc',
        description: 'File upload component',
        demo: `<example-fileupload></example-fileupload>`,
        source: `<cl-fileupload
    multiple="true"
    accept=".pdf,.jpg,.png"
    maxfilesize="1048576"
    on-upload="\${handleUpload}">
</cl-fileupload>`
    },

    colorpicker: {
        id: 'colorpicker',
        name: 'ColorPicker',
        category: 'misc',
        description: 'Color picker component',
        demo: `<example-colorpicker></example-colorpicker>`,
        source: `defineComponent('my-component', {
    data() {
        return { color: '#3498db', inlineColor: '#e74c3c' };
    },
    template() {
        return html\`
            <cl-colorpicker
                label="Pick Color"
                x-model="color">
            </cl-colorpicker>

            <cl-colorpicker
                label="Inline Color Picker"
                inline="true"
                x-model="inlineColor">
            </cl-colorpicker>

            <div style="padding: 40px; background: \${this.state.color};">
                Selected Color
            </div>
        \`;
    }
});`
    },

    spinner: {
        id: 'spinner',
        name: 'Spinner',
        category: 'misc',
        description: 'Loading spinner with multiple variants and sizes',
        demo: `<example-spinner></example-spinner>`,
        source: `<!-- Border spinner (default) -->
<cl-spinner></cl-spinner>

<!-- Different variants -->
<cl-spinner variant="border"></cl-spinner>
<cl-spinner variant="dots"></cl-spinner>
<cl-spinner variant="bars"></cl-spinner>
<cl-spinner variant="pulse"></cl-spinner>

<!-- Sizes: small, medium, large, or custom -->
<cl-spinner size="small"></cl-spinner>
<cl-spinner size="medium"></cl-spinner>
<cl-spinner size="large"></cl-spinner>
<cl-spinner size="64px"></cl-spinner>

<!-- Custom color -->
<cl-spinner color="#28a745"></cl-spinner>

<!-- With label -->
<cl-spinner label="Loading..."></cl-spinner>
<cl-spinner label="Please wait" labelposition="right"></cl-spinner>`
    },

    // LAYOUT COMPONENTS
    shell: {
        id: 'shell',
        name: 'Shell',
        category: 'layout',
        description: 'Responsive application shell with top bar, sidebar, and hamburger menu',
        demo: `<example-shell></example-shell>`,
        source: `defineComponent('my-app', {
    data() {
        return {
            activeItem: 'dashboard',
            menuItems: [
                {
                    label: 'Main',
                    icon: '🏠',
                    items: [
                        { label: 'Dashboard', key: 'dashboard' },
                        { label: 'Analytics', key: 'analytics' }
                    ]
                },
                {
                    label: 'Settings',
                    icon: '⚙️',
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
        return html\`
            <cl-shell
                title="My App"
                subtitle="Dashboard"
                menuItems="\${this.state.menuItems}"
                activeItem="\${this.state.activeItem}"
                on-change="\${(e, key) => this.state.activeItem = key}">

                <div slot="topbar">
                    <button>Notifications</button>
                </div>

                <h2>Welcome to \${this.state.activeItem}</h2>
                <p>Main content area</p>
            </cl-shell>
        \`;
    }
});`
    },

    // FORM EXAMPLE (Complete Form)
    completeForm: {
        id: 'completeForm',
        name: 'Complete Form',
        category: 'form',
        description: 'Full form example with multiple component types, labels, and submit button',
        demo: `<example-complete-form></example-complete-form>`,
        source: `defineComponent('example-complete-form', {
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
        return html\`
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
                    <cl-dropdown label="Country" options="\${this.state.countries}" placeholder="Select country" x-model="form.country"></cl-dropdown>

                    <!-- Row 4: Gender -->
                    <div class="form-full">
                        <label class="form-label">Gender</label>
                        <div class="radio-group">
                            <cl-radio-button name="gender" value="male" label="Male" modelvalue="\${this.state.form.gender}" on-change="\${(e, v) => this.state.form.gender = v}"></cl-radio-button>
                            <cl-radio-button name="gender" value="female" label="Female" modelvalue="\${this.state.form.gender}" on-change="\${(e, v) => this.state.form.gender = v}"></cl-radio-button>
                            <cl-radio-button name="gender" value="other" label="Other" modelvalue="\${this.state.form.gender}" on-change="\${(e, v) => this.state.form.gender = v}"></cl-radio-button>
                        </div>
                    </div>

                    <!-- Row 5: Interests -->
                    <div class="form-full">
                        <cl-multiselect label="Interests" options="\${this.state.interestOptions}" x-model="form.interests"></cl-multiselect>
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

            <style>
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .form-full { grid-column: 1 / -1; }
                .form-label { display: block; font-weight: 500; margin-bottom: 8px; color: #333; }
                .radio-group { display: flex; gap: 24px; }
                .checkbox-group { display: flex; gap: 24px; }
                .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
                @media (max-width: 600px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .radio-group, .checkbox-group { flex-direction: column; gap: 12px; }
                }
            </style>
        \`;
    }
});`
    },

    // NEW COMPONENTS

    inputMask: {
        id: 'inputMask',
        name: 'InputMask',
        category: 'form',
        description: 'Masked input for phone, SSN, and formatted data',
        demo: `<example-input-mask></example-input-mask>`,
        source: `defineComponent('example-input-mask', {
    data() {
        return {
            phone: '',
            ssn: '',
            creditCard: '',
            date: ''
        };
    },
    template() {
        return html\`
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
                    Phone: \${this.state.phone || '(empty)'}<br>
                    SSN: \${this.state.ssn || '(empty)'}<br>
                    Card: \${this.state.creditCard || '(empty)'}<br>
                    Date: \${this.state.date || '(empty)'}
                </div>
            </div>
        \`;
    }
});`
    },

    inputPassword: {
        id: 'inputPassword',
        name: 'InputPassword',
        category: 'form',
        description: 'Password input with visibility toggle and strength meter',
        demo: `<example-input-password></example-input-password>`,
        source: `defineComponent('example-input-password', {
    data() {
        return {
            password: '',
            confirmPassword: ''
        };
    },
    template() {
        return html\`
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
        \`;
    }
});`
    },

    toggle: {
        id: 'toggle',
        name: 'Toggle',
        category: 'form',
        description: 'Modern toggle/switch component',
        demo: `<example-toggle></example-toggle>`,
        source: `defineComponent('example-toggle', {
    data() {
        return {
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
    },
    template() {
        return html\`
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
                    Notifications: \${this.state.notifications ? 'On' : 'Off'} |
                    Dark Mode: \${this.state.darkMode ? 'On' : 'Off'} |
                    Auto-save: \${this.state.autoSave ? 'On' : 'Off'}
                </div>
            </div>
        \`;
    }
});`
    },

    inputSearch: {
        id: 'inputSearch',
        name: 'InputSearch',
        category: 'form',
        description: 'Search input with clear button and suggestions',
        demo: `<example-input-search></example-input-search>`,
        source: `defineComponent('example-input-search', {
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
        return html\`
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
                    suggestions="\${this.state.suggestions}"
                    on-select="handleSelect">
                </cl-input-search>

                <cl-input-search
                    label="Loading State"
                    placeholder="Searching..."
                    loading="true">
                </cl-input-search>

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Search query: \${this.state.query || '(empty)'}
                </div>
            </div>
        \`;
    }
});`
    },

    virtualList: {
        id: 'virtualList',
        name: 'VirtualList',
        category: 'data',
        description: 'Efficiently render large lists with virtualization. Supports self-scrolling, parent scrolling, or window scrolling.',
        demo: `<example-virtual-list></example-virtual-list>`,
        source: `defineComponent('example-virtual-list', {
    data() {
        return {
            items: untracked([]),  // Don't track 10000 items!
            selectedItem: null,
            scrollMode: 'self'  // 'self' | 'parent' | 'window'
        };
    },
    mounted() {
        // Generate 10000 items
        this.state.items = Array.from({ length: 10000 }, (_, i) => ({
            id: i + 1,
            title: \`Item \${i + 1}\`,
            subtitle: \`Description for item \${i + 1}\`
        }));
    },
    methods: {
        handleSelect(e) {
            this.state.selectedItem = e.detail.item;
        },
        setScrollMode(mode) {
            this.state.scrollMode = mode;
        },
        // Custom key function for memoization
        getItemKey(item) {
            return item.id;
        }
    },
    template() {
        return html\`
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <p style="color: var(--text-muted, #666); margin: 0;">
                    Displaying <strong>10,000 items</strong> with virtualization.
                    Only visible items are rendered for optimal performance.
                </p>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <cl-button
                        label="Self Scroll"
                        severity="\${this.state.scrollMode === 'self' ? 'primary' : 'secondary'}"
                        on-click="\${() => this.setScrollMode('self')}">
                    </cl-button>
                    <cl-button
                        label="Page Scroll"
                        severity="\${this.state.scrollMode === 'window' ? 'primary' : 'secondary'}"
                        on-click="\${() => this.setScrollMode('window')}">
                    </cl-button>
                </div>

                \${when(this.state.scrollMode === 'self', html\`
                    <cl-virtual-list
                        items="\${this.state.items}"
                        itemHeight="60"
                        height="400px"
                        scrollContainer="self"
                        keyFn="\${this.getItemKey}"
                        selectable="true"
                        on-select="handleSelect">
                    </cl-virtual-list>
                \`)}

                \${when(this.state.scrollMode === 'window', html\`
                    <cl-virtual-list
                        items="\${this.state.items}"
                        itemHeight="60"
                        scrollContainer="window"
                        keyFn="\${this.getItemKey}"
                        selectable="true"
                        on-select="handleSelect">
                    </cl-virtual-list>
                \`)}

                <div style="padding: 12px; background: var(--table-header-bg, #f8f9fa); border-radius: 4px;">
                    Selected: \${this.state.selectedItem ? this.state.selectedItem.title : 'None'}
                </div>

                <p style="color: var(--text-muted, #666); font-size: 13px; margin: 0;">
                    <strong>scrollContainer options:</strong><br>
                    • "self" (default) - Component has its own scrollbar<br>
                    • "parent" - Tracks nearest scrollable parent<br>
                    • "window" - Tracks window/document scroll<br>
                    • CSS selector - Tracks a specific element
                </p>
            </div>
        \`;
    }
});`
    },

    badge: {
        id: 'badge',
        name: 'Badge',
        category: 'misc',
        description: 'Badge/pill for labels, counts, and status indicators',
        demo: `<example-badge></example-badge>`,
        source: `defineComponent('example-badge', {
    template() {
        return html\`
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
        \`;
    }
});`
    },

    alert: {
        id: 'alert',
        name: 'Alert',
        category: 'misc',
        description: 'Alert/banner for messages and notifications',
        demo: `<example-alert></example-alert>`,
        source: `defineComponent('example-alert', {
    template() {
        return html\`
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
        \`;
    }
});`
    },

    errorBoundary: {
        id: 'errorBoundary',
        name: 'Error Boundary',
        category: 'misc',
        description: 'Pre-styled error display for renderError handlers',
        demo: `<cl-error-boundary-demo></cl-error-boundary-demo>`,
        source: `// cl-error-boundary provides pre-styled error display
// Use it in your renderError() handlers for consistent error UI

defineComponent('my-component', {
    data() {
        return { data: null };
    },

    template() {
        // If this throws, renderError() will be called instead
        return html\`
            <div>
                <h1>\${this.state.data.title}</h1>
                <p>\${this.state.data.content}</p>
            </div>
        \`;
    },

    // Use cl-error-boundary for pre-styled error display
    renderError(error) {
        return html\`
            <cl-error-boundary
                error="\${error}"
                title="Failed to load content"
                showDetails="true"
                onRetry="\${() => this.loadData()}">
            </cl-error-boundary>
        \`;
    },

    methods: {
        loadData() {
            this.state.data = { title: 'Loaded', content: 'Content loaded successfully' };
        }
    }
});

// Props:
// - error: Error object or message string
// - title: Custom title (default: "Something went wrong")
// - showDetails: Show error message and stack trace
// - onRetry: Callback function for retry button (auto-shows button)
// - showRetry: Explicitly show retry button
// - compact: Smaller padding and text`
    }
};
