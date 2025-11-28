/**
 * Password Generator Component (SPWG)
 */

import { defineComponent } from '../../lib/framework.js';
import { html, raw } from '../../lib/framework.js';
import { fromlength, fromlengthbatch, frombits, frommax, tonumber, towords } from './spwg_api.js';

export default defineComponent('spwg-page', {
    data() {
        return {
            response: '',
            entropy: '',
            combinations: '',
            number: '',
            password: '',
            count: 10,
            words: 4
        };
    },

    async mounted() {
        // Load initial password with default word count
        await this.fromWords();
    },

    template() {
        return html`
            <div>
                <h1>Secure Passphrase Generator</h1>

                <!-- Response display -->
                <div class="section">
                    ${raw(this.state.response)}
                </div>

                <p><strong>I want a password with...</strong></p>

                <!-- Entropy input -->
                <div class="section">
                    <form on-submit-prevent="fromBits">
                        <label>
                            <input class="sm" x-model="entropy" type="number" min="1" max="1000">
                            bits of entropy.
                        </label>
                        <input type="submit" value="Generate">
                    </form>

                    <!-- Words input -->
                    <form on-submit-prevent="fromWords">
                        <label>
                            <input class="sm" x-model="words" type="number" min="1" max="20">
                            words.
                        </label>
                        <input type="submit" value="Generate">
                    </form>

                    <!-- Combinations input -->
                    <form on-submit-prevent="fromMax">
                        <label>
                            <input x-model="combinations" type="number" min="1">
                            possible combinations.
                        </label>
                        <input type="submit" value="Generate">
                    </form>
                </div>

                <!-- Conversion tools -->
                <div class="section">
                    <h3>Conversion Tools</h3>

                    <form on-submit-prevent="toWordsSubmit">
                        <label>
                            Convert the number
                            <input x-model="number" type="number" style="width: 200px;">
                            to a password.
                        </label>
                        <input type="submit" value="Convert">
                    </form>

                    <form on-submit-prevent="fromPassword">
                        <label>
                            Convert the password
                            <input x-model="password" type="text" style="width: 200px;">
                            to a number.
                        </label>
                        <input type="submit" value="Convert">
                    </form>
                </div>

                <!-- Batch generation -->
                <div class="section">
                    <h3>Batch Generation</h3>

                    <form on-submit-prevent="batchGenerate">
                        <label>
                            Generate <input class="sm" x-model="count" type="number" min="1" max="100"> passwords
                            with <input class="sm" x-model="words" type="number" min="1" max="20"> words.
                        </label>
                        <input type="submit" value="Generate Batch">
                    </form>
                </div>
            </div>
        `;
    },

    methods: {
        async fromBits() {
            try {
                this.state.response = await frombits(this.state.entropy);
            } catch (error) {
                this.state.response = '<p class="banner-error">Error generating password from bits.</p>';
            }
        },

        async fromWords() {
            try {
                this.state.response = await fromlength(this.state.words);
            } catch (error) {
                this.state.response = '<p class="banner-error">Error generating password from word count.</p>';
            }
        },

        async fromMax() {
            try {
                this.state.response = await frommax(this.state.combinations);
            } catch (error) {
                this.state.response = '<p class="banner-error">Error generating password from combinations.</p>';
            }
        },

        async toWordsSubmit() {
            try {
                this.state.response = await towords(this.state.number);
            } catch (error) {
                this.state.response = '<p class="banner-error">Error converting number to words.</p>';
            }
        },

        async fromPassword() {
            try {
                this.state.response = await tonumber(this.state.password);
            } catch (error) {
                this.state.response = '<p class="banner-error">That password cannot be converted to a number.</p>';
            }
        },

        async batchGenerate() {
            try {
                this.state.response = await fromlengthbatch(this.state.words, this.state.count);
            } catch (error) {
                this.state.response = '<p class="banner-error">Error generating batch passwords.</p>';
            }
        }
    },

    styles: `
        form {
            display: block;
            margin: 15px 0;
        }

        label {
            display: inline;
            margin-right: 10px;
        }

        .sm {
            width: 4em;  /* Increased from 3em to fix number overlap in dark mode */
        }

        h3 {
            margin-top: 0;
            color: #555;
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
            padding: 8px;
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

        input[type="submit"]:disabled,
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `
});
