/**
 * Conditional Demo - Demonstrates conditional rendering patterns
 */
import { defineComponent } from '../lib/framework.js';
import { html, when } from '../lib/framework.js';

export default defineComponent('conditional-demo', {
    data() {
        return {
            isVisible: true,
            status: 'idle', // idle, loading, success, error
            loginState: 'loggedOut' // loggedOut, loggedIn, admin
        };
    },

    methods: {
        toggleVisibility() {
            this.state.isVisible = !this.state.isVisible;
        },

        simulateLoading() {
            this.state.status = 'loading';
            setTimeout(() => {
                this.state.status = Math.random() > 0.3 ? 'success' : 'error';
            }, 1500);
        },

        cycleLoginState() {
            const states = ['loggedOut', 'loggedIn', 'admin'];
            const currentIndex = states.indexOf(this.state.loginState);
            this.state.loginState = states[(currentIndex + 1) % states.length];
        }
    },

    template() {
        return html`
            <h2>Conditional Demo</h2>
            <p>Various conditional rendering patterns</p>

            <h3>Simple Toggle</h3>
            <button on-click="toggleVisibility">
                ${this.state.isVisible ? 'Hide' : 'Show'}
            </button>
            ${when(this.state.isVisible,
                html`<div style="margin-top: 10px; padding: 10px; background: var(--primary-color, #0066cc); color: white; border-radius: 4px;">
                    👋 Hello! I'm conditionally rendered.
                </div>`,
                html`<div style="margin-top: 10px; padding: 10px; background: var(--text-secondary, #999); color: white; border-radius: 4px;">
                    💤 Content is hidden
                </div>`
            )}

            <h3>Status States</h3>
            <button on-click="simulateLoading" disabled="${this.state.status === 'loading' ? 'disabled' : undefined}">
                Simulate API Call
            </button>
            <div style="margin-top: 10px;">
                ${when(this.state.status === 'idle',
                    html`<div style="color: var(--text-secondary, #666);">Ready to make a request</div>`,
                    when(this.state.status === 'loading',
                        html`<div style="color: var(--primary-color, #0066cc);">⏳ Loading...</div>`,
                        when(this.state.status === 'success',
                            html`<div style="color: #28a745;">✓ Success! Data loaded.</div>`,
                            html`<div style="color: #dc3545;">✗ Error! Something went wrong.</div>`
                        )
                    )
                )}
            </div>

            <h3>Permission States</h3>
            <button on-click="cycleLoginState">
                Change State (${this.state.loginState})
            </button>
            <div style="margin-top: 10px;">
                ${when(this.state.loginState === 'loggedOut',
                    html`<div style="padding: 10px; background: #f8d7da; color: #721c24; border-radius: 4px;">
                        🔒 Please log in to continue
                    </div>`,
                    when(this.state.loginState === 'admin',
                        html`<div style="padding: 10px; background: #d4edda; color: #155724; border-radius: 4px;">
                            👑 Admin Panel - Full Access
                        </div>`,
                        html`<div style="padding: 10px; background: #d1ecf1; color: #0c5460; border-radius: 4px;">
                            👤 User Dashboard - Limited Access
                        </div>`
                    )
                )}
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        h3 {
            margin-top: 20px;
            margin-bottom: 10px;
        }
    `
});
