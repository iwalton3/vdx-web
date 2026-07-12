import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../../../ui/misc/code-block.js';

class BestPracticesChapter extends TutChapter {
    constructor(props) {
        super(props);
        this.state = {
            eventsBad: '<button onclick="handleClick()">Save</button>',
            eventsGood: '<button on-click="handleClick">Save</button>',
            listBad: '${items.map(i => `<li>${i.name}</li>`).join("")}',
            listGood: '${each(items, item => html`<li>${item.name}</li>`, item => item.id)}',
            cleanup: [
                'mounted() {',
                '    this._timer = setInterval(this.tick, 1000);',
                '}',
                '',
                'unmounted() {',
                '    clearInterval(this._timer);   // always undo mounted()',
                '}'
            ].join('\n')
        };
    }

    template() {
        return html`
            <p class="eyebrow">Chapter 13 · Going further</p>
            <h1>Best practices</h1>
            <p class="lead">
                A short checklist that keeps VDX components predictable and fast.
            </p>

            <h2>Bind events with on-*</h2>
            <p>Never use inline <code>onclick</code> or <code>addEventListener</code>.</p>
            <div class="dd">
                <div class="dont"><span class="tag">Avoid</span>
                    <cl-code-block code="${this.state.eventsBad}" copyable="false"></cl-code-block>
                </div>
                <div class="do"><span class="tag">Prefer</span>
                    <cl-code-block code="${this.state.eventsGood}" copyable="false"></cl-code-block>
                </div>
            </div>

            <h2>Render lists with each()</h2>
            <p>Use <code>when()</code> and <code>each()</code> instead of ternaries and
               <code>.map().join()</code> — and give <code>each()</code> a key.</p>
            <div class="dd">
                <div class="dont"><span class="tag">Avoid</span>
                    <cl-code-block code="${this.state.listBad}" language="js" copyable="false"></cl-code-block>
                </div>
                <div class="do"><span class="tag">Prefer</span>
                    <cl-code-block code="${this.state.listGood}" language="js" copyable="false"></cl-code-block>
                </div>
            </div>

            <h2>Clean up in unmounted()</h2>
            <p>Every timer, listener, or subscription started in <code>mounted()</code> should be
               torn down in <code>unmounted()</code>.</p>
            <cl-code-block code="${this.state.cleanup}" language="js" copyable="false"></cl-code-block>

            <h2>A few more</h2>
            <ul>
                <li>Put props in <code>static props</code> — never as class fields.</li>
                <li>Getters must read only <code>state</code>, <code>stores</code>, or
                    <code>props</code>, so their caching stays correct.</li>
                <li>Use <code>x-model</code> for form inputs rather than wiring value + input by
                    hand.</li>
                <li>Isolate high-frequency updates with <code>contain()</code> so they don't
                    re-render expensive neighbours.</li>
                <li>Need the DOM after a change? <code>await this.nextRender()</code> — not
                    <code>requestAnimationFrame</code> or timeouts.</li>
                <li>Fetching on user input? <code>this.createTask()</code> so a stale response
                    can't overwrite a newer one.</li>
                <li>Pass objects and arrays as real values
                    (<code>options="\${items}"</code>) — never <code>JSON.stringify</code> them.</li>
                <li>Write components as classes. Very old code may use a deprecated
                    options-object form of <code>defineComponent</code> — it still runs, but don't
                    write new code in it.</li>
            </ul>
        `;
    }

    static styles = /*css*/`
        .dd { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
        @media (max-width: 620px) { .dd { grid-template-columns: 1fr; } }
        .dd .tag { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .dd .dont .tag { color: var(--error-color, #cf222e); }
        .dd .do .tag { color: var(--success-color, #1a7f37); }
    `
}

defineComponent('tut-ch-best', BestPracticesChapter);
