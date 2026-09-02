// Scanner fixture, not a check of its own: `n++ / 2` is division, but a walker
// that tracks only one previous significant character sees a bare `+` and
// treats the rest of the line as a regex body - silently swallowing any
// template on that line. Two of the three walkers guarded against this; the
// third did not, so a violation was reported or not depending purely on where
// the line break fell. All three share one classifier now.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class ScannerRegex extends Component {
    state = { n: 0 };
    template() {
        let n = this.state.n;
        // Violation on the SAME line as the increment-then-divide.
        n++ / 2; return html`<button onclick="a()">a</button>`; // LINT-EXPECT: t10-inline-events
    }

    other() {
        let n = this.state.n;
        n++ / 2;
        // Same violation, next line - this form was always caught.
        return html`<button onclick="b()">b</button>`; // LINT-EXPECT: t10-inline-events
    }

    // Real regex literals must still be skipped, not scanned as markup.
    clean() {
        const re = /<button onclick="c()">/g;
        void re;
        return html`<button on-click="handleOk">c</button>`;
    }

    handleOk() {}
}

defineComponent('t14-scanner-regex', ScannerRegex);
