/**
 * App Header Component
 * Displays site branding and current page info
 */
import { defineComponent, html, Component } from '../../../lib/framework.js';
import conf from '../conf.js';

export class AppHeader extends Component {
    constructor(props) {
        super(props);

        this.state = {
            currentRoute: '/',
            appName: 'Home',
            pageTitle: ''
        };
    }

    template() {
        return html`
            <nav style="padding: 0 0 0 48px; position: relative; margin-top: 20px; margin-bottom: 20px;">
                <h1 style="font-size: 2em; margin: 0;">
                    <router-link to="/" class="title" style="text-decoration: none;">
                        <img src="${conf.logo}" alt="logo" style="width: 32px; height: 32px; left: 0; position: absolute;">
                        ${conf.site}
                    </router-link>
                </h1>
                ${this.state.pageTitle ? html`
                    <h3 style="font-size: 1.17em; margin: 0.5em 0 0 0;">${this.state.appName} - ${this.state.pageTitle}</h3>
                ` : ''}
            </nav>
        `;
    }
}

export default defineComponent('app-header', AppHeader);
