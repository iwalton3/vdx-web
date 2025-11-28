/**
 * ProgressBar - Progress indicator
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-progressbar', {
    props: {
        value: 0,
        showvalue: true,
        mode: 'determinate', // 'determinate' or 'indeterminate'
        color: ''
    },

    template() {
        const percentage = Math.min(100, Math.max(0, this.props.value));

        return html`
            <div class="cl-progressbar">
                <div class="progress-container">
                    ${when(this.props.mode === 'determinate', html`
                        <div
                            class="progress-bar"
                            style="width: ${percentage}%; ${this.props.color ? `background: ${this.props.color}` : ''}">
                        </div>
                    `, html`
                        <div class="progress-bar indeterminate"></div>
                    `)}
                </div>
                ${when(this.props.showvalue && this.props.mode === 'determinate', html`
                    <div class="progress-value">${percentage}%</div>
                `)}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-progressbar {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .progress-container {
            flex: 1;
            height: 20px;
            background: var(--input-border, #dee2e6);
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }

        .progress-bar {
            height: 100%;
            background: var(--primary-color, #007bff);
            border-radius: 10px;
            transition: width 0.3s ease;
        }

        .progress-bar.indeterminate {
            width: 30%;
            animation: indeterminate 1.5s ease-in-out infinite;
        }

        @keyframes indeterminate {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(400%);
            }
        }

        .progress-value {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color, #333);
            min-width: 45px;
            text-align: right;
        }
    `
});
