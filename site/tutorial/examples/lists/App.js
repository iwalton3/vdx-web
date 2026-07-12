import { defineComponent, Component, html, each, when } from 'vdx/lib/framework.js';
import 'vdx/ui/data/orderable-list.js';
import 'vdx/ui/overlay/context-menu.js';

// Two list tools working together:
//  - <cl-orderable-list> emits the reordered array as a change event, so
//    x-model="playlist" keeps state in sync with the user's dragging.
//  - <cl-context-menu> opens at the pointer via openAtEvent(e, context); the
//    context (here: the track) comes back in the select event, so one menu
//    serves every row.
class PlaylistManager extends Component {
    constructor(props) {
        super(props);
        this.state = {
            playlist: [
                { label: 'Blue Monday — New Order' },
                { label: 'Running Up That Hill — Kate Bush' },
                { label: 'Everlong — Foo Fighters' }
            ],
            library: [
                { id: 1, title: 'Karma Police', artist: 'Radiohead' },
                { id: 2, title: 'Dreams', artist: 'Fleetwood Mac' },
                { id: 3, title: 'Midnight City', artist: 'M83' }
            ],
            menuItems: [
                { label: 'Queue', icon: '➕' },
                { label: 'Remove from library', icon: '🗑️', danger: true }
            ]
        };
    }

    openMenu(e, track) {
        this.refs.menu.openAtEvent(e, track);   // track comes back as context
    }

    onPick(e) {
        const { item, context: track } = e.detail;
        if (item.label === 'Queue') {
            this.state.playlist.push({ label: `${track.title} — ${track.artist}` });
        } else {
            this.state.library = this.state.library.filter(t => t.id !== track.id);
        }
    }

    template() {
        return html`
            <div class="demo">
                <section>
                    <cl-orderable-list header="Playlist — drag to reorder" x-model="playlist">
                    </cl-orderable-list>
                </section>

                <section>
                    <h4>Library — right-click a track</h4>
                    ${when(this.state.library.length,
                        each(this.state.library, track => html`
                            <div class="track" on-contextmenu="${(e) => this.openMenu(e, track)}">
                                <strong>${track.title}</strong>
                                <span>${track.artist}</span>
                            </div>
                        `, track => track.id),
                        html`<p class="empty">Library emptied — refresh to reset.</p>`
                    )}
                </section>

                <cl-context-menu ref="menu" items="${this.state.menuItems}" on-select="onPick">
                </cl-context-menu>
            </div>
        `;
    }

    static styles = /*css*/`
        .demo { font-family: system-ui, sans-serif; display: grid; gap: 18px; max-width: 420px; }
        h4 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #8898a8; }
        .track {
            display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
            padding: 10px 12px; border: 1px solid #8883; border-radius: 8px; margin-bottom: 6px;
            cursor: context-menu; user-select: none;
        }
        .track:hover { border-color: var(--primary-color, #007bff); }
        .track span { color: var(--text-secondary, #57606a); font-size: 13px; }
        .empty { color: #8898a8; font-size: 13.5px; }
    `;
}
defineComponent('playlist-manager', PlaylistManager);
