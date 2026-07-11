import { defineComponent, Component, html } from 'vdx/lib/framework.js';
import { enableRouting } from 'vdx/lib/router.js';

// Each "page" is just a component. The router swaps them into <router-outlet>
// based on the URL, and <router-link> navigates without a full page reload.

class HomePage extends Component {
    template() {
        return html`
            <h2>Home</h2>
            <p>Pick a user to see route parameters in action:</p>
            <ul>
                <li><router-link to="/users/ada/">Ada Lovelace</router-link></li>
                <li><router-link to="/users/alan/">Alan Turing</router-link></li>
            </ul>
        `;
    }
}
defineComponent('home-page', HomePage);

class AboutPage extends Component {
    template() {
        return html`<h2>About</h2><p>A three-route single-page app in one file.</p>`;
    }
}
defineComponent('about-page', AboutPage);

class UserPage extends Component {
    // Declare `params` so the router's URL params surface as this.props.params.
    static props = { params: {} };

    template() {
        return html`
            <h2>User: ${this.props.params && this.props.params.id}</h2>
            <p>The <code>:id</code> segment of the URL is available as
               <code>this.props.params.id</code>.</p>
            <router-link to="/">← Back home</router-link>
        `;
    }
}
defineComponent('user-page', UserPage);

// Wire the routes to the <router-outlet> in index.html.
enableRouting(document.querySelector('router-outlet'), {
    '/': { component: 'home-page' },
    '/about/': { component: 'about-page' },
    '/users/:id/': { component: 'user-page' }
});
