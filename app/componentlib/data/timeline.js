/**
 * Timeline - Vertical sequence of events with markers and a connecting line.
 * Data-driven: items = [{ title, description, time, icon, color, status }].
 */
import { defineComponent, html, when, each, Component } from '../../lib/framework.js';

export class ClTimeline extends Component {
    static props = {
        items: [],
        align: 'left'   // 'left' | 'alternate'
    }

    template() {
        const items = this.props.items || [];
        const classes = `cl-timeline align-${this.props.align}`;

        return html`
            <div class="${classes}">
                ${each(items, (item, i) => {
                    const side = this.props.align === 'alternate'
                        ? (i % 2 === 0 ? 'side-left' : 'side-right') : 'side-left';
                    const markerStyle = item.color ? `border-color:${item.color};color:${item.color};` : '';
                    return html`
                        <div class="tl-item ${side} ${item.status ? 'status-' + item.status : ''}">
                            <div class="tl-marker" style="${markerStyle}">
                                ${when(item.icon, html`<span class="tl-icon">${item.icon}</span>`)}
                            </div>
                            <div class="tl-content">
                                ${when(item.time, html`<div class="tl-time">${item.time}</div>`)}
                                ${when(item.title, html`<div class="tl-title">${item.title}</div>`)}
                                ${when(item.description, html`<div class="tl-desc">${item.description}</div>`)}
                            </div>
                        </div>
                    `;
                }, (item, i) => item.id != null ? item.id : i)}
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }

        .cl-timeline {
            position: relative;
            padding: 4px 0;
        }

        .tl-item {
            position: relative;
            display: grid;
            grid-template-columns: 24px 1fr;
            gap: 12px;
            padding-bottom: 24px;
        }

        .tl-item:last-child { padding-bottom: 0; }

        /* Connecting line runs through the marker column. */
        .tl-item::before {
            content: "";
            position: absolute;
            left: 11px;
            top: 20px;
            bottom: -4px;
            width: 2px;
            background: var(--input-border, #dee2e6);
        }
        .tl-item:last-child::before { display: none; }

        .tl-marker {
            position: relative;
            z-index: 1;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--card-bg, #fff);
            border: 2px solid var(--primary-color, #007bff);
            color: var(--primary-color, #007bff);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            box-sizing: border-box;
        }

        .status-success .tl-marker { border-color: #28a745; color: #28a745; }
        .status-warning .tl-marker { border-color: #ffc107; color: #ffc107; }
        .status-error .tl-marker { border-color: #dc3545; color: #dc3545; }
        .status-muted .tl-marker { border-color: var(--text-muted, #adb5bd); color: var(--text-muted, #adb5bd); }

        .tl-content { padding-top: 0; min-width: 0; }

        .tl-time {
            font-size: 12px;
            color: var(--text-muted, #6c757d);
            margin-bottom: 2px;
        }

        .tl-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-color, #333);
        }

        .tl-desc {
            font-size: 14px;
            color: var(--text-muted, #6c757d);
            line-height: 1.5;
            margin-top: 2px;
        }

        /* Alternate layout on wider screens */
        .align-alternate .tl-item {
            grid-template-columns: 1fr 24px 1fr;
        }
        .align-alternate .tl-marker { grid-column: 2; }
        .align-alternate .tl-item::before { left: 50%; transform: translateX(-50%); }
        .align-alternate .side-left .tl-content { grid-column: 1; text-align: right; }
        .align-alternate .side-right .tl-content { grid-column: 3; }

        @media (max-width: 640px) {
            .align-alternate .tl-item { grid-template-columns: 24px 1fr; }
            .align-alternate .tl-marker { grid-column: 1; }
            .align-alternate .tl-item::before { left: 11px; transform: none; }
            .align-alternate .side-left .tl-content,
            .align-alternate .side-right .tl-content { grid-column: 2; text-align: left; }
        }
    `
}

export default defineComponent('cl-timeline', ClTimeline);
