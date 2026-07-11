/**
 * Simple Test Runner
 * Zero-dependency test framework for browser-based testing
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    /**
     * Define a test suite
     */
    describe(name, fn) {
        const suite = { name, tests: [] };
        const context = {
            it: (testName, testFn) => {
                suite.tests.push({ name: testName, fn: testFn });
            }
        };
        fn.call(context, context.it);
        this.tests.push(suite);
    }

    /**
     * Run all tests
     */
    async run() {
        console.log('🧪 Running tests...\n');

        for (const suite of this.tests) {
            console.log(`\n📦 ${suite.name}`);

            for (const test of suite.tests) {
                this.results.total++;
                try {
                    // Check if test expects a 'done' callback (has parameters)
                    if (test.fn.length > 0) {
                        // Async test with done callback
                        await new Promise((resolve, reject) => {
                            let completed = false;

                            const done = (err) => {
                                if (completed) return; // Already called
                                completed = true;
                                clearTimeout(timeout);
                                if (err) reject(err);
                                else resolve();
                            };

                            // Set a timeout to prevent hanging
                            const timeout = setTimeout(() => {
                                if (!completed) {
                                    completed = true;
                                    reject(new Error('Test timeout: done() was not called within 5 seconds'));
                                }
                            }, 5000);

                            // Call test with done callback
                            try {
                                test.fn(done);
                            } catch (error) {
                                if (!completed) {
                                    completed = true;
                                    clearTimeout(timeout);
                                    reject(error);
                                }
                            }
                        });
                    } else {
                        // Regular async test or sync test
                        await test.fn();
                    }

                    this.results.passed++;
                    console.log(`  ✅ ${test.name}`);
                } catch (error) {
                    this.results.failed++;
                    console.error(`  ❌ ${test.name}`);
                    console.error(`     ${error.message}`);
                    if (error.expected !== undefined) {
                        console.error(`     Expected: ${JSON.stringify(error.expected)}`);
                        console.error(`     Received: ${JSON.stringify(error.actual)}`);
                    }
                }
            }
        }

        this._printSummary();
    }

    _printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log(`\n📊 Test Results:`);
        console.log(`   Total:  ${this.results.total}`);
        console.log(`   ✅ Passed: ${this.results.passed}`);
        console.log(`   ❌ Failed: ${this.results.failed}`);

        const rate = this.results.total > 0
            ? Math.round((this.results.passed / this.results.total) * 100)
            : 0;
        console.log(`   Success Rate: ${rate}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log('\n💥 Some tests failed');
        }
    }

    /**
     * Render results to DOM
     */
    renderResults(container) {
        const html = `
            <div class="test-results">
                <h2>Test Results</h2>
                <div class="summary ${this.results.failed === 0 ? 'success' : 'failure'}">
                    <div class="stat">
                        <span class="label">Total:</span>
                        <span class="value">${this.results.total}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Passed:</span>
                        <span class="value">${this.results.passed}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Failed:</span>
                        <span class="value">${this.results.failed}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Success Rate:</span>
                        <span class="value">${Math.round((this.results.passed / this.results.total) * 100)}%</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    }
}

/**
 * Assertion helpers
 */
export const assert = {
    equal(actual, expected, message = '') {
        if (actual !== expected) {
            const error = new Error(message || `Expected ${expected}, got ${actual}`);
            error.expected = expected;
            error.actual = actual;
            throw error;
        }
    },

    deepEqual(actual, expected, message = '') {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            const error = new Error(message || 'Deep equality failed');
            error.expected = expected;
            error.actual = actual;
            throw error;
        }
    },

    ok(value, message = '') {
        if (!value) {
            throw new Error(message || `Expected truthy value, got ${value}`);
        }
    },

    throws(fn, expectedError, message = '') {
        let thrown = false;
        try {
            fn();
        } catch (error) {
            thrown = true;
            if (expectedError && !(error instanceof expectedError)) {
                throw new Error(message || `Expected ${expectedError.name}, got ${error.constructor.name}`);
            }
        }
        if (!thrown) {
            throw new Error(message || 'Expected function to throw');
        }
    },

    async rejects(promise, expectedError, message = '') {
        let thrown = false;
        try {
            await promise;
        } catch (error) {
            thrown = true;
            if (expectedError && !(error instanceof expectedError)) {
                throw new Error(message || `Expected ${expectedError.name}, got ${error.constructor.name}`);
            }
        }
        if (!thrown) {
            throw new Error(message || 'Expected promise to reject');
        }
    },

    isType(value, type, message = '') {
        if (typeof value !== type) {
            throw new Error(message || `Expected type ${type}, got ${typeof value}`);
        }
    },

    includes(array, value, message = '') {
        if (!array.includes(value)) {
            throw new Error(message || `Expected array to include ${value}`);
        }
    },

    isNull(value, message = '') {
        if (value !== null) {
            throw new Error(message || `Expected null, got ${value}`);
        }
    },

    isNotNull(value, message = '') {
        if (value === null) {
            throw new Error(message || 'Expected non-null value');
        }
    },

    notEqual(actual, expected, message = '') {
        if (actual === expected) {
            const error = new Error(message || `Expected values to be different, but both were ${actual}`);
            error.expected = `not ${expected}`;
            error.actual = actual;
            throw error;
        }
    }
};

// Global test runner instance
export const runner = new TestRunner();

// Convenience export
export const describe = runner.describe.bind(runner);
