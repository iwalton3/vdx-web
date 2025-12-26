/**
 * Synthetic Benchmark Components
 *
 * Self-contained components designed to stress-test specific rendering patterns.
 * These isolate performance characteristics without external dependencies.
 */

import { defineComponent, html, when, each, memoEach, reactive } from '../../lib/framework.js';

/**
 * Simple list component - tests each() rendering
 */
defineComponent('bench-simple-list', {
    props: {
        items: []
    },

    template() {
        return html`
            <div class="simple-list">
                ${each(this.props.items, item => html`
                    <div class="item">${item.name} - ${item.value}</div>
                `)}
            </div>
        `;
    }
});

/**
 * Complex list item - tests many bindings per item
 */
defineComponent('bench-complex-list', {
    props: {
        items: []
    },

    template() {
        return html`
            <div class="complex-list">
                ${each(this.props.items, item => html`
                    <div class="item ${item.active ? 'active' : ''}"
                         data-id="${item.id}"
                         title="${item.description}">
                        <span class="name">${item.name}</span>
                        <span class="value">${item.value}</span>
                        <span class="status ${item.status}">${item.status}</span>
                        ${when(item.badge, html`<span class="badge">${item.badge}</span>`)}
                    </div>
                `)}
            </div>
        `;
    }
});

/**
 * Memoized list - tests memoEach() pattern
 */
defineComponent('bench-memo-list', {
    props: {
        items: []
    },

    template() {
        return html`
            <div class="memo-list">
                ${memoEach(this.props.items, item => html`
                    <div class="item">${item.name} - ${item.value}</div>
                `, item => item.id)}
            </div>
        `;
    }
});

/**
 * Stateful list item - tests state updates
 */
defineComponent('bench-stateful-list', {
    props: {
        items: []
    },

    data() {
        return {
            selectedId: null
        };
    },

    methods: {
        selectItem(id) {
            this.state.selectedId = id;
        }
    },

    template() {
        return html`
            <div class="stateful-list">
                ${each(this.props.items, item => html`
                    <div class="item ${this.state.selectedId === item.id ? 'selected' : ''}"
                         on-click="${() => this.selectItem(item.id)}">
                        ${item.name}
                    </div>
                `)}
            </div>
        `;
    }
});

/**
 * Deeply nested component - tests nesting depth
 */
defineComponent('bench-nested-level', {
    props: {
        depth: 0,
        maxDepth: 5,
        value: ''
    },

    template() {
        const nextDepth = this.props.depth + 1;
        return html`
            <div class="level-${this.props.depth}">
                <span>${this.props.value} L${this.props.depth}</span>
                ${when(this.props.depth < this.props.maxDepth,
                    html`<bench-nested-level
                        depth="${nextDepth}"
                        maxDepth="${this.props.maxDepth}"
                        value="${this.props.value}">
                    </bench-nested-level>`
                )}
            </div>
        `;
    }
});

/**
 * Many bindings component - tests effect count
 */
defineComponent('bench-many-bindings', {
    props: {
        data: {}
    },

    template() {
        const d = this.props.data;
        return html`
            <div class="many-bindings"
                 data-a="${d.a}" data-b="${d.b}" data-c="${d.c}"
                 data-d="${d.d}" data-e="${d.e}" data-f="${d.f}"
                 data-g="${d.g}" data-h="${d.h}" data-i="${d.i}"
                 data-j="${d.j}">
                <span class="${d.class1}">${d.text1}</span>
                <span class="${d.class2}">${d.text2}</span>
                <span class="${d.class3}">${d.text3}</span>
                <span class="${d.class4}">${d.text4}</span>
                <span class="${d.class5}">${d.text5}</span>
                <span class="${d.class6}">${d.text6}</span>
                <span class="${d.class7}">${d.text7}</span>
                <span class="${d.class8}">${d.text8}</span>
                <span class="${d.class9}">${d.text9}</span>
                <span class="${d.class10}">${d.text10}</span>
            </div>
        `;
    }
});

/**
 * Conditional rendering component - tests when()
 */
