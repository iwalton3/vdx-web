/**
 * tut-app - the interactive tutorial shell.
 *
 * Sidebar chapter navigation + a content pane that mounts one chapter component
 * at a time. Chapters are plain custom elements; the active one is inserted with
 * raw() inside a contain() keyed to the active id, so switching chapters remounts
 * (and re-runs its live examples) while unrelated re-renders leave it alone -
 * the same isolation pattern the component showcase uses.
 */
import { defineComponent, html, each, when, raw, contain, Component } from '../lib/framework.js';
import { chapters } from './chapters/index.js';

export class TutApp extends Component {
    constructor(props) {
        super(props);
        this.state = { activeId: chapters[0].id, menuOpen: false };
    }

    mounted() {
        this._onHash = () => this._loadFromHash();
        window.addEventListener('hashchange', this._onHash);
        this._loadFromHash();
    }

    unmounted() {
        window.removeEventListener('hashchange', this._onHash);
    }

    _loadFromHash() {
        const id = window.location.hash.slice(1);
        if (id && chapters.some((c) => c.id === id)) {
            this.state.activeId = id;
        } else {
            history.replaceState(null, '', '#' + this.state.activeId);
        }
        this.state.menuOpen = false;
        this._scrollTop();
    }

    _scrollTop() {
        requestAnimationFrame(() => {
            const content = this.querySelector('.tut-content');
            if (content) content.scrollTop = 0;
        });
    }

    get active() {
        return chapters.find((c) => c.id === this.state.activeId) || chapters[0];
    }

    get groups() {
        const order = [];
        const byGroup = new Map();
        for (const c of chapters) {
            if (!byGroup.has(c.group)) { byGroup.set(c.group, []); order.push(c.group); }
            byGroup.get(c.group).push(c);
        }
        return order.map((name) => ({ name, items: byGroup.get(name) }));
    }

    go(id) {
        window.location.hash = id;
    }

    prev() {
        const i = chapters.findIndex((c) => c.id === this.state.activeId);
        if (i > 0) this.go(chapters[i - 1].id);
    }

    next() {
        const i = chapters.findIndex((c) => c.id === this.state.activeId);
        if (i < chapters.length - 1) this.go(chapters[i + 1].id);
    }

    toggleTheme() {
        document.body.classList.toggle('dark');
    }

    toggleMenu() {
        this.state.menuOpen = !this.state.menuOpen;
    }

