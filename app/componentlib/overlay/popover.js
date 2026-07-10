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
    }

    mounted() {
        this._onKey = (e) => {
            if (e.key === 'Escape' && this.state.open) this.hide();
        };
        document.addEventListener('keydown', this._onKey);
    }

    unmounted() {
        document.removeEventListener('keydown', this._onKey);
        if (this._leaveTimer) clearTimeout(this._leaveTimer);
    }

    show() {
        if (this.props.disabled || this.state.open) return;
        this.state.open = true;
        this._emit();
    }

    hide() {
        if (!this.state.open) return;
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
        const panelClasses = `popover-panel pos-${this.props.position} align-${this.props.align}`;

        return html`
            <div
                class="cl-popover-wrapper"
                on-click-outside="hide"
                on-mouseenter="onEnter"
                on-mouseleave="onLeave">
                <div class="popover-trigger" on-click="onTriggerClick">
                    ${this.props.children}
                </div>
                ${when(this.state.open, html`
                    <div class="${panelClasses}" role="dialog" on-click="onContentClick">
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
            position: absolute;
            z-index: 1250;
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

        /* Centered panels position via translateX(-50%); the entry animation must
           keep that offset or the panel jumps to center only after it finishes. */
        @keyframes cl-popover-in-center {
            from { opacity: 0; transform: translate(-50%, -2px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }

        /* Vertical placement */
        .pos-bottom { top: 100%; margin-top: 8px; }
        .pos-top { bottom: 100%; margin-bottom: 8px; }

        .pos-bottom.align-start, .pos-top.align-start { left: 0; }
        .pos-bottom.align-end, .pos-top.align-end { right: 0; }
        .pos-bottom.align-center, .pos-top.align-center {
            left: 50%;
            transform: translateX(-50%);
            animation-name: cl-popover-in-center;
        }

        /* Horizontal placement */
        .pos-right { left: 100%; top: 0; margin-left: 8px; }
        .pos-left { right: 100%; top: 0; margin-right: 8px; }
    `
}

export default defineComponent('cl-popover', ClPopover);
