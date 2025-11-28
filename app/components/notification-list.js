/**
 * Notification List Component
 * Displays toast notifications in the bottom-right corner
 */
import { defineComponent } from '../lib/framework.js';
import { html, when, each, raw } from '../lib/framework.js';
import { notifications } from '../lib/utils.js';
import './icon.js';

export default defineComponent('notification-list', {
    stores: { notifications },

    template() {
        if (this.stores.notifications.list.length === 0) {
            return html``;
        }

        return html`
            <div class="notify-list">
                ${each(this.stores.notifications.list, notification => html`
                    <div class="notify ${notification.severity}">
                        <x-icon icon="${notification.severity}" alt="${notification.severity}"></x-icon>
                        <span role="alert">${notification.message}</span>
                    </div>
                `)}
            </div>
        `;
    }
});
