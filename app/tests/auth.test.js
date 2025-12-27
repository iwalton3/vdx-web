/**
 * Tests for Authentication System (with mocked API)
 */

import { describe, assert } from './test-runner.js';
import { createStore } from '../lib/framework.js';

// Mock API
const mockApi = {
    sendOtpCalled: false,
    loginCalled: false,
    getDetailsCalled: false,
    logoffCalled: false,

    reset() {
        this.sendOtpCalled = false;
        this.loginCalled = false;
        this.getDetailsCalled = false;
        this.logoffCalled = false;
        this.sendOtpEmail = null;
        this.loginEmail = null;
        this.loginOtp = null;
    },

    send_otp(email) {
        this.sendOtpCalled = true;
        this.sendOtpEmail = email;
        return Promise.resolve();
    },

    login(email, otp) {
        this.loginCalled = true;
        this.loginEmail = email;
        this.loginOtp = otp;
        // Simulate successful login if OTP is '123456'
        return Promise.resolve({ success: otp === '123456' });
    },

    getDetails() {
        this.getDetailsCalled = true;
        return Promise.resolve({
            user: 'test@example.com',
            capabilities: ['user', 'view']
        });
    },

    logoff() {
        this.logoffCalled = true;
        return Promise.resolve();
    }
};

// Mock Login class
class MockLogin {
    constructor(api) {
        this.api = api;
        this.capabilities = new Set();
        this.user = null;
        this.partialLogin = null;
        this.updated = null;
    }

    async send_otp(user) {
        await this.api.send_otp(user);
        this.partialLogin = user;
        if (this.updated) this.updated(this);
    }

    async login(otp) {
        if (!this.partialLogin) return false;

        const { success } = await this.api.login(this.partialLogin, otp);
        this.partialLogin = null;

        if (success) {
            await this.upd();
            return true;
        } else {
            if (this.updated) this.updated(this);
            return false;
        }
    }

    async logoff() {
        await this.api.logoff();
        await this.upd();
    }

    async upd() {
        const { capabilities, user } = await this.api.getDetails();
        this.capabilities = new Set(capabilities);
        this.user = user;
        if (this.updated) this.updated(this);
    }
}

describe('Authentication State Management', function(it) {
    it('creates login store', () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);
        const loginStore = createStore(login);

        assert.ok(loginStore.state, 'Should have state');
        assert.ok(loginStore.subscribe, 'Should have subscribe method');
        assert.ok(loginStore.set, 'Should have set method');
        assert.ok(loginStore.update, 'Should have update method');
    });

    it('sends OTP and sets partialLogin', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        await login.send_otp('test@example.com');

        assert.ok(mockApi.sendOtpCalled, 'Should call send_otp API');
        assert.equal(mockApi.sendOtpEmail, 'test@example.com', 'Should send correct email');
        assert.equal(login.partialLogin, 'test@example.com', 'Should set partialLogin');
    });

    it('completes login with correct OTP', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        // First send OTP
        await login.send_otp('test@example.com');

        // Then complete login
        const success = await login.login('123456');

        assert.ok(mockApi.loginCalled, 'Should call login API');
        assert.equal(mockApi.loginEmail, 'test@example.com', 'Should use correct email');
        assert.equal(mockApi.loginOtp, '123456', 'Should use correct OTP');
        assert.ok(success, 'Should return true for successful login');
        assert.equal(login.partialLogin, null, 'Should clear partialLogin');
        assert.equal(login.user, 'test@example.com', 'Should set user');
    });

    it('fails login with incorrect OTP', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        // First send OTP
        await login.send_otp('test@example.com');

        // Then try with wrong OTP
        const success = await login.login('wrong');

        assert.ok(mockApi.loginCalled, 'Should call login API');
        assert.ok(!success, 'Should return false for failed login');
        assert.equal(login.partialLogin, null, 'Should clear partialLogin');
        assert.equal(login.user, null, 'Should not set user');
    });

    it('prevents login without send_otp first', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        // Try to login without sending OTP first
        const success = await login.login('123456');

        assert.ok(!mockApi.loginCalled, 'Should not call login API');
        assert.ok(!success, 'Should return false');
    });

    it('notifies subscribers on state changes', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);
        const loginStore = createStore(login);

        let notifications = 0;
        let lastState = null;

        loginStore.subscribe(state => {
            // Fine-grained: must access properties to track them
            void state.partialLogin;
            notifications++;
            lastState = state;
        });

        // Initial subscription should fire immediately
        assert.equal(notifications, 1, 'Should notify on initial subscription');
        assert.ok(lastState, 'Should provide state in notification');

        // Trigger a state change - call method on the REACTIVE state, not the original object
        await loginStore.state.send_otp('test@example.com');

        // Give time for notification
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.ok(notifications >= 2, 'Should notify on state change');
        assert.equal(lastState.partialLogin, 'test@example.com', 'Should include updated state');
    });
});

describe('Login Component State Flow', function(it) {
    it('starts in email input state', () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        assert.equal(login.partialLogin, null, 'Should not have partialLogin initially');
        assert.equal(login.user, null, 'Should not have user initially');
    });

    it('transitions to OTP input state after send_otp', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        // Check initial state
        assert.equal(login.partialLogin, null, 'Should start without partialLogin');

        // Send OTP
        await login.send_otp('test@example.com');

        // Check transitioned state
        assert.equal(login.partialLogin, 'test@example.com', 'Should have partialLogin after send_otp');
        assert.equal(login.user, null, 'Should not have user yet');
    });

    it('transitions to logged in state after successful login', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        // Send OTP
        await login.send_otp('test@example.com');
        assert.equal(login.partialLogin, 'test@example.com', 'Should have partialLogin');

        // Complete login
        await login.login('123456');

        // Check final state
        assert.equal(login.partialLogin, null, 'Should clear partialLogin after login');
        assert.equal(login.user, 'test@example.com', 'Should have user after login');
    });

    it('returns to email input state after failed login', async () => {
        mockApi.reset();
        const login = new MockLogin(mockApi);

        // Send OTP
        await login.send_otp('test@example.com');

        // Try with wrong OTP
        await login.login('wrong');

        // Should clear partialLogin and stay logged out
        assert.equal(login.partialLogin, null, 'Should clear partialLogin');
        assert.equal(login.user, null, 'Should not have user');
    });
});
