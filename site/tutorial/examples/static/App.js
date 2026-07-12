import { defineComponent, Component, html, when, each } from 'vdx/lib/framework.js';

// Static-site integration: VDX components are just custom elements. Drop them
// into any HTML page and configure them with plain attributes - no build step,
// no framework owning the page. Here two small "islands" enhance an otherwise
// static article.

// Reads its initial count from a `count` attribute (static HTML → props).
class LikeButton extends Component {
    static props = { count: 0, label: 'Like' };

    constructor(props) {
        super(props);
        this.state = { count: Number(props.count) || 0, liked: false };
    }

    toggle() {
        this.state.liked = !this.state.liked;
        this.state.count += this.state.liked ? 1 : -1;
    }

    template() {
        return html`
            <button class="like ${this.state.liked ? 'on' : ''}" on-click="toggle">
                <span class="heart">${this.state.liked ? '♥' : '♡'}</span>
                ${this.props.label} · ${this.state.count}
            </button>
        `;
    }

    static styles = /*css*/`
        .like { font: inherit; display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; cursor: pointer; border: 1px solid var(--border-color, #d0d7de); background: var(--card-bg, #fff); color: inherit; }
        .like.on { border-color: #e0245e; color: #e0245e; }
        .heart { font-size: 1.1em; }
    `;
}
defineComponent('like-button', LikeButton);

// A self-contained newsletter island with its own form handling.
class NewsletterSignup extends Component {
    constructor(props) {
        super(props);
        this.state = { email: '', done: false };
    }

    submit() {
        if (/.+@.+\..+/.test(this.state.email)) this.state.done = true;
    }

    template() {
        return html`
            <div class="news">
                ${when(this.state.done,
                    html`<p class="thanks">✓ Thanks — you're subscribed!</p>`,
                    html`
                        <form on-submit-prevent="submit">
                            <input type="email" placeholder="you@example.com" x-model="email" required>
                            <button type="submit">Subscribe</button>
                        </form>
                    `
                )}
            </div>
        `;
    }

    static styles = /*css*/`
        .news form { display: flex; gap: 8px; }
        input { flex: 1; font: inherit; padding: 9px 12px; border: 1px solid var(--input-border, #d0d7de); border-radius: 8px; background: var(--input-bg, #fff); color: var(--input-text, #000); }
        button { font: inherit; padding: 9px 16px; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
        .thanks { color: var(--success-color, #1a7f37); font-weight: 600; margin: 0; }
    `;
}
defineComponent('newsletter-signup', NewsletterSignup);

// Rich data doesn't fit in an attribute. The `json-posts="related-data"`
// attribute in index.html points at a <script type="application/json"> block;
// the framework parses it into this.props.posts before mount. No escaping
// tricks, no base64 - the JSON stays readable in view-source.
class RelatedPosts extends Component {
    static props = { posts: [] };

    template() {
        return html`
            <ul class="related">
                ${each(this.props.posts, (p) => html`
                    <li><a href="${p.href}">${p.title}</a><span>${p.readTime} min</span></li>
                `)}
            </ul>
        `;
    }

    static styles = /*css*/`
        .related { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .related li { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; }
        .related a { color: var(--primary-color, #007bff); text-decoration: none; }
        .related a:hover { text-decoration: underline; }
        .related span { color: #8898a8; font-size: 12.5px; }
    `;
}
defineComponent('related-posts', RelatedPosts);
