/**
 * Tooltip - Tooltip component
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-tooltip', {
    props: {
        text: '',
        position: 'top' // 'top', 'bottom', 'left', 'right'
    },

    data() {
        return {
            visible: false
        };
    },

    methods: {
        show() {
            this.state.visible = true;
        },

        hide() {
            this.state.visible = false;
        }
    },

    template() {
        return html`
            <div class="cl-tooltip-wrapper">
                <div
                    class="tooltip-target"
                    on-mouseenter="show"
                    on-mouseleave="hide">
                    ${this.props.children}
                </div>
                ${when(this.state.visible && this.props.text, html`
                    <div class="tooltip-content ${this.props.position}">
                        ${this.props.text}
                        <div class="tooltip-arrow"></div>
                    </div>
                `)}
            </div>
        `;
    },

    styles: `
        :host {
            display: inline-block;
        }

        .cl-tooltip-wrapper {
            position: relative;
            display: inline-block;
        }

        .tooltip-target {
            display: inline-block;
        }

        .tooltip-content {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1300;
            pointer-events: none;
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .tooltip-content.top {
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
        }

        .tooltip-content.bottom {
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 8px;
        }

        .tooltip-content.left {
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-right: 8px;
        }

        .tooltip-content.right {
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-left: 8px;
        }

        .tooltip-arrow {
            position: absolute;
            width: 0;
            height: 0;
            border: 4px solid transparent;
        }

        .top .tooltip-arrow {
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-top-color: rgba(0, 0, 0, 0.9);
        }

        .bottom .tooltip-arrow {
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-bottom-color: rgba(0, 0, 0, 0.9);
        }

        .left .tooltip-arrow {
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-left-color: rgba(0, 0, 0, 0.9);
        }

        .right .tooltip-arrow {
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-right-color: rgba(0, 0, 0, 0.9);
        }
    `
});
