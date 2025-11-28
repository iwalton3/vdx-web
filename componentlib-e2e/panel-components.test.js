/**
 * Panel Components E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Panel Components...\n');

    // Accordion Tests
    await test.test('Accordion component renders', async () => {
        await test.selectComponent('Accordion');
        await test.assertExists('example-accordion');
        await test.assertExists('cl-accordion');
    });

    await test.test('Accordion has tabs', async () => {
        await test.selectComponent('Accordion');
        const tabs = await test.page.$$('.accordion-tab');
        await test.assertGreaterThan(tabs.length, 0, 'Should have accordion tabs');
    });

    await test.test('Accordion tabs are clickable', async () => {
        await test.selectComponent('Accordion');
        const headers = await test.page.$$('.accordion-header');

        if (headers.length > 1) {
            await headers[1].click();
            await test.page.waitForTimeout(200);

            const activeContent = await test.page.$$('.accordion-content');
            await test.assertGreaterThan(activeContent.length, 0, 'Should show content');
        }
    });

    // TabView Tests
    await test.test('TabView component renders', async () => {
        await test.selectComponent('TabView');
        await test.assertExists('example-tabview');
        await test.assertExists('cl-tabview');
    });

    await test.test('TabView has tab headers', async () => {
        await test.selectComponent('TabView');
        const headers = await test.page.$$('.tab-header');
        await test.assertGreaterThan(headers.length, 0, 'Should have tab headers');
    });

    await test.test('TabView has active tab', async () => {
        await test.selectComponent('TabView');
        await test.assertExists('.tab-header.active');
    });

    await test.test('TabView tabs are clickable', async () => {
        await test.selectComponent('TabView');
        const headers = await test.page.$$('.tab-header');

        if (headers.length > 1) {
            const initialActive = await test.page.$eval('.tab-header.active',
                el => el.textContent.trim());

            await headers[1].click();
            await test.page.waitForTimeout(200);

            const newActive = await test.page.$eval('.tab-header.active',
                el => el.textContent.trim());

            await test.assert(newActive !== initialActive, 'Active tab should change');
        }
    });

    // Card Tests
    await test.test('Card component renders', async () => {
        await test.selectComponent('Card');
        await test.assertExists('example-card');
        await test.assertExists('cl-card');
    });

    await test.test('Card has header', async () => {
        await test.selectComponent('Card');
        await test.assertExists('.card-header');
        await test.assertExists('.card-title');
    });

    await test.test('Card has body', async () => {
        await test.selectComponent('Card');
        await test.assertExists('.card-body');
    });

    await test.test('Card can have footer', async () => {
        await test.selectComponent('Card');
        const cards = await test.page.$$('cl-card');

        // Second card should have footer
        if (cards.length > 1) {
            const footer = await test.page.$('.card-footer');
            await test.assert(footer !== null, 'Card can have footer');
        }
    });

    // Fieldset Tests
    await test.test('Fieldset component renders', async () => {
        await test.selectComponent('Fieldset');
        await test.assertExists('example-fieldset');
        await test.assertExists('cl-fieldset');
    });

    await test.test('Fieldset has legend', async () => {
        await test.selectComponent('Fieldset');
        await test.assertExists('legend');
    });

    await test.test('Toggleable fieldset has toggle icon', async () => {
        await test.selectComponent('Fieldset');
        const toggleable = await test.page.$('legend.toggleable');

        if (toggleable) {
            await test.assertExists('.toggle-icon');
        }
    });

    await test.test('Toggleable fieldset can collapse', async () => {
        await test.selectComponent('Fieldset');
        const toggleableLegend = await test.page.$('legend.toggleable');

        if (toggleableLegend) {
            // Check initial state - should not be collapsed
            const initiallyCollapsed = await test.page.$('.fieldset-content.collapsed');
            await test.assert(!initiallyCollapsed, 'Should not be collapsed initially');

            // Click to collapse
            await toggleableLegend.click();
            await test.page.waitForTimeout(200);

            // Check it's now collapsed
            const nowCollapsed = await test.page.$('.fieldset-content.collapsed');
            await test.assert(nowCollapsed, 'Content should be collapsed after toggle');
        }
    });

    // Splitter Tests
    await test.test('Splitter component renders', async () => {
        await test.selectComponent('Splitter');
        await test.assertExists('example-splitter');
        await test.assertExists('cl-splitter');
    });

    await test.test('Splitter has panels', async () => {
        await test.selectComponent('Splitter');
        await test.assertExists('.splitter-panel.panel-1');
        await test.assertExists('.splitter-panel.panel-2');
    });

    await test.test('Splitter has gutter', async () => {
        await test.selectComponent('Splitter');
        await test.assertExists('.splitter-gutter');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
