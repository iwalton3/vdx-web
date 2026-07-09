/**
 * Empty - Empty-state placeholder for lists, tables, and search results.
 * Default slot / children render call-to-action buttons under the message.
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-empty', {
    props: {
        icon: '',                  // emoji or text glyph; default 📭
        title: 'Nothing here yet',
        description: '',
        size: 'md'                 // 'sm' | 'md' | 'lg'
    },

    template() {
        return html`
            <div class="cl-empty size-${this.props.size}">
                <div class="empty-icon">${this.props.icon || '📭'}</div>
                ${when(this.props.title, html`
                    <div class="empty-title">${this.props.title}</div>
                `)}
                ${when(this.props.description, html`
                    <div class="empty-description">${this.props.description}</div>
                `)}
                ${when(this.props.children && this.props.children.length, html`
                    <div class="empty-actions">${this.props.children}</div>
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        :host { display: block; }

        .cl-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px 24px;
            color: var(--text-muted, #6c757d);
        }

        .empty-icon {
            font-size: 48px;
            line-height: 1;
            margin-bottom: 16px;
            opacity: 0.85;
        }

        .empty-title {
            font-size: 17px;
            font-weight: 600;
            color: var(--text-color, #333);
            margin-bottom: 6px;
        }

        .empty-description {
            font-size: 14px;
            max-width: 340px;
            line-height: 1.5;
        }

        .empty-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 20px;
        }

        .cl-empty.size-sm { padding: 24px 16px; }
        .cl-empty.size-sm .empty-icon { font-size: 34px; margin-bottom: 10px; }
        .cl-empty.size-sm .empty-title { font-size: 15px; }

        .cl-empty.size-lg { padding: 64px 32px; }
        .cl-empty.size-lg .empty-icon { font-size: 64px; margin-bottom: 20px; }
        .cl-empty.size-lg .empty-title { font-size: 20px; }
    `
});
