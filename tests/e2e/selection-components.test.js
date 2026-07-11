/**
 * Selection Components E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Selection Components...\n');

    // Dropdown Tests
    await test.test('Dropdown component renders', async () => {
        await test.selectComponent('Dropdown');
        await test.assertExists('example-dropdown');
        await test.assertExists('cl-dropdown');
    });

    await test.test('Dropdown has trigger element', async () => {
        await test.selectComponent('Dropdown');
        await test.assertExists('.dropdown-trigger');
    });

    await test.test('Dropdown opens on click', async () => {
        await test.selectComponent('Dropdown');
        await test.assertNotExists('.dropdown-panel');

        await test.page.click('.dropdown-trigger');
        await test.page.waitForTimeout(200);

        await test.assertExists('.dropdown-panel');
    });

    await test.test('Dropdown shows options', async () => {
        await test.selectComponent('Dropdown');
        await test.page.waitForSelector('.dropdown-trigger', { timeout: 2000 });

        // Check if dropdown is already open from previous test
        const panelOpen = await test.page.$('.dropdown-panel');
        const trigger = await test.page.$('.dropdown-trigger');

        if (panelOpen && trigger) {
            // Close it first
            await trigger.click();
            await test.page.waitForTimeout(300);
        }

        // Now open it
        if (trigger) {
            await trigger.click();
            await test.page.waitForSelector('.option', { timeout: 2000 });
        }

        const options = await test.page.$$('.option');
        await test.assertGreaterThan(options.length, 0, 'Should have options');
    });

    await test.test('Dropdown with filter has search input', async () => {
        await test.selectComponent('Dropdown');
        await test.page.waitForSelector('.dropdown-trigger', { timeout: 2000 });

        // Close any open dropdowns first
        const existingPanel = await test.page.$('.dropdown-panel');
        if (existingPanel) {
            await test.page.click('.dropdown-trigger');
            await test.page.waitForTimeout(300);
        }

        // Click the second dropdown (with filter)
        const triggers = await test.page.$$('.dropdown-trigger');
        if (triggers.length > 1) {
            await triggers[1].click();
            await test.page.waitForTimeout(400);
            await test.assertExists('.filter-input');
        }
    });

    // MultiSelect Tests
    await test.test('MultiSelect component renders', async () => {
        await test.selectComponent('MultiSelect');
        await test.assertExists('example-multiselect');
        await test.assertExists('cl-multiselect');
    });

    await test.test('MultiSelect shows chips for selected items', async () => {
        await test.selectComponent('MultiSelect');
        // Should have pre-selected chips
        const chips = await test.page.$$('.chip');
        await test.assertGreaterThan(chips.length, 0, 'Should have selected chips');
    });

    await test.test('MultiSelect opens on click', async () => {
        await test.selectComponent('MultiSelect');
        await test.page.click('.multiselect-trigger');
        await test.page.waitForTimeout(200);

        await test.assertExists('.multiselect-panel');
    });

    await test.test('MultiSelect options have checkboxes', async () => {
        await test.selectComponent('MultiSelect');
        await test.page.waitForSelector('.multiselect-trigger', { timeout: 2000 });

        // Check if already open from previous test
        const panelOpen = await test.page.$('.multiselect-panel');
        const trigger = await test.page.$('.multiselect-trigger');

        if (panelOpen && trigger) {
            await trigger.click();
            await test.page.waitForTimeout(300);
        }

        if (trigger) {
            await trigger.click();
            await test.page.waitForSelector('.option input[type="checkbox"]', { timeout: 2000 });
        }

        const checkboxes = await test.page.$$('.option input[type="checkbox"]');
        await test.assertGreaterThan(checkboxes.length, 0, 'Should have checkboxes');
    });

    // AutoComplete Tests
    await test.test('AutoComplete component renders', async () => {
        await test.selectComponent('AutoComplete');
        await test.assertExists('example-autocomplete');
        await test.assertExists('cl-autocomplete');
    });

    await test.test('AutoComplete has input field', async () => {
        await test.selectComponent('AutoComplete');
        const input = await test.page.$('cl-autocomplete input[type="text"]');
        await test.assert(input !== null, 'Should have text input');
    });

    await test.test('AutoComplete shows suggestions on type', async () => {
        await test.selectComponent('AutoComplete');
        const input = await test.page.$('cl-autocomplete input[type="text"]');

        await input.type('United');
        await test.page.waitForTimeout(500); // Wait for delay

        const suggestions = await test.page.$('.suggestions-panel');
        await test.assert(suggestions !== null, 'Should show suggestions');
    });

    // Chips Tests
    await test.test('Chips component renders', async () => {
        await test.selectComponent('Chips');
        await test.assertExists('example-chips');
        await test.assertExists('cl-chips');
    });

    await test.test('Chips shows existing tags', async () => {
        await test.selectComponent('Chips');
        const chips = await test.page.$$('.chip');
        await test.assertGreaterThan(chips.length, 0, 'Should have chips');
    });

    await test.test('Chips has input for adding tags', async () => {
        await test.selectComponent('Chips');
        await test.assertExists('.chip-input');
    });

    await test.test('Chips can add new tag', async () => {
        await test.selectComponent('Chips');
        await test.page.waitForSelector('.chip-input', { timeout: 2000 });

        const result = await test.page.evaluate(() => {
            const initialCount = document.querySelectorAll('.chip').length;
            const input = document.querySelector('.chip-input');

            // Set value directly
            input.value = 'newtag';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Trigger Enter key
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            });
            input.dispatchEvent(enterEvent);

            // Wait a bit for state to update
            return new Promise(resolve => {
                setTimeout(() => {
                    const newCount = document.querySelectorAll('.chip').length;
                    resolve({ initialCount, newCount });
                }, 300);
            });
        });

        await test.assertGreaterThan(result.newCount, result.initialCount, 'Should add new chip');
    });

    await test.test('Chips preserves existing tags when adding new ones', async () => {
        await test.selectComponent('Chips');
        await test.page.waitForSelector('.chip', { timeout: 2000 });

        // Get initial chips
        const initialChips = await test.page.evaluate(() => {
            return Array.from(document.querySelectorAll('.chip')).map(c => {
                // Get text content without the remove button
                const clone = c.cloneNode(true);
                const removeBtn = clone.querySelector('.chip-remove');
                if (removeBtn) removeBtn.remove();
                return clone.textContent.trim();
            });
        });

        // Verify we have initial chips (should have javascript, react, vue)
        await test.assertGreaterThan(initialChips.length, 0, 'Should have initial chips');

        // Type and add a new chip
        const input = await test.page.$('.chip-input');
        await input.type('angular');

        // Press Enter to add the chip
        await test.page.keyboard.press('Enter');
        await test.page.waitForTimeout(300);

        // Get all chips now
        const newChips = await test.page.evaluate(() => {
            return Array.from(document.querySelectorAll('.chip')).map(c => {
                const clone = c.cloneNode(true);
                const removeBtn = clone.querySelector('.chip-remove');
                if (removeBtn) removeBtn.remove();
                return clone.textContent.trim();
            });
        });

        // Check that all original chips are still present
        const allOriginalPresent = initialChips.every(chip => newChips.includes(chip));
        await test.assert(allOriginalPresent,
            `All original chips should be preserved. Original: [${initialChips.join(', ')}], New: [${newChips.join(', ')}]`);

        // Check that new chip was added
        await test.assert(newChips.includes('angular'),
            `New chip "angular" should be added. Chips: [${newChips.join(', ')}]`);
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
