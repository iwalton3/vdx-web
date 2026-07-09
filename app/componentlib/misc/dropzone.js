/**
 * DropZone - Drag & drop (and paste, and click-to-browse) file target.
 *
 * A focused capture surface: it collects files from a drag/drop, a paste, or a
 * native file dialog, validates them against `accept` / `maxfilesize`, and emits
 * the accepted and rejected sets. It deliberately does NOT keep a file list of
 * its own - pair it with cl-fileupload (which composes it) or handle `select`
 * yourself.
 *
 * Events:
 *   select  detail: { files: File[] }                 - accepted files
 *   reject  detail: { files: [{ file, reason }] }      - reason: 'size' | 'type'
 *   change  detail: { value: File[] }                  - accepted files (on-change)
 */
import { defineComponent, html, when } from '../../lib/framework.js';

// Parse an `accept` string ("image/*,.pdf,text/plain") into matcher tokens.
function parseAccept(accept) {
    if (!accept) return [];
    return accept
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
}

function fileMatchesAccept(matchers, file) {
    if (matchers.length === 0) return true;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    return matchers.some(token => {
        if (token.startsWith('.')) {
            return name.endsWith(token);               // extension, e.g. ".pdf"
        }
        if (token.endsWith('/*')) {
            return type.startsWith(token.slice(0, -1)); // wildcard mime, e.g. "image/"
        }
        return type === token;                          // exact mime
    });
}

/**
 * Pure validation shared by cl-dropzone and cl-fileupload so the accept/size
 * rules live in exactly one place.
 * @returns { accepted: File[], rejected: [{ file, reason }] }
 */
export function filterFiles(fileList, { accept = '', maxSize = 0, multiple = true } = {}) {
    const files = Array.from(fileList || []);
    const matchers = parseAccept(accept);
    const accepted = [];
    const rejected = [];

    for (const file of files) {
        if (maxSize && file.size > maxSize) {
            rejected.push({ file, reason: 'size' });
        } else if (!fileMatchesAccept(matchers, file)) {
            rejected.push({ file, reason: 'type' });
        } else {
            accepted.push(file);
        }
    }

    return {
        accepted: multiple ? accepted : accepted.slice(0, 1),
        rejected
    };
}

export default defineComponent('cl-dropzone', {
    props: {
        multiple: false,
        accept: '',
        maxfilesize: 0,        // bytes; 0 = no limit
        disabled: false,
        paste: false,          // capture pasted files while focused
        label: 'Drag & drop files here',
        hint: 'or click to browse',
        icon: ''               // custom icon (emoji/text); default is a cloud SVG
    },

    data() {
        return { dragging: false };
    },

    methods: {
        // --- click / keyboard to open the native picker ---
        openBrowse(e) {
            if (this.props.disabled) return;
            // Ignore the click that the programmatic input.click() bubbles back
            // up to the zone, otherwise we'd re-open the dialog in a loop.
            if (e && e.target && e.target.tagName === 'INPUT') return;
            this.refs.input.click();
        },

        onKeydown(e) {
            if (this.props.disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.refs.input.click();
            }
        },

        onInputChange(e) {
            this.process(e.target.files);
            e.target.value = ''; // allow re-selecting the same file
        },

        // --- drag & drop ---
        // A depth counter tolerates dragenter/dragleave firing for child nodes.
        onDragEnter() {
            if (this.props.disabled) return;
            this._dragDepth = (this._dragDepth || 0) + 1;
            this.state.dragging = true;
        },

        onDragOver() {
            // Handler exists so on-dragover-prevent keeps the drop target valid.
            if (this.props.disabled) return;
            this.state.dragging = true;
        },

        onDragLeave() {
            this._dragDepth = (this._dragDepth || 1) - 1;
            if (this._dragDepth <= 0) {
                this._dragDepth = 0;
                this.state.dragging = false;
            }
        },

        onDrop(e) {
            this._dragDepth = 0;
            this.state.dragging = false;
            if (this.props.disabled) return;
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length) {
                this.process(dt.files);
            }
        },

        // --- paste ---
        onPaste(e) {
            if (this.props.disabled || !this.props.paste) return;
            const files = e.clipboardData && e.clipboardData.files;
            if (files && files.length) {
                e.preventDefault();
                this.process(files);
            }
        },

        process(fileList) {
            const { accepted, rejected } = filterFiles(fileList, {
                accept: this.props.accept,
                maxSize: this.props.maxfilesize,
                multiple: this.props.multiple
            });

            if (rejected.length) {
                this.dispatchEvent(new CustomEvent('reject', {
                    detail: { files: rejected }, bubbles: true, composed: true
                }));
            }
            if (accepted.length) {
                this.dispatchEvent(new CustomEvent('select', {
                    detail: { files: accepted }, bubbles: true, composed: true
                }));
                this.emitChange(null, accepted);
            }
        }
    },

    template() {
        const classes = [
            'cl-dropzone',
            this.state.dragging ? 'dragging' : '',
            this.props.disabled ? 'disabled' : ''
        ].filter(Boolean).join(' ');

        return html`
            <div
                class="${classes}"
                role="button"
                tabindex="${this.props.disabled ? -1 : 0}"
                aria-disabled="${this.props.disabled ? 'true' : 'false'}"
                on-click="openBrowse"
                on-keydown="onKeydown"
                on-paste="onPaste"
                on-dragenter-prevent="onDragEnter"
                on-dragover-prevent="onDragOver"
                on-dragleave="onDragLeave"
                on-drop-prevent="onDrop">
                <input
                    ref="input"
                    class="dz-input"
                    type="file"
                    multiple="${this.props.multiple}"
                    accept="${this.props.accept}"
                    disabled="${this.props.disabled}"
                    on-change="onInputChange">
                <div class="dz-icon">
                    ${when(this.props.icon, html`${this.props.icon}`, html`
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                             stroke-linecap="round" stroke-linejoin="round" width="40" height="40">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                    `)}
                </div>
                <div class="dz-label">${this.props.label}</div>
                ${when(this.props.hint, html`<div class="dz-hint">${this.props.hint}</div>`)}
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .cl-dropzone {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 32px 24px;
            border: 2px dashed var(--input-border, #ced4da);
            border-radius: 8px;
            background: var(--card-bg, #fff);
            color: var(--text-muted, #6c757d);
            text-align: center;
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s, color 0.2s;
            outline: none;
        }

        .cl-dropzone:hover:not(.disabled),
        .cl-dropzone:focus-visible:not(.disabled) {
            border-color: var(--primary-color, #007bff);
            color: var(--text-color, #333);
        }

        .cl-dropzone.dragging {
            border-color: var(--primary-color, #007bff);
            background: var(--primary-light, rgba(0, 123, 255, 0.08));
            color: var(--primary-color, #007bff);
        }

        .cl-dropzone.disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }

        .dz-input {
            display: none;
        }

        .dz-icon {
            color: inherit;
            line-height: 0;
        }

        .dz-label {
            font-size: 15px;
            font-weight: 500;
            color: var(--text-color, #333);
        }

        .cl-dropzone.dragging .dz-label {
            color: var(--primary-color, #007bff);
        }

        .dz-hint {
            font-size: 13px;
        }
    `
});
