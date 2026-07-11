/**
 * Home Page
 */
import { defineComponent, html, when, Component } from '../../lib/framework.js';
import './auth/user-tools.js';
import './components/tiles.js';

export class HomePage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            mainApps: { featured: [], other: [] },
            privateApps: []
        };
    }

    async mounted() {
        // Load apps.json
        try {
            const response = await fetch('apps.json');
            const data = await response.json();
            this.state.mainApps = data;
        } catch (error) {
            console.error('Failed to load apps.json:', error);
        }

        // Load private apps from API
        try {
            const api = await import('./api.js');
            const apps = await api.get_applications();
            this.state.privateApps = apps;
        } catch (error) {
            console.error('Failed to load private apps:', error);
        }
    }

    template() {
        const hasFeatured = this.state.mainApps.featured && this.state.mainApps.featured.length > 0;
        const hasPrivate = this.state.privateApps && this.state.privateApps.length > 0;
        const hasOther = this.state.mainApps.other && this.state.mainApps.other.length > 0;

        return html`
            <div>
                <div class="section">
                    Welcome! This website is my dumping ground for projects and web applications.
                    Feel free to explore and see what is available.
                    Hover over an item to see a short description.
                </div>

                ${when(hasFeatured, html`
                    <h3>Featured</h3>
                    <x-tiles id="featured-tiles" tiles="${this.state.mainApps.featured}"></x-tiles>
                `)}

                ${when(hasPrivate, html`
                    <h3>Private Applications</h3>
                    <x-tiles id="private-tiles" tiles="${this.state.privateApps}"></x-tiles>
                `)}

                ${when(hasOther, html`
                    <h3>Everything Else</h3>
                    <x-tiles id="other-tiles" tiles="${this.state.mainApps.other}"></x-tiles>
                `)}

                <user-tools></user-tools>

                <div style="text-align: center; font-size: .75em;">
                    <a href="legal.html">Privacy, Usage, and Removal Requests</a>
                </div>
            </div>
        `;
    }
}

export default defineComponent('home-page', HomePage);