    template() {
        const active = this.active;
        const i = chapters.findIndex((c) => c.id === active.id);
        const hasPrev = i > 0;
        const hasNext = i < chapters.length - 1;

        return html`
            <div class="tut-shell ${this.state.menuOpen ? 'menu-open' : ''}">
                <header class="tut-topbar">
                    <button class="tut-burger" on-click="toggleMenu" aria-label="Toggle chapters">☰</button>
                    <a class="tut-brand" href="#${chapters[0].id}">VDX · Interactive Tutorial</a>
                    <button class="tut-theme" on-click="toggleTheme" aria-label="Toggle theme">🌓</button>
                </header>

                <nav class="tut-sidebar" aria-label="Chapters">
                    ${each(this.groups, (group) => html`
                        <div class="tut-group">
                            <div class="tut-group-name">${group.name}</div>
                            ${each(group.items, (c) => html`
                                <a class="tut-navlink ${c.id === active.id ? 'active' : ''}"
                                   href="#${c.id}">
                                    <span class="tut-navnum">${c.num}</span>${c.title}
                                </a>
                            `)}
                        </div>
                    `)}
                </nav>

                <main class="tut-content">
                    ${contain(() => html`<div class="tut-chapter-host">${raw(this.active.mount)}</div>`)}
                    <div class="tut-chapter-nav">
                        ${when(hasPrev,
                            html`<button class="tut-pn prev" on-click="prev">← ${i > 0 ? chapters[i - 1].title : ''}</button>`,
                            html`<span></span>`)}
                        ${when(hasNext,
                            html`<button class="tut-pn next" on-click="next">${i < chapters.length - 1 ? chapters[i + 1].title : ''} →</button>`,
                            html`<span></span>`)}
                    </div>
                </main>

                ${when(this.state.menuOpen, html`<div class="tut-scrim" on-click="toggleMenu"></div>`)}
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; height: 100vh; }

        .tut-shell {
            display: grid;
            grid-template-columns: 280px 1fr;
            grid-template-rows: 54px 1fr;
            grid-template-areas: "brand topbar" "sidebar content";
            height: 100vh;
        }

        .tut-topbar {
            grid-area: topbar;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 0 20px;
            border-bottom: 1px solid var(--border-color, #e1e4e8);
            background: var(--card-bg, #fff);
        }
        .tut-brand {
            grid-area: brand;
            display: flex;
            align-items: center;
            padding: 0 20px;
            font-weight: 650;
            font-size: 14px;
            color: var(--text-color, #24292e);
            text-decoration: none;
            border-bottom: 1px solid var(--border-color, #e1e4e8);
            border-right: 1px solid var(--border-color, #e1e4e8);
            background: var(--hover-bg, #f6f8fa);
        }
        .tut-theme, .tut-burger {
            margin-left: auto;
            font-size: 18px;
            line-height: 1;
            background: none;
            border: none;
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
        }
        .tut-burger { display: none; margin-left: 0; }
        .tut-theme:hover, .tut-burger:hover { background: var(--hover-bg, #f6f8fa); }

        .tut-sidebar {
            grid-area: sidebar;
            overflow-y: auto;
            padding: 16px 12px 40px;
            border-right: 1px solid var(--border-color, #e1e4e8);
            background: var(--hover-bg, #f6f8fa);
        }
        .tut-group { margin-bottom: 20px; }
        .tut-group-name {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--text-muted, #6c757d);
            padding: 0 10px 6px;
        }
        .tut-navlink {
            display: flex;
            align-items: baseline;
            gap: 8px;
            padding: 7px 10px;
            border-radius: 7px;
            font-size: 14px;
            color: var(--text-secondary, #57606a);
            text-decoration: none;
        }
        .tut-navlink:hover { background: var(--selected-bg, #eaeef2); color: var(--text-color, #24292e); }
        .tut-navlink.active {
            background: var(--primary-color, #0969da);
            color: #fff;
        }
        .tut-navlink.active .tut-navnum { color: rgba(255,255,255,0.8); }
        .tut-navnum {
            font-variant-numeric: tabular-nums;
            font-size: 12px;
            color: var(--text-muted, #6c757d);
            min-width: 14px;
        }

        .tut-content {
            grid-area: content;
            overflow-y: auto;
            padding: 40px 32px;
        }

        .tut-chapter-nav {
            max-width: 820px;
            margin: 48px auto 0;
            padding-top: 24px;
            border-top: 1px solid var(--border-color, #e1e4e8);
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }
        .tut-pn {
            font: inherit;
            font-size: 14px;
            font-weight: 550;
            cursor: pointer;
            padding: 10px 16px;
            border-radius: 8px;
            border: 1px solid var(--border-color, #e1e4e8);
            background: var(--card-bg, #fff);
            color: var(--primary-color, #0969da);
            max-width: 46%;
            text-align: left;
        }
        .tut-pn.next { text-align: right; }
        .tut-pn:hover { background: var(--hover-bg, #f6f8fa); }

        .tut-scrim { display: none; }

        @media (max-width: 860px) {
            .tut-shell {
                grid-template-columns: 1fr;
                grid-template-rows: 54px 1fr;
                grid-template-areas: "topbar" "content";
            }
            .tut-brand { display: none; }
            .tut-burger { display: block; }
            .tut-theme { margin-left: auto; }
            .tut-sidebar {
                position: fixed;
                top: 0; left: 0; bottom: 0;
                width: 280px;
                z-index: 20;
                transform: translateX(-100%);
                transition: transform 0.2s ease;
            }
            .tut-shell.menu-open .tut-sidebar { transform: translateX(0); }
            .tut-scrim {
                display: block;
                position: fixed;
                inset: 0;
                z-index: 15;
                background: rgba(0,0,0,0.35);
            }
            .tut-content { padding: 24px 18px; }
        }
    `
}

export default defineComponent('tut-app', TutApp);
