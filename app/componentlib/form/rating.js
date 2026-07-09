/**
 * Rating - Star rating input/display with hover preview and optional half steps.
 * x-model compatible (emits the numeric value).
 */
import { defineComponent, html, each } from '../../lib/framework.js';

export default defineComponent('cl-rating', {
    props: {
        value: 0,
        max: 5,
        precision: 1,        // 1 = whole stars, 0.5 = half stars
        readonly: false,
        disabled: false,
        icon: '★'
    },

    data() {
        return { internalValue: 0, hover: null };
    },

    mounted() {
        this.state.internalValue = Number(this.props.value) || 0;
    },

    propsChanged(prop, newValue) {
        if (prop === 'value') this.state.internalValue = Number(newValue) || 0;
    },

    methods: {
        interactive() {
            return !this.props.readonly && !this.props.disabled;
        },

        // value contributed by star `index` (1-based) given a half flag
        valueFor(index, half) {
            return (Number(this.props.precision) === 0.5 && half) ? index - 0.5 : index;
        },

        setHover(index, half) {
            if (!this.interactive()) return;
            this.state.hover = this.valueFor(index, half);
        },

        clearHover() {
            this.state.hover = null;
        },

        select(index, half) {
            if (!this.interactive()) return;
            const v = this.valueFor(index, half);
            // Clicking the current value again clears it.
            this.state.internalValue = (v === this.state.internalValue) ? 0 : v;
            this.emitChange(null, this.state.internalValue);
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true, composed: true, detail: { value: this.state.internalValue }
            }));
        }
    },

    computed: {
        stars() {
            return Array.from({ length: Math.max(1, Number(this.props.max) || 5) }, (_, i) => i + 1);
        },
        effective() {
            return this.state.hover != null ? this.state.hover : this.state.internalValue;
        }
    },

    template() {
        const eff = this.effective;
        const half = Number(this.props.precision) === 0.5;
        const classes = [
            'cl-rating',
            this.interactive() ? 'interactive' : 'static',
            this.props.disabled ? 'disabled' : ''
        ].filter(Boolean).join(' ');

        return html`
            <div class="${classes}" role="slider"
                 aria-valuenow="${this.state.internalValue}" aria-valuemax="${this.props.max}"
                 on-mouseleave="clearHover">
                ${each(this.stars, index => {
                    const fill = eff >= index ? 'full' : (eff >= index - 0.5 ? 'half' : 'empty');
                    return html`
                        <span class="star ${fill}">
                            <span class="star-bg">${this.props.icon}</span>
                            <span class="star-fill">${this.props.icon}</span>
                            ${half ? html`
                                <span class="hit hit-left"
                                      on-mouseenter="${() => this.setHover(index, true)}"
                                      on-click="${() => this.select(index, true)}"></span>
                                <span class="hit hit-right"
                                      on-mouseenter="${() => this.setHover(index, false)}"
                                      on-click="${() => this.select(index, false)}"></span>
                            ` : html`
                                <span class="hit hit-full"
                                      on-mouseenter="${() => this.setHover(index, false)}"
                                      on-click="${() => this.select(index, false)}"></span>
                            `}
                        </span>
                    `;
                }, index => index)}
            </div>
        `;
    },

    styles: /*css*/`
        :host { display: inline-block; }

        .cl-rating {
            display: inline-flex;
            gap: 2px;
            font-size: 24px;
            line-height: 1;
            color: var(--rating-empty, #d0d5dd);
        }

        .cl-rating.interactive .star { cursor: pointer; }
        .cl-rating.disabled { opacity: 0.6; }

        .star {
            position: relative;
            display: inline-block;
            width: 1em;
            height: 1em;
        }

        .star-bg, .star-fill {
            position: absolute;
            inset: 0;
        }

        .star-bg { color: var(--rating-empty, #d0d5dd); }

        .star-fill {
            color: var(--rating-color, #f5b301);
            width: 0;
            overflow: hidden;
        }

        .star.full .star-fill { width: 100%; }
        .star.half .star-fill { width: 50%; }

        /* Invisible click/hover hit zones sit on top of each star. */
        .hit {
            position: absolute;
            top: 0;
            bottom: 0;
            z-index: 1;
        }
        .hit-full { left: 0; right: 0; }
        .hit-left { left: 0; width: 50%; }
        .hit-right { right: 0; width: 50%; }
    `
});
