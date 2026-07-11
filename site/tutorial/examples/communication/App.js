import { defineComponent, Component, html, each } from 'vdx/lib/framework.js';

// Data flows DOWN via props and events flow UP via custom events. A child never
// reaches into its parent; it just announces what happened.

// Child: takes a `value` prop, emits a `rate` event when a star is clicked.
class RatingStars extends Component {
    static props = { value: 0 };

    pick(n) {
        this.dispatchEvent(new CustomEvent('rate', { detail: n, bubbles: true }));
    }

    template() {
        return html`
            <div class="stars">
                ${each([1, 2, 3, 4, 5], (n) => html`
                    <button class="${n <= this.props.value ? 'on' : ''}"
                        on-click="${() => this.pick(n)}">★</button>
                `)}
            </div>
        `;
    }

    static styles = /*css*/`
        .stars { display: inline-flex; gap: 2px; }
        button { font-size: 26px; line-height: 1; background: none; border: none; cursor: pointer; color: #ccc; padding: 0; }
        button.on { color: #f5b301; }
    `;
}
defineComponent('rating-stars', RatingStars);

// Parent: passes score DOWN as a prop, receives the child's event coming UP.
class ReviewForm extends Component {
    constructor(props) {
        super(props);
        this.state = { score: 3 };
    }

    onRate(e) {
        this.state.score = e.detail;   // the child's detail payload
    }

    template() {
        return html`
            <div class="review">
                <p>Your rating: <strong>${this.state.score} / 5</strong></p>
                <rating-stars value="${this.state.score}" on-rate="onRate"></rating-stars>
            </div>
        `;
    }

    static styles = /*css*/`
        .review { font-family: system-ui, sans-serif; }
    `;
}
defineComponent('review-form', ReviewForm);

// Slots: a component can render whatever children are placed inside it via
// this.props.children.
class InfoCard extends Component {
    static props = { title: '' };

    template() {
        return html`
            <div class="card">
                <h4>${this.props.title}</h4>
                <div class="body">${this.props.children}</div>
            </div>
        `;
    }

    static styles = /*css*/`
        .card { font-family: system-ui, sans-serif; border: 1px solid #8884; border-radius: 10px; padding: 14px 16px; }
        h4 { margin: 0 0 6px; }
        .body { color: var(--text-secondary, #57606a); }
    `;
}
defineComponent('info-card', InfoCard);
