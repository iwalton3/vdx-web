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

    // ============ Toast stacking animation (keyed reconciliation) ============
    // Regression: cl-toast used each() without a keyFn, so index-based
    // reconciliation recreated DOM nodes when a middle toast was removed,
    // retriggering the slide-in animation across the whole pane. With a stable
    // keyFn, surviving toasts must keep their exact DOM nodes.
    await test.test('Toast: dismissing a middle toast preserves the surviving toasts DOM nodes', async () => {
        await test.selectComponent('Toast');
        await test.page.waitForSelector('cl-toast', { timeout: 3000 });

        // Show three long-lived toasts directly on the component instance.
        await test.page.evaluate(() => {
            const t = document.querySelector('cl-toast');
            t.show({ severity: 'info', summary: 'One', detail: 'first', life: 60000 });
            t.show({ severity: 'success', summary: 'Two', detail: 'second', life: 60000 });
            t.show({ severity: 'error', summary: 'Three', detail: 'third', life: 60000 });
        });
        await test.page.waitForTimeout(300);

        const initial = await test.page.$$eval('cl-toast .toast-message', els => els.length);
        await test.assert(initial === 3, `Expected 3 toasts, got ${initial}`);

        // Tag every toast node so we can detect recreation.
        await test.page.evaluate(() => {
            document.querySelectorAll('cl-toast .toast-message').forEach((el, i) => { el.__tag = 'tag-' + i; });
        });

        // Dismiss the middle toast.
        await test.page.evaluate(() => {
            const nodes = document.querySelectorAll('cl-toast .toast-message');
            nodes[1].querySelector('.toast-close').click();
        });
        await test.page.waitForTimeout(500); // exit animation (300ms) + removal

        const result = await test.page.evaluate(() => {
            const nodes = Array.from(document.querySelectorAll('cl-toast .toast-message'));
            return { count: nodes.length, tags: nodes.map(n => n.__tag || 'NEW') };
        });

        await test.assert(result.count === 2, `Expected 2 toasts after dismiss, got ${result.count}`);
        await test.assert(
            result.tags.includes('tag-0') && result.tags.includes('tag-2') && !result.tags.includes('NEW'),
            `Surviving toasts must keep their original DOM nodes (no re-animation), got tags: ${result.tags.join(',')}`
        );
    });

    // ============ Toggle: no slide animation on mount ============
    // A toggle that mounts already-checked must not animate on->off->on. The
    // transition is gated behind an `.animated` class added only after the first
    // paint, so it is absent at mount and present afterwards.
    await test.test('Toggle does not animate into its initial state on mount', async () => {
        await test.selectComponent('Toggle');
        const atMount = await test.page.evaluate(() => {
            const el = document.createElement('cl-toggle');
            el.setAttribute('checked', 'true');
            document.body.appendChild(el);
            const w = el.querySelector('.cl-toggle-wrapper');
            const result = w ? w.classList.contains('animated') : null;
            el.remove();
            return result;
        });
        await test.assert(atMount === false, 'Freshly-mounted toggle must not have transitions enabled (no mount animation)');

        // After settling, existing toggles are animated so real toggles slide.
        const settled = await test.page.$('example-toggle cl-toggle .cl-toggle-wrapper.animated');
        await test.assert(!!settled, 'After the first frame, toggles should be animated so genuine toggling slides');
    });

    // ============ Calendar: range hover stays readable ============
    // Hovering a day while selecting a range must keep the dark (endpoint) colour,
    // not the light hover background that made white text unreadable.
    await test.test('Calendar range hover keeps a dark, readable background', async () => {
        await test.selectComponent('Calendar');
        await test.page.evaluate(() =>
            document.querySelectorAll('example-calendar cl-calendar')[1].querySelector('.calendar-toggle').click());
        await test.page.waitForTimeout(300);
        await test.page.evaluate(() => {
            const cal = document.querySelectorAll('example-calendar cl-calendar')[1];
            cal.querySelectorAll('.day:not(.empty):not(.disabled)')[4].click();
        });
        await test.page.waitForTimeout(150);

        const box = await test.page.evaluate(() => {
            const cal = document.querySelectorAll('example-calendar cl-calendar')[1];
            const day = cal.querySelectorAll('.day:not(.empty):not(.disabled)')[11];
            const rc = day.getBoundingClientRect();
            return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
        });
        await test.page.mouse.move(box.x, box.y);
        await test.page.waitForTimeout(200);

        const style = await test.page.evaluate(() => {
            const cal = document.querySelectorAll('example-calendar cl-calendar')[1];
            const day = cal.querySelectorAll('.day:not(.empty):not(.disabled)')[11];
            const cs = getComputedStyle(day);
            return { bg: cs.backgroundColor, isEnd: day.classList.contains('range-end') };
        });
        await test.assert(style.isEnd, 'Hovered day should preview as the range end');
        await test.assert(/rgb\(0, 123, 255\)|rgba\(0, 123, 255/.test(style.bg),
            `Hovered range-end day should stay primary-blue, got: ${style.bg}`);
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
