/**
 * Component reconnection tests (synchronous disconnect->reconnect)
 *
 * Custom elements fire disconnectedCallback + connectedCallback SYNCHRONOUSLY
 * when moved in the DOM (drag-reorder, re-parenting, list re-keying). These
 * tests pin the per-connect-generation fixes: lifecycle pairing, light-DOM
 * children captured once, component-bound task re-arming, whenMounted's
 * per-connect ready promise, and attribute changes applied while detached.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, Component, html, when, flushSync } from '../../lib/framework.js';

const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));

describe('Component reconnection (synchronous DOM moves)', function(it) {

    it('a synchronous move fires mounted/unmounted as balanced pairs', async () => {
        const log = [];
        defineComponent('recon-pair', {
            data() { return {}; },
            mounted() { log.push('m'); },
            unmounted() { log.push('u'); },
            template() { return html`<span>x</span>`; }
        });

        const a = document.createElement('div');
        const b = document.createElement('div');
        document.body.append(a, b);
        const el = document.createElement('recon-pair');
        a.appendChild(el);
        await tick();
        assert.equal(log.join(''), 'm', 'initial connect mounts once');

        b.appendChild(el);   // synchronous disconnect->reconnect
        await tick();
        assert.equal(log.join(''), 'mum', 'move = one unmount + one mount (no double mounted)');

        el.remove();
        await tick();
        assert.equal(log.join(''), 'mumu', 'final removal unmounts once');
        a.remove(); b.remove();
    });

    it('a move in the same task as first connect yields ONE mounted and no orphan unmounted', async () => {
        const log = [];
        defineComponent('recon-fastmove', {
            data() { return {}; },
            mounted() { log.push('m'); },
            unmounted() { log.push('u'); },
            template() { return html`<span>x</span>`; }
        });

        const a = document.createElement('div');
        const b = document.createElement('div');
        document.body.append(a, b);
        const el = document.createElement('recon-fastmove');
        a.appendChild(el);
        b.appendChild(el);   // same task - before the mount microtask ran
        await tick();
        assert.equal(log.join(''), 'm',
            'exactly one mounted; unmounted() is NOT delivered for a mount that never ran');
        a.remove(); b.remove();
    });

    it('light-DOM children survive a move (own render output is not re-captured)', async () => {
        defineComponent('recon-kids', {
            data() { return {}; },
            template() {
                return html`<div class="frame">${this.props.children}</div>`;
            }
        });

        const a = document.createElement('div');
        const b = document.createElement('div');
        document.body.append(a, b);
        a.innerHTML = '<recon-kids><span class="orig">hi</span></recon-kids>';
        await tick();

        const el = a.querySelector('recon-kids');
        assert.equal(el.props.children.length, 1, 'child captured at first connect');
        assert.ok(el.querySelector('.frame .orig'), 'child rendered inside template');

        b.appendChild(el);   // synchronous move
        await tick();

        assert.equal(el.props.children.length, 1,
            'props.children still the original capture (not the rendered output)');
        assert.equal(el.props.children[0].className, 'orig', 'the captured node is the light-DOM child');
        assert.equal(el.querySelectorAll('.frame').length, 1, 'exactly one rendered frame (no duplication)');
        assert.ok(el.querySelector('.frame .orig'), 'child re-rendered inside template after move');
        assert.equal(el.querySelector('.frame .orig').textContent, 'hi', 'child content intact');
        a.remove(); b.remove();
    });

    it('createTask() from a class constructor still works after a move', async () => {
        class ReconTask extends Component {
            t = this.createTask(async (signal, v) => {
                this.state.last = v;
                return v;
            });
            constructor(props) {
                super(props);
                this.state = { last: null };
            }
            template() { return html`<i class="last">${this.state.last}</i>`; }
        }
        defineComponent('recon-task', ReconTask);

        const a = document.createElement('div');
        const b = document.createElement('div');
        document.body.append(a, b);
        const el = document.createElement('recon-task');
        a.appendChild(el);
        await tick();

        assert.equal(await el.t.run(1), 1, 'task runs before the move');

        b.appendChild(el);   // synchronous move (disconnect used to dispose the task)
        await tick();

        const result = await el.t.run(42);
        assert.equal(result, 42, 'task still runs after reconnect (was permanently dead)');
        await tick();
        assert.equal(el.querySelector('.last').textContent, '42', 'committed state rendered');
        a.remove(); b.remove();
    });

    it('whenMounted() does not resolve a detached element; resolves after reconnect', async () => {
        defineComponent('recon-waiter', {
            data() { return {}; },
            template() { return html`<div class="slot-area"></div>`; }
        });
        defineComponent('recon-child', {
            data() { return {}; },
            template() { return html`<em>c</em>`; }
        });

        const a = document.createElement('div');
        document.body.append(a);
        const parent = document.createElement('recon-waiter');
        a.appendChild(parent);
        await tick();

        const child = document.createElement('recon-child');
        parent.appendChild(child);
        await tick();

        child.remove();   // detach - old _ready is resolved by disconnect
        let resolved = null, done = false;
        parent.whenMounted(child).then(v => { resolved = v; done = true; });
        await tick();
        assert.equal(done, false, 'must NOT resolve while the element is detached');

        parent.appendChild(child);   // reconnect
        await tick();
        assert.equal(done, true, 'resolves once the element re-mounted');
        assert.ok(resolved === child && child.isConnected, 'resolved the connected element');
        a.remove();
    });

    it('attribute changes applied while detached are visible after reconnect', async () => {
        defineComponent('recon-attr', {
            props: { label: 'default' },
            template() { return html`<b class="out">${this.props.label}</b>`; }
        });

        const a = document.createElement('div');
        document.body.append(a);
        const el = document.createElement('recon-attr');
        a.appendChild(el);
        await tick();
        assert.equal(el.querySelector('.out').textContent, 'default', 'initial render');

        el.remove();                         // detach
        el.setAttribute('label', 'updated'); // change while detached (was silently lost)
        a.appendChild(el);                   // reconnect
        await tick();

        assert.equal(el.props.label, 'updated', 'prop reflects the detached attribute write');
        assert.equal(el.querySelector('.out').textContent, 'updated', 'render reflects it');
        a.remove();
    });

    it('a structure change queued before a synchronous move does not double-instantiate', async () => {
        defineComponent('recon-zombie', {
            data() { return { on: false }; },
            template() {
                // Different template per branch -> structural re-instantiation
                return this.state.on
                    ? html`<div class="branch on">ON</div>`
                    : html`<div class="branch off">OFF</div>`;
            }
        });

        const a = document.createElement('div');
        const b = document.createElement('div');
        document.body.append(a, b);
        const el = document.createElement('recon-zombie');
        a.appendChild(el);
        await tick();
        assert.equal(el.querySelectorAll('.branch').length, 1, 'one branch initially');

        // Queue the structural re-instantiation microtask, then move the
        // element in the SAME task - the stale microtask must not run.
        flushSync(() => { el.state.on = true; });
        b.appendChild(el);
        await tick();

        assert.equal(el.querySelectorAll('.branch').length, 1, 'exactly one branch after move');
        assert.equal(el.querySelector('.branch').textContent, 'ON', 'the new state rendered');

        // Toggle again - a zombie compute effect from the stale instantiate
        // would render a second copy or fight the live one.
        el.state.on = false;
        await tick();
        assert.equal(el.querySelectorAll('.branch').length, 1, 'still exactly one branch');
        assert.equal(el.querySelector('.branch').textContent, 'OFF', 'toggles cleanly');
        a.remove(); b.remove();
    });
});
