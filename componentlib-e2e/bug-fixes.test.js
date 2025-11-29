/**
 * Bug Fixes E2E Tests
 * Tests for specific bugs reported during manual testing
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Bug Fixes...\n');

    // Bug 1: InputText - values change to "undefined" after typing
    await test.test('InputText maintains value after typing', async () => {
        await test.selectComponent('InputText');

        // Wait for the demo content to render
        await test.page.waitForSelector('.demo-section', { timeout: 5000 });
        await test.page.waitForTimeout(500);

        // Verify example component exists
        const hasExample = await test.page.evaluate(() => {
            return document.querySelector('example-input-text') !== null;
        });

        if (!hasExample) {
            throw new Error('example-input-text component not found');
        }

        await test.page.waitForSelector('example-input-text input', { timeout: 5000 });
        const input = await test.page.$('example-input-text input');
        await input.click();
        await input.type('test value');
        await test.page.waitForTimeout(300);

        const value = await test.page.evaluate(() => {
            const input = document.querySelector('example-input-text input');
            return input ? input.value : null;
        });

        await test.assert(value === 'test value', `Expected 'test value', got '${value}'`);
    });

    // Bug 2: Slider - changes to undefined after sliding
    await test.test('Slider maintains value after sliding', async () => {
        await test.selectComponent('Slider');
        await test.page.waitForSelector('.demo-section', { timeout: 5000 });
        await test.page.waitForTimeout(500);

        // Verify example component exists
        const hasExample = await test.page.evaluate(() => {
            return document.querySelector('example-slider') !== null;
        });

        if (!hasExample) {
            throw new Error('example-slider component not found');
        }

        await test.page.waitForSelector('example-slider input[type="range"]', { timeout: 5000 });

        // Get slider and move it
        await test.page.evaluate(() => {
            const slider = document.querySelector('example-slider input[type="range"]');
            if (slider) {
                slider.value = 75;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        await test.page.waitForTimeout(300);

        const displayedValue = await test.page.evaluate(() => {
            const display = document.querySelector('example-slider .value-display');
            return display ? display.textContent : null;
        });

        await test.assert(displayedValue === '75', `Expected '75', got '${displayedValue}'`);
    });

    // Bug 3: Calendar - loses selection after selecting
    await test.test('Calendar maintains selection after picking date', async () => {
        await test.selectComponent('Calendar');
        await test.page.waitForSelector('example-calendar cl-calendar');

        // Open calendar using the toggle button
        await test.page.click('example-calendar cl-calendar .calendar-toggle');
        await test.page.waitForTimeout(500);

        // Click a date that's not empty
        const dayClicked = await test.page.evaluate(() => {
            const day = document.querySelector('.calendar-grid .day:not(.empty):not(.disabled)');
            if (day) {
                day.click();
                return true;
            }
            return false;
        });

        await test.page.waitForTimeout(500);

        // Verify selection is maintained - check the masked input has a value
        const hasSelectedDate = await test.page.evaluate(() => {
            // Look for the input inside the calendar's input-mask component
            const calendars = document.querySelectorAll('example-calendar cl-calendar');
            for (const calendar of calendars) {
                const input = calendar.querySelector('cl-input-mask input');
                if (input && input.value && input.value.length > 0 && !input.value.includes('_')) {
                    return true;
                }
            }
            return false;
        });

        await test.assert(hasSelectedDate, 'Calendar should maintain selected date');
    });

    // Bug 3b: Calendar - inline calendar should not have z-index
    await test.test('Inline calendar has no z-index', async () => {
        await test.selectComponent('Calendar');
        await test.page.waitForSelector('example-calendar cl-calendar');

        const hasNoZIndex = await test.page.evaluate(() => {
            const inlinePickers = Array.from(document.querySelectorAll('.calendar-picker.inline'));
            return inlinePickers.every(picker => {
                const zIndex = window.getComputedStyle(picker).zIndex;
                return zIndex === 'auto' || zIndex === '0';
            });
        });

        await test.assert(hasNoZIndex, 'Inline calendar should not have z-index');
    });

    // Bug 4: Chips - adds individual characters of undefined after mousing out
    await test.test('Chips does not add undefined characters', async () => {
        await test.selectComponent('Chips');
        await test.page.waitForSelector('.demo-section', { timeout: 5000 });
        await test.page.waitForTimeout(500);

        // Verify example component exists
        const hasExample = await test.page.evaluate(() => {
            return document.querySelector('example-chips') !== null;
        });

        if (!hasExample) {
            throw new Error('example-chips component not found');
        }

        await test.page.waitForSelector('example-chips .chip-input', { timeout: 5000 });

        // Add a chip
        const input = await test.page.$('example-chips .chip-input');
        await input.click();
        await input.type('test');
        await test.page.keyboard.press('Enter'); // Add chip with Enter
        await test.page.waitForTimeout(300);

        // Verify no undefined chips
        const chips = await test.page.evaluate(() => {
            const chipElements = Array.from(document.querySelectorAll('example-chips .chip'));
            return chipElements.map(chip => chip.textContent.replace(/×/g, '').trim());
        });

        const hasUndefined = chips.some(chip => chip.includes('undefined') || chip === 'u' || chip === 'n' || chip === 'd');
        await test.assert(!hasUndefined, `Chips should not contain undefined: ${chips.join(', ')}`);
    });

    // Bug 5: Splitter - items show below splitter, not in split sections
    await test.test('Splitter content appears in panels', async () => {
        await test.selectComponent('Splitter');
        await test.page.waitForSelector('example-splitter cl-splitter');

        // Check if content is inside panel divs
        const contentInPanels = await test.page.evaluate(() => {
            const panel1 = document.querySelector('.splitter-panel.panel-1');
            const panel2 = document.querySelector('.splitter-panel.panel-2');

            return {
                panel1HasContent: panel1 && panel1.textContent.includes('Left Panel'),
                panel2HasContent: panel2 && panel2.textContent.includes('Right Panel')
            };
        });

        await test.assert(contentInPanels.panel1HasContent, 'Panel 1 should contain content');
        await test.assert(contentInPanels.panel2HasContent, 'Panel 2 should contain content');
    });

    // Bug 6: Toast - duplicate toast items
    await test.test('Toast shows single notification per click', async () => {
        await test.selectComponent('Toast');
        await test.page.waitForSelector('example-toast cl-button');

        // Click a toast button
        await test.page.click('example-toast cl-button');
        await test.page.waitForTimeout(500);

        // Count toast messages
        const toastCount = await test.page.evaluate(() => {
            return document.querySelectorAll('.toast-message').length;
        });

        await test.assertEqual(toastCount, 1, `Expected 1 toast, got ${toastCount}`);
    });

    // Bug 7: Color Picker - inline should not have z-index
    await test.test('Inline color picker has no z-index', async () => {
        await test.selectComponent('ColorPicker');
        await test.page.waitForSelector('example-colorpicker cl-colorpicker');

        const hasNoZIndex = await test.page.evaluate(() => {
            const inlinePickers = Array.from(document.querySelectorAll('.color-picker.inline'));
            return inlinePickers.every(picker => {
                const zIndex = window.getComputedStyle(picker).zIndex;
                return zIndex === 'auto' || zIndex === '0';
            });
        });

        await test.assert(hasNoZIndex, 'Inline color picker should not have z-index');
    });

    // Bug 7b: Color Picker - value display should show color, not "Selected"
    await test.test('Color picker displays color value correctly', async () => {
        await test.selectComponent('ColorPicker');
        await test.page.waitForSelector('.demo-section', { timeout: 5000 });
        await test.page.waitForTimeout(500);

        // Verify example component exists
        const hasExample = await test.page.evaluate(() => {
            return document.querySelector('example-colorpicker') !== null;
        });

        if (!hasExample) {
            throw new Error('example-colorpicker component not found');
        }

        await test.page.waitForSelector('example-colorpicker input[type="color"]', { timeout: 5000 });

        // Change color
        await test.page.evaluate(() => {
            const colorInput = document.querySelector('example-colorpicker input[type="color"]');
            if (colorInput) {
                colorInput.value = '#ff0000';
                colorInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        await test.page.waitForTimeout(500);

        // Check display
        const displayText = await test.page.evaluate(() => {
            const hexDisplay = document.querySelector('.color-hex');
            return hexDisplay ? hexDisplay.textContent : null;
        });

        await test.assert(
            displayText && displayText.startsWith('#') && !displayText.includes('Selected'),
            `Expected hex color value, got '${displayText}'`
        );
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
