import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class InteractiveListsChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 18 · Guides</p>
            <h1>Interactive lists</h1>
            <p class="lead">
                Drag-reorder, right-click menus, long-press — the fiddly parts of a list UI,
                already packaged. This stack was extracted from a production music player's queue.
            </p>

            <h2>Drag-reorder in one tag</h2>
            <p>
                <code>&lt;cl-orderable-list&gt;</code> takes an array in <code>value</code>, lets the
                user drag rows (with a touch fallback on mobile), and emits the reordered array as
                a change event. That means <code>x-model</code> works on it — the playlist below
                reorders itself into state with no handler code at all.
            </p>

            <h2>Context menus anywhere</h2>
            <p>
                <code>&lt;cl-context-menu&gt;</code> is a popup menu that opens at any
                <code>(x, y)</code> — it isn't tied to a trigger button. Give it an
                <code>items</code> array (<code>label</code>, optional <code>icon</code>,
                <code>shortcut</code>, <code>danger</code>, <code>separator</code>), then open it
                from a right-click with <code>this.refs.menu.openAtEvent(e, context)</code>. The
                <code>context</code> you pass comes back in the <code>select</code> event, so one
                menu serves every row. It flips and clamps to stay inside the viewport, and only
                one is ever open at a time.
            </p>

            <tut-live-example
                title="A playlist with reorder + a right-click menu"
                base="/site/tutorial/examples/lists"
                files="App.js, index.html"
                activeFile="App.js">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> drag the playlist into a new order, then right-click a
                track in <em>Library</em> — <em>Queue</em> appends it to the playlist,
                <em>Remove</em> is a <code>danger</code> item. Add a
                <code>shortcut: '⌘Q'</code> hint to the Queue item, or a
                <code>{ separator: true }</code> between the groups.
            </p>

            <h2>Under the hood: <code>createRowGestures</code></h2>
            <p>
                When the packaged components don't fit — multi-select drags, windowed queues with
                thousands of rows, long-press on touch — <code>lib/gestures.js</code> exposes the
                controller they're built from. <code>createRowGestures(this, options)</code> owns
                all the gesture state (drag index, drop gap, long-press timers) and hands you thin
                handlers to bind with <code>on-*</code>; you keep full control of the markup. It
                composes with <code>createWindowing</code>, the primitive under
                <code>&lt;cl-virtual-list&gt;</code> from chapter 11, so a 5,000-row queue can be
                windowed <em>and</em> reorderable.
            </p>

            <div class="callout warn">
                Touch handlers in a scrollable list must not block scrolling. The controller
                documents exactly which of its handlers may call <code>preventDefault</code>:
                bind the safe ones with the passive modifier
                (<code>on-touchstart-passive</code>, <code>on-touchmove-passive</code> — chapter 3)
                and the drag-suppressing ones without it. The table at the top of
                <a href="https://github.com/iwalton3/vdx-web/blob/main/lib/gestures.js">lib/gestures.js</a>
                is the contract — follow it and long-press tracking never janks a scroll.
            </div>
        `;
    }
}

defineComponent('tut-ch-lists', InteractiveListsChapter);
