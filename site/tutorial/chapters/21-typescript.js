import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../../../ui/misc/code-block.js';

class TypeScriptChapter extends TutChapter {
    constructor(props) {
        super(props);
        this.state = {
            typedEx: [
                "import { defineComponent, Component, html, each } from 'vdx/lib/framework.js';",
                '',
                'interface TaskProps { title: string; }',
                'interface TaskState { items: string[]; }',
                '',
                'class TaskList extends Component<TaskProps, TaskState> {',
                "    static props = { title: 'Tasks' };",
                '',
                '    constructor(props: TaskProps) {',
                '        super(props);',
                '        this.state = { items: [] };      // typed as string[]',
                '    }',
                '',
                '    add(name: string) { this.state.items.push(name); }',
                '',
                '    template() {',
                '        return html`<h2>${this.props.title}</h2>',
                '            <ul>${each(this.state.items, (t) => html`<li>${t}</li>`)}</ul>`;',
                '    }',
                '}',
                '',
                "defineComponent('task-list', TaskList);"
            ].join('\n')
        };
    }

    template() {
        return html`
            <p class="eyebrow">Chapter 21 · Guides</p>
            <h1>TypeScript</h1>
            <p class="lead">
                TypeScript is fully supported and entirely optional. VDX ships hand-written
                <code>.d.ts</code> declarations, so you get types and editor autocomplete — with or
                without a compile step.
            </p>

            <h2>Types without a build</h2>
            <p>
                The declarations live next to the source (<code>lib/framework.d.ts</code>,
                <code>lib/router.d.ts</code>, <code>lib/utils.d.ts</code>, and the component-library
                types). Point your editor or <code>tsc</code> at them and you get checking on the same
                unbundled ES modules that run in the browser — no transform required to be productive:
            </p>
            <pre class="ex"><code># type-check only, emit nothing — your .js still runs as-is
tsc --noEmit</code></pre>

            <h2>A typed component</h2>
            <p>
                <code>Component</code> is generic in its props and state:
                <code>Component&lt;Props, State&gt;</code>. Declare interfaces for each and everything
                downstream is checked:
            </p>
            <cl-code-block code="${this.state.typedEx}" language="js" copyable="false"></cl-code-block>
            <p>
                Router definitions are typed too — <code>import type { RouteDefinitions } from
                'vdx/lib/router.js'</code> gives you a checked route map.
            </p>

            <h2>If you do want a build</h2>
            <p>
                TypeScript is the one case where a compile step buys you something (stripping types),
                and it slots in cleanly: compile your <code>.ts</code> to <code>.js</code> and deploy
                the output exactly as in <a href="/site/tutorial.html#production">chapter&nbsp;19</a>.
                It stays your choice — the framework never requires it.
            </p>

            <div class="callout tip">
                A complete typed app — a task manager with typed routes, stores and components — lives
                in <a href="https://github.com/iwalton3/vdx-web/tree/main/examples/ts-demo">examples/ts-demo</a>,
                and the setup is documented in
                <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/typescript.md">docs/typescript.md</a>.
            </div>
        `;
    }

    static styles = /*css*/`
        .ex { background: var(--code-bg, rgba(175,184,193,0.15)); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 14px 0; }
        .ex code { background: none; padding: 0; font-size: 0.82em; line-height: 1.6; white-space: pre; }
    `;
}

defineComponent('tut-ch-typescript', TypeScriptChapter);
