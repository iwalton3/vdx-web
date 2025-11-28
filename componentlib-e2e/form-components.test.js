/**
 * Form Components E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Form Components...\n');

    // InputText Tests
    await test.test('InputText component renders', async () => {
        await test.selectComponent('InputText');
        await test.assertExists('example-input-text');
        await test.assertExists('cl-input-text');
    });

    await test.test('InputText has multiple inputs with labels', async () => {
        await test.selectComponent('InputText');
        const labels = await test.page.$$eval('cl-input-text .cl-label',
            labels => labels.map(l => l.textContent.trim()));

        await test.assertGreaterThan(labels.length, 0, 'Should have labels');
        await test.assert(labels.some(l => l.includes('Basic Input')), 'Should have Basic Input');
    });

    await test.test('InputText is interactive', async () => {
        await test.selectComponent('InputText');
        await test.page.waitForSelector('cl-input-text input[type="text"]', { timeout: 2000 });

        // Test if we can focus and interact with the input
        const canFocus = await test.page.evaluate(() => {
            const input = document.querySelector('cl-input-text input[type="text"]');
            if (!input) return false;
            input.focus();
            return document.activeElement === input;
        });

        await test.assert(canFocus, 'Input should be focusable and interactive');
    });

    // InputNumber Tests
    await test.test('InputNumber component renders', async () => {
        await test.selectComponent('InputNumber');
        await test.assertExists('example-input-number');
        await test.assertExists('cl-input-number');
    });

    await test.test('InputNumber has increment/decrement buttons', async () => {
        await test.selectComponent('InputNumber');
        await test.assertExists('.btn-increment');
        await test.assertExists('.btn-decrement');
    });

    await test.test('InputNumber buttons are clickable', async () => {
        await test.selectComponent('InputNumber');
        const incrementBtn = await test.page.$('.btn-increment');
        await test.assert(incrementBtn !== null, 'Should have increment button');

        await incrementBtn.click();
        await test.page.waitForTimeout(100);
        // Button should remain visible after click
        await test.assertExists('.btn-increment');
    });

    // TextArea Tests
    await test.test('TextArea component renders', async () => {
        await test.selectComponent('TextArea');
        await test.assertExists('example-textarea');
        await test.assertExists('cl-textarea');
    });

    await test.test('TextArea is interactive', async () => {
        await test.selectComponent('TextArea');
        const textarea = await test.page.$('cl-textarea textarea');
        await test.assert(textarea !== null, 'Should have textarea');

        await textarea.type('Multi-line\ntext input');
        const value = await test.page.evaluate(el => el.value, textarea);
        await test.assert(value.includes('Multi-line'), 'Should accept text input');
    });

    // Checkbox Tests
    await test.test('Checkbox component renders', async () => {
        await test.selectComponent('Checkbox');
        await test.assertExists('example-checkbox');
        await test.assertExists('cl-checkbox');
    });

    await test.test('Checkbox is clickable', async () => {
        await test.selectComponent('Checkbox');
        await test.page.waitForSelector('cl-checkbox label', { timeout: 2000 });

        // Get initial state text from the status display
        const initialText = await test.page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('example-checkbox > div > div'));
            const statusDiv = divs.find(d => d.textContent.includes('Terms:'));
            return statusDiv ? statusDiv.textContent.trim() : null;
        });

        // Click the checkbox label
        await test.page.click('cl-checkbox label');
        await test.page.waitForTimeout(300);

        // Verify state changed
        const newText = await test.page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('example-checkbox > div > div'));
            const statusDiv = divs.find(d => d.textContent.includes('Terms:'));
            return statusDiv ? statusDiv.textContent.trim() : null;
        });

        await test.assert(newText !== initialText, 'Checkbox should update parent state');
    });

    // RadioButton Tests
    await test.test('RadioButton component renders', async () => {
        await test.selectComponent('RadioButton');
        await test.assertExists('example-radio-button');
        await test.assertExists('cl-radio-button');
    });

    await test.test('RadioButton has multiple options', async () => {
        await test.selectComponent('RadioButton');
        const radios = await test.page.$$('cl-radio-button');
        await test.assertGreaterThan(radios.length, 1, 'Should have multiple radio buttons');
    });

    // Slider Tests
    await test.test('Slider component renders', async () => {
        await test.selectComponent('Slider');
        await test.assertExists('example-slider');
        await test.assertExists('cl-slider');
    });

    await test.test('Slider has range input', async () => {
        await test.selectComponent('Slider');
        await test.assertExists('input[type="range"]');
    });

    await test.test('Slider displays value', async () => {
        await test.selectComponent('Slider');
        await test.assertExists('.value-display');
        const value = await test.page.$eval('.value-display', el => el.textContent);
        await test.assert(/\d+/.test(value), 'Should display numeric value');
    });

    // Calendar Tests
    await test.test('Calendar component renders', async () => {
        await test.selectComponent('Calendar');
        await test.assertExists('example-calendar');
        await test.assertExists('cl-calendar');
    });

    await test.test('Calendar shows date picker', async () => {
        await test.selectComponent('Calendar');
        // Wait for component to fully mount and render
        await test.page.waitForSelector('.calendar-picker.inline', { timeout: 3000 });

        // Inline calendar should be visible
        await test.assertExists('.calendar-picker.inline');
    });

    await test.test('Calendar has navigation', async () => {
        await test.selectComponent('Calendar');
        await test.page.waitForSelector('.nav-btn', { timeout: 3000 });
        await test.assertExists('.nav-btn'); // Previous/Next buttons
        await test.assertExists('.month-year'); // Month/Year display
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
