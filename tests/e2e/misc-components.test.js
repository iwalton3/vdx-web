/**
 * Misc Components E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Misc Components...\n');

    // ProgressBar Tests
    await test.test('ProgressBar component renders', async () => {
        await test.selectComponent('ProgressBar');
        await test.assertExists('example-progressbar');
        await test.assertExists('cl-progressbar');
    });

    await test.test('ProgressBar has progress container', async () => {
        await test.selectComponent('ProgressBar');
        await test.assertExists('.progress-container');
    });

    await test.test('ProgressBar has progress bar', async () => {
        await test.selectComponent('ProgressBar');
        await test.assertExists('.progress-bar');
    });

    await test.test('ProgressBar shows value', async () => {
        await test.selectComponent('ProgressBar');
        const values = await test.page.$$('.progress-value');
        await test.assertGreaterThan(values.length, 0, 'Should show progress values');
    });

    await test.test('ProgressBar can be indeterminate', async () => {
        await test.selectComponent('ProgressBar');
        const indeterminate = await test.page.$('.progress-bar.indeterminate');
        await test.assert(indeterminate !== null, 'Should have indeterminate mode');
    });

    await test.test('ProgressBar value is correct', async () => {
        await test.selectComponent('ProgressBar');
        const value = await test.page.$eval('.progress-value', el => el.textContent);
        await test.assert(/\d+%/.test(value), 'Should show percentage value');
    });

    // FileUpload Tests
    await test.test('FileUpload component renders', async () => {
        await test.selectComponent('FileUpload');
        await test.assertExists('example-fileupload');
        await test.assertExists('cl-fileupload');
    });

    await test.test('FileUpload has choose button', async () => {
        await test.selectComponent('FileUpload');
        await test.assertExists('.choose-button');
    });

    await test.test('FileUpload has file input', async () => {
        await test.selectComponent('FileUpload');
        const input = await test.page.$('input[type="file"]');
        await test.assert(input !== null, 'Should have file input');
    });

    await test.test('FileUpload can accept multiple files', async () => {
        await test.selectComponent('FileUpload');
        const hasMultiple = await test.page.evaluate(() => {
            const input = document.querySelector('input[type="file"]');
            return input && input.hasAttribute('multiple');
        });
        await test.assert(hasMultiple, 'Should support multiple files');
    });

    // ColorPicker Tests
    await test.test('ColorPicker component renders', async () => {
        await test.selectComponent('ColorPicker');
        await test.assertExists('example-colorpicker');
        await test.assertExists('cl-colorpicker');
    });

    await test.test('ColorPicker has color input', async () => {
        await test.selectComponent('ColorPicker');
        const input = await test.page.$('input[type="color"]');
        await test.assert(input !== null, 'Should have color input');
    });

    await test.test('ColorPicker shows preview', async () => {
        await test.selectComponent('ColorPicker');
        await test.assertExists('.color-preview');
    });

    await test.test('ColorPicker displays selected color', async () => {
        await test.selectComponent('ColorPicker');
        await test.page.waitForTimeout(500);

        // Should show color in a demo div or color preview
        const colorDemo = await test.page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('div'));
            return divs.some(div => {
                const bg = div.style.background || div.style.backgroundColor;
                const text = div.textContent;
                return (bg && (bg.includes('#') || bg.includes('rgb'))) ||
                       (text && text.includes('Selected Color'));
            });
        });

        await test.assert(colorDemo, 'Should display selected color');
    });

    await test.test('ColorPicker shows hex value', async () => {
        await test.selectComponent('ColorPicker');

        const hasHex = await test.page.evaluate(() => {
            const text = document.body.textContent;
            return /#[0-9a-fA-F]{6}/.test(text);
        });

        await test.assert(hasHex, 'Should show hex color value');
    });

    await test.test('ColorPicker shows RGB values', async () => {
        await test.selectComponent('ColorPicker');

        const picker = await test.page.$('.color-picker');
        if (picker) {
            await test.assertExists('.color-rgb');
        }
    });

    await test.test('ColorPicker persists selected color', async () => {
        await test.selectComponent('ColorPicker');
        await test.page.waitForSelector('input[type="color"]', { timeout: 2000 });

        // Set a specific color via JavaScript (direct value set for color inputs)
        const testColor = '#ff5500';
        await test.page.evaluate((color) => {
            const colorInput = document.querySelector('input[type="color"]');
            if (colorInput) {
                colorInput.value = color;
                colorInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, testColor);

        await test.page.waitForTimeout(200);

        // Click elsewhere to blur
        await test.page.click('body');
        await test.page.waitForTimeout(200);

        // Verify color persisted
        const currentColor = await test.page.evaluate(() => {
            const colorInput = document.querySelector('input[type="color"]');
            return colorInput ? colorInput.value : '';
        });

        await test.assert(currentColor.toLowerCase() === testColor.toLowerCase(),
            `ColorPicker should persist selected color. Expected "${testColor}", got "${currentColor}"`);
    });

    // ErrorBoundary Tests
    await test.test('ErrorBoundary component renders', async () => {
        await test.selectComponent('Error Boundary');
        await test.assertExists('cl-error-boundary-demo');
    });

    await test.test('ErrorBoundary demo has trigger button', async () => {
        await test.selectComponent('Error Boundary');
        await test.assertExists('.trigger-btn');
    });

    await test.test('ErrorBoundary shows error state when triggered', async () => {
        await test.selectComponent('Error Boundary');
        await test.page.click('.trigger-btn');
        await test.page.waitForTimeout(300);
        await test.assertExists('cl-error-boundary');
    });

    await test.test('ErrorBoundary shows error title and message', async () => {
        await test.selectComponent('Error Boundary');
        // May already be in error state from previous test
        const hasError = await test.page.$('cl-error-boundary');
        if (!hasError) {
            await test.page.click('.trigger-btn');
            await test.page.waitForTimeout(300);
        }

        const title = await test.page.$eval('.error-title', el => el.textContent);
        await test.assert(title === 'Render Failed', `Expected title "Render Failed", got "${title}"`);

        const message = await test.page.$eval('.error-message', el => el.textContent);
        await test.assert(message.includes('data is undefined'), 'Should show error message');
    });

    await test.test('ErrorBoundary retry button resets error', async () => {
        await test.selectComponent('Error Boundary');
        // Ensure we're in error state
        const hasError = await test.page.$('cl-error-boundary');
        if (!hasError) {
            await test.page.click('.trigger-btn');
            await test.page.waitForTimeout(300);
        }

        await test.page.click('.retry-btn');
        await test.page.waitForTimeout(300);

        // Should be back to success state
        await test.assertExists('.content-box');
        await test.assertExists('.trigger-btn');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
