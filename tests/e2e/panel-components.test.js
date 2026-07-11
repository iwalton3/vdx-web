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

    // Stepper Tests
    await test.test('Stepper component renders', async () => {
        await test.selectComponent('Stepper');
        await test.assertExists('example-stepper');
        await test.assertExists('cl-stepper');
    });

    await test.test('Stepper has step indicators', async () => {
        await test.selectComponent('Stepper');
        const steps = await test.page.$$('.step-item');
        await test.assertGreaterThan(steps.length, 0, 'Should have step indicators');
    });

    await test.test('Stepper has active step', async () => {
        await test.selectComponent('Stepper');
        await test.assertExists('.step-item.active');
    });

    await test.test('Stepper has step connectors', async () => {
        await test.selectComponent('Stepper');
        const connectors = await test.page.$$('.step-connector');
        await test.assertGreaterThan(connectors.length, 0, 'Should have step connectors');
    });

    await test.test('Stepper has navigation buttons', async () => {
        await test.selectComponent('Stepper');
        await test.assertExists('.stepper-actions');
        await test.assertExists('.btn-primary'); // Continue button
    });

    await test.test('Stepper shows content for current step', async () => {
        await test.selectComponent('Stepper');
        await test.assertExists('.stepper-content');
        // The first step content should be visible
        const content = await test.page.$('.stepper-content');
        const textContent = await test.page.evaluate(el => el.textContent, content);
        await test.assert(textContent.includes('Account') || textContent.includes('Email'),
            'Should show first step content');
    });

    await test.test('Stepper can navigate to next step', async () => {
        await test.selectComponent('Stepper');
        await test.page.waitForTimeout(300);

        // Enter required email first (validation requires it)
        const emailInput = await test.page.$('cl-input-text input');
        if (emailInput) {
            await emailInput.type('test@example.com');
            await test.page.waitForTimeout(100);
        }

        // Click continue
        const continueBtn = await test.page.$('.btn-primary');
        if (continueBtn) {
            await continueBtn.click();
            await test.page.waitForTimeout(300);

            // Check that we're on step 2 (Profile)
            const stepItems = await test.page.$$('.step-item');
            if (stepItems.length >= 2) {
                const isSecondActive = await test.page.evaluate(
                    el => el.classList.contains('active'),
                    stepItems[1]
                );
                await test.assert(isSecondActive, 'Second step should be active');
            }
        }
    });

    await test.test('Stepper marks completed steps', async () => {
        await test.selectComponent('Stepper');
        await test.page.waitForTimeout(300);

        // Fill email and go to step 2
        const emailInput = await test.page.$('cl-input-text input');
        if (emailInput) {
            await emailInput.type('test@example.com');
        }

        const continueBtn = await test.page.$('.btn-primary');
        if (continueBtn) {
            await continueBtn.click();
            await test.page.waitForTimeout(300);

            // First step should now have completed class
            const completedStep = await test.page.$('.step-item.completed');
            await test.assert(completedStep !== null, 'First step should be marked completed');
        }
    });

    await test.test('Stepper back button works', async () => {
        // Select a different component first to force reset
        await test.selectComponent('Card');
        await test.page.waitForTimeout(200);
        await test.selectComponent('Stepper');
        await test.page.waitForTimeout(500);

        // Go to step 2 first
        const emailInput = await test.page.$('cl-input-text input');
        if (emailInput) {
            await emailInput.type('test@example.com');
            await test.page.waitForTimeout(100);
        }

        let continueBtn = await test.page.$('.btn-primary');
        if (continueBtn) {
            await continueBtn.click();
            await test.page.waitForTimeout(500);

            // Verify we're on step 2 before clicking back
            const step2Active = await test.page.evaluate(() => {
                const items = document.querySelectorAll('.step-item');
                return items.length > 1 && items[1].classList.contains('active');
            });
            await test.assert(step2Active, 'Should be on step 2');

            // Now click back
            const backBtn = await test.page.$('.btn-secondary');
            if (backBtn) {
                await backBtn.click();
                await test.page.waitForTimeout(500);

                // First step should be active again - query fresh from DOM
                const isFirstActive = await test.page.evaluate(() => {
                    const items = document.querySelectorAll('.step-item');
                    return items.length > 0 && items[0].classList.contains('active');
                });
                await test.assert(isFirstActive, 'First step should be active after back');
            }
        }
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
