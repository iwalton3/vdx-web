/**
 * Tests for event modifier parsing and application
 * (-prevent, -stop, -passive, and combinations)
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html } from '../../lib/framework.js';

describe('Event Modifiers', function(it) {
    it('applies multiple chained modifiers (on-click-prevent-stop)', (done) => {
        let innerFired = false;
        let outerFired = false;

        defineComponent('test-multi-modifier', {
            methods: {
                inner(e) { innerFired = true; },
                outer() { outerFired = true; }
            },
            template() {
                return html`
                    <div on-click="outer">
                        <a href="#never" id="link" on-click-prevent-stop="inner">Click</a>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-multi-modifier');
        document.body.appendChild(el);

        setTimeout(() => {
            const link = el.querySelector('#link');
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            link.dispatchEvent(event);

            assert.ok(innerFired, 'Handler should fire');
            assert.ok(event.defaultPrevented, '-prevent should call preventDefault');
            assert.ok(!outerFired, '-stop should stop propagation to parent handler');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('registers passive listeners with -passive (preventDefault is ignored)', (done) => {
        defineComponent('test-passive-modifier', {
            methods: {
                onWheel(e) {
                    e.preventDefault();  // Ignored for passive listeners
                }
            },
            template() {
                return html`<div id="area" on-wheel-passive="onWheel">scroll me</div>`;
            }
        });

        const el = document.createElement('test-passive-modifier');
        document.body.appendChild(el);

        setTimeout(() => {
            const area = el.querySelector('#area');
            const event = new WheelEvent('wheel', { bubbles: true, cancelable: true });
            area.dispatchEvent(event);

            assert.ok(!event.defaultPrevented,
                'preventDefault inside a -passive listener must be ignored');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('non-passive listeners can still preventDefault (control case)', (done) => {
        defineComponent('test-nonpassive-control', {
            methods: {
                onWheel(e) {
                    e.preventDefault();
                }
            },
            template() {
                return html`<div id="area" on-wheel="onWheel">scroll me</div>`;
            }
        });

        const el = document.createElement('test-nonpassive-control');
        document.body.appendChild(el);

        setTimeout(() => {
            const area = el.querySelector('#area');
            const event = new WheelEvent('wheel', { bubbles: true, cancelable: true });
            area.dispatchEvent(event);

            assert.ok(event.defaultPrevented,
                'Without -passive, preventDefault must work');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('parses -passive on touch events (handler still fires)', (done) => {
        let fired = false;
        defineComponent('test-touch-passive', {
            methods: {
                onTouchMove() { fired = true; }
            },
            template() {
                return html`<div id="area" on-touchmove-passive="onTouchMove">touch</div>`;
            }
        });

        const el = document.createElement('test-touch-passive');
        document.body.appendChild(el);

        setTimeout(() => {
            el.querySelector('#area').dispatchEvent(
                new Event('touchmove', { bubbles: true, cancelable: true }));
            assert.ok(fired, 'touchmove handler should fire (event name parsed correctly)');
            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('warns and stays non-passive when -passive conflicts with -prevent', (done) => {
        const originalWarn = console.warn;
        let warned = false;
        console.warn = (...args) => {
            if (String(args[0]).includes('-passive')) warned = true;
        };

        defineComponent('test-passive-conflict', {
            methods: {
                onWheel() {}
            },
            template() {
                return html`<div id="area" on-wheel-passive-prevent="onWheel">x</div>`;
            }
        });

        const el = document.createElement('test-passive-conflict');
        document.body.appendChild(el);

        setTimeout(() => {
            try {
                const area = el.querySelector('#area');
                const event = new WheelEvent('wheel', { bubbles: true, cancelable: true });
                area.dispatchEvent(event);

                assert.ok(warned, 'Should warn about the conflict');
                assert.ok(event.defaultPrevented,
                    '-prevent must win: listener is non-passive and preventDefault applies');
            } finally {
                console.warn = originalWarn;
                document.body.removeChild(el);
            }
            done();
        }, 100);
    });

    it('single modifiers still work (on-submit-prevent)', (done) => {
        let fired = false;
        defineComponent('test-single-modifier', {
            methods: {
                onSubmit() { fired = true; }
            },
            template() {
                return html`<form id="f" on-submit-prevent="onSubmit"><button>go</button></form>`;
            }
        });

        const el = document.createElement('test-single-modifier');
        document.body.appendChild(el);

        setTimeout(() => {
            const form = el.querySelector('#f');
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);

            assert.ok(fired, 'Handler should fire');
            assert.ok(event.defaultPrevented, '-prevent should apply');

            document.body.removeChild(el);
            done();
        }, 100);
    });
});
