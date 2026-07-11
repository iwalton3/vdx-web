/**
 * Accessibility Tests using axe-core
 *
 * Tests ARIA attributes, keyboard navigation, and WCAG compliance
 * for the component library.
 */

const TestHelper = require('./test-helper');
const AxePuppeteer = require('@axe-core/puppeteer').default;

// Components to test with their showcase page names
const COMPONENTS_TO_TEST = [
    'Button',
    'InputText',
    'InputNumber',
    'TextArea',
    'Checkbox',
    'Toggle',
    'Slider',
    'Dropdown',
    'MultiSelect',
    'AutoComplete',
    'Dialog',
    'Sidebar',
    'DataTable',
    'Accordion',
    'TabView'
];

// axe rules to disable for known issues or framework limitations
const DISABLED_RULES = [
    'color-contrast',                // Design decision - may need theme adjustments
    'region',                         // Showcase page may not have landmark regions
    'scrollable-region-focusable'    // Showcase layout issue, not component issue
];

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Running Accessibility Tests with axe-core...\n');

    // Test the main showcase page first
    await test.test('Showcase page has no critical a11y violations', async () => {
        const results = await new AxePuppeteer(test.page)
            .disableRules(DISABLED_RULES)
            .analyze();

        const critical = results.violations.filter(v =>
            v.impact === 'critical' || v.impact === 'serious'
        );

        if (critical.length > 0) {
            const issues = critical.map(v =>
                `${v.id}: ${v.description} (${v.nodes.length} nodes)`
            ).join('\n');
            throw new Error(`Critical a11y violations:\n${issues}`);
        }
    });

    // Test individual components
    for (const component of COMPONENTS_TO_TEST) {
        await test.test(`${component} component has no critical a11y violations`, async () => {
            try {
                await test.selectComponent(component);
                await test.page.waitForTimeout(500); // Wait for component to render

                const results = await new AxePuppeteer(test.page)
                    .disableRules(DISABLED_RULES)
                    .analyze();

                const critical = results.violations.filter(v =>
                    v.impact === 'critical' || v.impact === 'serious'
                );

                if (critical.length > 0) {
                    const issues = critical.map(v =>
                        `${v.id}: ${v.description} (${v.nodes.length} nodes)`
                    ).join('\n');
                    throw new Error(`Critical a11y violations in ${component}:\n${issues}`);
                }
            } catch (error) {
                // Component might not exist in showcase - skip
                if (error.message.includes('not found in sidebar')) {
                    console.log(`    (Skipping ${component} - not in showcase)`);
                    return;
                }
                throw error;
            }
        });
    }

    // Test specific ARIA attributes on key components
    await test.test('Dialog has proper ARIA attributes', async () => {
        await test.selectComponent('Dialog');
        await test.page.waitForTimeout(300);

        // Click to open dialog
        await test.page.evaluate(() => {
            const btn = document.querySelector('cl-button');
            if (btn) btn.click();
        });
        await test.page.waitForTimeout(500);

        const hasAriaDialog = await test.page.evaluate(() => {
            const dialog = document.querySelector('cl-dialog .cl-dialog[role="dialog"]');
            return dialog !== null;
        });

        await test.assert(hasAriaDialog, 'Dialog should have role="dialog"');
    });

    await test.test('Dropdown has proper ARIA attributes', async () => {
        await test.selectComponent('Dropdown');
        await test.page.waitForTimeout(300);

        const hasCombobox = await test.page.evaluate(() => {
            const trigger = document.querySelector('cl-dropdown .dropdown-trigger');
            return trigger && trigger.getAttribute('role') === 'combobox';
        });

        await test.assert(hasCombobox, 'Dropdown trigger should have role="combobox"');

        const hasAriaExpanded = await test.page.evaluate(() => {
            const trigger = document.querySelector('cl-dropdown .dropdown-trigger');
            return trigger && trigger.hasAttribute('aria-expanded');
        });

        await test.assert(hasAriaExpanded, 'Dropdown should have aria-expanded');
    });

    await test.test('MultiSelect has proper ARIA attributes', async () => {
        await test.selectComponent('MultiSelect');
        await test.page.waitForTimeout(300);

        const hasCombobox = await test.page.evaluate(() => {
            const trigger = document.querySelector('cl-multiselect .multiselect-trigger');
            return trigger && trigger.getAttribute('role') === 'combobox';
        });

        await test.assert(hasCombobox, 'MultiSelect trigger should have role="combobox"');
    });

    await test.test('InputText has proper label association', async () => {
        await test.selectComponent('InputText');
        await test.page.waitForTimeout(300);

        const hasLabelFor = await test.page.evaluate(() => {
            const labels = document.querySelectorAll('cl-input-text .cl-label');
            for (const label of labels) {
                const forAttr = label.getAttribute('for');
                if (forAttr) {
                    const input = document.getElementById(forAttr);
                    if (input) return true;
                }
            }
            return false;
        });

        await test.assert(hasLabelFor, 'Input labels should have proper for/id association');
    });

    await test.test('Slider has proper input attributes', async () => {
        await test.selectComponent('Slider');
        await test.page.waitForTimeout(500);

        const hasRangeInput = await test.page.evaluate(() => {
            // Native range inputs have built-in accessibility via min/max/value attributes
            const sliders = document.querySelectorAll('cl-slider input[type="range"]');
            if (sliders.length === 0) return false;
            // Check at least one slider has the required attributes
            for (const slider of sliders) {
                if (slider.hasAttribute('min') &&
                    slider.hasAttribute('max')) {
                    return true;
                }
            }
            return false;
        });

        await test.assert(hasRangeInput, 'Slider should have range input with min, max attributes');
    });

    // Keyboard navigation tests
    await test.test('Dropdown supports keyboard navigation', async () => {
        await test.selectComponent('Dropdown');
        await test.page.waitForTimeout(300);

        // Focus and open dropdown
        await test.page.evaluate(() => {
            const trigger = document.querySelector('cl-dropdown .dropdown-trigger');
            if (trigger) trigger.focus();
        });

        // Press ArrowDown to open (standard combobox pattern)
        await test.page.keyboard.press('ArrowDown');
        await test.page.waitForTimeout(300);

        const isExpanded = await test.page.evaluate(() => {
            const trigger = document.querySelector('cl-dropdown .dropdown-trigger');
            return trigger && trigger.getAttribute('aria-expanded') === 'true';
        });

        await test.assert(isExpanded, 'Dropdown should open with ArrowDown key');

        // Press Escape to close
        await test.page.keyboard.press('Escape');
        await test.page.waitForTimeout(300);

        const isClosed = await test.page.evaluate(() => {
            const trigger = document.querySelector('cl-dropdown .dropdown-trigger');
            return trigger && trigger.getAttribute('aria-expanded') === 'false';
        });

        await test.assert(isClosed, 'Dropdown should close with Escape key');
    });

    await test.test('Toggle is keyboard accessible', async () => {
        await test.selectComponent('Toggle');
        await test.page.waitForTimeout(300);

        const hasRole = await test.page.evaluate(() => {
            const toggle = document.querySelector('cl-toggle [role="switch"]');
            return toggle !== null;
        });

        await test.assert(hasRole, 'Toggle should have role="switch"');

        const hasAriaChecked = await test.page.evaluate(() => {
            const toggle = document.querySelector('cl-toggle [role="switch"]');
            return toggle && toggle.hasAttribute('aria-checked');
        });

        await test.assert(hasAriaChecked, 'Toggle should have aria-checked');
    });

    await test.test('DataTable has proper table roles', async () => {
        await test.selectComponent('DataTable');
        await test.page.waitForTimeout(300);

        const hasGrid = await test.page.evaluate(() => {
            const table = document.querySelector('cl-datatable table');
            return table && table.getAttribute('role') === 'grid';
        });

        await test.assert(hasGrid, 'DataTable should have role="grid"');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
