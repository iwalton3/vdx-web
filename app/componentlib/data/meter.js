/**
 * Meter - Dashboard gauge for a single value within a range. Renders as a
 * linear bar or a radial ring, colouring itself by threshold as the value rises.
 *
 *   <cl-meter value="72" unit="%" label="CPU"
 *       thresholds="${[{ value: 70, color: '#f5b301' }, { value: 90, color: '#dc3545' }]}">
 *   </cl-meter>
 */
import { defineComponent, html, when, each, Component } from '../../lib/framework.js';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export class ClMeter extends Component {
    static props = {
        value: 0,
        min: 0,
        max: 100,
        variant: 'linear',   // 'linear' | 'radial'
        label: '',
        unit: '',
        showValue: true,
        color: '',           // fixed colour override (ignores thresholds)
        thresholds: [],      // [{ value, color }] lower-bounds where the colour switches
        size: 120            // radial diameter in px
    }

    get fraction() {
        const min = Number(this.props.min), max = Number(this.props.max);
        const span = max - min;
        if (!span) return 0;
        return Math.min(1, Math.max(0, (Number(this.props.value) - min) / span));
    }

    get percent() {
        return Math.round(this.fraction * 100);
    }

    get activeColor() {
        if (this.props.color) return this.props.color;
        const th = [...(this.props.thresholds || [])].sort((a, b) => a.value - b.value);
        let color = 'var(--primary-color, #007bff)';
        for (const t of th) {
            if (Number(this.props.value) >= t.value) color = t.color;
        }
        return color;
    }

    template() {
        const valueText = `${this.props.value}${this.props.unit}`;

        if (this.props.variant === 'radial') {
            const offset = CIRCUMFERENCE * (1 - this.fraction);
            const size = this.props.size;
            return html`
                <div class="cl-meter radial" style="width:${size}px;height:${size}px;">
                    <svg viewBox="0 0 100 100" class="meter-svg">
                        <circle class="meter-ring-bg" cx="50" cy="50" r="${RADIUS}"></circle>
                        <circle class="meter-ring-fg" cx="50" cy="50" r="${RADIUS}"
                                stroke="${this.activeColor}"
                                stroke-dasharray="${CIRCUMFERENCE}"
                                stroke-dashoffset="${offset}"
                                transform="rotate(-90 50 50)"></circle>
                    </svg>
                    <div class="meter-center">
                        ${when(this.props.showValue, html`<div class="meter-value">${valueText}</div>`)}
                        ${when(this.props.label, html`<div class="meter-label">${this.props.label}</div>`)}
                    </div>
                </div>
            `;
        }

        // Linear
        const min = Number(this.props.min), max = Number(this.props.max);
        const span = max - min || 1;
        return html`
            <div class="cl-meter linear">
                ${when(this.props.label || this.props.showValue, html`
                    <div class="meter-head">
                        <span class="meter-label">${this.props.label}</span>
                        ${when(this.props.showValue, html`<span class="meter-value">${valueText}</span>`)}
                    </div>
                `)}
                <div class="meter-track" role="meter"
                     aria-valuenow="${this.props.value}" aria-valuemin="${this.props.min}" aria-valuemax="${this.props.max}">
                    <div class="meter-fill" style="width:${this.percent}%;background:${this.activeColor};"></div>
                    ${each(this.props.thresholds || [], t => {
                        const pos = Math.min(100, Math.max(0, ((t.value - min) / span) * 100));
                        return html`<span class="meter-tick" style="left:${pos}%;" title="${t.value}"></span>`;
                    })}
                </div>
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }

        /* Linear */
        .cl-meter.linear { display: flex; flex-direction: column; gap: 6px; }

        .meter-head {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 13px;
        }
        .meter-head .meter-label { color: var(--text-muted, #6c757d); }
        .meter-head .meter-value { font-weight: 600; color: var(--text-color, #333); }

        .meter-track {
            position: relative;
            height: 10px;
            background: var(--input-border, #e9ecef);
            border-radius: 6px;
            overflow: hidden;
        }

        .meter-fill {
            height: 100%;
            border-radius: 6px;
            transition: width 0.35s ease, background 0.35s ease;
        }

        .meter-tick {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--card-bg, #fff);
            opacity: 0.7;
            transform: translateX(-1px);
        }

        /* Radial */
        .cl-meter.radial {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .meter-svg { width: 100%; height: 100%; transform: rotate(0deg); }

        .meter-ring-bg {
            fill: none;
            stroke: var(--input-border, #e9ecef);
            stroke-width: 9;
        }

        .meter-ring-fg {
            fill: none;
            stroke-width: 9;
            stroke-linecap: round;
            transition: stroke-dashoffset 0.4s ease, stroke 0.4s ease;
        }

        .meter-center {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .meter-center .meter-value {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-color, #333);
            line-height: 1.1;
        }

        .meter-center .meter-label {
            font-size: 12px;
            color: var(--text-muted, #6c757d);
        }
    `
}

export default defineComponent('cl-meter', ClMeter);
