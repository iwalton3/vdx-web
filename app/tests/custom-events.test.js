/**
 * Custom Event Tests
 * Tests for custom events with hyphens and event modifiers
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html } from '../lib/framework.js';

describe('Custom Hyphenated Events', function(it) {
    it('handles custom events with hyphens via ref', (done) => {
        let receivedData = null;

        // Child component that emits custom event
        const ChildComponent = defineComponent('test-event-emitter', {
            methods: {
                emitCustom() {
                    this.dispatchEvent(new CustomEvent('status-change', {
                        detail: { status: 'active' },
                        bubbles: true
                    }));
                }
            },
            template() {
                return html`<button on-click="emitCustom">Emit</button>`;
            }
        });

        // Parent component that listens
        const ParentComponent = defineComponent('test-event-listener', {
            methods: {
                handleStatusChange(e) {
                    receivedData = e.detail;
                }
            },
            template() {
                return html`
                    <test-event-emitter on-status-change="handleStatusChange">
                    </test-event-emitter>
                `;
            }
        });

        const parent = document.createElement('test-event-listener');
        document.body.appendChild(parent);

        setTimeout(() => {
            const child = parent.querySelector('test-event-emitter');
            const button = child.querySelector('button');
            button.click();

            setTimeout(() => {
                assert.ok(receivedData !== null, 'Custom event should be received');
                assert.equal(receivedData.status, 'active', 'Event data should be correct');

                document.body.removeChild(parent);
                done();
            }, 50);
        }, 100);
    });

    it('handles multiple hyphenated events on same element', (done) => {
        let statusReceived = false;
        let itemDeleted = false;

        const ChildComponent = defineComponent('test-multi-event-emitter', {
            methods: {
                emitStatus() {
                    this.dispatchEvent(new CustomEvent('status-change', { bubbles: true }));
                },
                emitDelete() {
                    this.dispatchEvent(new CustomEvent('item-delete', { bubbles: true }));
                }
            },
            template() {
                return html`
                    <button id="status" on-click="emitStatus">Status</button>
                    <button id="delete" on-click="emitDelete">Delete</button>
                `;
            }
        });

        const ParentComponent = defineComponent('test-multi-event-listener', {
            methods: {
                handleStatus() { statusReceived = true; },
                handleDelete() { itemDeleted = true; }
            },
            template() {
                return html`
                    <test-multi-event-emitter
                        on-status-change="handleStatus"
                        on-item-delete="handleDelete">
                    </test-multi-event-emitter>
                `;
            }
        });

        const parent = document.createElement('test-multi-event-listener');
        document.body.appendChild(parent);

        setTimeout(() => {
            const child = parent.querySelector('test-multi-event-emitter');
            child.querySelector('#status').click();

            setTimeout(() => {
                assert.ok(statusReceived, 'status-change event should be received');
                assert.ok(!itemDeleted, 'item-delete should not be triggered yet');

                child.querySelector('#delete').click();

                setTimeout(() => {
                    assert.ok(itemDeleted, 'item-delete event should be received');

                    document.body.removeChild(parent);
                    done();
                }, 50);
            }, 50);
        }, 100);
    });

    it('supports prevent modifier on custom events', (done) => {
        let eventPrevented = false;

        const ChildComponent = defineComponent('test-prevent-emitter', {
            methods: {
                emitCustom() {
                    const event = new CustomEvent('my-event', {
                        bubbles: true,
                        cancelable: true
                    });
                    this.dispatchEvent(event);
                    eventPrevented = event.defaultPrevented;
                }
            },
            template() {
                return html`<button on-click="emitCustom">Emit</button>`;
            }
        });

        const ParentComponent = defineComponent('test-prevent-listener', {
            methods: {
                handleEvent(e) {
                    // Handler runs, default should be prevented by modifier
                }
            },
            template() {
                return html`
                    <test-prevent-emitter on-my-event-prevent="handleEvent">
                    </test-prevent-emitter>
                `;
            }
        });

        const parent = document.createElement('test-prevent-listener');
        document.body.appendChild(parent);

        setTimeout(() => {
            const child = parent.querySelector('test-prevent-emitter');
            child.querySelector('button').click();

            setTimeout(() => {
                assert.ok(eventPrevented, 'Event default should be prevented with -prevent modifier');

                document.body.removeChild(parent);
                done();
            }, 50);
        }, 100);
    });

    it('supports stop modifier on custom events', (done) => {
        let parentReceived = false;
        let grandparentReceived = false;

        const ChildComponent = defineComponent('test-stop-child', {
            methods: {
                emitCustom() {
                    this.dispatchEvent(new CustomEvent('bubble-event', { bubbles: true }));
                }
            },
            template() {
                return html`<button on-click="emitCustom">Emit</button>`;
            }
        });

        const ParentComponent = defineComponent('test-stop-parent', {
            methods: {
                handleEvent() {
                    parentReceived = true;
                }
            },
            template() {
                return html`
                    <test-stop-child on-bubble-event-stop="handleEvent">
                    </test-stop-child>
                `;
            }
        });

        const GrandparentComponent = defineComponent('test-stop-grandparent', {
            methods: {
                handleEvent() {
                    grandparentReceived = true;
                }
            },
            template() {
                return html`
                    <test-stop-parent on-bubble-event="handleEvent">
                    </test-stop-parent>
                `;
            }
        });

        const grandparent = document.createElement('test-stop-grandparent');
        document.body.appendChild(grandparent);

        setTimeout(() => {
            const parent = grandparent.querySelector('test-stop-parent');
            const child = parent.querySelector('test-stop-child');
            child.querySelector('button').click();

            setTimeout(() => {
                assert.ok(parentReceived, 'Parent should receive event');
                assert.ok(!grandparentReceived, 'Grandparent should not receive event (stopped)');

                document.body.removeChild(grandparent);
                done();
            }, 50);
        }, 150);
    });
});

describe('Standard Event Modifiers', function(it) {
    it('prevents default with -prevent modifier', (done) => {
        let formSubmitted = false;
        let defaultPrevented = false;

        const TestComponent = defineComponent('test-prevent-default', {
            methods: {
                handleSubmit(e) {
                    formSubmitted = true;
                    defaultPrevented = e.defaultPrevented;
                }
            },
            template() {
                return html`
                    <form on-submit-prevent="handleSubmit">
                        <button type="submit">Submit</button>
                    </form>
                `;
            }
        });

        const el = document.createElement('test-prevent-default');
        document.body.appendChild(el);

        setTimeout(() => {
            const form = el.querySelector('form');

            // Submit the form
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

            setTimeout(() => {
                assert.ok(formSubmitted, 'Submit handler should be called');
                assert.ok(defaultPrevented, 'Default should be prevented');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('stops propagation with -stop modifier', (done) => {
        let innerClicked = false;
        let outerClicked = false;

        const TestComponent = defineComponent('test-stop-propagation', {
            methods: {
                handleInner() { innerClicked = true; },
                handleOuter() { outerClicked = true; }
            },
            template() {
                return html`
                    <div on-click="handleOuter">
                        <button on-click-stop="handleInner">Click</button>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-stop-propagation');
        document.body.appendChild(el);

        setTimeout(() => {
            el.querySelector('button').click();

            setTimeout(() => {
                assert.ok(innerClicked, 'Inner handler should be called');
                assert.ok(!outerClicked, 'Outer handler should not be called (stopped)');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });
});
