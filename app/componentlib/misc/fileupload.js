/**
 * FileUpload - File upload component
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-fileupload', {
    props: {
        multiple: false,
        accept: '',
        maxfilesize: 0, // in bytes
        disabled: false,
        auto: false,
        label: 'Choose Files'
    },

    data() {
        return {
            files: []
        };
    },

    methods: {
        handleFileSelect(event) {
            const fileList = Array.from(event.target.files);
            const validFiles = [];

            for (const file of fileList) {
                if (this.props.maxfilesize && file.size > this.props.maxfilesize) {
                    this.emitEvent('file-size-error', { file });
                    continue;
                }
                validFiles.push({
                    file,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            }

            if (!this.props.multiple) {
                this.state.files = validFiles.slice(0, 1);
            } else {
                this.state.files = [...this.state.files, ...validFiles];
            }

            this.emitChange(null, this.state.files);

            if (this.props.auto && validFiles.length > 0) {
                this.upload();
            }

            // Reset input
            event.target.value = '';
        },

        removeFile(index) {
            this.state.files = this.state.files.filter((_, i) => i !== index);
            this.emitChange(null, this.state.files);
        },

        upload() {
            this.emitEvent('upload', { files: this.state.files });
        },

        clear() {
            this.state.files = [];
            this.emitChange(null, this.state.files);
        },

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },

        emitEvent(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
        }
    },

    template() {
        const hasFiles = this.state.files.length > 0;

        return html`
            <div class="cl-fileupload">
                <div class="upload-header">
                    <label class="choose-button">
                        <input
                            type="file"
                            multiple="${this.props.multiple}"
                            accept="${this.props.accept}"
                            disabled="${this.props.disabled}"
                            on-change="handleFileSelect">
                        ${this.props.label}
                    </label>
                    ${when(hasFiles && !this.props.auto, html`
                        <button class="upload-button" on-click="upload">Upload</button>
                        <button class="cancel-button" on-click="clear">Cancel</button>
                    `)}
                </div>
                ${when(hasFiles, html`
                    <div class="files-list">
                        ${each(this.state.files, (fileInfo, index) => html`
                            <div class="file-item">
                                <div class="file-info">
                                    <div class="file-name">${fileInfo.name}</div>
                                    <div class="file-size">${this.formatFileSize(fileInfo.size)}</div>
                                </div>
                                <button
                                    class="remove-button"
                                    on-click="${() => this.removeFile(index)}">×</button>
                            </div>
                        `)}
                    </div>
                `)}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-fileupload {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            padding: 16px;
            background: var(--card-bg, white);
        }

        .upload-header {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .choose-button {
            display: inline-block;
            padding: 10px 20px;
            background: var(--primary-color, #007bff);
            color: white;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }

        .choose-button:hover {
            background: #0056b3;
        }

        .choose-button input[type="file"] {
            display: none;
        }

        .upload-button,
        .cancel-button {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .upload-button {
            background: #28a745;
            border-color: #28a745;
            color: white;
        }

        .upload-button:hover {
            background: #218838;
        }

        .cancel-button {
            background: transparent;
            border-color: var(--input-border, #dee2e6);
            color: var(--text-color, #333);
        }

        .cancel-button:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        .files-list {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background: var(--table-header-bg, #f8f9fa);
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
        }

        .file-info {
            flex: 1;
        }

        .file-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
            margin-bottom: 4px;
        }

        .file-size {
            font-size: 12px;
            color: var(--text-muted, #6c757d);
        }

        .remove-button {
            background: none;
            border: none;
            font-size: 24px;
            line-height: 1;
            cursor: pointer;
            color: var(--text-muted, #6c757d);
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .remove-button:hover {
            background: var(--hover-bg, #e9ecef);
            color: var(--error-color, #dc3545);
        }
    `
});
