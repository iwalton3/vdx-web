/**
 * Landing-page components. The landing page is itself built with VDX and served
 * with no build step - the clearest possible proof of the pitch.
 *
 *   landing-live   - a horizontal (code | preview) live example, reusing the same
 *                    <cl-code-runner> the tutorial and showcase use.
 *   vdx-hero-demo  - a tiny reactive widget that runs inline in the hero, showing
 *                    a component dropped straight into static HTML.
 */
import { defineComponent, Component, html, when } from '../../lib/framework.js';
import '../../ui/misc/code-runner.js';

export class LandingLive extends Component {
    static props = {
        base: '',
        files: null,
        entry: '',
        activeFile: '',
        previewLabel: 'Live preview'
    };

    constructor(props) {
        super(props);
        this.state = { filesData: null };
    }

    mounted() {
        const names = this._fileList();
        if (!names.length) return;
        const base = (this.props.base || '').replace(/\/$/, '');
        Promise.all(names.map((name) =>
            fetch(base ? `${base}/${name}` : name)
                .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.text(); })
                .then((text) => ({ name, code: text.replace(/\s+$/, '\n') }))
                .catch((err) => ({ name, code: `// Failed to load ${name}\n// ${err.message}\n` }))
        )).then((loaded) => {
            const ordered = {};
            for (const name of names) {
                const hit = loaded.find((l) => l.name === name);
                if (hit) ordered[name] = hit.code;
            }
            this.state.filesData = ordered;
        });
    }

    _fileList() {
        const f = this.props.files;
        if (Array.isArray(f)) return f.slice();
        if (typeof f === 'string' && f.trim()) return f.trim().split(/[\s,]+/);
        return [];
    }

    template() {
        return html`
            <div class="landing-live">
                ${when(this.state.filesData,
                    html`
                        <cl-code-runner
                            files="${this.state.filesData}"
                            entry="${this.props.entry}"
                            activeFile="${this.props.activeFile}"
                            previewLabel="${this.props.previewLabel}"
                            height="330px"
                            previewHeight="330px">
                        </cl-code-runner>
                    `,
                    html`<div class="landing-live-loading">Loading example…</div>`
                )}
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }
        .landing-live {
            border: 1px solid var(--border-color, #e1e4e8);
            border-radius: 14px;
            overflow: hidden;
            background: var(--card-bg, #fff);
            box-shadow: 0 18px 40px -28px rgba(0,0,0,.4);
        }
        .landing-live cl-code-runner .cl-runner { border: 0; border-radius: 0; }

        /* Side-by-side on wide screens: code left, preview right (light DOM, so we
           can flip the runner's own layout). Stacks back to a column on mobile. */
        @media (min-width: 760px) {
            .landing-live cl-code-runner .cl-runner { flex-direction: row; align-items: stretch; }
            .landing-live cl-code-runner .cl-pane-code {
                flex: 1 1 55%; min-width: 0;
                border-bottom: 0;
                border-right: 1px solid var(--border-color, #e1e4e8);
            }
            .landing-live cl-code-runner .cl-pane-preview { flex: 1 1 45%; min-width: 0; border-top: 0; }
        }
        .landing-live-loading {
            padding: 60px 16px; text-align: center;
            color: var(--text-muted, #6c757d); font-size: 14px;
        }
    `;
}

defineComponent('landing-live', LandingLive);


// A component you just drop into the page. This is the whole story.
export class HeroDemo extends Component {
    constructor(props) {
        super(props);
        this.state = { count: 0 };
    }

    template() {
        return html`
            <button class="hero-chip" on-click="${() => this.state.count++}">
                <span class="hero-chip-dot"></span>
                clicked <strong>${this.state.count}</strong> ${this.state.count === 1 ? 'time' : 'times'}
            </button>
        `;
    }

    static styles = /*css*/`
        .hero-chip {
            display: inline-flex; align-items: center; gap: 9px;
            font: inherit; font-size: 14px; cursor: pointer;
            padding: 9px 16px; border-radius: 999px;
            border: 1px solid var(--vdx-line);
            background: var(--vdx-surface); color: var(--vdx-text);
            transition: border-color .15s ease, transform .06s ease;
        }
        .hero-chip:hover { border-color: var(--vdx-accent); }
        .hero-chip:active { transform: scale(.97); }
        .hero-chip strong { color: var(--vdx-accent); font-variant-numeric: tabular-nums; }
        .hero-chip-dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: var(--vdx-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--vdx-accent) 22%, transparent);
        }
    `;
}

defineComponent('vdx-hero-demo', HeroDemo);
