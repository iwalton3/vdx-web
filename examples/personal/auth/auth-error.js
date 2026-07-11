/**
 * AuthError - Error page when permission is missing
 */
import { defineComponent, Component } from '../../../lib/framework.js';
import { html } from '../../../lib/framework.js';
import { getRouter } from '../../../lib/router.js';
import './login-component.js';

export class AuthError extends Component {
    constructor(props) {
        super(props);

        this.state = {
            message: ''
        };
    }

    mounted() {
        // Get message from URL query parameters
        const router = getRouter();
        if (router && router.currentRoute) {
            const query = router.currentRoute.state.query;
            if (query && query.message) {
                this.state.message = query.message;
            } else {
                this.state.message = 'You need to log in to access this page.';
            }
        } else {
            this.state.message = 'You need to log in to access this page.';
        }
    }

    template() {
        return html`
            <div>
                <h1>Permission Denied</h1>
                <p>${this.state.message || 'You need to log in to access this page.'}</p>
                <div class="section">
                    <h3>Login</h3>
                    <login-component></login-component>
                </div>
            </div>
        `;
    }
}

export default defineComponent('auth-error', AuthError);
