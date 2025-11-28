/**
 * LoginComponent - Two-step OTP login form
 */
import { defineComponent } from '../lib/framework.js';
import { html } from '../lib/framework.js';
import login from './auth.js';
import { notify } from '../lib/utils.js';

export default defineComponent('login-component', {
    props: {
        after: '/'
    },

    stores: { login },

    data() {
        return {
            user: '',
            otp: ''
        };
    },

    methods: {
        async sendOtp(e) {
            e.preventDefault();
            try {
                await login.state.send_otp(this.state.user);
            } catch (error) {
                console.error('send_otp error:', error);
                notify('Could not send email.', 'error');
            }
        },

        async loginAct(e) {
            e.preventDefault();
            const success = await login.state.login(this.state.otp);

            if (!success) {
                notify('Login failed. Please try again.', 'error');
            } else {
                notify('Login successful.');
                if (this.props.after && window.router) {
                    window.router.navigate(this.props.after);
                }
            }
        }
    },

    template() {
        if (!this.stores.login.partialLogin) {
            // Step 1: Email input
            return html`
                <form on-submit="sendOtp">
                    <p>Please enter your email address to proceed.</p>
                    <label>Email Address: <input type="text" x-model="user"></label>
                    <input type="submit" value="Next"/>
                </form>
            `;
        } else {
            // Step 2: OTP input
            return html`
                <form on-submit="loginAct">
                    <p>You should have recieved an email with a single-use login code. Enter it below.</p>
                    <label>Email Address: <input type="text" value="${this.stores.login.partialLogin}" disabled></label>
                    <label>Login Code: <input type="text" x-model="otp"></label>
                    <input type="submit" value="Login"/>
                </form>
            `;
        }
    }
});
