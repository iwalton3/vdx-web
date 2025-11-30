/**
 * Autopassword - Generate deterministic passwords from a secret key and name
 * Uses Web Crypto API for SHA-256 (no external dependencies)
 */
import { defineComponent, html, when } from '../../lib/framework.js';
import { notify } from '../../lib/utils.js';

export default defineComponent('autopassword-page', {
    data() {
        return {
            key: '',
            keyVerify: '',
            name: '',
            response: '',
            keyError: ''
        };
    },

    methods: {
        async refreshPasswords() {
            if (this.state.key !== this.state.keyVerify && this.state.keyVerify !== '') {
                this.state.keyError = 'Keys are Different!';
                this.state.response = '';
                return;
            }

            this.state.keyError = '';

            if (this.state.name !== '' && this.state.key !== '') {
                const hash = await this.sha256(this.state.name + this.state.key);
                // Convert to base64 and clean up
                let hashText = this.toBase64(hash);
                hashText = hashText.replace(/[+/]/g, '');
                this.state.response = hashText.substring(0, 8) + '-' + hashText.substring(8, 16);
            } else {
                this.state.response = '';
            }
        },

        async sha256(message) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            return new Uint8Array(hashBuffer);
        },

        toBase64(bytes) {
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        },

        async copyResult() {
            if (this.state.response) {
                try {
                    await navigator.clipboard.writeText(this.state.response);
                    notify('Password copied to clipboard!');
                } catch (e) {
                    // Fallback for older browsers
                    const input = this.querySelector('#response');
                    input.select();
                    document.execCommand('copy');
                    notify('Password copied to clipboard!');
                }
            }
        },

        handleKeyInput() {
            this.refreshPasswords();
        },

        handleKeyVerifyInput() {
            this.refreshPasswords();
        },

        handleNameInput() {
            this.refreshPasswords();
        }
    },

    template() {
        return html`
            <div class="autopassword">
                <h1>Autopassword</h1>

                <div class="section">
                    <p>
                        Autopassword allows you to generate passwords using a secret key and a name for each generated password.
                        Please note that the security of generated password depends on the key.
                        I suggest using a key with several random words or an entire sentence.
                        (You can generate a password with <router-link to="/pwgen/">SPWG</router-link> or
                        <router-link to="/pwgen/apwg/">APWG</router-link> to meet this requirement.)
                    </p>
                    <p>
                        There are also offline versions that will autotype passwords:
                        <a href="/autopassword.vbs">Windows</a> or
                        <a href="/autopassword.sh">Linux</a>
                    </p>
                </div>

                <div class="section form-section">
                    <div class="form-row">
                        <label>Secret Key:
                            <input id="key" type="password" x-model="key" on-input="handleKeyInput" placeholder="Secret Key">
                        </label>
                    </div>

                    <div class="form-row">
                        <label>Secret Key (Again):
                            <input id="keyVerify" type="password" x-model="keyVerify" on-input="handleKeyVerifyInput" placeholder="Secret Key (Again)">
                        </label>
                        ${when(this.state.keyError, html`
                            <span class="error">${this.state.keyError}</span>
                        `)}
                    </div>

                    <div class="form-row">
                        <label>Name:
                            <input id="name" type="text" x-model="name" on-input="handleNameInput" placeholder="Name (e.g., 'google', 'bank')">
                        </label>
                    </div>

                    <div class="form-row result-row">
                        <label>Result:
                            <input id="response" type="text" value="${this.state.response}" readonly>
                        </label>
                        <button on-click="copyResult" disabled="${!this.state.response}">Copy</button>
                    </div>
                </div>

                <div class="section">
                    <p class="hint">
                        The same key + name combination will always generate the same password.
                        Use different names for different accounts (e.g., "gmail", "bank", "work").
                    </p>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .autopassword {
            max-width: 600px;
        }

        .form-section {
            background: var(--card-bg, #f8f9fa);
            padding: 20px;
            border-radius: 8px;
        }

        .form-row {
            margin-bottom: 15px;
        }

        .form-row label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }

        .form-row input {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
            box-sizing: border-box;
        }

        .form-row input:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .form-row button {
            margin-bottom: 5px;
        }

        .result-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }

        .result-row label {
            flex: 1;
        }

        .result-row button {
            padding: 10px 20px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
            cursor: pointer;
            font-size: 14px;
        }

        .result-row button:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }

        .result-row button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .error {
            color: #dc3545;
            font-size: 14px;
            margin-top: 5px;
            display: block;
        }

        .hint {
            color: var(--text-muted, #6c757d);
            font-size: 14px;
            font-style: italic;
        }
    `
});
