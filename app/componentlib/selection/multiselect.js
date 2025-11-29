/**
 * MultiSelect - Multi-select dropdown with chips
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-multiselect', {
    props: {
        options: [],
        value: [],
        placeholder: 'Select options',
        disabled: false,
        filter: false,
        label: '',
        optionlabel: 'label',
        optionvalue: 'value',
        maxselected: 0
    },

    data() {
        return {
            showPanel: false,
            filterValue: ''
        };
    },

    mounted() {
        // Close panel when clicking outside
        this._clickOutside = (e) => {
            if (!this.contains(e.target) && this.state.showPanel) {
                this.state.showPanel = false;
            }
        };
        document.addEventListener('click', this._clickOutside);
    },

    unmounted() {
        if (this._clickOutside) {
            document.removeEventListener('click', this._clickOutside);
        }
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

        toggleOption(option) {
            const value = this.getOptionValue(option);
            const currentValue = this.props.value || [];
            const index = currentValue.indexOf(value);

            let newValue;
            if (index >= 0) {
                newValue = currentValue.filter((_, i) => i !== index);
            } else {
                if (this.props.maxselected > 0 && currentValue.length >= this.props.maxselected) {
                    return; // Max selection reached
                }
                newValue = [...currentValue, value];
            }

            this.emitChange(null, newValue);
        },

        removeValue(value) {
            const currentValue = this.props.value || [];
            const newValue = currentValue.filter(v => v !== value);
            this.emitChange(null, newValue);
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
                const label = this.getOptionLabel(option);
                return String(label).toLowerCase().includes(filter);
            });
        },

        getOptionLabel(option) {
            return typeof option === 'object' ? option[this.props.optionlabel] : option;
        },

        getOptionValue(option) {
            return typeof option === 'object' ? option[this.props.optionvalue] : option;
        },

        isSelected(option) {
            const value = this.getOptionValue(option);
            const currentValue = this.props.value || [];
            return currentValue.includes(value);
        },

        getSelectedOptions() {
            const currentValue = this.props.value || [];
            return currentValue.map(val => {
                const option = (this.props.options || []).find(opt => {
                    return this.getOptionValue(opt) === val;
                });
                return option || val;
            });
        }
    },

    template() {
        const filteredOptions = this.getFilteredOptions();
        const selectedOptions = this.getSelectedOptions();
        const hasSelection = selectedOptions.length > 0;

        return html`
            <div class="cl-multiselect-wrapper">
                ${when(this.props.label, html`
                    <label class="cl-label">${this.props.label}</label>
                `)}
                <div class="multiselect-container">
                    <div class="multiselect-trigger ${this.props.disabled ? 'disabled' : ''}" on-click="togglePanel">
                        <div class="selected-items">
                            ${when(!hasSelection, html`
                                <span class="placeholder">${this.props.placeholder}</span>
                            `)}
                            ${each(selectedOptions, option => html`
                                <span class="chip">
                                    ${this.getOptionLabel(option)}
                                    <span class="chip-remove" on-click="${(e) => {
                                        e.stopPropagation();
                                        this.removeValue(this.getOptionValue(option));
                                    }}">×</span>
                                </span>
                            `)}
                        </div>
                        <span class="dropdown-icon">${this.state.showPanel ? '▲' : '▼'}</span>
                    </div>
                    ${when(this.state.showPanel, html`
                        <div class="multiselect-panel">
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
                                ${each(filteredOptions, option => {
                                    const isSelected = this.isSelected(option);
                                    return html`
                                        <div
                                            class="option ${isSelected ? 'selected' : ''}"
                                            on-click="${() => this.toggleOption(option)}">
                                            <input type="checkbox" checked="${isSelected}" readonly>
                                            <span>${this.getOptionLabel(option)}</span>
                                        </div>
                                    `;
                                })}
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

        .cl-multiselect-wrapper {
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

        .multiselect-container {
            position: relative;
        }

        .multiselect-trigger {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 42px;
            padding: 6px 12px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            background: var(--input-bg, #fff);
            cursor: pointer;
            transition: all 0.2s;
        }

        .multiselect-trigger:hover:not(.disabled) {
            border-color: var(--primary-color, #007bff);
        }

        .multiselect-trigger.disabled {
            background: var(--disabled-bg, #e9ecef);
            cursor: not-allowed;
            opacity: 0.6;
        }

        .selected-items {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            flex: 1;
        }

        .placeholder {
            color: var(--text-muted, #6c757d);
            line-height: 30px;
        }

        .chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: var(--primary-color, #007bff);
            color: white;
            border-radius: 12px;
            font-size: 13px;
        }

        .chip-remove {
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            font-weight: bold;
        }

        .chip-remove:hover {
            opacity: 0.8;
        }

        .dropdown-icon {
            font-size: 10px;
            color: var(--text-muted, #6c757d);
            margin-left: 8px;
        }

        .multiselect-panel {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 4px;
            background: var(--card-bg, white);
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
            background: var(--input-bg, #fff);
            color: var(--text-color, #333);
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
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 14px;
        }

        .option:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        .option input[type="checkbox"] {
            pointer-events: none;
        }

        .no-results {
            padding: 20px;
            text-align: center;
            color: var(--text-muted, #6c757d);
            font-size: 14px;
        }
    `
});
