/**
 * APWG - Advanced Password Generator
 * Generates memorable passwords using phonetic segments
 */
import { defineComponent, html, when } from '../../lib/framework.js';
import { range } from '../../lib/utils.js';
import '../../components/select-box.js';

// Segment data cache
let segments = null;

// Secure random number generator
function secureRandom(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}

// Load segment data
async function loadSegments() {
    if (segments !== null) return;
    const resp = await fetch('/apps/pwgen/apwg-data.json');
    const data = await resp.json();
    segments = {
        s: data.starting,
        m: data.middle,
        e: data.ending,
        v: data.vowel,
        v2: data.vowel2,
        c: data.special
    };
}

// Get random segment
function randseg(segtype) {
    return segments[segtype][secureRandom(segments[segtype].length)];
}

// Password type definitions
const pwdef = {
    simple: {
        gen: (n) => randseg('s') + randseg('v') + randseg('e'),
        bits: (l) => Math.floor(l * 1779 / 100)
    },
    complex: {
        gen: (n) => randseg('s') + randseg('v2') + randseg('m') + randseg('v2') + randseg('e'),
        bits: (l) => Math.floor(l * 2782 / 100)
    },
    extended: {
        gen: (n) => n > 0
            ? randseg('c') + randseg('s') + randseg('v') + randseg('e')
            : randseg('s') + randseg('v') + randseg('e'),
        bits: (l) => Math.floor((l * 2463 - 678) / 100)
    }
};

// Generate password
async function genapw(pwtype, length) {
    await loadSegments();
    const spacer = pwtype === 'extended' ? '' : ' ';
    const words = [];
    for (let i = 0; i < length; i++) {
        words.push(pwdef[pwtype].gen(i));
    }
    return words.join(spacer);
}

// Calculate time to crack
function timecalc(count, tests) {
    let time = Math.floor(count / tests);

    if (time > 6311520000) return "centuries";
    if (time > 31557600) return Math.floor(time / 31557600) + " years";
    if (time > 2630016) return Math.floor(time / 2630016) + " months";
    if (time > 86400) return Math.floor(time / 86400) + " days";
    if (time > 3600) return Math.floor(time / 3600) + " hours";
    if (time > 60) return Math.floor(time / 60) + " minutes";
    return time + " seconds";
}

export default defineComponent('apwg-page', {
    data() {
        return {
            // Result state
            password: '',
            bits: 0,
            error: '',

            // Security info
            onlineTime: '',
            slowHashTime: '',
            fastHashTime: '',

            // Form inputs
            pwType: 'complex',
            length: 3,
            lengthOptions: range(1, 9), // 1-8
            pwTypeOptions: ['simple', 'extended', 'complex']
        };
    },

    async mounted() {
        await this.updatePassword();
    },

    methods: {
        calculateSecurity(count) {
            this.state.onlineTime = timecalc(count, 1000);
            this.state.slowHashTime = timecalc(count, 1000000);
            this.state.fastHashTime = timecalc(count, 250000000000);
        },

        async updatePassword() {
            this.state.error = '';
            try {
                let length = parseInt(this.state.length);
                if (length > 10) length = 10;

                const bits = pwdef[this.state.pwType].bits(length);
                const count = Math.pow(2, bits);

                this.state.password = await genapw(this.state.pwType, length);
                this.state.bits = bits;
                this.calculateSecurity(count);
            } catch (error) {
                console.error('Failed to generate password:', error);
                this.state.error = 'Failed to generate password';
            }
        },

        handleLengthChange() {
            this.updatePassword();
        },

        handleTypeChange() {
            this.updatePassword();
        },

        async copyPassword() {
            try {
                await navigator.clipboard.writeText(this.state.password);
            } catch (e) {
                const input = this.querySelector('.password-display');
                if (input) {
                    input.select();
                    document.execCommand('copy');
                }
            }
        }
    },

    template() {
        return html`
            <div class="apwg">
                <h1>Advanced Password Generator</h1>

                <!-- Error display -->
                ${when(this.state.error, html`
                    <div class="section error-banner">
                        ${this.state.error}
                    </div>
                `)}

                <!-- Generation options - ON TOP -->
                <div class="section">
                    <div class="form-row">
                        <label>
                            Generate a
                            <x-select-box
                                x-model="length"
                                options="${this.state.lengthOptions}"
                                on-change="handleLengthChange">
                            </x-select-box>
                            word password using
                            <x-select-box
                                x-model="pwType"
                                options="${this.state.pwTypeOptions}"
                                on-change="handleTypeChange">
                            </x-select-box>
                            words.
                        </label>
                    </div>
                </div>

                <!-- Password result -->
                ${when(this.state.password, html`
                    <div class="section result">
                        <label>Generated Password:</label>
                        <div class="password-row">
                            <input type="text" class="password-display" value="${this.state.password}" readonly>
                            <button type="button" class="icon-btn" on-click="updatePassword" title="Regenerate">🔄</button>
                            <button type="button" on-click="copyPassword">Copy</button>
                        </div>
                        <p class="info">This password was generated with <strong>${this.state.bits}</strong> bits of randomness.</p>

                        <div class="security-info">
                            <p><strong>Password crack times vary with password use:</strong></p>
                            <ul>
                                <li>Online/Network Accounts: ${this.state.onlineTime}</li>
                                <li>Stolen Hash (Slow, like LUKS/BCRYPT): ${this.state.slowHashTime}</li>
                                <li>Stolen Hash (Fast, like NTLM/MD5): ${this.state.fastHashTime}</li>
                            </ul>
                        </div>
                    </div>
                `)}

                <!-- Info section -->
                <div class="section info-section">
                    <h3>Password Types</h3>
                    <ul>
                        <li><strong>Simple:</strong> Basic phonetic patterns (e.g., "kas lov nim")</li>
                        <li><strong>Complex:</strong> More varied patterns with higher entropy (e.g., "kasev lovum nimat")</li>
                        <li><strong>Extended:</strong> Includes special characters, no spaces (e.g., "@kaslov#nimura")</li>
                    </ul>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .apwg {
            max-width: 700px;
        }

        form {
            display: block;
            margin: 15px 0;
        }

        .form-row {
            margin-bottom: 15px;
        }

        .form-row label {
            display: inline;
        }

        h3 {
            margin-top: 0;
            color: var(--text-muted, #555);
        }

        .result {
            background: var(--card-bg, #f8f9fa);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .result > label {
            display: block;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .password-row {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }

        .password-display {
            flex: 1;
            font-family: monospace;
            font-size: 16px;
        }

        .icon-btn {
            padding: 8px 10px;
            font-size: 16px;
            line-height: 1;
        }

        .info {
            margin: 10px 0;
            color: var(--text-muted, #666);
        }

        .security-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--input-border, #ddd);
        }

        .security-info ul {
            margin: 10px 0;
            padding-left: 20px;
        }

        .security-info li {
            margin: 5px 0;
        }

        .info-section ul {
            padding-left: 20px;
        }

        .info-section li {
            margin: 8px 0;
        }

        .error-banner {
            background: var(--error-bg, #f8d7da);
            color: var(--error-text, #721c24);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        /* Form elements with CSS variables for dark theme */
        input[type="text"],
        input[type="number"],
        textarea {
            padding: 8px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
        }

        input[type="text"]:focus,
        input[type="number"]:focus,
        textarea:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        input[type="submit"],
        button {
            padding: 8px 12px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
            cursor: pointer;
        }

        input[type="submit"]:hover:not(:disabled),
        button:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }

        h1 {
            margin-bottom: 10px;
        }
    `
});
