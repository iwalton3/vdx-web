/**
 * tut-live-example - a titled tutorial cell wrapping <cl-code-runner>.
 *
 * Fetches an example's files from a directory and hands them to the reusable
 * runner (componentlib/misc/code-runner.js), which owns the tabbed editor and
 * the sandboxed live preview. This component just adds the fetch + the cell
 * chrome (title) so chapters can drop in an example by path.
 *
 * Props:
 *   base       - directory the files live in, e.g. "/tutorial/examples/counter"
 *   files      - filenames: array, or a comma/space-separated string (tab order)
 *   entry      - HTML entry filename (default: the first *.html)
 *   activeFile - filename to open first
 *   title      - optional heading above the cell
 *   previewLabel - label above the preview pane
 */
import { defineComponent, html, when, Component } from '../lib/framework.js';
import '../componentlib/misc/code-runner.js';

export class TutLiveExample extends Component {
    static props = {
        base: '',
        files: null,
        entry: '',
        activeFile: '',
        title: '',
        previewLabel: 'Result'
    }

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
            const map = {};
            for (const { name, code } of loaded) map[name] = code;
            // Preserve the listed order (Object insertion order = tab order).
            const ordered = {};
            for (const n of names) if (n in map) ordered[n] = map[n];
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
            <div class="tut-live">
                ${when(this.props.title, html`<h3 class="tut-live-title">${this.props.title}</h3>`)}
                ${when(this.state.filesData,
                    html`
                        <cl-code-runner
                            files="${this.state.filesData}"
                            entry="${this.props.entry}"
                            activeFile="${this.props.activeFile}"
                            previewLabel="${this.props.previewLabel}"
                            height="300px"
                            previewHeight="360px">
                        </cl-code-runner>
                    `,
                    html`<div class="tut-live-loading">Loading example…</div>`
                )}
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; margin: 24px 0; }

        .tut-live {
            border: 1px solid var(--border-color, #e1e4e8);
            border-radius: 10px;
            overflow: hidden;
            background: var(--card-bg, #fff);
        }

        .tut-live-title {
            margin: 0;
            padding: 12px 16px;
            font-size: 15px;
            border-bottom: 1px solid var(--border-color, #e1e4e8);
            background: var(--hover-bg, #f6f8fa);
        }

        /* The runner draws its own border; drop the doubled one inside the cell. */
        .tut-live cl-code-runner .cl-runner { border: 0; border-radius: 0; }

        .tut-live-loading {
            padding: 40px 16px;
            text-align: center;
            color: var(--text-muted, #6c757d);
            font-size: 14px;
        }
    `
}

export default defineComponent('tut-live-example', TutLiveExample);
