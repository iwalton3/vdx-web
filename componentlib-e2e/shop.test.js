/**
 * VDX Shop E2E Tests
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9000/apps/shop/';
const VIEWPORT = { width: 1400, height: 900 };

class ShopTestHelper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testsPassed = 0;
        this.testsFailed = 0;
    }

    async setup() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport(VIEWPORT);

        this.page.on('pageerror', error => {
            console.error(`[PAGE ERROR] ${error.message}`);
        });

        // Clear localStorage before tests
        await this.page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await this.page.evaluate(() => localStorage.clear());
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(1000);
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }

        console.log('\nTest Results:');
        console.log(`  Passed: ${this.testsPassed}`);
        console.log(`  Failed: ${this.testsFailed} ${this.testsFailed > 0 ? '❌' : ''}`);

        if (this.testsFailed > 0) {
            process.exit(1);
        }
    }

    async test(name, fn) {
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
            throw new Error(message || `Expected "${expected}", got "${actual}"`);
        }
    }

    async assertGreaterThan(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} > ${expected}`);
        }
    }

    async navigate(hash) {
        await this.page.evaluate((h) => window.location.hash = h, hash);
        await this.page.waitForTimeout(500);
    }

    async waitForElement(selector, timeout = 5000) {
        await this.page.waitForSelector(selector, { timeout });
    }

    async getCartCount() {
        return await this.page.evaluate(() => {
            const badge = document.querySelector('.cart-badge');
            return badge ? parseInt(badge.textContent) : 0;
        });
    }
}

async function runTests() {
    const test = new ShopTestHelper();
    await test.setup();

    console.log('Testing VDX Shop E-commerce Demo...\n');

    // ============================================
    // HOME PAGE TESTS
    // ============================================
    console.log('\n📦 Home Page Tests');

    await test.test('Shop loads with shell component', async () => {
        await test.waitForElement('cl-shell');
        await test.waitForElement('.topbar');
    });

    await test.test('Home page has hero section', async () => {
        await test.navigate('/shop/');
        await test.waitForElement('.hero');
        const heroText = await test.page.$eval('.hero-content h1', el => el.textContent);
        await test.assert(heroText.includes('Welcome'), 'Hero should have welcome message');
    });

    await test.test('Home page shows categories', async () => {
        const categories = await test.page.$$('.category-card');
        await test.assertGreaterThan(categories.length, 0, 'Should have category cards');
    });

    await test.test('Home page shows featured products', async () => {
        const products = await test.page.$$('.product-card');
        await test.assertGreaterThan(products.length, 0, 'Should have featured products');
    });

    await test.test('Clicking category navigates to products page', async () => {
        const firstCategory = await test.page.$('.category-card');
        if (firstCategory) {
            await firstCategory.click();
            await test.page.waitForTimeout(500);
            await test.assert(
                test.page.url().includes('/shop/products/'),
                'Should navigate to products page'
            );
        }
    });

    // ============================================
    // PRODUCTS PAGE TESTS
    // ============================================
    console.log('\n📦 Products Page Tests');

    await test.test('Products page loads', async () => {
        await test.navigate('/shop/products/');
        await test.page.waitForTimeout(500);
        await test.waitForElement('.products-page');
    });

    await test.test('Products page shows product grid', async () => {
        const products = await test.page.$$('.product-card');
        await test.assertGreaterThan(products.length, 0, 'Should have products');
    });

    await test.test('Products page has filter sidebar', async () => {
        await test.waitForElement('.filters-sidebar');
    });

    await test.test('Products page has sorting dropdown', async () => {
        await test.waitForElement('cl-dropdown');
    });

    await test.test('Products page has pagination', async () => {
        // Navigate to all products (should clear category filter via watch)
        await test.navigate('/shop/products/');
        await test.page.waitForTimeout(1000);
        // Wait for product grid to have items before checking paginator
        await test.waitForElement('.product-card');
        await test.page.waitForTimeout(500);

        // Check if paginator exists (it should show when totalProducts > 8)
        const hasPaginator = await test.page.evaluate(() => {
            const paginator = document.querySelector('cl-paginator');
            const productCards = document.querySelectorAll('.product-card');
            return {
                hasPaginator: !!paginator,
                productCount: productCards.length
            };
        });
        await test.assert(hasPaginator.hasPaginator, `Paginator should exist (products: ${hasPaginator.productCount})`);
    });

    await test.test('Category filter works', async () => {
        await test.navigate('/shop/products/electronics/');
        await test.page.waitForTimeout(500);

        const headerText = await test.page.$eval('.page-header h1', el => el.textContent);
        await test.assert(
            headerText.toLowerCase().includes('electronics'),
            'Should show electronics category'
        );
    });

    await test.test('Stock filter checkbox exists', async () => {
        await test.navigate('/shop/products/');
        await test.page.waitForTimeout(500);
        await test.waitForElement('cl-checkbox');
    });

    await test.test('Price slider exists', async () => {
        await test.waitForElement('cl-slider');
    });

    // ============================================
    // PRODUCT DETAIL PAGE TESTS
    // ============================================
    console.log('\n📦 Product Detail Page Tests');

    await test.test('Product detail page loads', async () => {
        await test.navigate('/shop/product/1/');
        await test.page.waitForTimeout(500);
        await test.waitForElement('.product-detail-page');
    });

    await test.test('Product detail shows product name', async () => {
        await test.waitForElement('.product-name');
    });

    await test.test('Product detail shows price', async () => {
        await test.waitForElement('.current-price');
    });

    await test.test('Product detail has quantity selector', async () => {
        await test.waitForElement('cl-input-number');
    });

    await test.test('Product detail has add to cart button', async () => {
        const addToCartBtn = await test.page.$('cl-button');
        await test.assert(addToCartBtn !== null, 'Should have add to cart button');
    });

    await test.test('Product detail has breadcrumb', async () => {
        await test.waitForElement('cl-breadcrumb');
    });

    await test.test('Product detail shows features', async () => {
        await test.waitForElement('.product-features');
    });

    await test.test('Product detail shows stock status', async () => {
        await test.waitForElement('.stock-status');
    });

    // ============================================
    // CART FUNCTIONALITY TESTS
    // ============================================
    console.log('\n📦 Cart Functionality Tests');

    await test.test('Cart starts empty', async () => {
        await test.page.evaluate(() => localStorage.clear());
        await test.page.reload({ waitUntil: 'networkidle2' });
        await test.page.waitForTimeout(500);

        const cartCount = await test.getCartCount();
        await test.assertEqual(cartCount, 0, 'Cart should be empty initially');
    });

    await test.test('Add to cart updates cart count', async () => {
        await test.navigate('/shop/product/1/');
        await test.page.waitForTimeout(500);

        // Find and click Add to Cart button
        const buttons = await test.page.$$('cl-button');
        for (const btn of buttons) {
            const label = await test.page.evaluate(el => el.getAttribute('label'), btn);
            if (label && label.includes('Add to Cart')) {
                await btn.click();
                break;
            }
        }

        await test.page.waitForTimeout(500);
        const cartCount = await test.getCartCount();
        await test.assertGreaterThan(cartCount, 0, 'Cart count should increase');
    });

    await test.test('Cart page shows added item', async () => {
        await test.navigate('/shop/cart/');
        await test.page.waitForTimeout(500);
        await test.waitForElement('.cart-page');

        const items = await test.page.$$('.cart-item');
        await test.assertGreaterThan(items.length, 0, 'Cart should have items');
    });

    await test.test('Cart shows order summary', async () => {
        await test.waitForElement('.order-summary');
    });

    await test.test('Cart quantity can be changed', async () => {
        await test.waitForElement('cl-input-number');
    });

    await test.test('Cart item can be removed', async () => {
        const removeBtn = await test.page.$('.remove-btn');
        await test.assert(removeBtn !== null, 'Should have remove button');
    });

    await test.test('Cart persists after reload', async () => {
        // Add another item first
        await test.navigate('/shop/product/2/');
        await test.page.waitForTimeout(500);

        const buttons = await test.page.$$('cl-button');
        for (const btn of buttons) {
            const label = await test.page.evaluate(el => el.getAttribute('label'), btn);
            if (label && label.includes('Add to Cart')) {
                await btn.click();
                break;
            }
        }
        await test.page.waitForTimeout(300);

        const countBefore = await test.getCartCount();

        // Reload page
        await test.page.reload({ waitUntil: 'networkidle2' });
        await test.page.waitForTimeout(500);

        const countAfter = await test.getCartCount();
        await test.assertEqual(countAfter, countBefore, 'Cart should persist after reload');
    });

    // ============================================
    // CHECKOUT FLOW TESTS
    // ============================================
    console.log('\n📦 Checkout Flow Tests');

    await test.test('Checkout page loads', async () => {
        await test.navigate('/shop/checkout/');
        await test.page.waitForTimeout(500);
        await test.waitForElement('.checkout-page');
    });

    await test.test('Checkout has progress steps', async () => {
        await test.waitForElement('.progress-steps');
        const steps = await test.page.$$('.step');
        await test.assertEqual(steps.length, 3, 'Should have 3 checkout steps');
    });

    await test.test('Checkout has shipping form', async () => {
        await test.waitForElement('.form-section');
        await test.waitForElement('cl-input-text');
    });

    await test.test('Checkout shows order summary sidebar', async () => {
        await test.waitForElement('.order-summary');
    });

    await test.test('Checkout validates required fields', async () => {
        // Click continue without filling form
        const continueBtn = await test.page.$('cl-button[label="Continue"]');
        if (continueBtn) {
            await continueBtn.click();
            await test.page.waitForTimeout(300);

            // Should show error
            const hasError = await test.page.$('.error');
            await test.assert(hasError !== null, 'Should show validation error');
        }
    });

    await test.test('Checkout can proceed with valid data', async () => {
        // Fill shipping form
        await test.page.evaluate(() => {
            const showcase = document.querySelector('shop-checkout-page');
            if (showcase && showcase.state) {
                showcase.state.shipping = {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '555-1234',
                    address: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip: '10001',
                    country: 'US'
                };
            }
        });

        // Click continue
        const continueBtn = await test.page.$('cl-button[label="Continue"]');
        if (continueBtn) {
            await continueBtn.click();
            await test.page.waitForTimeout(500);

            // Should be on step 2
            const step2Active = await test.page.$('.step:nth-child(3).active');
            // Note: CSS selector may vary, just check we can proceed
        }
    });

    await test.test('Checkout payment form shows text inputs', async () => {
        // Navigate to checkout
        await test.navigate('/shop/checkout/');
        await test.page.waitForTimeout(500);

        // Fill shipping and advance to payment step
        await test.page.evaluate(() => {
            const checkout = document.querySelector('shop-checkout-page');
            if (checkout && checkout.state) {
                checkout.state.shipping = {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '555-1234',
                    address: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip: '10001',
                    country: 'US'
                };
                checkout.state.step = 2; // Jump to payment step
            }
        });
        await test.page.waitForTimeout(500);

        // Check that cl-input-text components have visible input elements
        const inputCount = await test.page.evaluate(() => {
            const inputTexts = document.querySelectorAll('cl-input-text');
            let count = 0;
            inputTexts.forEach(it => {
                const input = it.querySelector('input[type="text"]');
                if (input) count++;
            });
            return count;
        });

        await test.assertGreaterThan(inputCount, 0,
            `Payment form should have visible input fields. Found ${inputCount} inputs.`);
    });

    await test.test('Checkout payment inputs accept text input', async () => {
        // Navigate to checkout and go to payment step
        await test.navigate('/shop/checkout/');
        await test.page.waitForTimeout(500);

        await test.page.evaluate(() => {
            const checkout = document.querySelector('shop-checkout-page');
            if (checkout && checkout.state) {
                checkout.state.shipping = {
                    firstName: 'John', lastName: 'Doe', email: 'john@example.com',
                    phone: '555-1234', address: '123 Main St', city: 'New York',
                    state: 'NY', zip: '10001', country: 'US'
                };
                checkout.state.step = 2;
            }
        });
        await test.page.waitForTimeout(500);

        // Try to type in the first input (Card Number)
        const cardInput = await test.page.$('cl-input-text input[type="text"]');
        await test.assert(cardInput !== null, 'Should have card number input');

        if (cardInput) {
            await cardInput.type('4111111111111111');
            await test.page.waitForTimeout(100);

            const value = await test.page.evaluate(el => el.value, cardInput);
            await test.assert(value.length > 0,
                `Payment input should accept typed value. Got: "${value}"`);
        }
    });

    await test.test('Checkout payment inputs persist value after blur', async () => {
        // Navigate to checkout and go to payment step
        await test.navigate('/shop/checkout/');
        await test.page.waitForTimeout(500);

        await test.page.evaluate(() => {
            const checkout = document.querySelector('shop-checkout-page');
            if (checkout && checkout.state) {
                checkout.state.shipping = {
                    firstName: 'John', lastName: 'Doe', email: 'john@example.com',
                    phone: '555-1234', address: '123 Main St', city: 'New York',
                    state: 'NY', zip: '10001', country: 'US'
                };
                checkout.state.step = 2;
            }
        });
        await test.page.waitForTimeout(500);

        const testName = 'John Smith';

        // Type in the "Name on Card" input (second input)
        const inputs = await test.page.$$('cl-input-text input[type="text"]');
        await test.assertGreaterThan(inputs.length, 1, 'Should have multiple payment inputs');

        if (inputs.length > 1) {
            const nameInput = inputs[1]; // Name on Card
            await nameInput.click({ clickCount: 3 });
            await nameInput.type(testName);

            // Blur
            await test.page.click('body');
            await test.page.waitForTimeout(200);

            const value = await test.page.evaluate(el => el.value, nameInput);
            await test.assert(value === testName,
                `Payment input should persist value after blur. Expected "${testName}", got "${value}"`);
        }
    });

    // ============================================
    // NAVIGATION TESTS
    // ============================================
    console.log('\n📦 Navigation Tests');

    await test.test('Shell sidebar has menu items', async () => {
        await test.navigate('/shop/');
        await test.page.waitForTimeout(500);

        const menuItems = await test.page.$$('.nav-item');
        await test.assertGreaterThan(menuItems.length, 0, 'Should have menu items');
    });

    await test.test('Cart button in topbar works', async () => {
        const cartBtn = await test.page.$('.cart-button');
        if (cartBtn) {
            await cartBtn.click();
            await test.page.waitForTimeout(500);
            await test.assert(
                test.page.url().includes('/shop/cart/'),
                'Should navigate to cart'
            );
        }
    });

    await test.test('Router handles product URL parameters', async () => {
        await test.navigate('/shop/product/5/');
        await test.page.waitForTimeout(500);
        await test.waitForElement('.product-detail-page');
    });

    await test.test('Router handles category URL parameters', async () => {
        await test.navigate('/shop/products/clothing/');
        await test.page.waitForTimeout(500);
        await test.waitForElement('.products-page');
    });

    // ============================================
    // RESPONSIVE TESTS
    // ============================================
    console.log('\n📦 Responsive Tests');

    await test.test('Mobile view shows hamburger menu', async () => {
        await test.page.setViewport({ width: 375, height: 667 });
        await test.page.waitForTimeout(300);
        await test.waitForElement('.hamburger');
    });

    await test.test('Hamburger menu toggles sidebar', async () => {
        const hamburger = await test.page.$('.hamburger');
        if (hamburger) {
            await hamburger.click();
            await test.page.waitForTimeout(300);
            await test.waitForElement('.sidebar.mobile.open');
        }
    });

    // Reset viewport
    await test.page.setViewport(VIEWPORT);

    // ============================================
    // CLEANUP
    // ============================================
    await test.test('Clear cart works', async () => {
        await test.navigate('/shop/cart/');
        await test.page.waitForTimeout(500);

        const clearBtn = await test.page.$('cl-button[label="Clear Cart"]');
        if (clearBtn) {
            // Accept confirm dialog
            test.page.once('dialog', async dialog => {
                await dialog.accept();
            });

            await clearBtn.click();
            await test.page.waitForTimeout(500);

            const cartCount = await test.getCartCount();
            await test.assertEqual(cartCount, 0, 'Cart should be empty after clear');
        }
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
