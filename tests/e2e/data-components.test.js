/**
 * Data Components E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Data Components...\n');

    // DataTable Tests
    await test.test('DataTable component renders', async () => {
        await test.selectComponent('DataTable');
        await test.assertExists('example-datatable');
        await test.assertExists('cl-datatable');
    });

    await test.test('DataTable has table structure', async () => {
        await test.selectComponent('DataTable');
        await test.assertExists('table');
        await test.assertExists('thead');
        await test.assertExists('tbody');
    });

    await test.test('DataTable has column headers', async () => {
        await test.selectComponent('DataTable');
        const headers = await test.page.$$('thead th');
        await test.assertGreaterThan(headers.length, 0, 'Should have column headers');
    });

    await test.test('DataTable has sortable columns', async () => {
        await test.selectComponent('DataTable');
        await test.assertExists('th.sortable');
    });

    await test.test('DataTable has data rows', async () => {
        await test.selectComponent('DataTable');
        const rows = await test.page.$$('tbody tr');
        await test.assertGreaterThan(rows.length, 0, 'Should have data rows');
    });

    await test.test('DataTable rows are selectable', async () => {
        await test.selectComponent('DataTable');
        await test.page.waitForSelector('tbody tr.selectable', { timeout: 2000 });

        await test.page.click('tbody tr.selectable');

        // Wait for the .selected class to be applied
        await test.assertExists('tbody tr.selected');
    });

    // Paginator Tests
    await test.test('Paginator component renders', async () => {
        await test.selectComponent('Paginator');
        await test.assertExists('example-paginator');
        await test.assertExists('cl-paginator');
    });

    await test.test('Paginator shows page info', async () => {
        await test.selectComponent('Paginator');
        await test.assertExists('.paginator-info');

        const info = await test.page.$eval('.paginator-info', el => el.textContent);
        await test.assert(info.includes('Showing'), 'Should show page info');
    });

    await test.test('Paginator has navigation buttons', async () => {
        await test.selectComponent('Paginator');
        const buttons = await test.page.$$('.page-btn');
        await test.assertGreaterThan(buttons.length, 0, 'Should have page buttons');
    });

    await test.test('Paginator has active page', async () => {
        await test.selectComponent('Paginator');
        await test.assertExists('.page-btn.active');
    });

    // Tree Tests
    await test.test('Tree component renders', async () => {
        await test.selectComponent('Tree');
        await test.assertExists('example-tree');
        await test.assertExists('cl-tree');
    });

    await test.test('Tree has nodes', async () => {
        await test.selectComponent('Tree');
        const nodes = await test.page.$$('.tree-node');
        await test.assertGreaterThan(nodes.length, 0, 'Should have tree nodes');
    });

    await test.test('Tree nodes are expandable', async () => {
        await test.selectComponent('Tree');
        await test.assertExists('.node-toggle');
    });

    await test.test('Tree node expands on toggle click', async () => {
        await test.selectComponent('Tree');
        const toggle = await test.page.$('.node-toggle');

        if (toggle) {
            await toggle.click();
            await test.page.waitForTimeout(200);

            // After expanding, should see children
            const children = await test.page.$('.node-children');
            await test.assert(children !== null, 'Should show children after expand');
        }
    });

    // OrderableList Tests
    await test.test('OrderableList component renders', async () => {
        await test.selectComponent('OrderableList');
        await test.assertExists('example-orderable-list');
        await test.assertExists('cl-orderable-list');
    });

    await test.test('OrderableList has header', async () => {
        await test.selectComponent('OrderableList');
        await test.assertExists('.list-header');
    });

    await test.test('OrderableList has items', async () => {
        await test.selectComponent('OrderableList');
        const items = await test.page.$$('.list-item');
        await test.assertGreaterThan(items.length, 0, 'Should have list items');
    });

    await test.test('OrderableList items have drag handles', async () => {
        await test.selectComponent('OrderableList');
        await test.assertExists('.drag-handle');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
