/**
 * WebGrep - Filter text lines using regex patterns
 * A browser-based grep tool
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('webgrep-page', {
    data() {
        return {
            filter: '',
            content: '',
            originalContent: '',
            matchCount: 0,
            totalLines: 0,
            regexError: ''
        };
    },

    methods: {
        updateFilter() {
            if (this.state.filter !== '') {
                try {
                    const re = new RegExp(this.state.filter, 'i');
                    this.state.regexError = '';
                    const lines = this.state.originalContent.split('\n');
                    const filtered = lines.filter(str => re.test(str));
                    this.state.content = filtered.join('\n');
                    this.state.matchCount = filtered.length;
                    this.state.totalLines = lines.length;
                } catch (e) {
                    this.state.regexError = 'Invalid regex: ' + e.message;
                }
            } else {
                this.state.content = this.state.originalContent;
                this.state.matchCount = 0;
                this.state.totalLines = 0;
                this.state.regexError = '';
            }
        },

        updateContent() {
            if (this.state.filter === '') {
                this.state.originalContent = this.state.content;
            }
        },

        handleFilterInput() {
            this.updateFilter();
        },

        handleContentInput() {
            this.updateContent();
        },

        clearFilter() {
            this.state.filter = '';
            this.state.content = this.state.originalContent;
            this.state.matchCount = 0;
            this.state.regexError = '';
        },

        clearAll() {
            this.state.filter = '';
            this.state.content = '';
            this.state.originalContent = '';
            this.state.matchCount = 0;
            this.state.totalLines = 0;
            this.state.regexError = '';
        }
    },

    template() {
        const isFiltering = this.state.filter !== '';

        return html`
            <div class="webgrep">
                <h1>Web Grep</h1>

                <div class="section">
                    <p>Filter text using regular expressions. Paste content below and use the filter box to search.</p>
                </div>

                <div class="filter-row">
                    <input
                        id="filter"
                        type="text"
                        x-model="filter"
                        on-input="handleFilterInput"
                        placeholder="Filter (regex supported)...">
                    <button on-click="clearFilter" disabled="${!isFiltering}">Clear Filter</button>
                    <button on-click="clearAll">Clear All</button>
                </div>

                ${when(this.state.regexError, html`
                    <div class="error">${this.state.regexError}</div>
                `)}

                ${when(isFiltering && !this.state.regexError, html`
                    <div class="status">
                        Showing ${this.state.matchCount} of ${this.state.totalLines} lines
                    </div>
                `)}

                <textarea
                    id="content"
                    x-model="content"
                    on-input="handleContentInput"
                    placeholder="Paste content to filter here..."
                    readonly="${isFiltering}"></textarea>

                <div class="section hints">
                    <h3>Regex Examples:</h3>
                    <ul>
                        <li><code>error</code> - Lines containing "error" (case-insensitive)</li>
                        <li><code>^ERROR</code> - Lines starting with "ERROR"</li>
                        <li><code>\\d{4}</code> - Lines containing 4 consecutive digits</li>
                        <li><code>foo|bar</code> - Lines containing "foo" or "bar"</li>
                    </ul>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .webgrep {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 200px);
            min-height: 400px;
        }

        .filter-row {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }

        .filter-row input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
        }

        .filter-row input:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .filter-row button {
            padding: 10px 20px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
            cursor: pointer;
            font-size: 14px;
        }

        .filter-row button:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }

        .filter-row button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .status {
            padding: 8px 12px;
            background: var(--info-bg, #e7f3ff);
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 14px;
            color: var(--info-text, #0066cc);
        }

        .error {
            padding: 8px 12px;
            background: var(--error-bg, #ffe7e7);
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 14px;
            color: var(--error-text, #dc3545);
        }

        textarea {
            flex: 1;
            width: 100%;
            padding: 12px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            resize: none;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
            box-sizing: border-box;
        }

        textarea:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
        }

        textarea[readonly] {
            background-color: var(--input-readonly-bg, #f5f5f5);
        }

        .hints {
            margin-top: 15px;
            flex-shrink: 0;
        }

        .hints h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: var(--text-muted, #6c757d);
        }

        .hints ul {
            margin: 0;
            padding-left: 20px;
        }

        .hints li {
            margin-bottom: 5px;
            font-size: 13px;
            color: var(--text-muted, #6c757d);
        }

        .hints code {
            background: var(--code-bg, #f0f0f0);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    `
});
