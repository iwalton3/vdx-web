/**
 * demo-app.js - Simple VDX component demonstrating the framework works offline
 *
 * This component is cached by the service worker and works offline.
 * It shows local state management and reactive updates.
 */

import { defineComponent, html, each } from '../../dist/framework.js';

export default defineComponent('demo-app', {
    data() {
        return {
            notes: [],
            newNote: '',
            timestamp: new Date().toLocaleTimeString()
        };
    },

    mounted() {
        // Load notes from localStorage
        this.loadNotes();

        // Update timestamp every second (shows reactivity works offline)
        this.interval = setInterval(() => {
            this.state.timestamp = new Date().toLocaleTimeString();
        }, 1000);
    },

    unmounted() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    },

    methods: {
        loadNotes() {
            try {
                const saved = localStorage.getItem('pwa-demo-notes');
                if (saved) {
                    this.state.notes = JSON.parse(saved);
                }
            } catch (e) {
                console.error('Failed to load notes:', e);
            }
        },

        saveNotes() {
            try {
                localStorage.setItem('pwa-demo-notes', JSON.stringify(this.state.notes));
            } catch (e) {
                console.error('Failed to save notes:', e);
            }
        },

        addNote() {
            const text = this.state.newNote.trim();
            if (!text) return;

            this.state.notes = [
                ...this.state.notes,
                {
                    id: Date.now(),
                    text,
                    created: new Date().toLocaleString()
                }
            ];
            this.state.newNote = '';
            this.saveNotes();
        },

        deleteNote(id) {
            this.state.notes = this.state.notes.filter(n => n.id !== id);
            this.saveNotes();
        },

        clearAll() {
            if (confirm('Delete all notes?')) {
                this.state.notes = [];
                this.saveNotes();
            }
        }
    },

    template() {
        return html`
            <div class="demo-widget">
                <div class="demo-header">
                    <h2>Offline Notes</h2>
                    <span class="demo-time">${this.state.timestamp}</span>
                </div>

                <p class="demo-desc">
                    This component works offline! Add notes and they persist in localStorage.
                </p>

                <form class="demo-form" on-submit-prevent="addNote">
                    <input
                        type="text"
                        placeholder="Add a note..."
                        x-model="newNote"
                        class="demo-input"
                    >
                    <button type="submit" class="demo-btn">Add</button>
                </form>

                <div class="demo-notes">
                    ${each(this.state.notes, note => html`
                        <div class="demo-note" key="${note.id}">
                            <div class="note-content">
                                <span class="note-text">${note.text}</span>
                                <span class="note-date">${note.created}</span>
                            </div>
                            <button
                                class="note-delete"
                                on-click="${() => this.deleteNote(note.id)}"
                            >×</button>
                        </div>
                    `)}
                </div>

                ${this.state.notes.length > 0 ? html`
                    <button class="demo-btn secondary" on-click="clearAll">
                        Clear All (${this.state.notes.length})
                    </button>
                ` : html`
                    <p class="demo-empty">No notes yet. Add one above!</p>
                `}
            </div>
        `;
    },

    styles: /*css*/`
        .demo-widget {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .demo-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .demo-header h2 {
            margin: 0;
            font-size: 18px;
        }

        .demo-time {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 14px;
            color: #6e6e73;
            background: #f0f0f0;
            padding: 4px 10px;
            border-radius: 6px;
        }

        .demo-desc {
            margin: 0 0 16px 0;
            color: #6e6e73;
            font-size: 14px;
        }

        .demo-form {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .demo-input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid #d2d2d7;
            border-radius: 8px;
            font-size: 14px;
        }

        .demo-input:focus {
            outline: none;
            border-color: #4a90d9;
            box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15);
        }

        .demo-btn {
            padding: 10px 20px;
            background: #4a90d9;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
        }

        .demo-btn:hover {
            background: #3a7bc8;
        }

        .demo-btn.secondary {
            background: #e9ecef;
            color: #1d1d1f;
        }

        .demo-btn.secondary:hover {
            background: #dde0e4;
        }

        .demo-notes {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        }

        .demo-note {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f9f9fb;
            border-radius: 8px;
        }

        .note-content {
            flex: 1;
            min-width: 0;
        }

        .note-text {
            display: block;
            word-break: break-word;
        }

        .note-date {
            display: block;
            font-size: 12px;
            color: #6e6e73;
            margin-top: 4px;
        }

        .note-delete {
            width: 28px;
            height: 28px;
            border: none;
            background: none;
            color: #6e6e73;
            font-size: 20px;
            cursor: pointer;
            border-radius: 4px;
        }

        .note-delete:hover {
            background: #ff3b30;
            color: white;
        }

        .demo-empty {
            text-align: center;
            color: #6e6e73;
            font-size: 14px;
            padding: 20px;
            margin: 0;
        }
    `
});
