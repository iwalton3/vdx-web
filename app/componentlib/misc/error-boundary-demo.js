/**
 * Error Boundary Demo - Shows cl-error-boundary in action
 */
import { defineComponent, html, when } from '../../lib/framework.js';
import './error-boundary.js';

/**
 * Demo component that can intentionally throw an error
 */
defineComponent('cl-error-demo-content', {
    props: {
        shouldError: false
    },

    template() {
        if (this.props.shouldError) {
            throw new Error('Component failed to render: data is undefined');
        }

        return html`
            <div class="content-box">
                <p>Content rendered successfully!</p>
                <p class="hint">Click "Trigger Error" to see the error boundary in action.</p>
            </div>
        `;
    },

    // Use cl-error-boundary for pre-styled error display
    // Note: We use showRetry="true" and let the parent listen for the 'retry' event
    // (props may not be fully available when renderError is called during a throw)
    renderError(error) {
        return html`
            <cl-error-boundary
                error="${error}"
                title="Render Failed"
                showDetails="true"
                showRetry="true">
            </cl-error-boundary>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .content-box {
            padding: 16px;
            background: var(--success-bg, #d4edda);
            border: 1px solid var(--success-color, #28a745);
            border-radius: 6px;
            color: var(--success-text, #155724);
        }

        .content-box p {
            margin: 0;
        }

        .content-box .hint {
            margin-top: 8px;
            font-size: 13px;
            opacity: 0.8;
        }
    `
});

/**
 * Error Boundary Demo Wrapper - Interactive demo of cl-error-boundary
 */
export default defineComponent('cl-error-boundary-demo', {
    data() {
        return {
            hasError: false
        };
    },

    mounted() {
        // Listen for retry events bubbling up from cl-error-boundary
        this.addEventListener('retry', () => {
            this.state.hasError = false;
        });
    },

    methods: {
        triggerError() {
            this.state.hasError = true;
        },

        resetError() {
            this.state.hasError = false;
        }
    },

    template() {
        return html`
            <div class="demo-container">
                <div class="demo-header">
                    <h4>Error Boundary Demo</h4>
                    <div class="button-group">
                        ${when(!this.state.hasError,
                            html`<button class="trigger-btn" on-click="triggerError">Trigger Error</button>`,
                            html`<button class="reset-btn" on-click="resetError">Reset</button>`
                        )}
                    </div>
                </div>

                <div class="demo-content">
                    <cl-error-demo-content
                        shouldError="${this.state.hasError}">
                    </cl-error-demo-content>
                </div>

                <div class="demo-footer">
                    Use <code>cl-error-boundary</code> in your <code>renderError()</code> handlers for pre-styled error display.
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .demo-container {
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            overflow: hidden;
            background: var(--card-bg, white);
        }

        .demo-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--hover-bg, #f8f9fa);
            border-bottom: 1px solid var(--border-color, #dee2e6);
        }

        .demo-header h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color, #212529);
        }

        .button-group {
            display: flex;
            gap: 8px;
        }

        .trigger-btn, .reset-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .trigger-btn {
            background: var(--error-color, #dc3545);
            color: white;
        }

        .trigger-btn:hover {
            opacity: 0.9;
        }

        .reset-btn {
            background: var(--primary-color, #007bff);
            color: white;
        }

        .reset-btn:hover {
            opacity: 0.9;
        }

        .demo-content {
            padding: 16px;
            background: var(--card-bg, #ffffff);
        }

        .demo-footer {
            padding: 12px 16px;
            background: var(--hover-bg, #f4f4f4);
            border-top: 1px solid var(--border-color, #dee2e6);
            font-size: 13px;
            color: var(--text-muted, #6c757d);
        }

        .demo-footer code {
            background: var(--disabled-bg, #e9ecef);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    `
});
