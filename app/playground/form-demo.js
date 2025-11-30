/**
 * Form Demo - Demonstrates form handling and validation
 */
import { defineComponent } from '../lib/framework.js';
import { html, when } from '../lib/framework.js';
import { notify } from '../lib/utils.js';

export default defineComponent('form-demo', {
    data() {
        return {
            username: '',
            email: '',
            errors: {},
            submitted: false
        };
    },

    methods: {
        handleSubmit() {
            // Validation
            const errors = {};
            if (!this.state.username || this.state.username.length < 3) {
                errors.username = 'Username must be at least 3 characters';
            }
            if (!this.state.email || !this.isValidEmail(this.state.email)) {
                errors.email = 'Please enter a valid email';
            }

            this.state.errors = errors;

            if (Object.keys(errors).length === 0) {
                notify(`Form submitted! User: ${this.state.username}`, 'info', 3);
                this.state.submitted = true;
                setTimeout(() => {
                    this.state.submitted = false;
                    this.state.username = '';
                    this.state.email = '';
                }, 2000);
            } else {
                notify('Please fix form errors', 'error', 3);
            }
        },

        clearError(field) {
            if (this.state.errors[field]) {
                delete this.state.errors[field];
                this.state.errors = { ...this.state.errors };
            }
        },

        isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
    },

    template() {
        return html`
            <h2>Form Demo</h2>
            <p>Form handling with x-model two-way binding and validation</p>

            ${when(this.state.submitted,
                html`<div style="padding: 10px; background: #d4edda; color: #155724; border-radius: 4px; margin-bottom: 15px;">
                    ✓ Form submitted successfully!
                </div>`,
                html`<form on-submit-prevent="handleSubmit">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Username:</label>
                        <input
                            type="text"
                            x-model="username"
                            on-input="${() => this.clearError('username')}"
                            placeholder="Enter username (min 3 chars)"
                            style="width: 100%; box-sizing: border-box;">
                        ${when(this.state.errors.username,
                            html`<div style="color: #dc3545; font-size: 0.85em; margin-top: 3px;">
                                ${this.state.errors.username}
                            </div>`,
                            html``
                        )}
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Email:</label>
                        <input
                            type="email"
                            x-model="email"
                            on-input="${() => this.clearError('email')}"
                            placeholder="your@email.com"
                            style="width: 100%; box-sizing: border-box;">
                        ${when(this.state.errors.email,
                            html`<div style="color: #dc3545; font-size: 0.85em; margin-top: 3px;">
                                ${this.state.errors.email}
                            </div>`,
                            html``
                        )}
                    </div>

                    <button type="submit">Submit</button>
                </form>`
            )}
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }
    `
});
