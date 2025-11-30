/**
 * Nested Demo - Demonstrates nested component composition
 */
import { defineComponent } from '../lib/framework.js';
import { html, each } from '../lib/framework.js';

// Child component: User Card
defineComponent('user-card', {
    props: {
        name: '',
        role: '',
        status: 'inactive'
    },

    template() {
        const statusClass = this.props.status === 'active' ? 'active' : 'inactive';

        return html`
            <div class="info">
                <strong>${this.props.name}</strong>
                <div class="role">
                    ${this.props.role}
                </div>
            </div>
            <span class="status ${statusClass}">
                ${this.props.status}
            </span>
        `;
    },

    styles: /*css*/`
        :host {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: var(--list-item-bg, #f8f9fa);
            border-radius: 4px;
            margin-bottom: 8px;
        }

        .info {
            flex: 1;
        }

        .role {
            font-size: 0.85em;
            color: var(--text-secondary, #666);
        }

        .status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: bold;
        }

        .status.active {
            background: #d4edda;
            color: #155724;
        }

        .status.inactive {
            background: #f8d7da;
            color: #721c24;
        }
    `
});

// Parent component
export default defineComponent('nested-demo', {
    data() {
        return {
            users: [
                { id: 1, name: 'Alice Johnson', role: 'Administrator', status: 'active' },
                { id: 2, name: 'Bob Smith', role: 'Developer', status: 'active' },
                { id: 3, name: 'Carol White', role: 'Designer', status: 'inactive' },
                { id: 4, name: 'David Brown', role: 'Manager', status: 'active' }
            ]
        };
    },

    methods: {
        toggleUserStatus(id) {
            this.state.users = this.state.users.map(user =>
                user.id === id
                    ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
                    : user
            );
        }
    },

    template() {
        const activeCount = this.state.users.filter(u => u.status === 'active').length;

        return html`
            <h2>Nested Components</h2>
            <p>Parent-child component composition</p>

            <div style="margin-bottom: 15px; padding: 10px; background: var(--info-bg, #e7f3ff); border-radius: 4px;">
                <strong>${activeCount}</strong> of <strong>${this.state.users.length}</strong> users active
            </div>

            <div class="users-list">
                ${each(this.state.users, user => html`
                    <user-card
                        name="${user.name}"
                        role="${user.role}"
                        status="${user.status}"
                        on-click="${() => this.toggleUserStatus(user.id)}"
                        style="cursor: pointer;">
                    </user-card>
                `)}
            </div>

            <div style="margin-top: 10px; font-size: 0.85em; color: var(--text-secondary, #666); font-style: italic;">
                Click on a user card to toggle their status
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .users-list {
            margin-top: 10px;
        }
    `
});
