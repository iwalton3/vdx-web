import { defineComponent, Component, html } from '/lib/framework.js';

// A reactive counter. `state` changes re-render automatically - no setState,
// no virtual DOM. Try editing the styles or adding a "reset" button, then hit
// Run (or just pause typing) to see it live.
class MyCounter extends Component {
    static props = { start: 0 };

    constructor(props) {
        super(props);
        this.state = { count: Number(props.start) || 0 };
    }

    increment() { this.state.count++; }
    decrement() { this.state.count--; }

    template() {
        return html`
            <div class="counter">
                <button on-click="decrement" aria-label="Decrement">−</button>
                <span class="count">${this.state.count}</span>
                <button on-click="increment" aria-label="Increment">+</button>
            </div>
        `;
    }

    static styles = /*css*/`
        .counter {
            display: inline-flex;
            align-items: center;
            gap: 18px;
            font-family: system-ui, sans-serif;
        }
        .count {
            font-size: 2.4rem;
            font-weight: 700;
            min-width: 3ch;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }
        button {
            width: 46px;
            height: 46px;
            font-size: 1.5rem;
            cursor: pointer;
            border: none;
            border-radius: 10px;
            background: var(--primary-color, #007bff);
            color: #fff;
            transition: transform 0.05s ease;
        }
        button:active { transform: scale(0.92); }
    `;
}

defineComponent('my-counter', MyCounter);
