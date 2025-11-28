/**
 * Dropdown - Advanced single select dropdown with search
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-dropdown', {
    props: {
        options: [],
        value: null,
        placeholder: 'Select an option',
        disabled: false,
        filter: false,
        label: '',
        optionlabel: 'label',
        optionvalue: 'value'
    },

    data() {
        return {
            showPanel: false,
            filterValue: ''
        };
    },

    methods: {
        togglePanel() {
            if (!this.props.disabled) {
                this.state.showPanel = !this.state.showPanel;
                if (this.state.showPanel) {
                    this.state.filterValue = '';
                }
            }
        },

        selectOption(option) {
            const value = typeof option === 'object' ? option[this.props.optionvalue] : option;
            this.emitChange(null, value);
            this.state.showPanel = false;
            this.state.filterValue = '';
        },

        handleFilterInput(e) {
            this.state.filterValue = e.target.value;
        },

        getFilteredOptions() {
            if (!this.props.filter || !this.state.filterValue) {
                return this.props.options || [];
            }

            const filter = this.state.filterValue.toLowerCase();
            return (this.props.options || []).filter(option => {
                const label = typeof option === 'object' ? option[this.props.optionlabel] : option;
                return String(label).toLowerCase().includes(filter);
            });
        },

        getSelectedLabel() {
            if (this.props.value === null || this.props.value === undefined) {
                return this.props.placeholder;
            }

            const option = (this.props.options || []).find(opt => {
                const value = typeof opt === 'object' ? opt[this.props.optionvalue] : opt;
                return value === this.props.value;
            });

            if (!option) return this.props.placeholder;
            return typeof option === 'object' ? option[this.props.optionlabel] : option;
        },

        getOptionLabel(option) {
            return typeof option === 'object' ? option[this.props.optionlabel] : option;
        },

        getOptionValue(option) {
            return typeof option === 'object' ? option[this.props.optionvalue] : option;
        },

        isSelected(option) {
            const value = this.getOptionValue(option);
            return value === this.props.value;
        }
    },

    template() {
        const filteredOptions = this.getFilteredOptions();
        const selectedLabel = this.getSelectedLabel();
        const hasValue = this.props.value !== null && this.props.value !== undefined;

        return html`
            <div class="cl-dropdown-wrapper">
                ${when(this.props.label, html`
                    <label class="cl-label">${this.props.label}</label>
                `)}
                <div class="dropdown-container">
                    <div class="dropdown-trigger ${this.props.disabled ? 'disabled' : ''}" on-click="togglePanel">
                        <span class="${hasValue ? '' : 'placeholder'}">${selectedLabel}</span>
                        <span class="dropdown-icon">${this.state.showPanel ? '▲' : '▼'}</span>
                    </div>
                    ${when(this.state.showPanel, html`
                        <div class="dropdown-panel">
                            ${when(this.props.filter, html`
                                <div class="filter-container">
                                    <input
                                        type="text"
                                        class="filter-input"
                                        placeholder="Search..."
                                        value="${this.state.filterValue}"
                                        on-input="handleFilterInput">
                                </div>
                            `)}
                            <div class="options-list">
                                ${when(filteredOptions.length === 0, html`
                                    <div class="no-results">No results found</div>
                                `)}
                                ${each(filteredOptions, option => html`
                                    <div
                                        class="option ${this.isSelected(option) ? 'selected' : ''}"
                                        on-click="${() => this.selectOption(option)}">
                                        ${this.getOptionLabel(option)}
                                    </div>
                                `)}
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-dropdown-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .cl-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
        }

        .dropdown-container {
            position: relative;
        }

        .dropdown-trigger {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            background: var(--input-bg, #fff);
            cursor: pointer;
            transition: all 0.2s;
        }

        .dropdown-trigger:hover:not(.disabled) {
            border-color: var(--primary-color, #007bff);
        }

        .dropdown-trigger.disabled {
            background: var(--disabled-bg, #e9ecef);
            cursor: not-allowed;
            opacity: 0.6;
        }

        .placeholder {
            color: var(--text-muted, #6c757d);
        }

        .dropdown-icon {
            font-size: 10px;
            color: var(--text-muted, #6c757d);
        }

        .dropdown-panel {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 4px;
            background: white;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-height: 300px;
            display: flex;
            flex-direction: column;
        }

        .filter-container {
            padding: 8px;
            border-bottom: 1px solid var(--input-border, #ced4da);
        }

        .filter-input {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
        }

        .filter-input:focus {
            outline: none;
            border-color: var(--primary-color, #007bff);
        }

        .options-list {
            overflow-y: auto;
            max-height: 250px;
        }

        .option {
            padding: 10px 12px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 14px;
        }

        .option:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        .option.selected {
            background: var(--primary-color, #007bff);
            color: white;
        }

        .no-results {
            padding: 20px;
            text-align: center;
            color: var(--text-muted, #6c757d);
            font-size: 14px;
        }
    `
});
