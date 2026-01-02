/**
 * QNote - Quick Note taking app with server persistence
 * Uses rw.php backend for encrypted note storage
 * Supports real-time collaboration via polling
 */
import { defineComponent, html, when, flushSync } from '../../lib/framework.js';
import { notify } from '../../lib/utils.js';
import { getRouter } from '../../lib/router.js';
import login from '../../auth/auth.js';

const RW_API = '/theme/rw.php';
const POLL_INTERVAL = 3000; // Check for updates every 3 seconds

function getDraftKey(name) {
    return `qnote-draft-${name}`;
}

export default defineComponent('qnote-page', {
    stores: { login },

    props: {
        params: {}
    },

    data() {
        return {
            name: '',
            content: '',
            savedContent: '',
            isUnsaved: false,
            autoSaveTimer: null,
            draftSaveTimer: null,
            nameChangeTimer: null,
            pollTimer: null,
            lockStatus: 'public', // 'public', 'authorized', 'unauthorized'
            loading: false,
            saving: false,
            defaultNote: localStorage.getItem('qnote-default') || '',
            hasDraft: false,
            hasConflict: false,
            serverContent: '', // Track what server has for conflict detection
            lastPollTime: 0,
            loadRequestId: 0, // Track current load request to prevent race conditions
            previousName: '' // Track previous name for draft saving
        };
    },

    mounted() {
        // Warn before leaving with unsaved changes
        this._beforeUnload = (e) => {
            if (this.state.isUnsaved) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', this._beforeUnload);

        // Load note from route params if present
        if (this.props.params?.name) {
            const slug = decodeURIComponent(this.props.params.name);
            this.state.name = this.normalizeName(this.slugToName(slug));
            this.state.previousName = this.state.name;
            this.loadNote();
        } else if (this.state.defaultNote) {
            // Load default note directly and update URL with replace
            this.state.name = this.normalizeName(this.state.defaultNote);
            this.state.previousName = this.state.name;
            this.loadNote();
            this.replaceToNote(this.state.name);
        }
    },

    updated(changedProps) {
        // React to route param changes
        if (changedProps.params) {
            const slug = this.props.params?.name
                ? decodeURIComponent(this.props.params.name)
                : '';
            const newName = slug ? this.normalizeName(this.slugToName(slug)) : '';

            if (newName !== this.state.name) {
                // Save current draft before switching
                if (this.state.name && this.state.isUnsaved) {
                    this.saveDraft();
                }

                // Stop polling old note
                this.stopPolling();

                this.state.name = newName;
                this.state.previousName = newName;
                if (newName) {
                    this.loadNote();
                } else {
                    // Clear state for new note
                    this.state.content = '';
                    this.state.savedContent = '';
                    this.state.serverContent = '';
                    this.state.isUnsaved = false;
                    this.state.lockStatus = 'public';
                    this.state.hasDraft = false;
                    this.state.hasConflict = false;
                }
            }
        }
    },

    afterRender() {
        // Auto-expand textarea on re-renders
        const textarea = this.refs.content;
        if (textarea) {
            this.autoExpand(textarea);
        }
    },

    unmounted() {
        window.removeEventListener('beforeunload', this._beforeUnload);

        // Save draft before unmounting
        if (this.state.name && this.state.isUnsaved) {
            this.saveDraft();
        }

        this.stopPolling();

        if (this.state.autoSaveTimer) {
            clearTimeout(this.state.autoSaveTimer);
        }
        if (this.state.draftSaveTimer) {
            clearTimeout(this.state.draftSaveTimer);
        }
        if (this.state.nameChangeTimer) {
            clearTimeout(this.state.nameChangeTimer);
        }
    },

    methods: {
        // Remove invalid characters but don't trim (allows typing spaces)
        sanitizeName(name) {
            return name.replace(/[^A-Za-z0-9 ]/g, '');
        },

        // Sanitize and trim for actual use (saving, loading, comparing)
        normalizeName(name) {
            return this.sanitizeName(name).trim().replace(/ +/g, ' ');
        },

        // Convert display name (spaces) to URL slug (dashes)
        nameToSlug(name) {
            return name.replace(/ +/g, '-');
        },

        // Convert URL slug (dashes) to display name (spaces)
        slugToName(slug) {
            return slug.replace(/-/g, ' ');
        },

        navigateToNote(name) {
            // Save draft before navigating
            if (this.state.name && this.state.isUnsaved) {
                this.saveDraft();
            }

            const router = getRouter();
            if (name) {
                const slug = this.nameToSlug(name);
                router.navigate(`/qnote/${encodeURIComponent(slug)}/`);
            } else {
                router.navigate('/qnote/');
            }
        },

        replaceToNote(name) {
            // Update URL without adding history entry
            const router = getRouter();
            if (name) {
                const slug = this.nameToSlug(name);
                router.replace(`/qnote/${encodeURIComponent(slug)}/`);
            } else {
                router.replace('/qnote/');
            }
        },

        saveDraft() {
            if (this.state.name && this.state.content) {
                localStorage.setItem(getDraftKey(this.state.name), this.state.content);
            }
        },

        clearDraft() {
            if (this.state.name) {
                localStorage.removeItem(getDraftKey(this.state.name));
                this.state.hasDraft = false;
            }
        },

        restoreDraft() {
            const draft = localStorage.getItem(getDraftKey(this.state.name));
            if (draft) {
                this.state.content = draft;
                this.state.isUnsaved = true;
                this.state.hasDraft = false;
                notify('Draft restored');
            }
        },

        discardDraft() {
            this.clearDraft();
            this.state.content = this.state.savedContent;
            this.state.isUnsaved = false;
            notify('Draft discarded');
        },

        autoExpand(textarea) {
            // Save scroll position before resize
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;

            textarea.style.height = 'auto';
            const minHeight = 200;
            const newHeight = Math.max(textarea.scrollHeight, minHeight);
            textarea.style.height = newHeight + 'px';

            // Restore scroll position
            window.scrollTo(scrollX, scrollY);
        },

        // Start polling for updates
        startPolling() {
            this.stopPolling();
            this.state.pollTimer = setInterval(() => {
                this.pollForUpdates();
            }, POLL_INTERVAL);
        },

        stopPolling() {
            if (this.state.pollTimer) {
                clearInterval(this.state.pollTimer);
                this.state.pollTimer = null;
            }
        },

        async pollForUpdates() {
            if (!this.state.name || this.state.loading || this.state.saving) return;

            try {
                const response = await fetch(`${RW_API}?name=${encodeURIComponent(this.state.name)}`);
                // Normalize for comparison
                const serverContent = this.normalizeNoteText(await response.text());

                // Server content changed
                if (serverContent !== this.state.serverContent) {
                    this.state.serverContent = serverContent;

                    if (!this.state.isUnsaved) {
                        // No local changes, update preserving cursor/scroll
                        this.updateContentPreservingCursor(serverContent);
                        this.state.savedContent = serverContent;
                    } else if (serverContent !== this.state.savedContent) {
                        // Both server and local changed - conflict!
                        this.state.hasConflict = true;
                    }
                }
            } catch (error) {
                // Silently ignore poll errors
                console.debug('Poll error:', error);
            }
        },

        // Accept server version during conflict
        acceptServerVersion() {
            this.state.content = this.state.serverContent;
            this.state.savedContent = this.state.serverContent;
            this.state.isUnsaved = false;
            this.state.hasConflict = false;
            this.clearDraft();
            notify('Loaded server version');
        },

        // Keep local version during conflict (will overwrite server on next save)
        keepLocalVersion() {
            this.state.hasConflict = false;
            this.state.savedContent = this.state.serverContent;
            // Keep isUnsaved true so it will save
            notify('Keeping your version - save to overwrite server');
        },

        async loadNote() {
            if (!this.state.name) return;

            const cleanName = this.normalizeName(this.state.name);
            if (!cleanName) return;

            // Increment request ID to track this load request
            const requestId = ++this.state.loadRequestId;

            this.state.loading = true;
            this.state.hasConflict = false;

            try {
                // Load note content from server
                const contentResp = await fetch(`${RW_API}?name=${encodeURIComponent(cleanName)}`);

                // Check if a newer request has started - abort if stale
                if (requestId !== this.state.loadRequestId) return;

                // Normalize server content (API adds trailing newlines)
                const serverContent = this.normalizeNoteText(await contentResp.text());

                // Check for local draft
                const draft = localStorage.getItem(getDraftKey(cleanName));

                if (draft && this.normalizeNoteText(draft) !== serverContent) {
                    // We have a draft that differs from server
                    flushSync(() => {
                        this.state.content = serverContent;
                        this.state.savedContent = serverContent;
                        this.state.serverContent = serverContent;
                        this.state.hasDraft = true;
                        this.state.isUnsaved = false;
                    });
                } else {
                    // No draft or draft matches server
                    flushSync(() => {
                        this.state.content = serverContent;
                        this.state.savedContent = serverContent;
                        this.state.serverContent = serverContent;
                        this.state.isUnsaved = false;
                        this.state.hasDraft = false;
                    });
                    if (draft) {
                        localStorage.removeItem(getDraftKey(cleanName));
                    }
                }

                // Auto-expand textarea after content is loaded
                const textarea = this.refs.content;
                if (textarea) {
                    this.autoExpand(textarea);
                }

                // Check lock status (API returns: public, authorized, readonly)
                const lockResp = await fetch(`${RW_API}?name=${encodeURIComponent(cleanName)}&lock=check`);

                // Check again if a newer request has started
                if (requestId !== this.state.loadRequestId) return;

                const lockResult = (await lockResp.text()).trim();
                // Map 'readonly' from API to 'unauthorized' for internal state
                this.state.lockStatus = lockResult === 'readonly' ? 'unauthorized' : lockResult;

                // Start polling for updates
                this.startPolling();
            } catch (error) {
                // Only handle error if this is still the current request
                if (requestId !== this.state.loadRequestId) return;

                console.error('Failed to load note:', error);
                notify('Failed to load note', 'error');

                // Try to recover from draft if server fails
                const draft = localStorage.getItem(getDraftKey(cleanName));
                if (draft) {
                    this.state.content = draft;
                    this.state.isUnsaved = true;
                    notify('Loaded from local draft', 'warn');
                }
            } finally {
                // Only update loading state if this is still the current request
                if (requestId === this.state.loadRequestId) {
                    this.state.loading = false;
                }
            }
        },

        normalizeNoteText(text) {
            return text.trim().replace(/\r\n/g, '\n');
        },

        // Adjust cursor position based on content diff
        adjustCursorForDiff(oldContent, newContent, cursorPos) {
            // Find common prefix length
            let prefixLen = 0;
            const minLen = Math.min(oldContent.length, newContent.length);
            while (prefixLen < minLen && oldContent[prefixLen] === newContent[prefixLen]) {
                prefixLen++;
            }

            // Find common suffix length (don't overlap with prefix)
            let suffixLen = 0;
            const maxSuffix = Math.min(oldContent.length - prefixLen, newContent.length - prefixLen);
            while (suffixLen < maxSuffix &&
                   oldContent[oldContent.length - 1 - suffixLen] === newContent[newContent.length - 1 - suffixLen]) {
                suffixLen++;
            }

            // Cursor in unchanged prefix - keep position
            if (cursorPos <= prefixLen) {
                return cursorPos;
            }

            // Cursor in unchanged suffix - adjust for length change
            const oldSuffixStart = oldContent.length - suffixLen;
            if (cursorPos >= oldSuffixStart) {
                const offsetFromEnd = oldContent.length - cursorPos;
                return newContent.length - offsetFromEnd;
            }

            // Cursor in changed middle - place at end of new middle
            return newContent.length - suffixLen;
        },

        // Update content while preserving cursor position and scroll
        updateContentPreservingCursor(newContent) {
            const textarea = this.refs.content;
            if (!textarea) {
                this.state.content = newContent;
                return;
            }

            const oldContent = this.state.content;
            const cursorStart = textarea.selectionStart;
            const cursorEnd = textarea.selectionEnd;
            const scrollTop = textarea.scrollTop;
            const windowScrollY = window.scrollY;

            // Calculate adjusted cursor positions
            const newCursorStart = this.adjustCursorForDiff(oldContent, newContent, cursorStart);
            const newCursorEnd = this.adjustCursorForDiff(oldContent, newContent, cursorEnd);

            // Update content
            this.state.content = newContent;

            // Restore after render
            requestAnimationFrame(() => {
                const ta = this.refs.content;
                if (ta) {
                    const maxPos = ta.value.length;
                    ta.selectionStart = Math.min(Math.max(0, newCursorStart), maxPos);
                    ta.selectionEnd = Math.min(Math.max(0, newCursorEnd), maxPos);
                    ta.scrollTop = scrollTop;
                }
                window.scrollTo(window.scrollX, windowScrollY);
            });
        },

        async saveNote(lockAction = null) {
            if (!this.state.name || this.state.saving) return;

            const cleanName = this.normalizeName(this.state.name);
            // Trim content before saving to normalize
            const contentToSave = this.normalizeNoteText(this.state.content);

            this.state.saving = true;

            try {
                const formData = new FormData();
                formData.append('name', cleanName);
                formData.append('content', contentToSave);
                if (lockAction) {
                    formData.append('lock', lockAction);
                }

                const response = await fetch(RW_API, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                const result = this.normalizeNoteText(await response.text());

                if (result === 'Note is locked.') {
                    notify('Note is locked by another user', 'error');
                    this.state.saving = false;
                    return;
                }

                // Verify the save by fetching back
                const verifyResp = await fetch(`${RW_API}?name=${encodeURIComponent(cleanName)}`);
                const verifiedContent = this.normalizeNoteText(await verifyResp.text());

                // Both are already trimmed, compare directly
                if (verifiedContent !== contentToSave) {
                    // Save didn't work properly!
                    notify('Save verification failed - keeping local copy', 'error');
                    this.saveDraft();
                    this.state.saving = false;
                    return;
                }

                // Save verified!
                if (result === 'Saved! (locked)') {
                    this.state.lockStatus = 'authorized';
                } else if (result === 'Saved! (public)') {
                    this.state.lockStatus = 'public';
                }

                // Store actual server content for accurate comparison
                this.state.savedContent = verifiedContent;
                this.state.serverContent = verifiedContent;
                this.state.isUnsaved = false;
                this.state.hasConflict = false;

                // Clear draft after successful verified save
                this.clearDraft();

                // Update URL if needed
                if (this.props.params?.name !== cleanName) {
                    this.navigateToNote(cleanName);
                }
            } catch (error) {
                console.error('Failed to save note:', error);
                notify('Failed to save - keeping local draft', 'error');
                this.saveDraft();
            }

            this.state.saving = false;
        },

        async toggleLock() {
            if (this.state.lockStatus === 'unauthorized') {
                notify('You cannot modify this locked note', 'error');
                return;
            }

            const newLock = this.state.lockStatus === 'authorized' ? 'unlock' : 'lock';
            await this.saveNote(newLock);
        },

        copyToClipboard() {
            if (this.state.content) {
                navigator.clipboard.writeText(this.state.content)
                    .then(() => notify('Copied to clipboard!'))
                    .catch(() => {
                        const textarea = this.refs.content;
                        textarea.select();
                        document.execCommand('copy');
                        notify('Copied to clipboard!');
                    });
            }
        },

        handleNameInput() {
            // Sanitize but don't trim (allows typing spaces)
            const sanitized = this.sanitizeName(this.state.name);
            this.state.name = sanitized;

            // Cancel any pending load
            if (this.state.nameChangeTimer) {
                clearTimeout(this.state.nameChangeTimer);
            }

            // Debounce the load to avoid excessive requests while typing
            this.state.nameChangeTimer = setTimeout(() => {
                // Normalize for comparison (trims and collapses spaces)
                const normalized = this.normalizeName(sanitized);

                if (normalized && normalized !== this.state.previousName) {
                    // Save draft of previous note before switching
                    if (this.state.previousName && this.state.isUnsaved) {
                        const prevName = this.state.previousName;
                        localStorage.setItem(getDraftKey(prevName), this.state.content);
                    }

                    this.stopPolling();
                    this.state.previousName = normalized;
                    this.loadNote();
                    // Update URL without adding history entry
                    this.replaceToNote(normalized);
                } else if (!normalized) {
                    // Name cleared - reset state
                    this.stopPolling();
                    this.state.previousName = '';
                    this.state.content = '';
                    this.state.savedContent = '';
                    this.state.serverContent = '';
                    this.state.isUnsaved = false;
                    this.state.lockStatus = 'public';
                    this.state.hasDraft = false;
                    this.state.hasConflict = false;
                    // Update URL without adding history entry
                    this.replaceToNote('');
                }
            }, 300);
        },

        handleNameChange() {
            // Immediate load on blur/enter - cancel debounce and load now
            if (this.state.nameChangeTimer) {
                clearTimeout(this.state.nameChangeTimer);
                this.state.nameChangeTimer = null;
            }

            // Normalize the name on blur (trim and collapse spaces)
            const normalized = this.normalizeName(this.state.name);
            this.state.name = normalized;

            if (normalized && normalized !== this.state.previousName) {
                // Save draft of previous note before switching
                if (this.state.previousName && this.state.isUnsaved) {
                    localStorage.setItem(getDraftKey(this.state.previousName), this.state.content);
                }

                this.stopPolling();
                this.state.previousName = normalized;
                this.loadNote();
                // Update URL without adding history entry
                this.replaceToNote(normalized);
            }
        },

        handleContentInput() {
            // Compare normalized content (savedContent is already normalized)
            this.state.isUnsaved = this.normalizeNoteText(this.state.content) !== this.state.savedContent;

            // Clear conflict if user starts typing
            if (this.state.hasConflict && this.state.isUnsaved) {
                this.state.hasConflict = false;
            }

            // Auto-expand textarea
            const textarea = this.refs.content;
            if (textarea) {
                this.autoExpand(textarea);
            }

            // Save draft to localStorage frequently (every 500ms of no typing)
            if (this.state.draftSaveTimer) {
                clearTimeout(this.state.draftSaveTimer);
            }
            this.state.draftSaveTimer = setTimeout(() => {
                if (this.state.name && this.state.isUnsaved) {
                    this.saveDraft();
                }
            }, 500);

            // Auto-save to server after 3 seconds of no typing
            if (this.state.autoSaveTimer) {
                clearTimeout(this.state.autoSaveTimer);
            }
            if (this.state.lockStatus !== 'unauthorized') {
                this.state.autoSaveTimer = setTimeout(() => {
                    if (this.state.isUnsaved && this.state.name) {
                        this.saveNote();
                    }
                }, 3000);
            }
        },

        newNote() {
            this.stopPolling();
            this.state.name = '';
            this.state.content = '';
            this.state.savedContent = '';
            this.state.serverContent = '';
            this.state.isUnsaved = false;
            this.state.lockStatus = 'public';
            this.state.hasDraft = false;
            this.state.hasConflict = false;
            this.navigateToNote('');
        },

        setAsDefault() {
            if (this.state.name) {
                localStorage.setItem('qnote-default', this.state.name);
                this.state.defaultNote = this.state.name;
                notify('Set as default note!');
            }
        }
    },

    template() {
        const isLoggedIn = !!this.stores.login.user;
        const isReadOnly = this.state.lockStatus === 'unauthorized';
        const canLock = isLoggedIn && this.state.lockStatus !== 'unauthorized';

        const lockIcon = {
            'public': '/theme/public.svg',
            'authorized': '/theme/locked.svg',
            'unauthorized': '/theme/readonly.svg'
        }[this.state.lockStatus];

        const lockTitle = {
            'public': 'Anyone can edit this note (click to lock)',
            'authorized': 'Only you can edit this note (click to unlock)',
            'unauthorized': 'This note is locked by another user'
        }[this.state.lockStatus];

        return html`
            <div class="qnote">
                <h1>Quick Note</h1>

                ${when(this.state.hasDraft, html`
                    <div class="draft-notice">
                        <span>You have unsaved changes from a previous session.</span>
                        <button on-click="restoreDraft">Restore Draft</button>
                        <button on-click="discardDraft" class="secondary">Discard</button>
                    </div>
                `)}

                ${when(this.state.hasConflict, html`
                    <div class="conflict-notice">
                        <span>Someone else edited this note. Choose which version to keep:</span>
                        <button on-click="acceptServerVersion">Use Their Version</button>
                        <button on-click="keepLocalVersion" class="secondary">Keep My Version</button>
                    </div>
                `)}

                <div class="note-editor">
                    <div class="toolbar">
                        <input
                            id="name"
                            type="text"
                            x-model="name"
                            on-input="handleNameInput"
                            on-change="handleNameChange"
                            placeholder="Note name...">

                        ${when(this.state.name, html`
                            <button
                                class="lock-btn"
                                on-click="toggleLock"
                                title="${lockTitle}"
                                disabled="${!canLock}">
                                <img src="${lockIcon}" alt="${this.state.lockStatus}">
                            </button>
                        `)}

                        <span class="status">
                            ${when(this.state.loading, html`<span class="loading">Loading...</span>`)}
                            ${when(this.state.saving, html`<span class="saving">Saving...</span>`)}
                            ${when(!this.state.loading && !this.state.saving && this.state.isUnsaved, html`<span class="unsaved">Unsaved</span>`)}
                            ${when(!this.state.loading && !this.state.saving && !this.state.isUnsaved && this.state.name, html`<span class="saved">Synced</span>`)}
                        </span>
                    </div>

                    ${when(isReadOnly, html`
                        <div class="readonly-notice">
                            This note is locked by another user and cannot be edited.
                        </div>
                    `)}

                    <textarea
                        ref="content"
                        x-model="content"
                        on-input="handleContentInput"
                        placeholder="Note content..."
                        readonly="${isReadOnly}"></textarea>

                    <div class="actions">
                        <button on-click="${() => this.saveNote()}" disabled="${!this.state.name || isReadOnly || this.state.saving}">
                            ${this.state.saving ? 'Saving...' : 'Save Now'}
                        </button>
                        <button on-click="copyToClipboard" disabled="${!this.state.content}">
                            Copy
                        </button>
                        <button on-click="newNote">New Note</button>
                        ${when(this.state.name && this.state.name !== this.state.defaultNote, html`
                            <button on-click="setAsDefault">Set as Default</button>
                        `)}
                    </div>
                </div>

                <div class="section">
                    <p>Notes are encrypted and stored on the server. ${when(isLoggedIn, html`
                        You can lock notes to prevent others from editing.
                    `, html`
                        <router-link to="/auth/">Log in</router-link> to lock notes.
                    `)}</p>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .qnote {
            display: flex;
            flex-direction: column;
            max-width: 800px;
        }

        .draft-notice, .conflict-notice {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            border: 1px solid var(--input-border);
            border-radius: 4px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .draft-notice {
            background: var(--info-bg);
        }

        .draft-notice span {
            color: var(--info-text);
        }

        .conflict-notice {
            background: var(--warning-bg);
        }

        .conflict-notice span {
            color: var(--warning-text);
        }

        .draft-notice span, .conflict-notice span {
            flex: 1;
            min-width: 200px;
        }

        .draft-notice button, .conflict-notice button {
            padding: 6px 12px;
            border: 1px solid var(--primary-color);
            border-radius: 4px;
            background-color: var(--primary-color);
            color: white;
            cursor: pointer;
            font-size: 13px;
        }

        .draft-notice button:hover, .conflict-notice button:hover {
            background-color: var(--primary-hover);
        }

        .draft-notice button.secondary, .conflict-notice button.secondary {
            background-color: transparent;
            color: var(--input-text);
            border-color: var(--input-border);
        }

        .draft-notice button.secondary:hover, .conflict-notice button.secondary:hover {
            background-color: var(--input-hover-bg);
        }

        .note-editor {
            display: flex;
            flex-direction: column;
        }

        .toolbar {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 10px;
        }

        .toolbar input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--input-border);
            border-radius: 4px;
            font-size: 14px;
            background-color: var(--input-bg);
            color: var(--input-text);
        }

        .toolbar input:focus {
            outline: none;
            border-color: var(--input-focus-border);
        }

        .lock-btn {
            padding: 8px;
            border: 1px solid var(--input-border);
            border-radius: 4px;
            background-color: var(--input-bg);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .lock-btn img {
            width: 20px;
            height: 20px;
        }

        .lock-btn:hover:not(:disabled) {
            background-color: var(--input-hover-bg);
        }

        .lock-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .status {
            font-size: 12px;
            min-width: 70px;
            text-align: right;
        }

        .loading, .saving {
            color: var(--text-muted);
        }

        .unsaved {
            color: #f0ad4e;
        }

        .saved {
            color: #5cb85c;
        }

        .readonly-notice {
            padding: 10px;
            background: var(--warning-bg);
            border: 1px solid var(--warning-border);
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 14px;
            color: var(--warning-text);
        }

        textarea {
            width: 100%;
            min-height: 200px;
            padding: 12px;
            border: 1px solid var(--input-border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            background-color: var(--input-bg);
            color: var(--input-text);
            box-sizing: border-box;
            overflow-y: hidden;
        }

        textarea:focus {
            outline: none;
            border-color: var(--input-focus-border);
        }

        textarea[readonly] {
            background-color: var(--input-readonly-bg);
        }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
            flex-wrap: wrap;
        }

        .actions button {
            padding: 8px 16px;
            border: 1px solid var(--input-border);
            border-radius: 4px;
            background-color: var(--input-bg);
            color: var(--input-text);
            cursor: pointer;
            font-size: 14px;
        }

        .actions button:hover:not(:disabled) {
            background-color: var(--input-hover-bg);
        }

        .actions button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        h1 {
            margin-bottom: 20px;
        }
    `
});
