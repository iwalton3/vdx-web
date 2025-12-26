const puppeteer = require('puppeteer');

async function test() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' && !text.includes('404')) {
            console.log('[ERROR]', text);
        } else if (text.startsWith('[TEST]')) {
            console.log(text);
        }
    });
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

    await page.goto('http://localhost:9000/componentlib/', { waitUntil: 'networkidle2', timeout: 15000 });

    // Run all tests
    const results = await page.evaluate(async () => {
        const { defineComponent, html, when, each, reactive } = await import('/lib/framework.js');
        const tests = {};

        // Helper
        async function wait(ms) {
            return new Promise(r => setTimeout(r, ms));
        }

        // Test 1: Nested template value updates
        console.log('[TEST] === Test 1: Nested template value updates ===');
        {
            const TestNested = defineComponent('test-nested-1', {
                data() { return { count: 1 }; },
                template() {
                    return html`<div>${html`<span class="v">${this.state.count}</span>`}</div>`;
                }
            });
            const el = document.createElement('test-nested-1');
            document.body.appendChild(el);
            await wait(50);
            const span = el.querySelector('.v');
            const original = span;
            console.log('[TEST] Initial:', span?.textContent);

            el.state.count = 99;
            await wait(50);
            const updated = el.querySelector('.v');
            console.log('[TEST] Updated:', updated?.textContent);
            console.log('[TEST] Same DOM:', updated === original);

            tests.nestedUpdate = {
                passed: updated?.textContent === '99' && updated === original,
                value: updated?.textContent,
                domPreserved: updated === original
            };
            document.body.removeChild(el);
        }

        // Test 2: when() value updates (same branch)
        console.log('[TEST] === Test 2: when() value updates ===');
        {
            const TestWhen = defineComponent('test-when-1', {
                data() { return { show: true, msg: 'Hello' }; },
                template() {
                    return html`<div>${when(this.state.show, html`<p class="w">${this.state.msg}</p>`)}</div>`;
                }
            });
            const el = document.createElement('test-when-1');
            document.body.appendChild(el);
            await wait(50);
            const p = el.querySelector('.w');
            const original = p;
            console.log('[TEST] Initial:', p?.textContent);

            el.state.msg = 'World';
            await wait(50);
            const updated = el.querySelector('.w');
            console.log('[TEST] Updated:', updated?.textContent);
            console.log('[TEST] Same DOM:', updated === original);

            tests.whenUpdate = {
                passed: updated?.textContent === 'World' && updated === original,
                value: updated?.textContent,
                domPreserved: updated === original
            };
            document.body.removeChild(el);
        }

        // Test 3: each() value updates (same keys)
        console.log('[TEST] === Test 3: each() value updates ===');
        {
            const TestEach = defineComponent('test-each-1', {
                data() {
                    return {
                        items: [
                            { id: 1, name: 'A' },
                            { id: 2, name: 'B' }
                        ]
                    };
                },
                template() {
                    return html`<ul>${each(this.state.items,
                        item => html`<li data-id="${item.id}">${item.name}</li>`,
                        item => item.id
                    )}</ul>`;
                }
            });
            const el = document.createElement('test-each-1');
            document.body.appendChild(el);
            await wait(50);
            const items = el.querySelectorAll('li');
            const original1 = items[0];
            const original2 = items[1];
            console.log('[TEST] Initial:', items[0]?.textContent, items[1]?.textContent);

            el.state.items = [
                { id: 1, name: 'Updated A' },
                { id: 2, name: 'Updated B' }
            ];
            await wait(50);
            const updated = el.querySelectorAll('li');
            console.log('[TEST] Updated:', updated[0]?.textContent, updated[1]?.textContent);
            console.log('[TEST] Same DOM:', updated[0] === original1, updated[1] === original2);

            tests.eachUpdate = {
                passed: updated[0]?.textContent === 'Updated A' &&
                        updated[1]?.textContent === 'Updated B' &&
                        updated[0] === original1 && updated[1] === original2,
                values: [updated[0]?.textContent, updated[1]?.textContent],
                domPreserved: updated[0] === original1 && updated[1] === original2
            };
            document.body.removeChild(el);
        }

        // Test 4: Deep nesting
        console.log('[TEST] === Test 4: Deep nesting ===');
        {
            const TestDeep = defineComponent('test-deep-1', {
                data() { return { name: 'Alice', age: 30 }; },
                template() {
                    return html`<div>${html`<div class="l1">${html`<span class="l2">${this.state.name} ${this.state.age}</span>`}</div>`}</div>`;
                }
            });
            const el = document.createElement('test-deep-1');
            document.body.appendChild(el);
            await wait(50);
            const span = el.querySelector('.l2');
            const original = span;
            console.log('[TEST] Initial:', span?.textContent);

            el.state.name = 'Bob';
            el.state.age = 25;
            await wait(50);
            const updated = el.querySelector('.l2');
            console.log('[TEST] Updated:', updated?.textContent);

            tests.deepNesting = {
                passed: updated?.textContent?.includes('Bob') && updated?.textContent?.includes('25'),
                value: updated?.textContent
            };
            document.body.removeChild(el);
        }

        return tests;
    });

    console.log('\n========== RESULTS ==========');
    let allPassed = true;
    for (const [name, result] of Object.entries(results)) {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${name}:`, JSON.stringify(result));
        if (!result.passed) allPassed = false;
    }

    console.log('\n' + (allPassed ? '🎉 All tests passed!' : '💥 Some tests failed'));

    await browser.close();
    process.exit(allPassed ? 0 : 1);
}

test().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
