import { defineComponent, html } from '../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class CommunicationChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 6 · Working with data</p>
            <h1>Component communication</h1>
            <p class="lead">
                Components talk in one direction: data flows <strong>down</strong> through props,
                and events flow <strong>up</strong> through custom events.
            </p>

            <h2>Props down</h2>
            <p>
                A parent passes data to a child with an attribute:
                <code>&lt;rating-stars value="\${this.state.score}"&gt;</code>. Objects, arrays, and
                functions pass through as-is — no stringifying.
            </p>

            <h2>Events up</h2>
            <p>
                A child never mutates its parent. Instead it dispatches a
                <code>CustomEvent</code>, and the parent listens with <code>on-*</code>:
                <code>&lt;rating-stars on-rate="onRate"&gt;</code>. The star picker below is a
                child component; the parent owns the score.
            </p>

            <tut-live-example
                title="Props down, events up"
                base="/tutorial/examples/communication"
                files="App.js, index.html">
            </tut-live-example>

            <h2>Children &amp; slots</h2>
            <p>
                Content placed between a component's tags is available as
                <code>this.props.children</code> — that's how <code>&lt;info-card&gt;</code> in the
                example renders the paragraph written in <code>index.html</code>. Named slots
                (<code>this.props.slots.footer</code>) work too, for multi-region layouts.
            </p>

            <div class="callout tip">
                Passing a callback down as a prop
                (<code>onSelect="\${this.handleSelect}"</code>) is also fine — but reaching
                <em>up</em> with an event keeps children reusable and unaware of who's listening.
            </div>
        `;
    }
}

defineComponent('tut-ch-communication', CommunicationChapter);
