/**
 * cl-error-boundary - Pre-styled error display component
 *
 * Use this component in your renderError() handlers to show
 * user-friendly error messages that match the componentlib style.
 *
 * @example
 * defineComponent('my-component', {
 *     renderError(error) {
 *         return html`
 *             <cl-error-boundary
 *                 error="${error}"
 *                 title="Failed to load"
 *                 onRetry="${() => this.reload()}">
 *             </cl-error-boundary>
 *         `;
 *     }
 * });
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-error-boundary', {
    props: {
        // Error object or message string
        error: null,
        // Custom title (defaults to "Something went wrong")
        title: 'Something went wrong',
        // Show error details (message, stack) - useful for dev mode
        showDetails: false,
        // Show retry button
        showRetry: false,
        // Compact mode (less padding, smaller text)
        compact: false,
        // Retry callback function (auto-shows retry button if provided)
        onRetry: null
    },

    methods: {
        handleRetry() {
            // Call the callback if provided
            if (this.props.onRetry) {
                this.props.onRetry();
            }
            // Also dispatch event for event listeners
            this.dispatchEvent(new CustomEvent('retry', {
                bubbles: true,
                composed: true
            }));
        },

        getErrorMessage() {
            const err = this.props.error;
            if (!err) return 'An unexpected error occurred';
            if (typeof err === 'string') return err;
            if (err.message) return err.message;
            return String(err);
        },

        getErrorStack() {
            const err = this.props.error;
            if (err && err.stack) {
                // Clean up stack trace for display
                return err.stack
                    .split('\n')
                    .slice(1, 6) // First 5 stack frames
                    .map(line => line.trim())
                    .join('\n');
            }
            return null;
        }
    },

    template() {
        const message = this.getErrorMessage();
        const stack = this.props.showDetails ? this.getErrorStack() : null;
        const compactClass = this.props.compact ? 'compact' : '';
        // Show retry if explicitly set OR if onRetry callback provided
        const showRetryBtn = this.props.showRetry || this.props.onRetry;

        return html`
            <div class="error-boundary ${compactClass}">
                <div class="error-icon">×</div>
                <div class="error-content">
                    <h4 class="error-title">${this.props.title}</h4>
                    <p class="error-message">${message}</p>
                    ${when(stack, html`
                        <pre class="error-stack">${stack}</pre>
                    `)}
                    ${when(showRetryBtn, html`
                        <button class="retry-btn" on-click="handleRetry">
                            Try Again
                        </button>
                    `)}
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .error-boundary {
            display: flex;
            gap: 16px;
            padding: 20px;
            background: var(--error-bg, #fef2f2);
            border: 1px solid var(--error-border, #fecaca);
            border-radius: 8px;
            color: var(--error-text, #991b1b);
        }

        .error-boundary.compact {
            gap: 12px;
            padding: 12px 16px;
        }

        .error-icon {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--error-color, #dc2626);
            color: white;
            border-radius: 50%;
            font-size: 24px;
            font-weight: 400;
            line-height: 1;
        }

        .compact .error-icon {
            width: 32px;
            height: 32px;
            font-size: 20px;
        }

        .error-content {
            flex: 1;
            min-width: 0;
        }

        .error-title {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--error-title, var(--error-text, #7f1d1d));
        }

        .compact .error-title {
            font-size: 14px;
        }

        .error-message {
            margin: 0;
            font-size: 14px;
            color: var(--error-text, #991b1b);
            line-height: 1.5;
        }

        .compact .error-message {
            font-size: 13px;
        }

        .error-stack {
            margin: 12px 0 0 0;
            padding: 12px;
            background: var(--error-stack-bg, rgba(0, 0, 0, 0.05));
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            line-height: 1.5;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
            color: var(--error-text, #7f1d1d);
        }

        .retry-btn {
            margin-top: 12px;
            padding: 8px 16px;
            background: var(--error-color, #dc2626);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
        }

        .retry-btn:hover {
            opacity: 0.9;
        }

        .retry-btn:active {
            transform: scale(0.98);
        }

        .compact .retry-btn {
            margin-top: 8px;
            padding: 6px 12px;
            font-size: 13px;
        }
    `
});
