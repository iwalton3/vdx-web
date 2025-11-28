import { defineComponent, html, when, each } from '../dist/framework.js';
import { notify, notifications } from '../dist/utils.js';

// Mock settings data (similar to jmpInfo structure)
const mockSettings = {
    video: {
        enableMPV: true,
        force_transcode_hevc: false,
        force_transcode_hdr: false,
        force_transcode_dovi: false,
        force_transcode_hi10p: false,
        force_transcode_av1: false,
        force_transcode_4k: false,
        always_force_transcode: false,
        allow_transcode_to_hevc: true,
        prefer_transcode_to_h265: false
    },
    audio: {
        channels: "5.1"
    },
    main: {
        userWebClient: "https://jellyfin.example.com",
        enableMPV: true
    },
    other: {
        customMPVConfig: "# Add custom MPV configuration here\n"
    }
};

const mockSections = [
    { key: 'video', order: 1 },
    { key: 'audio', order: 2 },
    { key: 'main', order: 3 },
    { key: 'other', order: 4 }
];

const mockSettingsDescriptions = {
    video: [
        {
            key: 'enableMPV',
            displayName: 'Enable MPV Player',
            help: 'Use MPV for video playback instead of browser native player'
        },
        {
            key: 'force_transcode_hevc',
            displayName: 'Force Transcode HEVC',
            help: 'Always transcode HEVC/H.265 content to H.264'
        },
        {
            key: 'force_transcode_hdr',
            displayName: 'Force Transcode HDR',
            help: 'Transcode HDR content to SDR'
        },
        {
            key: 'force_transcode_dovi',
            displayName: 'Force Transcode Dolby Vision',
            help: 'Transcode Dolby Vision content'
        },
        {
            key: 'force_transcode_hi10p',
            displayName: 'Force Transcode Hi10P',
            help: 'Transcode 10-bit content to 8-bit'
        },
        {
            key: 'force_transcode_av1',
            displayName: 'Force Transcode AV1',
            help: 'Transcode AV1 content to H.264'
        },
        {
            key: 'force_transcode_4k',
            displayName: 'Force Transcode 4K',
            help: 'Transcode 4K content to 1080p'
        },
        {
            key: 'always_force_transcode',
            displayName: 'Always Force Transcode',
            help: 'Never allow direct play, always transcode'
        },
        {
            key: 'allow_transcode_to_hevc',
            displayName: 'Allow Transcode to HEVC',
            help: 'Allow server to transcode to HEVC/H.265'
        },
        {
            key: 'prefer_transcode_to_h265',
            displayName: 'Prefer H.265 for Transcoding',
            help: 'Prefer H.265/HEVC over H.264 when transcoding'
        }
    ],
    audio: [
        {
            key: 'channels',
            displayName: 'Audio Channels',
            help: 'Maximum audio channels to use',
            options: [
                { value: '2.0', title: 'Stereo (2.0)' },
                { value: '5.1', title: 'Surround (5.1)' },
                { value: '7.1', title: 'Surround (7.1)' }
            ]
        }
    ],
    main: [
        {
            key: 'enableMPV',
            displayName: 'Enable MPV',
            help: 'Enable MPV media player backend'
        }
    ],
    other: [
        {
            key: 'customMPVConfig',
            displayName: 'Custom MPV Configuration',
            inputType: 'textarea',
            help: 'Add custom MPV configuration options here'
        }
    ]
};

