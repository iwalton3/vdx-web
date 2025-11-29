/**
 * Tests for raw() HTML in children
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, raw } from '../lib/framework.js';

async function waitForRender() {
    await new Promise(resolve => setTimeout(resolve, 100));
}

defineComponent('test-raw-wrapper', {
    template() {
        return html`
            <div class="wrapper">
                <div class="content">${this.props.children}</div>
            </div>
        `;
    }
});

describe('raw() HTML in Children', function(it) {
    it('renders raw HTML as children', async () => {
        defineComponent('test-raw-parent', {
            data() {
                return {
                    generatedHtml: '<strong class="generated">Generated Content</strong><p>With <em>formatting</em></p>'
                };
            },
            template() {
                return html`
                    <test-raw-wrapper>
                        ${raw(this.state.generatedHtml)}
                    </test-raw-wrapper>
                `;
            }
        });

        const el = document.createElement('test-raw-parent');
        document.body.appendChild(el);

        await waitForRender();

        const content = el.querySelector('.content');
        const strong = content?.querySelector('strong.generated');
        const em = content?.querySelector('em');

        assert.ok(strong, 'Should find raw HTML strong element');
        assert.equal(strong?.textContent, 'Generated Content', 'Should render raw HTML content');
        assert.ok(em, 'Should find nested raw HTML em element');
        assert.equal(em?.textContent, 'formatting', 'Should render nested raw HTML');

        document.body.removeChild(el);
    });

    it('mixes raw HTML with template children', async () => {
        defineComponent('test-mixed-raw-parent', {
            data() {
                return {
                    passwordHtml: '<code style="background: #f0f0f0; padding: 4px;">aB3$xY9!</code>'
                };
            },
            template() {
                return html`
                    <test-raw-wrapper>
                        <h3>Generated Password:</h3>
                        ${raw(this.state.passwordHtml)}
                        <button>Copy</button>
                    </test-raw-wrapper>
                `;
            }
        });

        const el = document.createElement('test-mixed-raw-parent');
        document.body.appendChild(el);

        await waitForRender();

        const content = el.querySelector('.content');
        const h3 = content?.querySelector('h3');
        const code = content?.querySelector('code');
        const button = content?.querySelector('button');

        assert.ok(h3, 'Should find template h3 element');
        assert.ok(code, 'Should find raw HTML code element');
        assert.ok(button, 'Should find template button element');
        assert.equal(code?.textContent, 'aB3$xY9!', 'Should render raw password HTML');
        assert.equal(code?.style.background, 'rgb(240, 240, 240)', 'Should preserve raw HTML styles');

        document.body.removeChild(el);
    });

    it('updates raw HTML children reactively', async () => {
        defineComponent('test-reactive-raw-parent', {
            data() {
                return {
                    htmlContent: '<span class="v1">Version 1</span>'
                };
            },
            methods: {
                updateContent() {
                    this.state.htmlContent = '<span class="v2">Version 2</span>';
                }
            },
            template() {
                return html`
                    <test-raw-wrapper>
                        ${raw(this.state.htmlContent)}
                    </test-raw-wrapper>
                `;
            }
        });

        const el = document.createElement('test-reactive-raw-parent');
        document.body.appendChild(el);

        await waitForRender();

        let content = el.querySelector('.content');
        let span = content?.querySelector('.v1');

        assert.ok(span, 'Should find initial raw HTML');
        assert.equal(span?.textContent, 'Version 1', 'Should show initial content');

        // Update raw HTML
        el.updateContent();
        await waitForRender();

        content = el.querySelector('.content');
        span = content?.querySelector('.v2');

        assert.ok(span, 'Should find updated raw HTML');
        assert.equal(span?.textContent, 'Version 2', 'Should show updated content');
        assert.ok(!content?.querySelector('.v1'), 'Should remove old raw HTML');

        document.body.removeChild(el);
    });

    it('renders raw HTML with named slots', async () => {
        defineComponent('test-raw-slots-wrapper', {
            template() {
                // children is always an array, slots has named slots
                const footerSlot = this.props.slots.footer || [];

                return html`
                    <div class="card">
                        <div class="card-body">${this.props.children}</div>
                        <div class="card-footer">${footerSlot}</div>
                    </div>
                `;
            }
        });

        defineComponent('test-raw-slots-parent', {
            data() {
                return {
                    resultHtml: '<div class="result"><strong>Success!</strong> Your password has been generated.</div>',
                    buttonHtml: '<button class="copy-btn">Copy to Clipboard</button>'
                };
            },
            template() {
                return html`
                    <test-raw-slots-wrapper>
                        ${raw(this.state.resultHtml)}
                        <div slot="footer">
                            ${raw(this.state.buttonHtml)}
                        </div>
                    </test-raw-slots-wrapper>
                `;
            }
        });

        const el = document.createElement('test-raw-slots-parent');
        document.body.appendChild(el);

        await waitForRender();

        const body = el.querySelector('.card-body');
        const footer = el.querySelector('.card-footer');
        const result = body?.querySelector('.result strong');
        const button = footer?.querySelector('.copy-btn');

        assert.ok(result, 'Should find raw HTML in default slot');
        assert.equal(result?.textContent, 'Success!', 'Should render raw HTML in body');
        assert.ok(button, 'Should find raw HTML in named slot');
        assert.equal(button?.textContent, 'Copy to Clipboard', 'Should render raw HTML in footer');

        document.body.removeChild(el);
    });
});
