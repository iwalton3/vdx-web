import { defineComponent, Component, html, when, each } from 'vdx/lib/framework.js';

// A fake search API with deliberately hostile latency: SHORT queries are SLOW.
// Type "vend" quickly and the response for "v" arrives long after the response
// for "vend" - the classic out-of-order async bug, on demand.
const CORPUS = [
    'vanilla js', 'vdx framework', 'vendored code', 'virtual list',
    'version counter', 'view layer', 'vendor folder', 'velocity'
];
function searchApi(query, signal) {
    const delay = 150 + Math.max(0, 4 - query.length) * 350;   // 1 char ≈ 1.2s, 4+ ≈ 150ms
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            resolve(CORPUS.filter((x) => x.includes(query.toLowerCase())));
        }, delay);
        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(t);
                reject(new DOMException('superseded', 'AbortError'));
            });
        }
    });
}

// ❌ The naive version: await, then assign. Whichever response lands LAST
// wins - even if it answers a query the user already typed past.
class NaiveSearch extends Component {
    constructor(props) {
        super(props);
        this.state = { query: '', hits: [], resultsFor: null, busy: 0 };
    }

    async onInput(e, value) {
        this.state.query = value;
        if (!value) { this.state.hits = []; this.state.resultsFor = null; return; }
        this.state.busy++;
        const hits = await searchApi(value, null);   // no cancellation, no guard
        this.state.busy--;
        this.state.hits = hits;                       // stale response can win!
        this.state.resultsFor = value;
    }

    template() {
        const stale = this.state.resultsFor !== null && this.state.resultsFor !== this.state.query;
        return html`
            <div class="box">
                <h4>❌ naive await</h4>
                <input placeholder="type 'vend' fast" value="${this.state.query}" on-input="onInput" spellcheck="false">
                ${when(this.state.busy > 0, html`<p class="pending">searching…</p>`)}
                ${when(stale, html`<p class="stale">⚠ showing results for "${this.state.resultsFor}"</p>`)}
                <ul>${each(this.state.hits, (h) => html`<li>${h}</li>`)}</ul>
            </div>
        `;
    }

    static styles = /*css*/`
        .box { font-family: system-ui, sans-serif; }
        h4 { margin: 0 0 8px; }
        input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #8886; border-radius: 8px; font: inherit; }
        ul { list-style: none; padding: 0; margin: 8px 0 0; }
        li { padding: 5px 8px; border-bottom: 1px solid #8883; font-size: 14px; }
        .pending { margin: 8px 0 0; font-size: 12.5px; color: #8898a8; }
        .stale { margin: 8px 0 0; font-size: 12.5px; color: #c0392b; font-weight: 600; }
    `;
}
defineComponent('naive-search', NaiveSearch);

// ✅ The task version: run() aborts the previous request, and a superseded
// body dies at its await (AbortError) before the commit line runs. The
// results can never belong to an old query.
class TaskSearch extends Component {
    constructor(props) {
        super(props);
        this.state = { query: '', hits: [], resultsFor: null };
    }

    search = this.createTask(async (signal, query) => {
        const hits = await searchApi(query, signal);
        this.state.hits = hits;               // reached only if still current
        this.state.resultsFor = query;
    });

    onInput(e, value) {
        this.state.query = value;
        if (value) {
            this.search.run(value);
        } else {
            this.search.cancel();
            this.state.hits = [];
            this.state.resultsFor = null;
        }
    }

    template() {
        return html`
            <div class="box">
                <h4>✅ createTask</h4>
                <input placeholder="type 'vend' fast" value="${this.state.query}" on-input="onInput" spellcheck="false">
                ${when(this.search.pending, html`<p class="pending">searching…</p>`)}
                <ul>${each(this.state.hits, (h) => html`<li>${h}</li>`)}</ul>
            </div>
        `;
    }

    static styles = /*css*/`
        .box { font-family: system-ui, sans-serif; }
        h4 { margin: 0 0 8px; }
        input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #8886; border-radius: 8px; font: inherit; }
        ul { list-style: none; padding: 0; margin: 8px 0 0; }
        li { padding: 5px 8px; border-bottom: 1px solid #8883; font-size: 14px; }
        .pending { margin: 8px 0 0; font-size: 12.5px; color: #8898a8; }
    `;
}
defineComponent('task-search', TaskSearch);
