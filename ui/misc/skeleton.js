/**
 * Skeleton - Loading placeholder that mirrors the shape of pending content.
 */
import { defineComponent, html, each, Component } from '../../lib/framework.js';

export class ClSkeleton extends Component {
    static props = {
        variant: 'text',       // 'text' | 'rect' | 'circle'
        width: '',             // CSS length; defaults per variant
        height: '',            // CSS length; defaults per variant
        lines: 1,              // for variant="text": number of lines
        animation: 'wave',     // 'wave' | 'pulse' | 'none'
        radius: ''             // border-radius override
    }

    boxStyle(isLast, isText) {
        const w = this.props.width || (isText && isLast ? '60%' : '100%');
        const h = this.props.height
            || (this.props.variant === 'circle' ? '40px'
                : this.props.variant === 'rect' ? '120px' : '');
        let radius = this.props.radius;
        if (!radius) {
            radius = this.props.variant === 'circle' ? '50%'
                : this.props.variant === 'rect' ? '8px' : '4px';
        }
        let style = `border-radius:${radius};`;
        if (w) style += `width:${w};`;
        if (h) style += `height:${h};`;
        if (this.props.variant === 'circle' && !this.props.height) {
            style += `width:${this.props.width || '40px'};height:${this.props.width || '40px'};`;
        }
        return style;
    }

    template() {
        const anim = `anim-${this.props.animation}`;

        if (this.props.variant === 'text' && this.props.lines > 1) {
            const lines = Array.from({ length: this.props.lines }, (_, i) => i);
            return html`
                <div class="cl-skeleton-lines">
                    ${each(lines, i => html`
                        <span class="cl-skeleton text ${anim}"
                              style="${this.boxStyle(i === lines.length - 1, true)}"></span>
                    `)}
                </div>
            `;
        }

        return html`
            <span class="cl-skeleton ${this.props.variant} ${anim}"
                  style="${this.boxStyle(true, this.props.variant === 'text')}"></span>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }

        .cl-skeleton-lines {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .cl-skeleton {
            display: block;
            height: 1em;
            background: var(--skeleton-bg, #e9ecef);
            position: relative;
            overflow: hidden;
        }

        .cl-skeleton.text { height: 0.85em; }
        .cl-skeleton.circle { display: inline-block; }
        .cl-skeleton.rect { width: 100%; }

        /* Pulse */
        .anim-pulse {
            animation: cl-skeleton-pulse 1.4s ease-in-out infinite;
        }
        @keyframes cl-skeleton-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
        }

        /* Wave (shimmer) */
        .anim-wave::after {
            content: "";
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(90deg,
                transparent,
                var(--skeleton-shine, rgba(255, 255, 255, 0.6)),
                transparent);
            animation: cl-skeleton-wave 1.6s infinite;
        }
        @keyframes cl-skeleton-wave {
            100% { transform: translateX(100%); }
        }
    `
}

export default defineComponent('cl-skeleton', ClSkeleton);
