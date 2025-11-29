/**
 * E2E Test for Showcase Fixes
 * - Dialog/Sidebar content not showing when visible=false
 * - Source code examples showing proper usage patterns
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Showcase Fixes...\n');

    // Test 1: Dialog content should not be visible on page load
    await test.test('Dialog content is hidden when visible=false', async () => {
        await test.selectComponent('Dialog');
        await test.page.waitForSelector('.demo-section', { timeout: 5000 });
        await test.page.waitForTimeout(500);

        const dialogVisible = await test.page.evaluate(() => {
            const mask = document.querySelector('.cl-dialog-mask');
            const dialogContent = document.querySelector('example-dialog');

            // Check if mask is not visible (dialog is closed)
            const hasMask = mask !== null;

            // Check if dialog content paragraphs are NOT in the DOM when closed
            const contentParagraph = dialogContent?.querySelector('.dialog-content p');
            const contentVisible = contentParagraph !== null;

            return {
                hasMask,
                contentVisible
            };
        });

        await test.assert(!dialogVisible.hasMask, 'Dialog mask should not be visible initially');
        await test.assert(!dialogVisible.contentVisible, 'Dialog content should not be in DOM when closed');
    });

    // Test 2: Sidebar content should not be visible on page load
    await test.test('Sidebar content is hidden when visible=false', async () => {
        await test.selectComponent('Sidebar');
        await test.page.waitForSelector('.demo-section', { timeout: 5000 });
        await test.page.waitForTimeout(500);

        const sidebarVisible = await test.page.evaluate(() => {
            const mask = document.querySelector('.cl-sidebar-mask');
            const sidebarContent = document.querySelector('example-sidebar');

            // Check if mask is not visible (sidebar is closed)
            const hasMask = mask !== null;

            // Check if sidebar content is NOT in the DOM when closed
            const contentElement = sidebarContent?.querySelector('.sidebar-content');
            const contentVisible = contentElement !== null;

            return {
                hasMask,
                contentVisible
            };
        });

        await test.assert(!sidebarVisible.hasMask, 'Sidebar mask should not be visible initially');
        await test.assert(!sidebarVisible.contentVisible, 'Sidebar content should not be in DOM when closed');
    });

    // Test 3: Dialog shows when button is clicked
    await test.test('Dialog shows when Basic Dialog button is clicked', async () => {
        await test.selectComponent('Dialog');
        await test.page.waitForSelector('.demo-section', { timeout: 5000 });
        await test.page.waitForTimeout(500);

        // Click the "Basic Dialog" button
        await test.page.evaluate(() => {
            const button = Array.from(document.querySelectorAll('cl-button')).find(
                btn => btn.innerText.includes('Basic Dialog')
            );
            if (button) {
                button.click();
            }
        });

        await test.page.waitForTimeout(500);

        const dialogNowVisible = await test.page.evaluate(() => {
            const mask = document.querySelector('.cl-dialog-mask');
            const dialog = document.querySelector('.cl-dialog');
            return mask !== null && dialog !== null;
        });

        await test.assert(dialogNowVisible, 'Dialog should be visible after clicking button');
    });

    // Test 4: Source code shows proper component usage pattern for InputText
    await test.test('InputText source code shows proper usage pattern', async () => {
        await test.selectComponent('InputText');
        await test.page.waitForSelector('.tabs', { timeout: 5000 });

        // Switch to Source Code tab
        await test.page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const sourceTab = tabs.find(tab => tab.textContent.includes('Source Code'));
            if (sourceTab) sourceTab.click();
        });

        await test.page.waitForTimeout(300);

        const sourceCode = await test.page.evaluate(() => {
            const sourceSection = document.querySelector('.source-section code');
            return sourceSection ? sourceSection.textContent : '';
        });

        // Check for proper patterns in source code
        await test.assert(sourceCode.includes('defineComponent'), 'Source should show defineComponent wrapper');
        await test.assert(sourceCode.includes('data()'), 'Source should show data() function');
        await test.assert(sourceCode.includes('x-model='), 'Source should show x-model usage');
    });

    // Test 5: Source code shows proper pattern for Dialog
    await test.test('Dialog source code shows visibility toggling pattern', async () => {
        await test.selectComponent('Dialog');
        await test.page.waitForSelector('.tabs', { timeout: 5000 });

        // Switch to Source Code tab
        await test.page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const sourceTab = tabs.find(tab => tab.textContent.includes('Source Code'));
            if (sourceTab) sourceTab.click();
        });

        await test.page.waitForTimeout(300);

        const sourceCode = await test.page.evaluate(() => {
            const sourceSection = document.querySelector('.source-section code');
            return sourceSection ? sourceSection.textContent : '';
        });

        // Check for visibility toggling pattern - source uses basicVisible, confirmVisible, formVisible
        await test.assert(sourceCode.includes('basicVisible: false'), 'Source should initialize visible state to false');
        await test.assert(sourceCode.includes('cl-button'), 'Source should show button to trigger dialog');
        await test.assert(sourceCode.includes('this.state.basicVisible = true'), 'Source should show how to open dialog');
        await test.assert(sourceCode.includes('on-change='), 'Source should show on-change handler');
    });

    // Test 6: Source code shows proper pattern for Chips (array handling)
    await test.test('Chips source code shows array state management', async () => {
        await test.selectComponent('Chips');
        await test.page.waitForSelector('.tabs', { timeout: 5000 });

        // Switch to Source Code tab
        await test.page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const sourceTab = tabs.find(tab => tab.textContent.includes('Source Code'));
            if (sourceTab) sourceTab.click();
        });

        await test.page.waitForTimeout(300);

        const sourceCode = await test.page.evaluate(() => {
            const sourceSection = document.querySelector('.source-section code');
            return sourceSection ? sourceSection.textContent : '';
        });

        // Check for array initialization and x-model handling
        await test.assert(sourceCode.includes("tags: ['javascript', 'react', 'vue']"), 'Source should show array initialization');
        await test.assert(sourceCode.includes('x-model="tags"'), 'Source should use x-model for array binding');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
