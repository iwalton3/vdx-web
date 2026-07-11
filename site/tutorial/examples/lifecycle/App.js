import { defineComponent, Component, html, when } from 'vdx/lib/framework.js';

// mounted() runs when the element enters the DOM - the place to start timers,
// fetch data, or add listeners. unmounted() runs when it leaves - the place to
// clean all of that up. Forgetting the cleanup is the classic memory leak.
class LiveClock extends Component {
    constructor(props) {
        super(props);
        this.state = { time: new Date().toLocaleTimeString() };
    }

    mounted() {
        this._timer = setInterval(() => {
            this.state.time = new Date().toLocaleTimeString();
        }, 1000);
    }

    unmounted() {
        clearInterval(this._timer);   // stop the timer so it can't leak
    }

    template() {
        return html`<div class="clock">🕐 ${this.state.time}</div>`;
    }

    static styles = /*css*/`
        .clock { font-family: ui-monospace, monospace; font-size: 1.6rem; padding: 12px 0; }
    `;
}
defineComponent('live-clock', LiveClock);

// Toggling the clock in and out of the DOM runs mounted()/unmounted() each time.
class ClockDemo extends Component {
    constructor(props) {
        super(props);
        this.state = { visible: true };
    }

    toggle() { this.state.visible = !this.state.visible; }

    template() {
        return html`
            <div class="demo">
                <button on-click="toggle">
                    ${this.state.visible ? 'Unmount' : 'Mount'} the clock
                </button>
                ${when(this.state.visible, html`<live-clock></live-clock>`)}
                <p class="hint">Unmount it and the interval is cleared — no ghost timer left running.</p>
            </div>
        `;
    }

    static styles = /*css*/`
        .demo { font-family: system-ui, sans-serif; }
        button { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
        .hint { font-size: 13px; color: #8898a8; }
    `;
}
defineComponent('clock-demo', ClockDemo);
