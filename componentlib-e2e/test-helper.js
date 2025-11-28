/**
 * Test Helper Utilities
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_URL || 'http://localhost:9000/componentlib/';
const VIEWPORT = { width: 1400, height: 900 };

class TestHelper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testsPassed = 0;
        this.testsFailed = 0;
        this.currentTest = '';
    }

    async setup() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport(VIEWPORT);

        // Setup error handlers
        this.page.on('pageerror', error => {
            console.error(`[PAGE ERROR] ${error.message}`);
        });

        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`[CONSOLE ERROR] ${msg.text()}`);
            }
        });

        await this.page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(1000);
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }

        console.log('\nTest Results:');
        console.log(`  Passed: ${this.testsPassed} ✅`);
        console.log(`  Failed: ${this.testsFailed} ${this.testsFailed > 0 ? '❌' : ''}`);

        if (this.testsFailed > 0) {
            process.exit(1);
        }
    }

    async test(name, fn) {
        this.currentTest = name;
        try {
            await fn();
            console.log(`  ✅ ${name}`);
            this.testsPassed++;
        } catch (error) {
            console.error(`  ❌ ${name}`);
            console.error(`     ${error.message}`);
            this.testsFailed++;
        }
    }

    async assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    async assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    async assertGreaterThan(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} > ${expected}`);
        }
    }

    async assertExists(selector, message, timeout = 5000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
        } catch (error) {
            throw new Error(message || `Element ${selector} not found`);
        }
    }

    async assertNotExists(selector, message, timeout = 5000) {
        try {
            await this.page.waitForSelector(selector, { hidden: true, timeout });
        } catch (error) {
            throw new Error(message || `Element ${selector} should not exist`);
        }
    }

    async selectComponent(name) {
        await this.page.evaluate((componentName) => {
            const items = Array.from(document.querySelectorAll('.component-item'));
            const item = items.find(el => el.textContent.trim() === componentName);
            if (item) {
                item.click();
            } else {
                throw new Error(`Component ${componentName} not found in sidebar`);
            }
        }, name);
        // Wait for component to be active
        await this.page.waitForSelector('.component-item.active', { timeout: 2000 });
        // Wait a bit for rendering to complete
        await this.page.waitForTimeout(300);
    }

    async getActiveComponent() {
        return await this.page.evaluate(() => {
            const active = document.querySelector('.component-item.active');
            return active ? active.textContent.trim() : null;
        });
    }

    async clickTab(tabName) {
        await this.page.evaluate((name) => {
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const tab = tabs.find(t => t.textContent.trim() === name);
            if (tab) {
                tab.click();
            }
        }, tabName);
        await this.page.waitForTimeout(200);
    }

    async searchComponents(query) {
        await this.page.type('.search-box input', query);
        await this.page.waitForTimeout(300);
    }

    async clearSearch() {
        await this.page.evaluate(() => {
            const input = document.querySelector('.search-box input');
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await this.page.waitForTimeout(300);
    }

    async countVisibleComponents() {
        return await this.page.evaluate(() => {
            return document.querySelectorAll('.component-item').length;
        });
    }

    async getComponentsByCategory(category) {
        return await this.page.evaluate((cat) => {
            const categories = Array.from(document.querySelectorAll('.category'));
            const categoryEl = categories.find(c => {
                const header = c.querySelector('.category-header');
                return header && header.textContent.trim() === cat;
            });

            if (!categoryEl) return [];

            const items = categoryEl.querySelectorAll('.component-item');
            return Array.from(items).map(item => item.textContent.trim());
        }, category);
    }

    async waitForElement(selector, timeout = 5000) {
        await this.page.waitForSelector(selector, { timeout });
    }

    async screenshot(name) {
        await this.page.screenshot({
            path: `/tmp/componentlib-${name}.png`,
            fullPage: true
        });
    }
}

module.exports = TestHelper;
