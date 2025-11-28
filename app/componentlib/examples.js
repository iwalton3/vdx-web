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
        source: `<cl-input-number
    label="Quantity"
    value="\${quantity}"
    min="1"
    max="100"
    step="1"
    on-change="\${handleChange}">
</cl-input-number>`
    },

    textarea: {
        id: 'textarea',
        name: 'TextArea',
        category: 'form',
        description: 'Multi-line text input with auto-resize',
        demo: `<example-textarea></example-textarea>`,
        source: `<cl-textarea
    label="Comments"
    placeholder="Enter comments..."
    rows="5"
    maxlength="500"
    showcount="true"
    value="\${value}"
    on-change="\${handleChange}">
</cl-textarea>`
    },

    checkbox: {
        id: 'checkbox',
        name: 'Checkbox',
        category: 'form',
        description: 'Checkbox input with label',
        demo: `<example-checkbox></example-checkbox>`,
        source: `<cl-checkbox
    label="Accept terms"
    checked="\${checked}"
    on-change="\${handleChange}">
</cl-checkbox>`
    },

    radioButton: {
        id: 'radioButton',
        name: 'RadioButton',
        category: 'form',
        description: 'Radio button input',
        demo: `<example-radio-button></example-radio-button>`,
        source: `<cl-radio-button
    name="size"
    value="medium"
    label="Medium"
    modelvalue="\${selectedSize}"
    on-change="\${handleChange}">
</cl-radio-button>`
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
        description: 'Date picker component',
        demo: `<example-calendar></example-calendar>`,
        source: `<cl-calendar
    label="Date"
    value="\${selectedDate}"
    on-change="\${handleChange}">
</cl-calendar>`
    },

    // SELECTION COMPONENTS
    dropdown: {
        id: 'dropdown',
        name: 'Dropdown',
        category: 'selection',
        description: 'Single select dropdown with search',
        demo: `<example-dropdown></example-dropdown>`,
        source: `<cl-dropdown
    label="Select Option"
    options="\${options}"
    value="\${selected}"
    filter="true"
    on-change="\${handleChange}">
</cl-dropdown>`
    },

    multiselect: {
        id: 'multiselect',
        name: 'MultiSelect',
        category: 'selection',
        description: 'Multi-select dropdown with chips',
        demo: `<example-multiselect></example-multiselect>`,
        source: `<cl-multiselect
    label="Tags"
    options="\${tags}"
    value="\${selected}"
    filter="true"
    on-change="\${handleChange}">
</cl-multiselect>`
    },

    autocomplete: {
        id: 'autocomplete',
        name: 'AutoComplete',
        category: 'selection',
        description: 'Text input with autocomplete suggestions',
        demo: `<example-autocomplete></example-autocomplete>`,
        source: `<cl-autocomplete
    label="Search"
    suggestions="\${suggestions}"
    value="\${value}"
    on-change="\${handleChange}">
</cl-autocomplete>`
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
        source: `<cl-datatable
    value="\${data}"
    columns="\${columns}"
    selectionmode="single"
    selection="\${selected}"
    on-change="\${handleSelectionChange}">
</cl-datatable>`
    },

    paginator: {
        id: 'paginator',
        name: 'Paginator',
        category: 'data',
        description: 'Pagination controls',
        demo: `<example-paginator></example-paginator>`,
        source: `<cl-paginator
    totalrecords="100"
    rows="10"
    first="\${first}"
    on-change="\${handlePageChange}">
</cl-paginator>`
    },

    tree: {
        id: 'tree',
        name: 'Tree',
        category: 'data',
        description: 'Hierarchical tree view',
        demo: `<example-tree></example-tree>`,
        source: `<cl-tree
    value="\${nodes}"
    selectionmode="single"
    selection="\${selected}"
    on-change="\${handleSelectionChange}">
</cl-tree>`
    },

    orderableList: {
        id: 'orderableList',
        name: 'OrderableList',
        category: 'data',
        description: 'Drag and drop reorderable list',
        demo: `<example-orderable-list></example-orderable-list>`,
        source: `<cl-orderable-list
    header="Tasks"
    value="\${items}"
    on-change="\${handleReorder}">
</cl-orderable-list>`
    },

    // PANEL COMPONENTS
    accordion: {
        id: 'accordion',
        name: 'Accordion',
        category: 'panel',
        description: 'Collapsible accordion panels',
        demo: `<example-accordion></example-accordion>`,
        source: `<cl-accordion
    tabs="\${tabs}"
    activeindex="0"
    multiple="false">
</cl-accordion>`
    },

    tabview: {
        id: 'tabview',
        name: 'TabView',
        category: 'panel',
        description: 'Tabbed interface component',
        demo: `<example-tabview></example-tabview>`,
        source: `<cl-tabview
    tabs="\${tabs}"
    activeindex="0"
    on-change="\${handleTabChange}">
</cl-tabview>`
    },

    card: {
        id: 'card',
        name: 'Card',
        category: 'panel',
        description: 'Content card container',
        demo: `<example-card></example-card>`,
        source: `<cl-card
    header="Title"
    subheader="Subtitle"
    footer="Footer content">
    Card body content
</cl-card>`
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
        source: `<cl-toast position="top-right"></cl-toast>

// Show toast programmatically:
toast.show({
    severity: 'success',
    summary: 'Title',
    detail: 'Message',
    life: 3000
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
        source: `<cl-split-button
    label="Save"
    model="\${menuItems}"
    severity="primary"
    on-click="\${handleClick}">
</cl-split-button>`
    },

    menu: {
        id: 'menu',
        name: 'Menu',
        category: 'button',
        description: 'Menu component',
        demo: `<example-menu></example-menu>`,
        source: `<cl-menu model="\${menuItems}"></cl-menu>

// menuItems format:
[{
    label: 'File',
    icon: '📁',
    items: [...]
}]`
    },

    breadcrumb: {
        id: 'breadcrumb',
        name: 'Breadcrumb',
        category: 'button',
        description: 'Breadcrumb navigation',
        demo: `<example-breadcrumb></example-breadcrumb>`,
        source: `<cl-breadcrumb
    model="\${items}"
    home="\${homeItem}"
    separator="/">
</cl-breadcrumb>`
    },

    // MISC COMPONENTS
    progressbar: {
        id: 'progressbar',
        name: 'ProgressBar',
        category: 'misc',
        description: 'Progress indicator',
        demo: `<example-progressbar></example-progressbar>`,
        source: `<cl-progressbar
    value="75"
    showvalue="true"
    mode="determinate">
</cl-progressbar>`
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
    }
};
