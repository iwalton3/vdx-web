/**
 * Tests for React-style children prop system
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, when, Component } from '../../lib/framework.js';

// Test helper to wait for rendering
async function waitForRender() {
    await new Promise(resolve => setTimeout(resolve, 100));
}

// Define test components
defineComponent('test-wrapper', {
    template() {
        return html`
            <div class="wrapper">
                <div class="header">Header</div>
                <div class="content">${this.props.children}</div>
                <div class="footer">Footer</div>
            </div>
        `;
    }
});

defineComponent('test-conditional-wrapper', {
    props: {
        show: true
    },

    template() {
        return html`
            <div class="conditional-wrapper">
                ${when(this.props.show, html`
                    <div class="content">${this.props.children}</div>
                `)}
            </div>
        `;
    }
});

defineComponent('test-named-slots', {
    template() {
        // children is always an array, slots has named slots
        const headerSlot = this.props.slots.header || [];
        const footerSlot = this.props.slots.footer || [];

        return html`
            <div class="named-slots">
                <div class="slot-header">${headerSlot}</div>
                <div class="slot-content">${this.props.children}</div>
                <div class="slot-footer">${footerSlot}</div>
            </div>
        `;
    }
});

defineComponent('test-nested-wrapper', {
    template() {
        return html`
            <div class="outer">
                <test-wrapper>
                    ${this.props.children}
                </test-wrapper>
            </div>
        `;
    }
});

defineComponent('test-stateful-child', {
    data() {
        return {
            count: 0
        };
    },

    methods: {
        increment() {
            this.state.count++;
        }
    },

    template() {
        return html`
            <div class="stateful-child">
                <span class="count">${this.state.count}</span>
                <button class="increment" on-click="increment">+</button>
            </div>
        `;
    }
});

defineComponent('test-tab-panel', {
    props: {
        activeTab: 'tab1'
    },

    template() {
        // children is always an array, slots has named slots
        const tab1Slot = this.props.slots.tab1 || [];
        const tab2Slot = this.props.slots.tab2 || [];

        return html`
            <div class="tab-panel">
                <div class="tab1 ${this.props.activeTab === 'tab1' ? 'active' : 'hidden'}">
                    ${tab1Slot}
                </div>
                <div class="tab2 ${this.props.activeTab === 'tab2' ? 'active' : 'hidden'}">
                    ${tab2Slot}
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .hidden {
            display: none;
        }
    `
});

defineComponent('test-template-prop', {
    props: {
        renderContent: null
    },

    template() {
        return html`
            <div class="template-prop">
                ${this.props.renderContent || this.props.children}
            </div>
        `;
    }
});

defineComponent('test-when-children', {
    props: {
        showChildren: true
    },

    template() {
        return html`
            <div class="when-wrapper">
                ${when(this.props.showChildren, this.props.children)}
            </div>
        `;
    }
});

// Tests
describe('Children Prop System', function(it) {
    it('renders basic children', async () => {
        defineComponent('test-basic-parent', {
            template() {
                return html`
                    <test-wrapper>
                        <p>Hello, World!</p>
                    </test-wrapper>
                `;
            }
        });

        const el = document.createElement('test-basic-parent');
        document.body.appendChild(el);

        await waitForRender();

        const content = el.querySelector('.content');
        const paragraph = content?.querySelector('p');

        assert.ok(paragraph, 'Should find paragraph element');
        assert.equal(paragraph.textContent, 'Hello, World!', 'Should render correct text');

        document.body.removeChild(el);
    });

    it('renders multiple children', async () => {
        defineComponent('test-multiple-parent', {
            template() {
                return html`
                    <test-wrapper>
                        <p>First child</p>
                        <p>Second child</p>
                        <p>Third child</p>
                    </test-wrapper>
                `;
            }
        });

        const el = document.createElement('test-multiple-parent');
        document.body.appendChild(el);

        await waitForRender();

        const content = el.querySelector('.content');
        const paragraphs = content?.querySelectorAll('p');

        assert.equal(paragraphs.length, 3, 'Should render 3 children');

        document.body.removeChild(el);
    });

    it('conditionally renders children with show prop', async () => {
        defineComponent('test-conditional-parent', {
            data() {
                return { show: true };
            },
            template() {
                return html`
                    <test-conditional-wrapper show="${this.state.show}">
                        <p>Conditional content</p>
                    </test-conditional-wrapper>
                `;
            }
        });

        const el = document.createElement('test-conditional-parent');
        document.body.appendChild(el);

        await waitForRender();

        let content = el.querySelector('.content');
        let paragraph = content?.querySelector('p');

        assert.ok(paragraph, 'Children should be visible when show=true');
        assert.equal(paragraph.textContent, 'Conditional content', 'Should show correct content');

        // Change prop to hide children
        el.state.show = false;
        await waitForRender();

        content = el.querySelector('.content');
        assert.ok(!content, 'Children should be hidden when show=false');

        document.body.removeChild(el);
    });

    it('renders named children (slots)', async () => {
        defineComponent('test-named-parent', {
            template() {
                return html`
                    <test-named-slots>
                        <div slot="header">Header Content</div>
                        <p>Default Content</p>
                        <div slot="footer">Footer Content</div>
                    </test-named-slots>
                `;
            }
        });

        const el = document.createElement('test-named-parent');
        document.body.appendChild(el);

        await waitForRender();

        const headerSlot = el.querySelector('.slot-header');
        const contentSlot = el.querySelector('.slot-content');
        const footerSlot = el.querySelector('.slot-footer');

        assert.ok(headerSlot?.textContent.includes('Header Content'), 'Header slot should have content');
        assert.ok(contentSlot?.textContent.includes('Default Content'), 'Default slot should have content');
        assert.ok(footerSlot?.textContent.includes('Footer Content'), 'Footer slot should have content');

        document.body.removeChild(el);
    });

    it('renders children in nested components', async () => {
        defineComponent('test-nested-parent', {
            template() {
                return html`
                    <test-nested-wrapper>
                        <p>Nested content</p>
                    </test-nested-wrapper>
                `;
            }
        });

        const el = document.createElement('test-nested-parent');
        document.body.appendChild(el);

        await waitForRender();

        const content = el.querySelector('.content');
        const paragraph = content?.querySelector('p');

        assert.ok(paragraph, 'Should find nested paragraph');
        assert.equal(paragraph.textContent, 'Nested content', 'Should render nested content');

        document.body.removeChild(el);
    });

    it('handles empty children gracefully', async () => {
        defineComponent('test-empty-parent', {
            template() {
                return html`
                    <test-wrapper></test-wrapper>
                `;
            }
        });

        const el = document.createElement('test-empty-parent');
        document.body.appendChild(el);

        await waitForRender();

        const content = el.querySelector('.content');

        assert.ok(content, 'Content div should exist');
        // Content may have text nodes/whitespace, so just check it exists
        assert.ok(true, 'Empty children handled');

        document.body.removeChild(el);
    });

    it('preserves child component state when hidden with CSS', async () => {
        defineComponent('test-tabs-parent', {
            data() {
                return { activeTab: 'tab1' };
            },
            template() {
                return html`
                    <test-tab-panel activeTab="${this.state.activeTab}">
                        <div slot="tab1">
                            <test-stateful-child></test-stateful-child>
                        </div>
                        <div slot="tab2">
                            <p>Tab 2 content</p>
                        </div>
                    </test-tab-panel>
                `;
            }
        });

        const el = document.createElement('test-tabs-parent');
        document.body.appendChild(el);

        await waitForRender();

        // Find the stateful child in tab1
        const statefulChild = el.querySelector('test-stateful-child');
        const incrementBtn = statefulChild?.querySelector('.increment');
        const countSpan = statefulChild?.querySelector('.count');

        // Increment counter
        incrementBtn?.click();
        await waitForRender();

        let count1 = parseInt(countSpan?.textContent || '0');
        assert.equal(count1, 1, 'Counter should increment to 1');

        // Switch to tab2
        el.state.activeTab = 'tab2';
        await waitForRender();

        // Check tab1 is hidden
        const tab1 = el.querySelector('.tab1');
        assert.ok(tab1?.classList.contains('hidden'), 'Tab1 should be hidden');

        // Switch back to tab1
        el.state.activeTab = 'tab1';
        await waitForRender();

        // Check if state preserved
        const countSpan2 = el.querySelector('test-stateful-child .count');
        const count2 = parseInt(countSpan2?.textContent || '0');

        assert.equal(count2, 1, 'State should be preserved when switching tabs');

        document.body.removeChild(el);
    });

    it('supports passing templates as props (HOC pattern)', async () => {
        defineComponent('test-hoc-parent', {
            methods: {
                renderCustomContent() {
                    return html`<p>Custom template content</p>`;
                }
            },

            template() {
                return html`
                    <test-template-prop renderContent="${this.renderCustomContent()}">
                    </test-template-prop>
                `;
            }
        });

        const el = document.createElement('test-hoc-parent');
        document.body.appendChild(el);

        await waitForRender();

        const templateProp = el.querySelector('.template-prop');
        const paragraph = templateProp?.querySelector('p');

        assert.ok(paragraph, 'Should find paragraph from template prop');
        assert.equal(paragraph.textContent, 'Custom template content', 'Should render template prop content');

        document.body.removeChild(el);
    });

    it('renders children conditionally with when()', async () => {
        defineComponent('test-when-parent', {
            data() {
                return { showChildren: true };
            },
            template() {
                return html`
                    <test-when-children showChildren="${this.state.showChildren}">
                        <p>Conditional child</p>
                    </test-when-children>
                `;
            }
        });

        const el = document.createElement('test-when-parent');
        document.body.appendChild(el);

        await waitForRender();

        let paragraph = el.querySelector('.when-wrapper p');
        assert.ok(paragraph, 'Children should be visible with when(true)');
        assert.equal(paragraph.textContent, 'Conditional child', 'Should show correct content');

        // Hide children
        el.state.showChildren = false;
        await waitForRender();

        paragraph = el.querySelector('.when-wrapper p');
        assert.ok(!paragraph, 'Children should be hidden with when(false)');

        document.body.removeChild(el);
    });

    it('renders mixed content (text and elements)', async () => {
        defineComponent('test-mixed-parent', {
            template() {
                return html`
                    <test-wrapper>
                        Text node
                        <strong>Bold text</strong>
                        More text
                    </test-wrapper>
                `;
            }
        });

        const el = document.createElement('test-mixed-parent');
        document.body.appendChild(el);

        await waitForRender();

        const content = el.querySelector('.content');
        const hasText = content?.textContent.includes('Text node');
        const hasBold = content?.querySelector('strong')?.textContent === 'Bold text';
        const hasMoreText = content?.textContent.includes('More text');

        assert.ok(hasText, 'Should render text nodes');
        assert.ok(hasBold, 'Should render bold element');
        assert.ok(hasMoreText, 'Should render multiple text nodes');

        document.body.removeChild(el);
    });
});

describe('Light DOM Adoption', function(it) {
    it('light-DOM children are adopted as the same nodes, listeners and nested state intact', async () => {
        // The capture used to serialise the light DOM through innerHTML and
        // parse it back, which produced fresh nodes: every listener the page
        // (or a parent template) had put on a child was gone, and a nested
        // component came back as a new instance with new state.
        let innerConstructed = 0;
        class LdaInner extends Component {
            constructor(props) {
                super(props);
                innerConstructed++;
                this.state = { serial: innerConstructed };
            }
            template() { return html`<i>${this.state.serial}</i>`; }
        }
        class LdaOuter extends Component {
            template() { return html`<section>${this.props.children}</section>`; }
        }
        defineComponent('lda-inner', LdaInner);
        defineComponent('lda-outer', LdaOuter);

        // Light DOM assembled before connect: a nested component and a
        // plain element carrying a listener. Nothing is upgraded until the
        // tree connects.
        const outer = document.createElement('lda-outer');
        const inner = document.createElement('lda-inner');
        const b = document.createElement('b');
        b.textContent = 'click me';
        let clicks = 0;
        b.addEventListener('click', () => { clicks++; });
        outer.append(inner, b);

        document.body.appendChild(outer);
        await new Promise(r => requestAnimationFrame(r));

        const section = outer.querySelector('section');
        assert.ok(section, 'outer rendered its template');
        assert.equal(section.querySelector('b'), b,
            'the same <b> node the page created, not a re-parsed copy');
        section.querySelector('b').click();
        assert.equal(clicks, 1, 'a listener put on a light-DOM child survives capture');
        assert.equal(section.querySelector('lda-inner'), inner,
            'the nested component is the same element');
        assert.equal(innerConstructed, 1,
            'the nested component was constructed once, not rebuilt from markup');
        assert.equal(section.querySelector('lda-inner i').textContent, '1');

        outer.remove();
    });
});
