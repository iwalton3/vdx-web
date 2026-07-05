/**
 * Tests for kebab-case attribute <-> camelCase prop mapping
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html } from '../lib/framework.js';

describe('Kebab-Case Attributes', function(it) {
    it('hydrates camelCase props from kebab-case attributes in static HTML', () => {
        defineComponent('kebab-static-test', {
            props: {
                fromUnit: 'gallons',
                initialValue: '1'
            },
            template() {
                return html`<div id="out">${this.props.fromUnit}:${this.props.initialValue}</div>`;
            }
        });

        const container = document.createElement('div');
        container.innerHTML = '<kebab-static-test from-unit="liters" initial-value="42"></kebab-static-test>';
        document.body.appendChild(container);

        const el = container.firstElementChild;
        assert.equal(el.props.fromUnit, 'liters', 'Should hydrate fromUnit from from-unit attribute');
        assert.equal(el.props.initialValue, '42', 'Should hydrate initialValue from initial-value attribute');

        document.body.removeChild(container);
    });

    it('still hydrates from legacy smushed-lowercase attributes', () => {
        defineComponent('kebab-legacy-test', {
            props: {
                fromUnit: 'gallons'
            },
            template() {
                return html`<div>${this.props.fromUnit}</div>`;
            }
        });

        const container = document.createElement('div');
        container.innerHTML = '<kebab-legacy-test fromunit="pints"></kebab-legacy-test>';
        document.body.appendChild(container);

        assert.equal(container.firstElementChild.props.fromUnit, 'pints',
            'Should hydrate fromUnit from legacy fromunit attribute');

        document.body.removeChild(container);
    });

    it('kebab-case attribute wins over legacy form when both present', () => {
        defineComponent('kebab-priority-test', {
            props: {
                fromUnit: 'gallons'
            },
            template() {
                return html`<div>${this.props.fromUnit}</div>`;
            }
        });

        const container = document.createElement('div');
        container.innerHTML = '<kebab-priority-test from-unit="liters" fromunit="pints"></kebab-priority-test>';
        document.body.appendChild(container);

        assert.equal(container.firstElementChild.props.fromUnit, 'liters',
            'Kebab-case form should take priority');

        document.body.removeChild(container);
    });

    it('reacts to setAttribute with kebab-case name after mount', (done) => {
        const changes = [];
        defineComponent('kebab-dynamic-test', {
            props: {
                initialFahrenheit: '68'
            },
            propsChanged(prop, newValue, oldValue) {
                changes.push({ prop, newValue, oldValue });
            },
            template() {
                return html`<div id="temp">${this.props.initialFahrenheit}</div>`;
            }
        });

        const el = document.createElement('kebab-dynamic-test');
        document.body.appendChild(el);

        setTimeout(() => {
            el.setAttribute('initial-fahrenheit', '72');

            setTimeout(() => {
                assert.equal(el.props.initialFahrenheit, '72', 'Prop should update from kebab setAttribute');
                const change = changes.find(c => c.prop === 'initialFahrenheit');
                assert.ok(change, 'propsChanged should fire with the camelCase prop name');
                assert.equal(change.newValue, '72', 'propsChanged should receive new value');
                assert.ok(el.querySelector('#temp').textContent.includes('72'), 'Should re-render');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });

    it('mirrors string property sets to the kebab-case attribute', () => {
        defineComponent('kebab-mirror-test', {
            props: {
                fromUnit: 'gallons'
            },
            template() {
                return html`<div>${this.props.fromUnit}</div>`;
            }
        });

        const el = document.createElement('kebab-mirror-test');
        document.body.appendChild(el);

        el.fromUnit = 'quarts';
        assert.equal(el.getAttribute('from-unit'), 'quarts', 'Should mirror to kebab-case attribute');
        assert.ok(!el.hasAttribute('fromunit'), 'Should not write the smushed-lowercase form');

        document.body.removeChild(el);
    });

    it('clears the legacy attribute form when the prop is set as a property', () => {
        defineComponent('kebab-cleanup-test', {
            props: {
                fromUnit: 'gallons'
            },
            template() {
                return html`<div>${this.props.fromUnit}</div>`;
            }
        });

        const container = document.createElement('div');
        container.innerHTML = '<kebab-cleanup-test fromunit="pints"></kebab-cleanup-test>';
        document.body.appendChild(container);
        const el = container.firstElementChild;

        el.fromUnit = 'liters';
        assert.equal(el.getAttribute('from-unit'), 'liters', 'Should write kebab form');
        assert.ok(!el.hasAttribute('fromunit'), 'Should remove stale legacy attribute');

        // Non-string values remove the attribute entirely
        el.fromUnit = ['a', 'b'];
        assert.ok(!el.hasAttribute('from-unit'), 'Non-string set should remove kebab attribute');

        document.body.removeChild(container);
    });

    it('lowercase prop names behave exactly as before', (done) => {
        defineComponent('kebab-lowercase-test', {
            props: {
                label: 'default',
                totalrecords: '0'
            },
            template() {
                return html`<div id="out">${this.props.label}:${this.props.totalrecords}</div>`;
            }
        });

        const container = document.createElement('div');
        container.innerHTML = '<kebab-lowercase-test label="hi" totalrecords="100"></kebab-lowercase-test>';
        document.body.appendChild(container);
        const el = container.firstElementChild;

        assert.equal(el.props.label, 'hi', 'Lowercase attribute hydrates');
        assert.equal(el.props.totalrecords, '100', 'Smushed-by-convention prop hydrates');

        setTimeout(() => {
            el.setAttribute('label', 'updated');
            setTimeout(() => {
                assert.equal(el.props.label, 'updated', 'Lowercase setAttribute still reactive');
                el.label = 'via-prop';
                assert.equal(el.getAttribute('label'), 'via-prop', 'Lowercase mirror unchanged');
                document.body.removeChild(container);
                done();
            }, 100);
        }, 100);
    });

    it('works for kebab-case attributes on custom elements inside templates', (done) => {
        defineComponent('kebab-inner-test', {
            props: {
                displayLabel: 'none'
            },
            template() {
                return html`<span id="inner">${this.props.displayLabel}</span>`;
            }
        });

        defineComponent('kebab-outer-test', {
            template() {
                return html`<kebab-inner-test display-label="from-template"></kebab-inner-test>`;
            }
        });

        const el = document.createElement('kebab-outer-test');
        document.body.appendChild(el);

        setTimeout(() => {
            const inner = el.querySelector('kebab-inner-test');
            assert.ok(inner, 'Inner component should render');
            assert.equal(inner.props.displayLabel, 'from-template',
                'Kebab attribute in a template should hydrate the camelCase prop');

            document.body.removeChild(el);
            done();
        }, 100);
    });
});
