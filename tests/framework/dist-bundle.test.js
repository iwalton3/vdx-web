/**
 * The real bundle. Every other file here imports lib/, and dist/ is what an
 * app ships - so dist/ can fail to parse, or lag lib/, while this whole suite
 * is green. This one imports /dist/framework.js and renders through it: a
 * component with props, host-applied attributes, children, a keyed list, a
 * contain() boundary and a literal form default, then an update. Not a
 * contract test; a "does the artifact boot and do the basics" test.
 * tests/node/dist-check.mjs is the other half (parses, is fresh), and
 * tests/e2e/run-framework-tests.js runs it first.
 */

import { describe, assert } from './test-runner.js';

describe('dist bundle', function(it) {
    it('renders through /dist/framework.js, not lib/', async () => {
        // A second copy of the framework in the page: its own registry, its
        // own reactivity. Tag names must not collide with anything lib/ owns.
        const F = await import('/dist/framework.js');
        const { Component, defineComponent, html, when, each, contain, nextRender, flushSync } = F;

        class DistChild extends Component {
            static props = { count: 0, spellcheck: false, label: '' };
            template() {
                return html`<div class="c" spellcheck="${this.props.spellcheck}">${this.props.label}:${this.props.count}<section>${this.props.children}</section></div>`;
            }
        }
        defineComponent('dist-child', DistChild);
        class DistHost extends Component {
            constructor(p) { super(p); this.state = { n: 1, items: [1, 2, 3], on: true }; }
            template() {
                return html`
                    <dist-child count="${this.state.n}" spellcheck="${false}" label="${'x'}" hidden="${!this.state.on}" data-k="${{ a: 1 }}"><b>${this.state.n}</b></dist-child>
                    <ul>${each(this.state.items, i => html`<li class="${when(i % 2, () => 'odd', () => 'even')}">${i}</li>`, i => i)}</ul>
                    <p>${contain(() => this.state.n * 2)}</p>
                    <input value="lit" data-d="${''}">`;
            }
        }
        defineComponent('dist-host', DistHost);

        const host = document.createElement('dist-host');
        document.body.appendChild(host);
        await nextRender();
        flushSync(() => { host.state.n = 2; host.state.on = false; host.state.items = [3, 2, 1]; });
        await nextRender();

        const child = host.querySelector('dist-child');
        assert.equal(child.querySelector('.c').textContent, 'x:22', 'props, text and children updated');
        assert.equal(child.props.count, 2, 'a number prop arrives as a number');
        assert.equal(child.props.spellcheck, false, 'a declared host-applied name reaches the prop');
        assert.equal(child.getAttribute('spellcheck'), 'false', 'and the host');
        assert.equal(child.hasAttribute('hidden'), true, 'hidden follows the update');
        assert.equal(child.hasAttribute('data-k'), false, 'an object is not stringified into data-*');
        assert.equal([...host.querySelectorAll('li')].map(l => l.className + l.textContent).join(' '),
            'odd3 even2 odd1', 'keyed list reconciled, when() in attribute position resolved');
        assert.equal(host.querySelector('p').textContent, '4', 'contain() boundary updated');
        assert.equal(host.querySelector('input').defaultValue, 'lit', 'a literal value is the form default');
        host.remove();
    });
});
