/**
 * Avatar - User avatar with image, initials fallback, and status dot.
 * Avatar Group - Overlapping stack of avatars with a "+N" overflow bubble.
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

const SIZE_MAP = { xs: 24, sm: 28, md: 40, lg: 56, xl: 80 };

function sizePx(size) {
    if (SIZE_MAP[size]) return SIZE_MAP[size];
    const n = parseInt(size, 10);
    return isNaN(n) ? SIZE_MAP.md : n;
}

function initialsFor(label) {
    const name = (label || '').trim();
    if (!name) return '';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic pleasant background from the label.
function colorFor(label) {
    let h = 0;
    for (let i = 0; i < (label || '').length; i++) {
        h = label.charCodeAt(i) + ((h << 5) - h);
    }
    return `hsl(${Math.abs(h) % 360}, 52%, 46%)`;
}

export default defineComponent('cl-avatar', {
    props: {
        src: '',
        label: '',                 // name -> initials + alt text
        size: 'md',                // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number(px)
        shape: 'circle',           // 'circle' | 'square'
        status: '',                // 'online' | 'offline' | 'busy' | 'away'
        color: '',                 // override background for initials
        icon: ''                   // fallback icon when no src/label
    },

    data() {
        return { imgFailed: false };
    },

    propsChanged(prop) {
        if (prop === 'src') this.state.imgFailed = false;
    },

    methods: {
        onImgError() {
            this.state.imgFailed = true;
        }
    },

    computed: {
        px() { return sizePx(this.props.size); },
        initials() { return initialsFor(this.props.label); },
        bg() { return this.props.color || colorFor(this.props.label || ''); }
    },

    template() {
        const px = this.px;
        const showImg = this.props.src && !this.state.imgFailed;
        const radius = this.props.shape === 'square' ? Math.round(px * 0.2) + 'px' : '50%';
        const fontSize = Math.round(px * 0.4);

        const style = `width:${px}px;height:${px}px;border-radius:${radius};`
            + (showImg ? '' : `background:${this.bg};font-size:${fontSize}px;`);

        return html`
            <span class="cl-avatar" style="${style}" title="${this.props.label}">
                ${when(showImg, html`
                    <img class="avatar-img" src="${this.props.src}" alt="${this.props.label}"
                         style="border-radius:${radius};" on-error="onImgError">
                `, html`
                    ${when(this.initials, html`<span class="avatar-initials">${this.initials}</span>`, html`
                        <span class="avatar-icon">${this.props.icon || '👤'}</span>
                    `)}
                `)}
                ${when(this.props.status, html`
                    <span class="avatar-status status-${this.props.status}"
                          style="width:${Math.max(6, Math.round(px * 0.28))}px;height:${Math.max(6, Math.round(px * 0.28))}px;"
                          title="${this.props.status}"></span>
                `)}
            </span>
        `;
    },

    styles: /*css*/`
        :host { display: inline-block; }

        .cl-avatar {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: 600;
            overflow: visible;
            user-select: none;
            vertical-align: middle;
            box-sizing: border-box;
        }

        .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .avatar-initials, .avatar-icon {
            line-height: 1;
        }

        .avatar-status {
            position: absolute;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            border: 2px solid var(--card-bg, #fff);
            box-sizing: content-box;
        }

        .status-online { background: #28a745; }
        .status-offline { background: #adb5bd; }
        .status-busy { background: #dc3545; }
        .status-away { background: #ffc107; }
    `
});

export const AvatarGroup = defineComponent('cl-avatar-group', {
    props: {
        avatars: [],       // array of { src, label, status, color }
        max: 0,            // 0 = show all; otherwise cap + show "+N"
        size: 'md',
        shape: 'circle'
    },

    computed: {
        visible() {
            const list = this.props.avatars || [];
            if (this.props.max > 0 && list.length > this.props.max) {
                return list.slice(0, this.props.max);
            }
            return list;
        },
        overflow() {
            const list = this.props.avatars || [];
            return (this.props.max > 0 && list.length > this.props.max)
                ? list.length - this.props.max : 0;
        }
    },

    template() {
        const px = sizePx(this.props.size);
        const overlap = Math.round(px * 0.32);
        const radius = this.props.shape === 'square' ? Math.round(px * 0.2) + 'px' : '50%';
        const fontSize = Math.round(px * 0.38);

        return html`
            <div class="cl-avatar-group">
                ${each(this.visible, (a, i) => html`
                    <span class="ag-item" style="margin-left:${i === 0 ? 0 : -overlap}px;">
                        <cl-avatar
                            src="${a.src || ''}"
                            label="${a.label || ''}"
                            status="${a.status || ''}"
                            color="${a.color || ''}"
                            size="${this.props.size}"
                            shape="${this.props.shape}">
                        </cl-avatar>
                    </span>
                `)}
                ${when(this.overflow > 0, html`
                    <span class="ag-item ag-overflow"
                          style="margin-left:${-overlap}px;width:${px}px;height:${px}px;border-radius:${radius};font-size:${fontSize}px;">
                        +${this.overflow}
                    </span>
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        :host { display: inline-block; }

        .cl-avatar-group {
            display: inline-flex;
            align-items: center;
        }

        .ag-item {
            display: inline-flex;
            border-radius: 50%;
            box-shadow: 0 0 0 2px var(--card-bg, #fff);
        }

        .ag-overflow {
            align-items: center;
            justify-content: center;
            background: var(--input-border, #ced4da);
            color: var(--text-color, #333);
            font-weight: 600;
            box-sizing: border-box;
        }
    `
});
