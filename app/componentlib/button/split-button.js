/**
 * SplitButton - Button with dropdown menu
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-split-button', {
    props: {
        label: '',
        model: [], // Array of {label: string, command: function}
        severity: 'primary',
        disabled: false
    },

    data() {
        return {
            showMenu: false
        };
    },

    methods: {
        closeMenu() {
            this.state.showMenu = false;
        },

        handleClick() {
            if (!this.props.disabled) {
                this.emitEvent('click');
            }
        },

        toggleMenu() {
            if (!this.props.disabled) {
                this.state.showMenu = !this.state.showMenu;
            }
        },

        handleItemClick(item) {
            this.state.showMenu = false;
            if (item.command) {
                item.command();
            }
            this.emitEvent('item-click', item);
        },

        emitEvent(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
        }
    },

    template() {
        return html`
            <div class="cl-split-button" on-click-outside="closeMenu">
                <button
                    class="main-button ${this.props.severity}"
                    disabled="${this.props.disabled}"
                    on-click="handleClick">
                    ${this.props.label}
                </button>
                <button
                    class="dropdown-button ${this.props.severity}"
                    disabled="${this.props.disabled}"
                    on-click="toggleMenu">
                    ▼
                </button>
                ${when(this.state.showMenu, html`
                    <div class="dropdown-menu">
                        ${each(this.props.model || [], item => html`
                            <div
                                class="menu-item"
                                on-click="${() => this.handleItemClick(item)}">
                                ${item.label}
                            </div>
                        `)}
                    </div>
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: inline-block;
        }

        .cl-split-button {
            position: relative;
            display: inline-flex;
        }

        button {
            font-family: inherit;
            font-size: 14px;
            font-weight: 500;
            padding: 10px 20px;
            border: 1px solid;
            cursor: pointer;
            transition: all 0.2s;
            user-select: none;
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .main-button {
            border-radius: 4px 0 0 4px;
            border-right: none;
        }

        .dropdown-button {
            border-radius: 0 4px 4px 0;
            padding: 10px 12px;
            font-size: 10px;
        }

        /* Color variants */
        .primary {
            background: var(--primary-color, #007bff);
            border-color: var(--primary-color, #007bff);
            color: white;
        }

        .primary:hover:not(:disabled) {
            background: #0056b3;
            border-color: #0056b3;
        }

        .secondary {
            background: #6c757d;
            border-color: #6c757d;
            color: white;
        }

        .secondary:hover:not(:disabled) {
            background: #5a6268;
            border-color: #545b62;
        }

        .success {
            background: #28a745;
            border-color: #28a745;
            color: white;
        }

        .success:hover:not(:disabled) {
            background: #218838;
            border-color: #1e7e34;
        }

        .danger {
            background: #dc3545;
            border-color: #dc3545;
            color: white;
        }

        .danger:hover:not(:disabled) {
            background: #c82333;
            border-color: #bd2130;
        }

        .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 4px;
            background: var(--card-bg, white);
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 150px;
        }

        .menu-item {
            padding: 10px 16px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .menu-item:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        .menu-item:first-child {
            border-radius: 4px 4px 0 0;
        }

        .menu-item:last-child {
            border-radius: 0 0 4px 4px;
        }
    `
});
