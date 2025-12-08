/**
 * New Components E2E Tests
 * Tests for InputMask, InputPassword, Toggle, InputSearch, VirtualList, Badge, Alert
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing New Components...\n');

    // ============ InputMask Tests ============
    await test.test('InputMask component renders', async () => {
        await test.selectComponent('InputMask');
        await test.assertExists('example-input-mask');
        await test.assertExists('cl-input-mask');
    });

    await test.test('InputMask has phone number field with mask', async () => {
        await test.selectComponent('InputMask');
        const labels = await test.page.$$eval('cl-input-mask .cl-label',
            labels => labels.map(l => l.textContent.trim()));
        await test.assert(labels.some(l => l.includes('Phone')), 'Should have Phone Number label');
    });

    await test.test('InputMask applies mask on input', async () => {
        await test.selectComponent('InputMask');
        await test.page.waitForSelector('cl-input-mask input', { timeout: 2000 });

        // Type digits into the first input (phone)
        const input = await test.page.$('cl-input-mask input');
        await input.click();
        await test.page.waitForTimeout(100);
        await input.type('1234567890', { delay: 50 });

        await test.page.waitForTimeout(200);
        const value = await test.page.evaluate(el => el.value, input);
        // Should be formatted like (123) 456-7890
        await test.assert(value.includes('(') || value.includes('-'),
            `Mask should be applied to phone input, got: ${value}`);
    });

    await test.test('InputMask has SSN field', async () => {
        await test.selectComponent('InputMask');
        const labels = await test.page.$$eval('cl-input-mask .cl-label',
            labels => labels.map(l => l.textContent.trim()));
        await test.assert(labels.some(l => l.includes('Social Security')), 'Should have SSN label');
    });

    // ============ InputPassword Tests ============
    await test.test('InputPassword component renders', async () => {
        await test.selectComponent('InputPassword');
        await test.assertExists('example-input-password');
        await test.assertExists('cl-input-password');
    });

    await test.test('InputPassword has visibility toggle button', async () => {
        await test.selectComponent('InputPassword');
        await test.assertExists('.toggle-btn');
    });

    await test.test('InputPassword toggles visibility', async () => {
        await test.selectComponent('InputPassword');
        await test.page.waitForSelector('cl-input-password input', { timeout: 2000 });

        // Get initial type
        const initialType = await test.page.$eval('cl-input-password input', el => el.type);
        await test.assert(initialType === 'password', 'Should start as password type');

        // Click toggle button
        await test.page.click('.toggle-btn');
        await test.page.waitForTimeout(200);

        // Check type changed
        const newType = await test.page.$eval('cl-input-password input', el => el.type);
        await test.assert(newType === 'text', 'Should toggle to text type');
    });

    await test.test('InputPassword shows strength meter when enabled', async () => {
        await test.selectComponent('InputPassword');
        const input = await test.page.$('cl-input-password input');
        await input.type('StrongPass123!', { delay: 30 });
        await test.page.waitForTimeout(300);

        await test.assertExists('.strength-meter');
        await test.assertExists('.strength-bar');
    });

    await test.test('InputPassword persists value after blur', async () => {
        await test.selectComponent('InputPassword');
        await test.page.waitForSelector('cl-input-password input', { timeout: 2000 });

        const testValue = 'TestPassword123';

        // Clear and type into the input
        const input = await test.page.$('cl-input-password input');
        await input.click({ clickCount: 3 }); // Select all
        await input.type(testValue);

        // Blur by clicking elsewhere
        await test.page.click('body');
        await test.page.waitForTimeout(200);

        // Verify value persisted
        const value = await test.page.evaluate(() => {
            const input = document.querySelector('cl-input-password input');
            return input ? input.value : '';
        });

        await test.assert(value === testValue, `InputPassword should persist value after blur. Expected "${testValue}", got "${value}"`);
    });

    // ============ Toggle Tests ============
    await test.test('Toggle component renders', async () => {
        await test.selectComponent('Toggle');
        await test.assertExists('example-toggle');
        await test.assertExists('cl-toggle');
    });

    await test.test('Toggle has track and thumb elements', async () => {
        await test.selectComponent('Toggle');
        await test.assertExists('cl-toggle .toggle-track');
        await test.assertExists('cl-toggle .toggle-thumb');
    });

    await test.test('Toggle is clickable and changes state', async () => {
        await test.selectComponent('Toggle');
        await test.page.waitForSelector('cl-toggle .toggle-track', { timeout: 2000 });

        // Get initial state
        const initialState = await test.page.evaluate(() => {
            const track = document.querySelector('cl-toggle .toggle-track');
            return track ? track.classList.contains('checked') : false;
        });

        // Click toggle
        await test.page.click('cl-toggle .cl-toggle-wrapper');
        await test.page.waitForTimeout(200);

        // Check state changed
        const newState = await test.page.evaluate(() => {
            const track = document.querySelector('cl-toggle .toggle-track');
            return track ? track.classList.contains('checked') : false;
        });

        await test.assert(newState !== initialState, 'Toggle state should change on click');
    });

    await test.test('Toggle has different sizes', async () => {
        await test.selectComponent('Toggle');
        const sizes = await test.page.$$eval('cl-toggle .toggle-track',
            tracks => tracks.map(t => {
                if (t.classList.contains('size-small')) return 'small';
                if (t.classList.contains('size-large')) return 'large';
                return 'medium';
            }));

        await test.assert(sizes.includes('small'), 'Should have small size');
        await test.assert(sizes.includes('medium'), 'Should have medium size');
        await test.assert(sizes.includes('large'), 'Should have large size');
    });

    await test.test('Toggle can cycle on -> off -> on', async () => {
        await test.selectComponent('Toggle');
        await test.page.waitForSelector('cl-toggle .toggle-track', { timeout: 2000 });

        // Find a toggle that starts checked (on)
        const initiallyChecked = await test.page.evaluate(() => {
            const toggles = document.querySelectorAll('cl-toggle .toggle-track');
            for (let t of toggles) {
                if (t.classList.contains('checked')) return true;
            }
            return false;
        });

        await test.assert(initiallyChecked, 'Should have at least one checked toggle initially');

        // Get first checked toggle
        const checkedToggle = await test.page.$('cl-toggle .toggle-track.checked');
        const wrapper = await test.page.$('cl-toggle:has(.toggle-track.checked) .cl-toggle-wrapper');

        if (!wrapper) {
            throw new Error('Could not find wrapper for checked toggle');
        }

        // Click to turn OFF
        await wrapper.click();
        await test.page.waitForTimeout(200);

        // Verify it's off (no longer checked)
        const isOffNow = await test.page.evaluate(el => {
            const track = el.querySelector('.toggle-track');
            return track && !track.classList.contains('checked');
        }, await wrapper.evaluateHandle(el => el.parentElement));

        await test.assert(isOffNow, 'Toggle should be OFF after first click');

        // Click to turn back ON
        await wrapper.click();
        await test.page.waitForTimeout(200);

        // Verify it's back on (checked again)
        const isOnAgain = await test.page.evaluate(el => {
            const track = el.querySelector('.toggle-track');
            return track && track.classList.contains('checked');
        }, await wrapper.evaluateHandle(el => el.parentElement));

        await test.assert(isOnAgain, 'Toggle should be ON again after second click - cycling must work');
    });

    // ============ InputSearch Tests ============
    await test.test('InputSearch component renders', async () => {
        await test.selectComponent('InputSearch');
        await test.assertExists('example-input-search');
        await test.assertExists('cl-input-search');
    });

    await test.test('InputSearch has search icon', async () => {
        await test.selectComponent('InputSearch');
        await test.assertExists('.search-icon');
    });

    await test.test('InputSearch shows clear button when has value', async () => {
        await test.selectComponent('InputSearch');
        const input = await test.page.$('cl-input-search input');
        await input.type('test search', { delay: 30 });
        await test.page.waitForTimeout(200);

        await test.assertExists('.clear-btn');
    });

    await test.test('InputSearch clear button clears input', async () => {
        await test.selectComponent('InputSearch');
        const input = await test.page.$('cl-input-search input');
        await input.type('test', { delay: 30 });
        await test.page.waitForTimeout(200);

        await test.page.click('.clear-btn');
        await test.page.waitForTimeout(200);

        const value = await test.page.evaluate(el => el.value, input);
        await test.assert(value === '', 'Input should be cleared');
    });

    await test.test('InputSearch shows suggestions dropdown', async () => {
        await test.selectComponent('InputSearch');

        // Find the search with suggestions (second one)
        const inputs = await test.page.$$('cl-input-search input');
        if (inputs.length > 1) {
            await inputs[1].type('ap', { delay: 50 });
            await test.page.waitForTimeout(300);

            await test.assertExists('.suggestions-dropdown');
        }
    });

    // ============ VirtualList Tests ============
    await test.test('VirtualList component renders', async () => {
        await test.selectComponent('VirtualList');
        await test.assertExists('example-virtual-list');
        await test.assertExists('cl-virtual-list');
    });

    await test.test('VirtualList renders items', async () => {
        await test.selectComponent('VirtualList');
        await test.page.waitForSelector('.virtual-list-item', { timeout: 3000 });
        await test.assertExists('.virtual-list-item');
    });

    await test.test('VirtualList uses virtualization (fewer DOM nodes than items)', async () => {
        await test.selectComponent('VirtualList');
        await test.page.waitForSelector('.virtual-list-item', { timeout: 3000 });

        const renderedCount = await test.page.$$eval('.virtual-list-item', items => items.length);
        // With 10000 items, virtualization should render far fewer
        await test.assert(renderedCount < 100, `Should render fewer than 100 items (virtualized), got ${renderedCount}`);
        await test.assert(renderedCount > 0, 'Should render at least some items');
    });

    await test.test('VirtualList is scrollable', async () => {
        await test.selectComponent('VirtualList');
        await test.page.waitForSelector('cl-virtual-list', { timeout: 3000 });

        const canScroll = await test.page.evaluate(() => {
            const list = document.querySelector('cl-virtual-list');
            return list.scrollHeight > list.clientHeight;
        });

        await test.assert(canScroll, 'VirtualList should be scrollable');
    });

    await test.test('VirtualList item is selectable', async () => {
        await test.selectComponent('VirtualList');
        await test.page.waitForSelector('.virtual-list-item', { timeout: 3000 });

        await test.page.click('.virtual-list-item');
        await test.page.waitForTimeout(200);

        await test.assertExists('.virtual-list-item.selected');
    });

    // ============ Badge Tests ============
    await test.test('Badge component renders', async () => {
        await test.selectComponent('Badge');
        await test.assertExists('example-badge');
        await test.assertExists('cl-badge');
    });

    await test.test('Badge has different severities', async () => {
        await test.selectComponent('Badge');
        const severities = await test.page.$$eval('.cl-badge',
            badges => badges.map(b => {
                const classes = b.className;
                if (classes.includes('severity-primary')) return 'primary';
                if (classes.includes('severity-success')) return 'success';
                if (classes.includes('severity-danger')) return 'danger';
                if (classes.includes('severity-warning')) return 'warning';
                return 'other';
            }));

        await test.assert(severities.includes('primary'), 'Should have primary badge');
        await test.assert(severities.includes('success'), 'Should have success badge');
    });

    await test.test('Badge has dot indicators', async () => {
        await test.selectComponent('Badge');
        await test.assertExists('.cl-badge.dot');
    });

    await test.test('Badge has rounded/pill style', async () => {
        await test.selectComponent('Badge');
        await test.assertExists('.cl-badge.rounded');
    });

    await test.test('Badge has removable badges', async () => {
        await test.selectComponent('Badge');
        await test.assertExists('.badge-remove');
    });

    // ============ Alert Tests ============
    await test.test('Alert component renders', async () => {
        await test.selectComponent('Alert');
        await test.assertExists('example-alert');
        await test.assertExists('cl-alert');
    });

    await test.test('Alert has different severities', async () => {
        await test.selectComponent('Alert');
        const severities = await test.page.$$eval('.cl-alert',
            alerts => alerts.map(a => {
                const classes = a.className;
                if (classes.includes('severity-info')) return 'info';
                if (classes.includes('severity-success')) return 'success';
                if (classes.includes('severity-warning')) return 'warning';
                if (classes.includes('severity-error')) return 'error';
                return 'other';
            }));

        await test.assert(severities.includes('info'), 'Should have info alert');
        await test.assert(severities.includes('success'), 'Should have success alert');
        await test.assert(severities.includes('warning'), 'Should have warning alert');
        await test.assert(severities.includes('error'), 'Should have error alert');
    });

    await test.test('Alert has icon', async () => {
        await test.selectComponent('Alert');
        await test.assertExists('.alert-icon');
    });

    await test.test('Alert has title and message', async () => {
        await test.selectComponent('Alert');
        await test.assertExists('.alert-title');
        await test.assertExists('.alert-message');
    });

    await test.test('Alert closable has close button', async () => {
        await test.selectComponent('Alert');
        await test.assertExists('.alert-close');
    });

    await test.test('Alert close button dismisses alert', async () => {
        await test.selectComponent('Alert');

        // Count alerts before
        const countBefore = await test.page.$$eval('.cl-alert', alerts => alerts.length);

        // Click first close button
        await test.page.click('.alert-close');
        await test.page.waitForTimeout(200);

        // Count alerts after
        const countAfter = await test.page.$$eval('.cl-alert', alerts => alerts.length);

        await test.assert(countAfter < countBefore, 'Alert should be dismissed on close');
    });

    await test.test('Alert has outline style', async () => {
        await test.selectComponent('Alert');
        await test.assertExists('.cl-alert.outline');
    });

    // ============ Calendar Enhanced Tests ============
    await test.test('Calendar has typeable input', async () => {
        await test.selectComponent('Calendar');
        // Calendar now uses cl-input-mask for date entry
        await test.assertExists('cl-calendar cl-input-mask');
    });

    await test.test('Calendar accepts typed date', async () => {
        await test.selectComponent('Calendar');
        const input = await test.page.$('cl-calendar cl-input-mask input');
        if (!input) {
            throw new Error('Calendar masked input not found');
        }
        await input.click();
        await input.type('12252024', { delay: 50 }); // Type without slashes - mask adds them
        await test.page.waitForTimeout(300);

        // Check that date was formatted properly
        const value = await test.page.evaluate(el => el.value, input);
        await test.assert(value.includes('/'), `Date should be formatted with slashes, got: ${value}`);
    });

    await test.test('Calendar has month/year picker buttons', async () => {
        await test.selectComponent('Calendar');

        // Open the calendar
        await test.page.click('.calendar-toggle');
        await test.page.waitForTimeout(300);

        await test.assertExists('.month-year-btn');
    });

    await test.test('Calendar switches to month view', async () => {
        await test.selectComponent('Calendar');

        // Open the calendar
        await test.page.click('.calendar-toggle');
        await test.page.waitForTimeout(300);

        // Click month button
        const monthBtns = await test.page.$$('.month-year-btn');
        if (monthBtns.length > 0) {
            await monthBtns[0].click();
            await test.page.waitForTimeout(300);

            await test.assertExists('.month-grid');
        }
    });

    await test.test('Calendar switches to year view', async () => {
        await test.selectComponent('Calendar');

        // Open the calendar
        await test.page.click('.calendar-toggle');
        await test.page.waitForTimeout(300);

        // Click month button first
        const monthBtns = await test.page.$$('.month-year-btn');
        if (monthBtns.length > 0) {
            await monthBtns[0].click();
            await test.page.waitForTimeout(300);

            // Now click year button
            const yearBtn = await test.page.$('.month-year-btn');
            if (yearBtn) {
                await yearBtn.click();
                await test.page.waitForTimeout(300);

                await test.assertExists('.year-grid');
            }
        }
    });

    // Cleanup and print summary
    await test.teardown();
}

runTests().catch(console.error);
