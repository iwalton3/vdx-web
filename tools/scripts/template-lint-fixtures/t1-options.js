// T1 fixture: legacy options-format components (named const + inline literal).
import { defineComponent, html } from '../../../lib/framework.js';

const counterOptions = {
    props: { label: '' },
    data() {
        return { count: 0 };
    },
    computed: {
        double() { return this.state.count * 2; }
    },
    methods: {
        increment() { this.state.count++; },
        reset() { this.state.count = 0; }
    },
    template() {
        return html`
            <button on-click="increment">ok</button>
            <button on-click="reset">ok</button>
            <button on-click="label">ok prop</button>
            <button on-click="incrment">bad typo</button> <!-- LINT-EXPECT: t1-handler -->
            <button on-click="double">bad computed</button> <!-- LINT-EXPECT: t1-handler -->
        `;
    }
};
defineComponent('fx-counter', counterOptions);

defineComponent('fx-inline', {
    methods: {
        go() {}
    },
    template() {
        return html`
            <button on-click="go">ok</button>
            <button on-click="gone">bad</button> <!-- LINT-EXPECT: t1-handler -->
        `;
    }
});

// Spread in methods: harvest is incomplete - component must go opaque
const mixinMethods = { helper() {} };
defineComponent('fx-spread', {
    methods: {
        ...mixinMethods,
        own() {}
    },
    template() {
        return html`<button on-click="helper">not checked (spread)</button>`;
    }
});
