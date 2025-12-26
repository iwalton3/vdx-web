/**
 * Children/Slots Spike Test
 *
 * Tests the fine-grained children/slots system to validate feasibility.
 * These tests mirror the scenarios from children.test.js but use the new renderer.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, when, each, reactive } from '../lib/framework.js';
import {
    instantiateTemplate,
    createDeferredChild,
    isDeferredChild
} from '../lib/core/template-renderer-spike.js';
import { compileTemplate } from '../lib/core/template-compiler.js';

// Test helper to wait for effects to settle
async function waitForEffects() {
    await new Promise(resolve => queueMicrotask(resolve));
    await new Promise(resolve => setTimeout(resolve, 50));
}

// Helper to compile and get template structure
function compile(strings, ...values) {
    const result = html(strings, ...values);
    return {
        compiled: result._compiled,
        values: result._values || values
    };
}

describe('Children/Slots Spike - Core Mechanics', function(it) {

    it('isDeferredChild correctly identifies deferred children', () => {
        const deferred = createDeferredChild({}, [], null);
        assert.ok(isDeferredChild(deferred), 'Should identify deferred child');
        assert.ok(!isDeferredChild({}), 'Should not identify plain object');
        assert.ok(!isDeferredChild(null), 'Should not identify null');
        assert.ok(!isDeferredChild('string'), 'Should not identify string');
    });

    it('createDeferredChild captures parent component', () => {
        const mockComponent = { state: { foo: 'bar' } };
        const compiled = {};
        const values = [1, 2, 3];

        const deferred = createDeferredChild(compiled, values, mockComponent);

        assert.equal(deferred.parentComponent, mockComponent, 'Should capture parent');
        assert.equal(deferred.compiled, compiled, 'Should capture compiled');
        assert.deepEqual(deferred.values, values, 'Should capture values');
    });

});

describe('Children/Slots Spike - Scenario 1: Basic Children', function(it) {

    it('renders static children inside wrapper', async () => {
        // Simulate: <wrapper><p>Hello</p></wrapper>
        // The child <p>Hello</p> should appear inside wrapper

        const childTemplate = compile`<p>Hello</p>`;
        const mockParent = { state: {}, refs: {} };

        // Create deferred child
        const deferredChild = createDeferredChild(
            childTemplate.compiled,
            childTemplate.values,
            mockParent
        );

        // Simulate wrapper component receiving children
        const wrapperState = reactive({ children: [deferredChild] });

        // Wrapper's template: <div class="content">${this.props.children}</div>
        const wrapperTemplate = compile`<div class="content">${wrapperState.children}</div>`;

        // Instantiate
        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            wrapperTemplate.compiled,
            [wrapperState.children],  // Pass children as slot value
            { state: wrapperState, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Verify
        const content = container.querySelector('.content');
        assert.ok(content, 'Should have content div');

        const paragraph = container.querySelector('p');
        assert.ok(paragraph, 'Should have paragraph');
        assert.equal(paragraph.textContent, 'Hello', 'Should have correct text');

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 2: Reactive Children (Parent State)', function(it) {

    it('children update when parent state changes', async () => {
        // This is the KEY test: children reference parent's state
        // <wrapper><p>${this.state.message}</p></wrapper>

        const parentState = reactive({ message: 'Initial' });
        const mockParent = { state: parentState, refs: {} };

        // Child template references parent state
        // In real usage, the template would capture `this.state.message`
        // Here we simulate by passing a function that reads parent state
        const childTemplate = compile`<p>${() => parentState.message}</p>`;

        const deferredChild = createDeferredChild(
            childTemplate.compiled,
            [() => parentState.message],  // Function for reactive access
            mockParent
        );

        // Wrapper receives children
        const wrapperTemplate = compile`<div class="content">${[deferredChild]}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            wrapperTemplate.compiled,
            [[deferredChild]],
            { state: {}, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Initial state
        let paragraph = container.querySelector('p');
        assert.ok(paragraph, 'Should have paragraph');
        assert.equal(paragraph.textContent, 'Initial', 'Should show initial message');

        // Update parent state
        parentState.message = 'Updated';
        await waitForEffects();

        // Verify update propagated
        paragraph = container.querySelector('p');
        assert.equal(paragraph.textContent, 'Updated', 'Should show updated message');

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 3: Named Slots', function(it) {

    it('routes children to named slots correctly', async () => {
        // <dialog>
        //   <p>Main content</p>
        //   <div slot="footer">Footer content</div>
        // </dialog>

        const mockParent = { state: {}, refs: {} };

        // Main content child
        const mainChild = createDeferredChild(
            compile`<p>Main content</p>`.compiled,
            [],
            mockParent
        );

        // Footer slot child
        const footerChild = createDeferredChild(
            compile`<div>Footer content</div>`.compiled,
            [],
            mockParent
        );
        footerChild.slotName = 'footer';

        // Simulate dialog receiving children and slots
        const dialogState = reactive({
            children: [mainChild],
            slots: { footer: [footerChild] }
        });

        // Dialog's template uses children and slots
        const dialogTemplate = compile`
            <div class="dialog">
                <div class="content">${dialogState.children}</div>
                <div class="footer">${dialogState.slots.footer}</div>
            </div>
        `;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            dialogTemplate.compiled,
            [dialogState.children, dialogState.slots.footer],
            { state: dialogState, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Verify main content
        const content = container.querySelector('.content');
        assert.ok(content, 'Should have content div');
        const mainP = content.querySelector('p');
        assert.ok(mainP, 'Should have main paragraph');
        assert.equal(mainP.textContent, 'Main content', 'Should have main content text');

        // Verify footer slot
        const footer = container.querySelector('.footer');
        assert.ok(footer, 'Should have footer div');
        const footerDiv = footer.querySelector('div');
        assert.ok(footerDiv, 'Should have footer child');
        assert.equal(footerDiv.textContent, 'Footer content', 'Should have footer text');

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 4: Control Flow in Children', function(it) {

    it('handles when() in children', async () => {
        // <wrapper>${when(condition, html`<p>Visible</p>`)}</wrapper>

        const parentState = reactive({ show: true });
        const mockParent = { state: parentState, refs: {} };

        // Child with conditional content
        // Note: when() returns a compiled template result
        const getChildContent = () => {
            if (parentState.show) {
                return compile`<p>Visible</p>`;
            }
            return null;
        };

        // Create a dynamic child that re-evaluates
        const wrapperTemplate = compile`<div class="content">${() => {
            const content = getChildContent();
            if (!content) return null;
            return createDeferredChild(content.compiled, content.values, mockParent);
        }}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            wrapperTemplate.compiled,
            [() => {
                const content = getChildContent();
                if (!content) return null;
                return createDeferredChild(content.compiled, content.values, mockParent);
            }],
            { state: parentState, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Initial: visible
        let paragraph = container.querySelector('p');
        assert.ok(paragraph, 'Should show paragraph when condition is true');
        assert.equal(paragraph.textContent, 'Visible');

        // Toggle condition
        parentState.show = false;
        await waitForEffects();

        paragraph = container.querySelector('p');
        assert.ok(!paragraph, 'Should hide paragraph when condition is false');

        // Toggle back
        parentState.show = true;
        await waitForEffects();

        paragraph = container.querySelector('p');
        assert.ok(paragraph, 'Should show paragraph again');

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 5: Nested Custom Elements', function(it) {

    it('forwards children through nested components', async () => {
        // <outer><inner><p>Deep</p></inner></outer>
        // Children should flow through correctly

        const mockParent = { state: {}, refs: {} };

        // Deepest content
        const deepContent = createDeferredChild(
            compile`<p>Deep</p>`.compiled,
            [],
            mockParent
        );

        // Inner wrapper receives deep content
        const innerChildren = [deepContent];
        const innerTemplate = compile`<div class="inner">${innerChildren}</div>`;

        // Create inner as deferred
        const innerDeferred = createDeferredChild(
            innerTemplate.compiled,
            [innerChildren],
            mockParent
        );

        // Outer wrapper receives inner
        const outerChildren = [innerDeferred];
        const outerTemplate = compile`<div class="outer">${outerChildren}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            outerTemplate.compiled,
            [outerChildren],
            { state: {}, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Verify nesting
        const outer = container.querySelector('.outer');
        assert.ok(outer, 'Should have outer div');

        const inner = outer.querySelector('.inner');
        assert.ok(inner, 'Should have inner div');

        const deep = inner.querySelector('p');
        assert.ok(deep, 'Should have deep paragraph');
        assert.equal(deep.textContent, 'Deep', 'Should have correct text');

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 6: Multiple Children', function(it) {

    it('renders multiple children in order', async () => {
        const mockParent = { state: {}, refs: {} };

        const child1 = createDeferredChild(compile`<p>First</p>`.compiled, [], mockParent);
        const child2 = createDeferredChild(compile`<p>Second</p>`.compiled, [], mockParent);
        const child3 = createDeferredChild(compile`<p>Third</p>`.compiled, [], mockParent);

        const children = [child1, child2, child3];
        const wrapperTemplate = compile`<div class="content">${children}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            wrapperTemplate.compiled,
            [children],
            { state: {}, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        const paragraphs = container.querySelectorAll('p');
        assert.equal(paragraphs.length, 3, 'Should have 3 paragraphs');
        assert.equal(paragraphs[0].textContent, 'First');
        assert.equal(paragraphs[1].textContent, 'Second');
        assert.equal(paragraphs[2].textContent, 'Third');

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 7: Mixed Content', function(it) {

    it('renders text and elements mixed', async () => {
        const mockParent = { state: {}, refs: {} };

        // Mixed content: text, element, text
        const textNode1 = 'Before ';
        const element = createDeferredChild(compile`<strong>Bold</strong>`.compiled, [], mockParent);
        const textNode2 = ' After';

        // This simulates mixed content rendering
        const wrapperTemplate = compile`<div class="content">${[textNode1, element, textNode2]}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            wrapperTemplate.compiled,
            [[textNode1, element, textNode2]],
            { state: {}, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        const content = container.querySelector('.content');
        assert.ok(content.textContent.includes('Before'), 'Should have before text');
        assert.ok(content.textContent.includes('Bold'), 'Should have bold text');
        assert.ok(content.textContent.includes('After'), 'Should have after text');

        const strong = content.querySelector('strong');
        assert.ok(strong, 'Should have strong element');
        assert.equal(strong.textContent, 'Bold');

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 8: Empty Children', function(it) {

    it('handles empty children gracefully', async () => {
        const wrapperTemplate = compile`<div class="content">${[]}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            wrapperTemplate.compiled,
            [[]],
            { state: {}, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        const content = container.querySelector('.content');
        assert.ok(content, 'Should have content div');
        // Just verify no errors occurred

        cleanup();
    });

});

describe('Children/Slots Spike - Scenario 9: Effect Cleanup', function(it) {

    it('disposes effects when cleanup is called', async () => {
        let effectRunCount = 0;

        const parentState = reactive({ value: 'initial' });

        // Child with reactive binding
        const childTemplate = compile`<p>${() => {
            effectRunCount++;
            return parentState.value;
        }}</p>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            childTemplate.compiled,
            [() => {
                effectRunCount++;
                return parentState.value;
            }],
            { state: parentState, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        const initialCount = effectRunCount;

        // Update should trigger effect
        parentState.value = 'updated';
        await waitForEffects();

        assert.ok(effectRunCount > initialCount, 'Effect should have run on update');

        const countBeforeCleanup = effectRunCount;

        // Cleanup
        cleanup();

        // Update after cleanup should NOT trigger effect
        parentState.value = 'after cleanup';
        await waitForEffects();

        assert.equal(effectRunCount, countBeforeCleanup, 'Effect should not run after cleanup');
    });

});

describe('Children/Slots Spike - Scenario 10: Context Preservation Chain', function(it) {

    it('preserves parent context through multiple levels', async () => {
        // This tests the critical context chain:
        // Parent -> Wrapper1 -> Wrapper2 -> Child with ${parent.state.x}

        const parentState = reactive({ message: 'From Parent' });
        const mockParent = { state: parentState, refs: {} };

        // Deepest child references parent state
        const deepChild = createDeferredChild(
            compile`<span>${() => parentState.message}</span>`.compiled,
            [() => parentState.message],
            mockParent  // Parent context!
        );

        // Wrapper 2 contains deep child
        const wrapper2Children = [deepChild];
        const wrapper2 = createDeferredChild(
            compile`<div class="wrapper2">${wrapper2Children}</div>`.compiled,
            [wrapper2Children],
            mockParent
        );

        // Wrapper 1 contains wrapper 2
        const wrapper1Children = [wrapper2];
        const wrapper1Template = compile`<div class="wrapper1">${wrapper1Children}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            wrapper1Template.compiled,
            [wrapper1Children],
            { state: {}, refs: {} }
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Verify structure
        const w1 = container.querySelector('.wrapper1');
        const w2 = w1?.querySelector('.wrapper2');
        const span = w2?.querySelector('span');

        assert.ok(span, 'Should find span through nested wrappers');
        assert.equal(span.textContent, 'From Parent', 'Should have parent state value');

        // Update parent state
        parentState.message = 'Updated Parent';
        await waitForEffects();

        assert.equal(span.textContent, 'Updated Parent', 'Should update when parent state changes');

        cleanup();
    });

});

// Run all tests
console.log('=== Children/Slots Spike Tests ===');