defineComponent('bench-conditionals', {
    props: {
        conditions: {}
    },

    template() {
        const c = this.props.conditions;
        return html`
            <div class="conditionals">
                ${when(c.show1, html`<div class="section1">Section 1 content with ${c.value1}</div>`)}
                ${when(c.show2, html`<div class="section2">Section 2 content with ${c.value2}</div>`)}
                ${when(c.show3, html`<div class="section3">Section 3 content with ${c.value3}</div>`)}
                ${when(c.show4, html`<div class="section4">Section 4 content with ${c.value4}</div>`)}
                ${when(c.show5, html`<div class="section5">Section 5 content with ${c.value5}</div>`)}
            </div>
        `;
    }
});

/**
 * Form component - tests input bindings
 */
defineComponent('bench-form', {
    data() {
        return {
            field1: '',
            field2: '',
            field3: '',
            field4: '',
            field5: '',
            checkbox1: false,
            checkbox2: false,
            select1: ''
        };
    },

    template() {
        return html`
            <form class="bench-form">
                <input type="text" x-model="field1" placeholder="Field 1">
                <input type="text" x-model="field2" placeholder="Field 2">
                <input type="text" x-model="field3" placeholder="Field 3">
                <input type="text" x-model="field4" placeholder="Field 4">
                <input type="text" x-model="field5" placeholder="Field 5">
                <input type="checkbox" x-model="checkbox1">
                <input type="checkbox" x-model="checkbox2">
                <select x-model="select1">
                    <option value="">Select...</option>
                    <option value="a">Option A</option>
                    <option value="b">Option B</option>
                    <option value="c">Option C</option>
                </select>
                <div class="preview">
                    ${this.state.field1} | ${this.state.field2} | ${this.state.field3}
                </div>
            </form>
        `;
    }
});

/**
 * Grid component - tests table-like rendering
 */
defineComponent('bench-grid', {
    props: {
        rows: [],
        columns: []
    },

    template() {
        return html`
            <table class="bench-grid">
                <thead>
                    <tr>
                        ${each(this.props.columns, col => html`
                            <th>${col.header}</th>
                        `)}
                    </tr>
                </thead>
                <tbody>
                    ${each(this.props.rows, row => html`
                        <tr>
                            ${each(this.props.columns, col => html`
                                <td>${row[col.field]}</td>
                            `)}
                        </tr>
                    `)}
                </tbody>
            </table>
        `;
    }
});

// Data generators for benchmarks

export function generateItems(count, complexity = 'simple') {
    const items = [];
    for (let i = 0; i < count; i++) {
        if (complexity === 'simple') {
            items.push({
                id: i,
                name: `Item ${i}`,
                value: Math.random() * 1000
            });
        } else {
            items.push({
                id: i,
                name: `Item ${i}`,
                value: Math.random() * 1000,
                description: `Description for item ${i} with some additional text`,
                active: i % 3 === 0,
                status: ['pending', 'active', 'complete'][i % 3],
                badge: i % 5 === 0 ? 'New' : null
            });
        }
    }
    return items;
}

export function generateGridData(rows, cols) {
    const columns = [];
    for (let c = 0; c < cols; c++) {
        columns.push({ field: `col${c}`, header: `Column ${c}` });
    }

    const data = [];
    for (let r = 0; r < rows; r++) {
        const row = { id: r };
        for (let c = 0; c < cols; c++) {
            row[`col${c}`] = `R${r}C${c}`;
        }
        data.push(row);
    }

    return { columns, rows: data };
}

export function generateBindingsData() {
    return {
        a: 'val-a', b: 'val-b', c: 'val-c', d: 'val-d', e: 'val-e',
        f: 'val-f', g: 'val-g', h: 'val-h', i: 'val-i', j: 'val-j',
        class1: 'c1', class2: 'c2', class3: 'c3', class4: 'c4', class5: 'c5',
        class6: 'c6', class7: 'c7', class8: 'c8', class9: 'c9', class10: 'c10',
        text1: 'Text 1', text2: 'Text 2', text3: 'Text 3', text4: 'Text 4', text5: 'Text 5',
        text6: 'Text 6', text7: 'Text 7', text8: 'Text 8', text9: 'Text 9', text10: 'Text 10'
    };
}

export function generateConditionsData(visibleCount = 3) {
    return {
        show1: visibleCount >= 1, value1: 'Value 1',
        show2: visibleCount >= 2, value2: 'Value 2',
        show3: visibleCount >= 3, value3: 'Value 3',
        show4: visibleCount >= 4, value4: 'Value 4',
        show5: visibleCount >= 5, value5: 'Value 5'
    };
}
