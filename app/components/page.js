/**
 * Page wrapper component with header
 */
import { defineComponent, html } from '../lib/framework.js';
import conf from '../conf.js';

export default defineComponent('page-wrapper', {
    props: {
        title: 'Main Page',
        appName: 'Home',
        appRoot: '/',
        showHeader: true
    },

    template() {
        return html`
            ${this.props.showHeader ? html`
                <nav style="padding: 0 0 0 48px; position: relative; margin-top: 20px;">
                    <h1>
                        <a class="title" href="/" style="color: #2a2a2a; text-decoration: none;">
                            <img src="${conf.logo}" alt="logo" style="width: 32px; height: 32px; left: 0; position: absolute;">
                            ${conf.site}
                        </a>
                    </h1>
                    <h3><router-link to="${this.props.appRoot}">${this.props.appName}</router-link> - ${this.props.title}</h3>
                </nav>
            ` : ''}
            <div class="page-content">
                ${this.props.children}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
            margin: 0 auto;
            max-width: 700px;
            padding-top: 20px;
        }

        h1 {
            font-size: 2em;
        }

        h3 {
            font-size: 1.17em;
        }

        .page-content {
            margin-top: 20px;
        }
    `
});
