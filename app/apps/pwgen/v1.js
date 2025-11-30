/**
 * V1 - Legacy Password Generator
 * Simple Japanese-style syllable password generator
 * DEPRECATED: Use SPWG or APWG for better security
 */
import { defineComponent, html } from '../../lib/framework.js';

// Syllable pairs for password generation
const pairs = [
    "ka", "ke", "ki", "ko", "ku",
    "sa", "se", "si", "so", "su",
    "ta", "te", "ti", "to", "tu",
    "na", "ne", "ni", "no", "nu",
    "ha", "he", "hi", "ho", "hu",
    "ma", "me", "mi", "mo", "mu",
    "ra", "re"
];

// Secure random number generator
function secureRandom(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}

// Generate password
function generatePassword() {
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += pairs[secureRandom(pairs.length)];
    }
    return result;
}

export default defineComponent('v1-page', {
    data() {
        return {
            password: ''
        };
    },

    mounted() {
        this.generate();
    },

    methods: {
        generate() {
            this.state.password = generatePassword();
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
            <div class="v1">
                <h1>Password Generator v1</h1>

                <div class="section warning">
                    <p>This password generator is <strong>deprecated</strong>.</p>
                    <p>Use <router-link to="/pwgen/">SPWG</router-link> or <router-link to="/pwgen/apwg/">APWG</router-link> for better security.</p>
                </div>

                <div class="section result">
                    <label>Your password is:</label>
                    <div class="password-row">
                        <input type="text" class="password-display" value="${this.state.password}" readonly>
                        <button type="button" on-click="copyPassword">Copy</button>
                    </div>
                    <button type="button" on-click="generate">Generate Another</button>
                </div>

                <div class="section info">
                    <p>This generator creates 16-character passwords using Japanese-style syllables.</p>
                    <p>Entropy: ~40 bits (32 possible syllables, 8 selections)</p>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .v1 {
            max-width: 600px;
        }

        .warning {
            background: var(--warning-bg, #fff3cd);
            border: 1px solid var(--warning-border, #ffc107);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .warning p {
            margin: 5px 0;
            color: var(--warning-text, #856404);
        }

        .result {
            background: var(--card-bg, #f8f9fa);
            padding: 20px;
            border-radius: 8px;
        }

        .result label {
            display: block;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .password-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }

        .password-display {
            flex: 1;
            font-family: monospace;
            font-size: 18px;
            letter-spacing: 2px;
        }

        .info {
            color: var(--text-muted, #666);
            font-size: 14px;
        }

        .info p {
            margin: 8px 0;
        }

        /* Form elements with CSS variables for dark theme */
        input[type="text"] {
            padding: 10px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
        }

        input[type="text"]:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        button {
            padding: 10px 16px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
            cursor: pointer;
        }

        button:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }
    `
});