// Define the settings modal component
defineComponent('settings-modal', {
    props: {
        visible: false
    },

    data() {
        return {
            settings: mockSettings,
            sections: mockSections,
            descriptions: mockSettingsDescriptions
        };
    },

    methods: {
        close() {
            // Emit change event for parent to handle
            this.emitChange(null, false, 'visible');
            // Remove from DOM (this is a dynamically created modal)
            this.remove();
        },

        handleOverlayClick(e) {
            if (e.target.classList.contains('modal-container')) {
                this.close();
            }
        },

        updateSetting(section, key, value) {
            console.log(`Updated ${section}.${key} =`, value);
            this.state.settings[section][key] = value;
            notify(`Updated ${key}`, 'success', 2);
        },

        resetSavedServer() {
            if (confirm('Are you sure you want to reset the saved server?')) {
                this.state.settings.main.userWebClient = '';
                notify('Saved server reset', 'info', 3);
            }
        },

        renderSetting(section, setting) {
            const value = this.state.settings[section][setting.key];
            const label = setting.displayName || setting.key;

            if (setting.options) {
                // Select dropdown
                return html`
                    <div class="form-group">
                        <label class="form-label">
                            ${label}
                            ${when(setting.help, html`
                                <span class="help-icon">
                                    <span class="tooltip">${setting.help}</span>
                                </span>
                            `)}
                        </label>
                        <select
                            value="${value}"
                            on-change="${(e) => this.updateSetting(section, setting.key, e.target.value)}">
                            ${each(setting.options, opt => html`
                                <option
                                    value="${opt.value}"
                                    selected="${opt.value === value ? true : undefined}">
                                    ${opt.title}
                                </option>
                            `)}
                        </select>
                    </div>
                `;
            } else if (setting.inputType === 'textarea') {
                // Textarea
                return html`
                    <div class="form-group">
                        <label class="form-label">
                            ${label}
                            ${when(setting.help, html`
                                <span class="help-icon">
                                    <span class="tooltip">${setting.help}</span>
                                </span>
                            `)}
                        </label>
                        <textarea
                            on-change="${(e) => this.updateSetting(section, setting.key, e.target.value)}"
                        >${value}</textarea>
                    </div>
                `;
            } else {
                // Checkbox
                return html`
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                checked="${value}"
                                on-change="${(e) => this.updateSetting(section, setting.key, e.target.checked)}">
                            ${label}
                            ${when(setting.help, html`
                                <span class="help-icon">
                                    <span class="tooltip">${setting.help}</span>
                                </span>
                            `)}
                        </label>
                    </div>
                `;
            }
        }
    },

    template() {
        return html`
            <div class="modal-container" on-click="handleOverlayClick">
                <div class="modal">
                    <div class="modal-header">
                        <h2 class="modal-title">Jellyfin Media Player Settings</h2>
                    </div>
                    <div class="modal-content">
                        ${each(this.state.sections, sectionInfo => {
                            const section = sectionInfo.key;
                            const settings = this.state.descriptions[section] || [];

                            return html`
                                <div class="section">
                                    <h3 class="section-title">${section}</h3>
                                    ${when(section === 'other', html`
                                        <p class="section-description">
                                            Use this section to input custom MPV configuration.
                                            These will override the above settings.
                                        </p>
                                    `)}
                                    ${each(settings, setting => this.renderSetting(section, setting))}
                                </div>
                            `;
                        })}

                        ${when(this.state.settings.main.userWebClient, html`
                            <div class="section">
                                <h3 class="section-title">Saved Server</h3>
                                <p class="section-description">
                                    The server you first connected to is your saved server.
                                    It provides the web client for Jellyfin Media Player in the absence of a bundled one.
                                    You can use this option to change it to another one. This does NOT log you off.
                                </p>
                                <button class="btn-danger" on-click="resetSavedServer">
                                    Reset Saved Server
                                </button>
                            </div>
                        `)}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" on-click="close">Close</button>
                    </div>
                </div>
            </div>
        `;
    },

    styles: `
        /* Component-specific styles can go here */
    `
});

// Define notification list component
defineComponent('notification-list', {
    data() {
        return {
            notificationList: []
        };
    },

    mounted() {
        // Subscribe to notifications store
        this.unsubscribe = notifications.subscribe(state => {
            this.state.notificationList = state.list;
        });
    },

    unmounted() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    },

    template() {
        return html`
            ${each(this.state.notificationList, notif => html`
                <div class="notification ${notif.severity}">
                    ${notif.message}
                </div>
            `)}
        `;
    }
});

// Global function to open settings
window.openSettings = function() {
    const modal = document.createElement('settings-modal');
    modal.setAttribute('visible', 'true');
    document.body.appendChild(modal);
};
