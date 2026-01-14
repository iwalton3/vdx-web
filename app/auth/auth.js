/**
 * Authentication System
 * Manages user login, capabilities, and sessions
 */
import { createStore } from '../lib/framework.js';
import * as api from '../api.js';

class Login {
    constructor() {
        this.capabilities = [];  // Use array instead of Set for reactivity
        this.user = null;
        this.partialLogin = null;
        this.updated = null;
    }

    /**
     * Check if user has a capability
     * @param {string} capability - Capability name
     * @returns {boolean}
     */
    has(capability) {
        return this.capabilities.includes(capability);
    }

    /**
     * Send one-time password to user's email
     * @param {string} user - Email address
     */
    async send_otp(user) {
        await api.send_otp(user);
        if (this.updated) this.updated({ partialLogin: user });
    }

    /**
     * Login with OTP code
     * @param {string} otp - One-time password
     * @returns {boolean} Success
     */
    async login(otp) {
        if (!this.partialLogin) return false;

        const { success } = await api.login(this.partialLogin, otp);

        if (success) {
            if (this.updated) this.updated({ partialLogin: null });
            await this.upd();
            return true;
        } else {
            if (this.updated) this.updated({ partialLogin: null });
            return false;
        }
    }

    /**
     * Log off current session
     */
    async logoff() {
        await api.logoff();
        await this.upd();
    }

    /**
     * Log off all sessions
     */
    async logoff_all() {
        await api.logoff_all();
        await this.upd();
    }

    /**
     * Update user details and capabilities
     */
    async upd() {
        const response = await api.getDetails();
        const { capabilities, user } = response;
        // Pass new values directly to trigger reactivity
        // (Don't set this.user/this.capabilities first - that bypasses the proxy)
        if (this.updated) this.updated({ capabilities, user });
    }
}

/**
 * Create reactive login store
 */
function loginStore() {
    const login = new Login();
    const store = createStore(login);

    login.updated = (value) => store.set(value);

    // Initialize - with error handling for initial auth sync
    login.upd().catch(error => {
        console.error('[Auth] Failed to initialize auth state:', error);
        // Set default unauthenticated state on error
        store.set({ user: null, capabilities: [] });
    });

    return store;
}

export default loginStore();
