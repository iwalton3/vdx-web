/**
 * Fast Link - Quick URL sharing
 * Uses QNote backend with name "fl" for simple link storage
 */
import { defineComponent, html, when } from '../../lib/framework.js';
import { notify } from '../../lib/utils.js';

const RW_API = '/theme/rw.php';

export default defineComponent('fastlink-page', {
    data() {
        return {
            currentLink: '',
            newLink: '',
            loading: true,
            saving: false
        };
    },

    async mounted() {
        await this.loadLink();
    },

    methods: {
        async loadLink() {
            this.state.loading = true;
            try {
                const response = await fetch(`${RW_API}?name=fl`);
                const link = await response.text();
                this.state.currentLink = link.trim();
            } catch (error) {
                console.error('Failed to load link:', error);
                notify('Failed to load link', 'error');
            }
            this.state.loading = false;
        },

        async saveLink() {
            if (!this.state.newLink.trim()) {
                notify('Please enter a URL', 'error');
                return;
            }

            this.state.saving = true;
            try {
                const formData = new FormData();
                formData.append('name', 'fl');
                formData.append('content', this.state.newLink.trim());

                const response = await fetch(RW_API, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.text();
                if (result.includes('Saved')) {
                    this.state.currentLink = this.state.newLink.trim();
                    this.state.newLink = '';
                    notify('Link saved!');
                } else {
                    notify('Failed to save link', 'error');
                }
            } catch (error) {
                console.error('Failed to save link:', error);
                notify('Failed to save link', 'error');
            }
            this.state.saving = false;
        },

        async clearLink() {
            this.state.saving = true;
            try {
                const formData = new FormData();
                formData.append('name', 'fl');
                formData.append('content', '');

                const response = await fetch(RW_API, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.text();
                if (result.includes('Saved')) {
                    this.state.currentLink = '';
                    notify('Link cleared');
                } else {
                    notify('Failed to clear link', 'error');
                }
            } catch (error) {
                console.error('Failed to clear link:', error);
                notify('Failed to clear link', 'error');
            }
            this.state.saving = false;
        },

        async copyLink() {
            if (this.state.currentLink) {
                try {
                    await navigator.clipboard.writeText(this.state.currentLink);
                    notify('Link copied to clipboard!');
                } catch (e) {
                    // Fallback
                    const input = document.createElement('input');
                    input.value = this.state.currentLink;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    notify('Link copied to clipboard!');
                }
            }
        },

        handleSubmit(e) {
            e.preventDefault();
            this.saveLink();
        }
    },

    template() {
        return html`
            <div class="fastlink">
                <h1>Fast Link</h1>

                ${when(this.state.loading, html`
                    <div class="loading">Loading...</div>
                `)}

                ${when(!this.state.loading, html`
                    <div class="current-link">
                        <h3>Current Link</h3>
                        ${when(this.state.currentLink, html`
                            <div class="link-display">
                                <a href="${this.state.currentLink}" target="_blank" rel="noopener noreferrer">
                                    ${this.state.currentLink}
                                </a>
                            </div>
                            <div class="link-actions">
                                <button on-click="copyLink">Copy</button>
                                <button on-click="clearLink" class="danger" disabled="${this.state.saving}">
                                    ${this.state.saving ? 'Clearing...' : 'Clear'}
                                </button>
                            </div>
                        `, html`
                            <p class="empty">No link currently stored</p>
                        `)}
                    </div>

                    <div class="new-link">
                        <h3>Save New Link</h3>
                        <form on-submit-prevent="handleSubmit">
                            <input
                                type="url"
                                x-model="newLink"
                                placeholder="https://example.com"
                                disabled="${this.state.saving}">
                            <button type="submit" disabled="${this.state.saving || !this.state.newLink.trim()}">
                                ${this.state.saving ? 'Saving...' : 'Save'}
                            </button>
                        </form>
                    </div>
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        .fastlink {
            max-width: 600px;
        }

        .loading {
            padding: 20px;
            text-align: center;
            color: var(--text-muted);
        }

        .current-link {
            background: var(--card-bg);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .current-link h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
        }

        .link-display {
            padding: 15px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            word-break: break-all;
            margin-bottom: 15px;
        }

        .link-display a {
            color: var(--link-color);
            text-decoration: none;
        }

        .link-display a:hover {
            text-decoration: underline;
        }

        .link-actions {
            display: flex;
            gap: 10px;
        }

        .link-actions button {
            padding: 8px 16px;
            border: 1px solid var(--input-border);
            border-radius: 4px;
            background-color: var(--input-bg);
            color: var(--input-text);
            cursor: pointer;
            font-size: 14px;
        }

        .link-actions button:hover:not(:disabled) {
            background-color: var(--input-hover-bg);
        }

        .link-actions button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .link-actions button.danger {
            color: #dc3545;
            border-color: #dc3545;
        }

        .link-actions button.danger:hover:not(:disabled) {
            background-color: #dc3545;
            color: white;
        }

        .empty {
            color: var(--text-muted);
            font-style: italic;
        }

        .new-link {
            background: var(--card-bg);
            border-radius: 8px;
            padding: 20px;
        }

        .new-link h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
        }

        .new-link form {
            display: flex;
            gap: 10px;
        }

        .new-link input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--input-border);
            border-radius: 4px;
            font-size: 14px;
            background-color: var(--input-bg);
            color: var(--input-text);
        }

        .new-link input:focus {
            outline: none;
            border-color: var(--input-focus-border);
        }

        .new-link input:disabled {
            background-color: var(--input-disabled-bg);
        }

        .new-link button {
            padding: 10px 20px;
            border: 1px solid var(--primary-color);
            border-radius: 4px;
            background-color: var(--primary-color);
            color: white;
            cursor: pointer;
            font-size: 14px;
        }

        .new-link button:hover:not(:disabled) {
            background-color: var(--primary-hover);
        }

        .new-link button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `
});
