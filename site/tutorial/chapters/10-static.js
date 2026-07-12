import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class StaticChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 10 · Building apps</p>
            <h1>Static-site integration</h1>
            <p class="lead">
                VDX components are just custom elements, so they drop into any static HTML page —
                a blog, a docs site, a landing page — with no build step.
            </p>

            <h2>Islands of interactivity</h2>
            <p>
                You don't have to hand the whole page to a framework. Keep your HTML static and add
                interactive <strong>islands</strong> only where you need them. In the
                <code>index.html</code> tab below, the article is plain markup; two custom elements
                add a "helpful" button and a newsletter form.
            </p>

            <h2>HTML configures components</h2>
            <p>
                Static content can configure a component through attributes. The like button reads
                its starting count from <code>count="128"</code> in the HTML — a kebab-case
                attribute becomes a prop. One <code>&lt;script type="module"&gt;</code> boots every
                island on the page.
            </p>

            <tut-live-example
                title="Interactive islands in a static article"
                base="/site/tutorial/examples/static"
                files="index.html, App.js"
                activeFile="index.html">
            </tut-live-example>

            <h2>Rich data: JSON hydration</h2>
            <p>
                Attributes are strings, and stuffing JSON into one means escaping every quote
                (people resort to base64 for this — don't). VDX has a first-class answer: a
                <code>json-*</code> attribute names a <code>&lt;script type="application/json"&gt;</code>
                block by id, and the framework parses it straight into the matching prop before
                mount. The <em>Related posts</em> island in the example gets its whole array this
                way — <code>json-posts="related-data"</code> becomes
                <code>this.props.posts</code>. The JSON needs no escaping, stays readable in
                view-source, is trivial for a static-site generator to emit, and several
                components can share one block.
            </p>

            <p class="try">
                <strong>Try it:</strong> change <code>count="128"</code> in the HTML, add a
                second <code>&lt;like-button label="Star"&gt;</code>, or add a fourth post to the
                JSON block and watch the list grow. No rebuild — just edit and run.
            </p>

            <div class="callout">
                This is one of VDX's core strengths: progressive enhancement without a toolchain.
                The same components also work inside a full single-page app — the framework doesn't
                care whether it owns the page or a corner of it.
            </div>
        `;
    }
}

defineComponent('tut-ch-static', StaticChapter);
