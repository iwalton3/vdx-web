/**
 * Component Examples and Demos
 */

export const componentExamples = {
    // FORM COMPONENTS
    inputText: {
        id: 'inputText',
        name: 'InputText',
        category: 'form',
        description: 'Text input with validation support',
        demo: `<example-input-text></example-input-text>`,
        source: `<cl-input-text
    label="Email"
    placeholder="email@example.com"
    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$"
    required="true"
    value="\${value}"
    on-change="\${handleChange}">
</cl-input-text>`
    },

    inputNumber: {
        id: 'inputNumber',
        name: 'InputNumber',
        category: 'form',
        description: 'Number input with increment/decrement buttons',
        demo: `
            <example-input-number></example-input-number>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/form/input-number.js';

                defineComponent('example-input-number', {
                    data() {
                        return { value: 0, quantity: 1, price: 9.99 };
                    },
                    template() {
                        return html\`
                            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                                <cl-input-number
                                    label="Basic"
                                    value="\${this.state.value}"
                                    on-change="\${(e, val) => this.state.value = val}">
                                </cl-input-number>

                                <cl-input-number
                                    label="Min/Max (1-10)"
                                    value="\${this.state.quantity}"
                                    min="1"
                                    max="10"
                                    on-change="\${(e, val) => this.state.quantity = val}">
                                </cl-input-number>

                                <cl-input-number
                                    label="Step (0.01)"
                                    value="\${this.state.price}"
                                    step="0.01"
                                    on-change="\${(e, val) => this.state.price = val}">
                                </cl-input-number>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-textarea></example-textarea>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/form/textarea.js';

                defineComponent('example-textarea', {
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
                                    value="\${this.state.text}"
                                    on-change="\${(e, val) => this.state.text = val}">
                                </cl-textarea>

                                <cl-textarea
                                    label="With Character Count"
                                    placeholder="Limited to 200 characters"
                                    maxlength="200"
                                    showcount="true"
                                    autoresize="true"
                                    value="\${this.state.limited}"
                                    on-change="\${(e, val) => this.state.limited = val}">
                                </cl-textarea>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-checkbox></example-checkbox>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/form/checkbox.js';

                defineComponent('example-checkbox', {
                    data() {
                        return { checked: false, terms: true };
                    },
                    template() {
                        return html\`
                            <div style="display: flex; flex-direction: column; gap: 16px;">
                                <cl-checkbox
                                    label="Accept terms and conditions"
                                    checked="\${this.state.terms}"
                                    on-change="\${(e, val) => this.state.terms = val}">
                                </cl-checkbox>

                                <cl-checkbox
                                    label="Subscribe to newsletter"
                                    checked="\${this.state.checked}"
                                    on-change="\${(e, val) => this.state.checked = val}">
                                </cl-checkbox>

                                <cl-checkbox
                                    label="Disabled checkbox"
                                    checked="true"
                                    disabled="true">
                                </cl-checkbox>

                                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px;">
                                    Terms: \${this.state.terms ? 'Accepted' : 'Not accepted'}
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-radio-button></example-radio-button>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/form/radio-button.js';

                defineComponent('example-radio-button', {
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

                                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 8px;">
                                    Selected: \${this.state.size}
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-slider></example-slider>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/form/slider.js';

                defineComponent('example-slider', {
                    data() {
                        return { value: 50, volume: 75 };
                    },
                    template() {
                        return html\`
                            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                                <cl-slider
                                    label="Basic Slider"
                                    value="\${this.state.value}"
                                    on-change="\${(e, val) => this.state.value = val}">
                                </cl-slider>

                                <cl-slider
                                    label="Volume (0-100)"
                                    value="\${this.state.volume}"
                                    min="0"
                                    max="100"
                                    step="5"
                                    on-change="\${(e, val) => this.state.volume = val}">
                                </cl-slider>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
        source: `<cl-slider
    label="Volume"
    value="\${volume}"
    min="0"
    max="100"
    step="5"
    on-change="\${handleChange}">
</cl-slider>`
    },

    calendar: {
        id: 'calendar',
        name: 'Calendar',
        category: 'form',
        description: 'Date picker component',
        demo: `
            <example-calendar></example-calendar>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/form/calendar.js';

                defineComponent('example-calendar', {
                    data() {
                        return { date: '', inline: new Date().toISOString().split('T')[0] };
                    },
                    template() {
                        return html\`
                            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                                <cl-calendar
                                    label="Select Date"
                                    value="\${this.state.date}"
                                    on-change="\${(e, val) => this.state.date = val}">
                                </cl-calendar>

                                <cl-calendar
                                    label="Inline Calendar"
                                    value="\${this.state.inline}"
                                    inline="true"
                                    on-change="\${(e, val) => this.state.inline = val}">
                                </cl-calendar>

                                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px;">
                                    Selected: \${this.state.date || 'None'}
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-dropdown></example-dropdown>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/selection/dropdown.js';

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
                        return html\`
                            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 500px;">
                                <cl-dropdown
                                    label="Programming Language"
                                    options="\${this.state.languages}"
                                    value="\${this.state.selected}"
                                    on-change="\${(e, val) => this.state.selected = val}">
                                </cl-dropdown>

                                <cl-dropdown
                                    label="City (with filter)"
                                    options="\${this.state.cities}"
                                    value="\${this.state.selectedCity}"
                                    filter="true"
                                    placeholder="Select a city"
                                    on-change="\${(e, val) => this.state.selectedCity = val}">
                                </cl-dropdown>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-multiselect></example-multiselect>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/selection/multiselect.js';

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
                        return html\`
                            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 600px;">
                                <cl-multiselect
                                    label="Select Colors"
                                    options="\${this.state.colors}"
                                    value="\${this.state.selected}"
                                    filter="true"
                                    on-change="\${(e, val) => this.state.selected = val}">
                                </cl-multiselect>

                                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px;">
                                    Selected: \${this.state.selected.join(', ') || 'None'}
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-autocomplete></example-autocomplete>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/selection/autocomplete.js';

                defineComponent('example-autocomplete', {
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
                                    value="\${this.state.value}"
                                    on-change="\${(e, val) => this.state.value = val}">
                                </cl-autocomplete>

                                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 16px;">
                                    Value: \${this.state.value || 'None'}
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-chips></example-chips>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/selection/chips.js';

                defineComponent('example-chips', {
                    data() {
                        return { tags: ['javascript', 'react', 'vue'] };
                    },
                    template() {
                        return html\`
                            <div style="max-width: 600px;">
                                <cl-chips
                                    label="Tags"
                                    placeholder="Add tag..."
                                    value="\${this.state.tags}"
                                    on-change="\${(e, val) => this.state.tags = val}">
                                </cl-chips>

                                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 16px;">
                                    Tags: \${this.state.tags.join(', ')}
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
        source: `<cl-chips
    label="Tags"
    value="\${tags}"
    separator=","
    on-change="\${handleChange}">
</cl-chips>`
    },

    // DATA COMPONENTS
    datatable: {
        id: 'datatable',
        name: 'DataTable',
        category: 'data',
        description: 'Advanced data table with sorting and selection',
        demo: `
            <example-datatable></example-datatable>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/data/datatable.js';

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
                        return html\`
                            <div>
                                <cl-datatable
                                    value="\${this.state.products}"
                                    columns="\${this.state.columns}"
                                    selectionmode="single"
                                    selection="\${this.state.selected}"
                                    on-change="\${(e, val) => this.state.selected = val}">
                                </cl-datatable>

                                <div style="padding: 12px; background: #f8f9fa; border-radius: 4px; margin-top: 16px;">
                                    Selected: \${this.state.selected ? this.state.selected.name : 'None'}
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-paginator></example-paginator>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/data/paginator.js';

                defineComponent('example-paginator', {
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
                });
            </script>
        `,
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
        demo: `
            <example-tree></example-tree>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/data/tree.js';

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
                });
            </script>
        `,
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
        demo: `
            <example-orderable-list></example-orderable-list>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/data/orderable-list.js';

                defineComponent('example-orderable-list', {
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
                });
            </script>
        `,
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
        demo: `
            <example-accordion></example-accordion>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/panel/accordion.js';

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
                        return html\`
                            <div style="max-width: 700px;">
                                <cl-accordion
                                    tabs="\${this.state.tabs}"
                                    activeindex="0">
                                </cl-accordion>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-tabview></example-tabview>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/panel/tabview.js';

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
                        return html\`
                            <div style="max-width: 700px;">
                                <cl-tabview
                                    tabs="\${this.state.tabs}"
                                    activeindex="0">
                                </cl-tabview>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-card></example-card>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/panel/card.js';

                defineComponent('example-card', {
                    template() {
                        return html\`
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                <cl-card
                                    header="Simple Card"
                                    subheader="Card subtitle">
                                    <p>This is the card content area. You can put any content here.</p>
                                </cl-card>

                                <cl-card
                                    header="Product Card"
                                    footer="<div style='display: flex; gap: 8px;'><button style='padding: 8px 16px;'>Buy</button><button style='padding: 8px 16px;'>Details</button></div>">
                                    <p><strong>$99.99</strong></p>
                                    <p>High quality product with great features.</p>
                                </cl-card>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-fieldset></example-fieldset>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/panel/fieldset.js';

                defineComponent('example-fieldset', {
                    template() {
                        return html\`
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
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-splitter></example-splitter>
            <script type="module">
                import { defineComponent, html, raw } from '../lib/framework.js';
                import '../componentlib/panel/splitter.js';

                defineComponent('example-splitter', {
                    template() {
                        return html\`
                            <div style="height: 400px;">
                                <cl-splitter layout="horizontal" panelsizes="[60, 40]">
                                    \${raw('<div slot="panel-1" style="padding: 20px;"><h3>Left Panel</h3><p>Drag the divider to resize.</p></div>')}
                                    \${raw('<div slot="panel-2" style="padding: 20px;"><h3>Right Panel</h3><p>This panel adjusts automatically.</p></div>')}
                                </cl-splitter>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
        source: `<cl-splitter
    layout="horizontal"
    panelsizes="[50, 50]">
    <div slot="panel-1">Left</div>
    <div slot="panel-2">Right</div>
</cl-splitter>`
    },

    // OVERLAY COMPONENTS
    dialog: {
        id: 'dialog',
        name: 'Dialog',
        category: 'overlay',
        description: 'Modal dialog component',
        demo: `
            <example-dialog></example-dialog>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/overlay/dialog.js';
                import '../componentlib/button/button.js';

                defineComponent('example-dialog', {
                    data() {
                        return { visible: false };
                    },
                    template() {
                        return html\`
                            <div>
                                <cl-button
                                    label="Show Dialog"
                                    on-click="\${() => this.state.visible = true}">
                                </cl-button>

                                <cl-dialog
                                    visible="\${this.state.visible}"
                                    header="Dialog Header"
                                    modal="true"
                                    closable="true"
                                    style="width: 500px;"
                                    on-change="\${(e, val) => this.state.visible = val}">
                                    <p>This is a modal dialog. Click outside or press the X to close.</p>
                                    <p>You can put any content here.</p>
                                </cl-dialog>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
        source: `<cl-dialog
    visible="\${showDialog}"
    header="Title"
    modal="true"
    closable="true"
    on-change="\${handleClose}">
    Dialog content
</cl-dialog>`
    },

    sidebar: {
        id: 'sidebar',
        name: 'Sidebar',
        category: 'overlay',
        description: 'Slide-out sidebar panel',
        demo: `
            <example-sidebar></example-sidebar>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/overlay/sidebar.js';
                import '../componentlib/button/button.js';

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
                });
            </script>
        `,
        source: `<cl-sidebar
    visible="\${showSidebar}"
    position="left"
    header="Menu"
    on-change="\${handleClose}">
    Sidebar content
</cl-sidebar>`
    },

    toast: {
        id: 'toast',
        name: 'Toast',
        category: 'overlay',
        description: 'Toast notification component',
        demo: `
            <example-toast></example-toast>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/overlay/toast.js';
                import '../componentlib/button/button.js';

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
                });
            </script>
        `,
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
        demo: `
            <example-tooltip></example-tooltip>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/overlay/tooltip.js';
                import '../componentlib/button/button.js';

                defineComponent('example-tooltip', {
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
                });
            </script>
        `,
        source: `<cl-tooltip
    text="Tooltip text"
    position="top">
    <button>Hover me</button>
</cl-tooltip>`
    },

    // BUTTON COMPONENTS
    button: {
        id: 'button',
        name: 'Button',
        category: 'button',
        description: 'Styled button component',
        demo: `
            <example-button></example-button>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/button/button.js';

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
                });
            </script>
        `,
        source: `<cl-button
    label="Click Me"
    severity="primary"
    icon="📄"
    on-click="\${handleClick}">
</cl-button>`
    },

    splitButton: {
        id: 'splitButton',
        name: 'SplitButton',
        category: 'button',
        description: 'Button with dropdown menu',
        demo: `
            <example-split-button></example-split-button>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/button/split-button.js';

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
                });
            </script>
        `,
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
        demo: `
            <example-menu></example-menu>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/button/menu.js';

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
                        return html\`
                            <div style="max-width: 400px;">
                                <cl-menu model="\${this.state.items}"></cl-menu>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-breadcrumb></example-breadcrumb>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/button/breadcrumb.js';

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
                        return html\`
                            <div>
                                <cl-breadcrumb
                                    model="\${this.state.items}"
                                    home="\${this.state.home}">
                                </cl-breadcrumb>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-progressbar></example-progressbar>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/misc/progressbar.js';

                defineComponent('example-progressbar', {
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
                });
            </script>
        `,
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
        demo: `
            <example-fileupload></example-fileupload>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/misc/fileupload.js';

                defineComponent('example-fileupload', {
                    data() {
                        return { files: [] };
                    },
                    template() {
                        return html\`
                            <div style="max-width: 600px;">
                                <cl-fileupload
                                    multiple="true"
                                    label="Choose Files"
                                    on-change="\${(e, val) => this.state.files = val}">
                                </cl-fileupload>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
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
        demo: `
            <example-colorpicker></example-colorpicker>
            <script type="module">
                import { defineComponent, html } from '../lib/framework.js';
                import '../componentlib/misc/colorpicker.js';

                defineComponent('example-colorpicker', {
                    data() {
                        return { color: '#3498db' };
                    },
                    template() {
                        return html\`
                            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 500px;">
                                <cl-colorpicker
                                    label="Pick Color"
                                    value="\${this.state.color}"
                                    on-change="\${(e, val) => this.state.color = val}">
                                </cl-colorpicker>

                                <div style="padding: 40px; background: \${this.state.color}; border-radius: 8px; color: white; text-align: center; font-weight: 600;">
                                    Selected Color
                                </div>
                            </div>
                        \`;
                    }
                });
            </script>
        `,
        source: `<cl-colorpicker
    label="Color"
    value="\${color}"
    format="hex"
    on-change="\${handleColorChange}">
</cl-colorpicker>`
    }
};
