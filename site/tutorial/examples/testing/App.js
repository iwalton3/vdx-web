import { defineComponent, Component, html, each, when, flushSync } from 'vdx/lib/framework.js';

// The thing under test — an ordinary component. (Note: we name the methods
// addItem/removeItem, not add/remove — a component IS its element, so a method
// called `remove` would shadow the native Element.remove().)
class ShoppingList extends Component {
    constructor(props) {
        super(props);
        this.state = { items: [] };
    }
    addItem(name) { this.state.items.push(name); }
    removeItem(i) { this.state.items.splice(i, 1); }
    get count() { return this.state.items.length; }

    template() {
        return html`<ul>${each(this.state.items, (x) => html`<li>${x}</li>`)}</ul>`;
    }
}
defineComponent('shopping-list', ShoppingList);


// A tiny test harness — no test framework, no renderer, no act(). Mount a
// component, call its methods, read its state and DOM. That's the whole story.
class TestRunner extends Component {
    constructor(props) {
        super(props);
        this.state = { results: [] };
    }

    mounted() {
        const out = [];
        const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
        const test = (name, fn) => {
            const els = [];
            const mount = (tag) => { const el = document.createElement(tag); document.body.appendChild(el); els.push(el); return el; };
            try { fn(mount); out.push({ name, ok: true }); }
            catch (e) { out.push({ name, ok: false, msg: e.message }); }
            finally { els.forEach((el) => el.remove()); }  // native Element.remove()
        };

        test('starts empty', (mount) => {
            const el = mount('shopping-list');
            assert(el.count === 0, `expected 0, got ${el.count}`);
        });
        test('addItem grows the list', (mount) => {
            const el = mount('shopping-list');
            el.addItem('milk'); el.addItem('eggs');
            assert(el.count === 2, `expected 2, got ${el.count}`);
        });
        test('removeItem shrinks it', (mount) => {
            const el = mount('shopping-list');
            el.addItem('a'); el.removeItem(0);
            assert(el.count === 0, `expected 0, got ${el.count}`);
        });
        test('renders each item to the DOM', (mount) => {
            const el = mount('shopping-list');
            flushSync(() => el.addItem('apples'));   // flush so we can read the DOM now
            assert(el.textContent.includes('apples'), 'DOM should show the item');
        });

        this.state.results = out;
    }

    template() {
        const passed = this.state.results.filter((r) => r.ok).length;
        return html`
            <h4>${passed}/${this.state.results.length} passing</h4>
            <ul class="results">
                ${each(this.state.results, (r) => html`
                    <li class="${r.ok ? 'ok' : 'fail'}">
                        <span class="mark">${r.ok ? '✓' : '✗'}</span> ${r.name}
                        ${when(!r.ok, html`<code>${r.msg}</code>`)}
                    </li>
                `)}
            </ul>
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 24px; font-family: system-ui, sans-serif; }
        h4 { margin: 0 0 12px; font-size: 15px; }
        .results { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .results li { font-size: 14px; padding: 7px 10px; border-radius: 7px; background: var(--hover-bg, #f6f8fa); }
        .results li.ok { color: var(--success-text, #116329); }
        .results li.fail { color: var(--error-text, #b62324); }
        .mark { font-weight: 700; }
        code { font-family: ui-monospace, monospace; font-size: 12px; margin-left: 6px; }
    `;
}
defineComponent('test-runner', TestRunner);
