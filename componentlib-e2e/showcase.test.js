/**
 * Showcase Interface E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Showcase Interface...\n');

    await test.test('Page loads without errors', async () => {
        await test.assertExists('.showcase-container');
        await test.assertExists('.sidebar');
        await test.assertExists('.main-content');
    });

    await test.test('Sidebar has header', async () => {
        await test.assertExists('.sidebar-header h1');
        const title = await test.page.$eval('.sidebar-header h1', el => el.textContent);
        await test.assertEqual(title, 'Component Library');
    });

    await test.test('Search box exists and is functional', async () => {
        await test.assertExists('.search-box input');
        const placeholder = await test.page.$eval('.search-box input', el => el.placeholder);
        await test.assertEqual(placeholder, 'Search components...');
    });

    await test.test('All 7 categories are displayed', async () => {
        const categories = await test.page.$$eval('.category-header',
            headers => headers.map(h => h.textContent.trim()));

        const expected = ['Form', 'Selection', 'Data', 'Panel', 'Overlay', 'Button', 'Misc'];
        await test.assertEqual(categories.length, 7, 'Should have 7 categories');

        for (const cat of expected) {
            await test.assert(categories.includes(cat), `Missing category: ${cat}`);
        }
    });

    await test.test('All 31 components are listed', async () => {
        const count = await test.countVisibleComponents();
        await test.assertEqual(count, 31, 'Should have 31 components');
    });

    await test.test('First component is auto-selected', async () => {
        const active = await test.getActiveComponent();
        await test.assert(active !== null, 'A component should be auto-selected');
        await test.assertExists('.component-view', 'Component view should be visible');
    });

    await test.test('Component selection works', async () => {
        await test.selectComponent('Checkbox');
        const active = await test.getActiveComponent();
        await test.assertEqual(active, 'Checkbox');
    });

    await test.test('Component header shows name and description', async () => {
        await test.assertExists('.component-header h2');
        await test.assertExists('.component-header p');

        const name = await test.page.$eval('.component-header h2', el => el.textContent);
        const desc = await test.page.$eval('.component-header p', el => el.textContent);

        await test.assert(name.length > 0, 'Component name should be shown');
        await test.assert(desc.length > 0, 'Component description should be shown');
    });

    await test.test('Tab navigation works', async () => {
        await test.assertExists('.tab:nth-child(1)');
        await test.assertExists('.tab:nth-child(2)');

        await test.clickTab('Source Code');
        await test.assertExists('.source-section');

        await test.clickTab('Demo');
        await test.assertExists('.demo-section');
    });

    await test.test('Source code tab shows code', async () => {
        await test.clickTab('Source Code');
        const code = await test.page.$eval('.source-section code', el => el.textContent);
        await test.assert(code.length > 0, 'Source code should be displayed');
    });

    await test.test('Search filters components', async () => {
        await test.clearSearch();
        const initialCount = await test.countVisibleComponents();
        await test.assertEqual(initialCount, 31);

        await test.searchComponents('button');
        const filteredCount = await test.countVisibleComponents();
        await test.assertGreaterThan(filteredCount, 0, 'Should find some components');
        await test.assert(filteredCount < initialCount, 'Should filter out some components');
    });

    await test.test('Search is case-insensitive', async () => {
        await test.clearSearch();
        await test.searchComponents('BUTTON');
        const count = await test.countVisibleComponents();
        await test.assertGreaterThan(count, 0, 'Case-insensitive search should work');
    });

    await test.test('Empty state shown when no results', async () => {
        await test.clearSearch();
        await test.searchComponents('xyznonexistent');
        const count = await test.countVisibleComponents();
        await test.assertEqual(count, 0, 'Should have no results');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
