import { defineComponent, html } from 'vdx/lib/framework.js';

// The original options-object format is still fully supported - class components
// are translated into it internally. New code should prefer classes, but you'll
// meet this style in older projects. Note the key difference: data() runs at
// element construction, before prop values arrive.
defineComponent('legacy-counter', {
    props: { start: 0 },

    data() {
        return { count: 0 };
    },

    mounted() {
        this.state.count = Number(this.props.start) || 0;
    },

    methods: {
        inc() { this.state.count++; },
        dec() { this.state.count--; }
    },

    computed: {
        parity() { return this.state.count % 2 === 0 ? 'even' : 'odd'; }
    },

    template() {
        return html`
            <div class="c">
                <button on-click="dec">−</button>
                <span class="n">${this.state.count}</span>
                <button on-click="inc">+</button>
                <em>(${this.parity})</em>
            </div>
        `;
    },

    styles: /*css*/`
        .c { font-family: system-ui, sans-serif; display: inline-flex; align-items: center; gap: 12px; }
        .n { font-size: 1.6rem; font-weight: 700; min-width: 2ch; text-align: center; }
        button { width: 40px; height: 40px; font-size: 1.3rem; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
        em { color: #8898a8; }
    `
});
