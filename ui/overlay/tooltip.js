/**
 * Tooltip - Tooltip component
 *
 * Accessibility features:
 * - role="tooltip" on tooltip element
 * - aria-describedby linking trigger to tooltip
 * - Shows on focus (not just hover)
 * - Escape key to dismiss
 * - Unique IDs for proper ARIA relationships
 */
import { defineComponent, html, when, Component } from '../../lib/framework.js';
import { createAnchoredOverlay } from '../../lib/overlay.js';

// Counter for unique IDs
let tooltipIdCounter = 0;

export class ClTooltip extends Component {
    static props = {
        text: '',
        position: 'top' // 'top', 'bottom', 'left', 'right'
    }

    constructor(props) {
        super(props);

        this.state = {
            visible: false,
            arrowSide: null,   // resolved (post-flip) side, drives the arrow direction
            tooltipId: `cl-tooltip-${++tooltipIdCounter}`
        };

        // Top-layer anchored overlay - escapes ancestor overflow/transform
        // clipping. Centered on the cross axis; arrow follows the flipped side.
        this._overlay = createAnchoredOverlay(this, {
            anchor: () => this.querySelector('.tooltip-target'),
            panel: () => this.querySelector('.tooltip-content'),
            placement: () => `${this.props.position}-center`,
            offset: 8,
            onReposition: (info) => { this.state.arrowSide = info.side; },
            onDismiss: () => this.hide()
        });
    }

    unmounted() {
        this._overlay.destroy();
    }

    async show() {
        this.state.visible = true;
        await this.nextRender();
        if (this.state.visible) this._overlay.open();
    }

    hide() {
        this._overlay.close();  // hidePopover before the branch unmounts
        this.state.visible = false;
    }

    template() {
        const tooltipContentId = `${this.state.tooltipId}-content`;

        return html`
            <div class="cl-tooltip-wrapper">
                <div
                    class="tooltip-target"
                    aria-describedby="${this.state.visible && this.props.text ? tooltipContentId : undefined}"
                    on-mouseenter="show"
                    on-mouseleave="hide"
                    on-focus="show"
                    on-blur="hide">
                    ${this.props.children}
                </div>
                ${when(this.state.visible && this.props.text, html`
                    <div class="tooltip-content ${this.state.arrowSide || this.props.position}"
                         popover="manual"
                         role="tooltip"
                         id="${tooltipContentId}">
                        ${this.props.text}
                        <div class="tooltip-arrow"></div>
                    </div>
                `)}
            </div>
        `;
    }

    static styles = /*css*/`
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
            /* Positioned by createAnchoredOverlay (top layer). inset/margin reset
               the UA popover defaults; placement is written inline. */
            inset: auto;
            margin: 0;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
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
}

export default defineComponent('cl-tooltip', ClTooltip);
