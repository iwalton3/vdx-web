/**
 * Notification Demo - Demonstrates notification system
 */
import { defineComponent } from '../lib/framework.js';
import { html, each } from '../lib/framework.js';
import { notify } from '../lib/utils.js';

export default defineComponent('notification-demo', {
    data() {
        return {
            message: 'Test notification',
            severity: 'info',
            duration: 3
        };
    },

    methods: {
        showNotification() {
            notify(this.state.message, this.state.severity, this.state.duration);
        },

        showInfo() {
            notify('This is an info message', 'info', 3);
        },

        showSuccess() {
            notify('Operation completed successfully!', 'success', 3);
        },

        showWarning() {
            notify('Warning: Please review your settings', 'warn', 4);
        },

        showError() {
            notify('Error: Something went wrong', 'error', 5);
        },

        showMultiple() {
            notify('First notification', 'info', 3);
            setTimeout(() => notify('Second notification', 'success', 3), 500);
            setTimeout(() => notify('Third notification', 'warn', 3), 1000);
        }
    },

    template() {
        return html`
            <h2>Notification Demo</h2>
            <p>Trigger various notification types using the notify() utility</p>

            <h3>Quick Actions</h3>
            <div class="controls">
                <button on-click="showInfo">Info</button>
                <button on-click="showSuccess" style="background: #28a745;">Success</button>
                <button on-click="showWarning" style="background: #ffc107;">Warning</button>
                <button on-click="showError" style="background: #dc3545;">Error</button>
                <button on-click="showMultiple" class="secondary">Show Multiple</button>
            </div>

            <h3>Custom Notification</h3>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">Message:</label>
                <input
                    type="text"
                    x-model="message"
                    style="width: 100%; box-sizing: border-box;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                    <label style="display: block; margin-bottom: 5px;">Severity:</label>
                    <select x-model="severity" style="width: 100%;">
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 5px;">Duration (seconds):</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        x-model="duration"
                        style="width: 100%; box-sizing: border-box;">
                </div>
            </div>

            <button on-click="showNotification" style="width: 100%;">Show Custom Notification</button>
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
