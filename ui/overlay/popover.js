/**
 * Popover - Click- or hover-triggered panel anchored to a trigger element,
 * holding arbitrary content. Distinct from Tooltip (hover + text only).
 *
 *   <cl-popover position="bottom">
 *       <cl-button label="Open"></cl-button>            <!-- trigger (default children) -->
 *       <div slot="content">...anything...</div>        <!-- panel body -->
 *   </cl-popover>
 *
 * Public methods: show(), hide(), toggle().
 * Emits 'popover-toggle' with detail { open }.
 */
import { defineComponent, html, when, Component } from '../../lib/framework.js';
import { createAnchoredOverlay } from '../../lib/overlay.js';

/**
 * @fires popover-toggle - detail: { open }
 */
export class ClPopover extends Component {
    static props = {
        position: 'bottom',   // 'top' | 'bottom' | 'left' | 'right'
        align: 'center',      // for top/bottom: 'start' | 'center' | 'end'
        trigger: 'click',     // 'click' | 'hover'
        closeOnContentClick: false,
        disabled: false
    }

    constructor(props) {
        super(props);

        this.state = { open: false };

        // Top-layer anchored overlay - escapes ancestor overflow/transform
        // clipping and owns outside-click + Escape dismissal.
        this._overlay = createAnchoredOverlay(this, {
            anchor: () => this.querySelector('.popover-trigger'),
            panel: () => this.querySelector('.popover-panel'),
            placement: () => `${this.props.position}-${this.props.align}`,
            offset: 8,
            onDismiss: () => this.hide()
        });
    }

    unmounted() {
        this._overlay.destroy();
        if (this._leaveTimer) clearTimeout(this._leaveTimer);
    }

    async show() {
        if (this.props.disabled || this.state.open) return;
        this.state.open = true;
        this._emit();
        await this.nextRender();
        if (this.state.open) this._overlay.open();
    }

    hide() {
        if (!this.state.open) return;
        this._overlay.close();  // hidePopover before the branch unmounts
        this.state.open = false;
        this._emit();
    }

    toggle() {
        this.state.open ? this.hide() : this.show();
    }

    onTriggerClick() {
        if (this.props.trigger === 'click') this.toggle();
    }

    onEnter() {
        if (this.props.trigger !== 'hover') return;
        if (this._leaveTimer) clearTimeout(this._leaveTimer);
        this.show();
    }

    onLeave() {
        if (this.props.trigger !== 'hover') return;
        // Small grace period so moving into the panel doesn't close it.
        this._leaveTimer = setTimeout(() => this.hide(), 120);
    }

    onContentClick() {
        if (this.props.closeOnContentClick) this.hide();
    }

    _emit() {
        this.dispatchEvent(new CustomEvent('popover-toggle', {
            detail: { open: this.state.open }, bubbles: true, composed: true
        }));
    }

    template() {
        const content = (this.props.slots && this.props.slots.content) || [];

        return html`
            <div
                class="cl-popover-wrapper"
                on-mouseenter="onEnter"
                on-mouseleave="onLeave">
                <div class="popover-trigger" on-click="onTriggerClick">
                    ${this.props.children}
                </div>
                ${when(this.state.open, html`
                    <div class="popover-panel" popover="manual" role="dialog" on-click="onContentClick">
                        ${content}
                    </div>
                `)}
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: inline-block; }

        .cl-popover-wrapper {
            position: relative;
            display: inline-block;
        }

        .popover-trigger { display: inline-block; }

        .popover-panel {
            /* Positioned by createAnchoredOverlay (top layer). inset/margin reset
               the UA popover defaults; placement is written inline. */
            inset: auto;
            margin: 0;
            color: inherit;   /* UA [popover] forces color:CanvasText; keep theme (dark mode) */
            box-sizing: border-box;
            min-width: 160px;
            background: var(--card-bg, #fff);
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            padding: 12px;
            animation: cl-popover-in 0.14s ease-out;
        }

        @keyframes cl-popover-in {
            from { opacity: 0; transform: translateY(-2px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `
}

export default defineComponent('cl-popover', ClPopover);
