/**
 * Tests for Error Boundary System
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html } from '../lib/framework.js';

describe('Error Boundary System', function(it) {
    it('catches template errors and logs them', (done) => {
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => errors.push(args.join(' '));

        defineComponent('test-error-template', {
            data() {
                return { shouldThrow: true };
            },
            template() {
                if (this.state.shouldThrow) {
                    throw new Error('Template error!');
                }
                return html`<div>OK</div>`;
            }
        });

        const el = document.createElement('test-error-template');
        document.body.appendChild(el);

        setTimeout(() => {
            // Should have logged the error
            const hasError = errors.some(e => e.includes('Render error') && e.includes('Template error'));
            assert.ok(hasError, 'Should log render error');

            // Component should have error flag
            assert.ok(el._hasRenderError, 'Should set _hasRenderError flag');

            console.error = originalError;
            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('calls renderError handler when template throws', (done) => {
        let renderErrorCalled = false;
        let capturedError = null;

        defineComponent('test-render-error-handler', {
            data() {
                return { shouldThrow: true };
            },
            template() {
                if (this.state.shouldThrow) {
                    throw new Error('Expected error');
                }
                return html`<div>OK</div>`;
            },
            renderError(error) {
                renderErrorCalled = true;
                capturedError = error;
                return html`<div class="fallback">Error occurred</div>`;
            }
        });

        const el = document.createElement('test-render-error-handler');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(renderErrorCalled, 'Should call renderError');
            assert.ok(capturedError.message.includes('Expected error'), 'Should pass error to handler');

            // Should render fallback
            const fallback = el.querySelector('.fallback');
            assert.ok(fallback, 'Should render fallback template');
            assert.ok(fallback.textContent.includes('Error occurred'), 'Fallback should have content');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('catches afterRender errors and logs them', (done) => {
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => errors.push(args.join(' '));

        defineComponent('test-afterrender-error', {
            template() {
                return html`<div>Content</div>`;
            },
            afterRender() {
                throw new Error('afterRender failed!');
            }
        });

        const el = document.createElement('test-afterrender-error');
        document.body.appendChild(el);

        setTimeout(() => {
            const hasError = errors.some(e => e.includes('afterRender') && e.includes('afterRender failed'));
            assert.ok(hasError, 'Should log afterRender error');

            console.error = originalError;
            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('continues rendering siblings when one component fails', (done) => {
        defineComponent('test-failing-sibling', {
            template() {
                throw new Error('I always fail');
            }
        });

        defineComponent('test-good-sibling', {
            template() {
                return html`<div class="good">I work fine</div>`;
            }
        });

        // Parent that contains both
        defineComponent('test-sibling-parent', {
            template() {
                return html`
                    <div>
                        <test-failing-sibling></test-failing-sibling>
                        <test-good-sibling></test-good-sibling>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-sibling-parent');
        document.body.appendChild(el);

        setTimeout(() => {
            // Good sibling should still render
            const good = el.querySelector('.good');
            assert.ok(good, 'Good sibling should render despite failing sibling');
            assert.ok(good.textContent.includes('I work fine'), 'Good sibling should have content');

            document.body.removeChild(el);
            done();
        }, 150);
    });

    it('recovers from error when state changes', (done) => {
        defineComponent('test-error-recovery', {
            data() {
                return { shouldThrow: true };
            },
            template() {
                if (this.state.shouldThrow) {
                    throw new Error('Intentional error');
                }
                return html`<div class="recovered">Recovered!</div>`;
            }
        });

        const el = document.createElement('test-error-recovery');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(el._hasRenderError, 'Should have error initially');

            // Fix the error condition
            el.state.shouldThrow = false;

            setTimeout(() => {
                assert.ok(!el._hasRenderError, 'Should clear error flag on successful render');
                const recovered = el.querySelector('.recovered');
                assert.ok(recovered, 'Should render recovered content');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });
});
