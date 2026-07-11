import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class ComponentsChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 17 · Guides</p>
            <h1>The component library</h1>
            <p class="lead">
                VDX ships <strong>vdx-ui</strong> — 60+ ready-made <code>cl-*</code> components
                (forms, data tables, overlays, panels, menus). They're built with the same framework
                you've been learning, so they behave exactly like your own components.
            </p>

            <h2>Import and use</h2>
            <p>
                Registering them is one import. <code>vdx/ui/all.js</code> pulls in the whole set, or
                you can import just the files you need (<code>vdx/ui/form/input-text.js</code>) to keep
                things lean. Then drop the tag in — props are attributes, two-way binding is
                <code>x-model</code>, events are <code>on-*</code>:
            </p>

            <tut-live-example
                title="A form built from cl-* components"
                base="/site/tutorial/examples/components"
                files="App.js, index.html"
                activeFile="App.js">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> fill in the form and hit <em>Send feedback</em> — a
                <code>&lt;cl-dialog&gt;</code> opens, driven by the same <code>this.state.sent</code>
                boolean. Swap <code>&lt;cl-dropdown&gt;</code> for <code>&lt;cl-segmented&gt;</code>, or
                add a <code>&lt;cl-textarea&gt;</code> for comments.
            </p>

            <h2>They're just components</h2>
            <p>
                Nothing about <code>cl-*</code> is special. Because there's no shadow DOM, a
                <code>&lt;cl-dropdown&gt;</code> is right there in your element tree — you can inspect
                it in DevTools, style around it, and pass it arrays and objects as properties. Two-way
                binding works because each input component emits a <code>change</code> event carrying
                its value, which is exactly what <code>x-model</code> listens for.
            </p>

            <div class="callout tip">
                Browse every component live — with copy-paste source for each — in the
                <a href="/site/showcase/">component showcase</a>. The full prop/event reference is in
                <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/componentlib.md">docs/componentlib.md</a>.
            </div>

            <h2>A quick map</h2>
            <ul>
                <li><strong>Forms</strong> — <code>cl-input-text</code>, <code>cl-input-number</code>, <code>cl-textarea</code>, <code>cl-checkbox</code>, <code>cl-radio-button</code>, <code>cl-toggle</code>, <code>cl-slider</code>, <code>cl-rating</code>, <code>cl-calendar</code></li>
                <li><strong>Selection</strong> — <code>cl-dropdown</code>, <code>cl-multiselect</code>, <code>cl-autocomplete</code>, <code>cl-chips</code>, <code>cl-segmented</code></li>
                <li><strong>Buttons &amp; menus</strong> — <code>cl-button</code>, <code>cl-split-button</code>, <code>cl-menu</code>, <code>cl-breadcrumb</code>, <code>cl-context-menu</code></li>
                <li><strong>Overlays</strong> — <code>cl-dialog</code>, <code>cl-sidebar</code>, <code>cl-toast</code>, <code>cl-tooltip</code>, <code>cl-popover</code></li>
                <li><strong>Data &amp; panels</strong> — data tables, tree, paginator, accordion, tabs, cards, splitters, and virtual lists (chapter 11).</li>
            </ul>
        `;
    }
}

defineComponent('tut-ch-components', ComponentsChapter);
