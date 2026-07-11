import { defineComponent, html } from '../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class BindingChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 4 · Working with data</p>
            <h1>Two-way binding</h1>
            <p class="lead">
                <code>x-model</code> keeps a form control and a piece of state in sync — in both
                directions.
            </p>

            <h2>x-model</h2>
            <p>
                Add <code>x-model="fieldName"</code> to an input, textarea, or select. Typing
                updates the state; changing the state updates the control. VDX converts values by
                input type automatically: <code>type="number"</code> binds a number,
                <code>type="checkbox"</code> binds a boolean.
            </p>

            <tut-live-example
                title="A live-bound form"
                base="/tutorial/examples/binding"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> edit the fields and watch the state object on the right
                update instantly. Add a new <code>&lt;input type="range" x-model="age"&gt;</code> —
                it stays in sync with the number field, because both bind the same state.
            </p>

            <div class="callout">
                The library's form components (<code>&lt;cl-input-text&gt;</code>,
                <code>&lt;cl-checkbox&gt;</code>, …) support <code>x-model</code> too — they emit
                their own change events so binding composes exactly like a native input.
            </div>
        `;
    }
}

defineComponent('tut-ch-binding', BindingChapter);
