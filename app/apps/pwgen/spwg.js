/**
 * SPWG - Secure Passphrase Generator
 * Generates cryptographically secure passphrases using a 55454-word dictionary
 */
import { defineComponent, html, when } from '../../lib/framework.js';

// Wordlist cache
let wordlist = null;

// Secure random number generator
function secureRandom(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}

// Secure random BigInt for large ranges
function secureRandomBigInt(max) {
    if (max <= 0n) return 0n;
    const bits = max.toString(2).length;
    const bytes = Math.ceil(bits / 8);
    const array = new Uint8Array(bytes);

    let result;
    do {
        crypto.getRandomValues(array);
        result = array.reduce((acc, byte, i) => acc + (BigInt(byte) << BigInt(i * 8)), 0n);
    } while (result >= max);

    return result;
}

// Load wordlist
async function loadWordlist() {
    if (wordlist !== null) return;
    const resp = await fetch('/apps/pwgen/spwg-data.json');
    const data = await resp.json();
    wordlist = data.words;
}

const BASE = 55454n;

// Get bit length of a BigInt
function getBitLength(n) {
    if (n <= 0n) return 0;
    return n.toString(2).length;
}

// Get word count needed to represent a number (BigInt)
function getWordCount(number) {
    let iterator = 0;
    let threshold = BASE - 1n;
    while (threshold < number) {
        iterator++;
        threshold = BASE ** BigInt(iterator + 1) - 1n;
    }
    return iterator;
}

// Convert BigInt to words
function convertToWords(number) {
    let output = "";
    let space = "";
    const maxset = getWordCount(number);

    for (let i = maxset; i >= 0; i--) {
        const divisor = BASE ** BigInt(i);
        const count = Number(number / divisor);
        number = number % divisor;
        output = output + space + wordlist[count];
        space = " ";
    }
    return output;
}

// Convert words to BigInt
function convertToNumber(words) {
    const wordsgroup = words.split(" ");
    const length = wordsgroup.length;
    let number = 0n;

    for (let i = 0; i < length; i++) {
        const idx = wordlist.indexOf(wordsgroup[i]);
        if (idx === -1) throw new Error(`Word not found: ${wordsgroup[i]}`);
        number = number + BASE ** BigInt(length - (i + 1)) * BigInt(idx);
    }
    return number;
}

// Generate passphrase with given word count
async function generateWithLength(length) {
    await loadWordlist();
    let output = "";
    let space = "";
    if (length > 15) length = 15;

    for (let i = 0; i < length; i++) {
        output = output + space + wordlist[secureRandom(55454)];
        space = " ";
    }
    return output;
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

export default defineComponent('spwg-page', {
    data() {
        return {
            // Result state
            password: '',
            passwords: [],
            bits: 0,
            conversionResult: '',
            error: '',
            resultType: '', // 'single', 'batch', 'conversion'

            // Security info
            onlineTime: '',
            slowHashTime: '',
            fastHashTime: '',

            // Form inputs
            entropy: 64,
            words: 4,
            combinations: 1000000,
            number: '',
            passwordInput: '',
            count: 10
        };
    },

    async mounted() {
        await this.fromWords();
    },

    methods: {
        calculateSecurity(count) {
            this.state.onlineTime = timecalc(count, 1000);
            this.state.slowHashTime = timecalc(count, 1000000);
            this.state.fastHashTime = timecalc(count, 250000000000);
        },

        async fromBits() {
            this.state.error = '';
            try {
                await loadWordlist();
                let bits = parseInt(this.state.entropy);
                if (bits > 512) bits = 512;

                const max = 2n ** BigInt(bits);
                const inputnumber = secureRandomBigInt(max);

                this.state.password = convertToWords(inputnumber);
                this.state.bits = bits;
                this.state.resultType = 'single';
                this.calculateSecurity(Math.pow(2, bits));
            } catch (error) {
                this.state.error = 'Error generating password from bits.';
            }
        },

        async fromWords() {
            this.state.error = '';
            try {
                await loadWordlist();
                const wordCount = parseInt(this.state.words);

                this.state.password = await generateWithLength(wordCount);
                this.state.bits = Math.floor(Math.log2(Math.pow(55454, wordCount)));
                this.state.resultType = 'single';
                this.calculateSecurity(Math.pow(55454, wordCount));
            } catch (error) {
                this.state.error = 'Error generating password from word count.';
            }
        },

        async fromMax() {
            this.state.error = '';
            try {
                await loadWordlist();
                const max = BigInt(this.state.combinations);

                const inputnumber = secureRandomBigInt(max);
                this.state.password = convertToWords(inputnumber);
                this.state.bits = Math.floor(Math.log2(Number(max)));
                this.state.resultType = 'single';
                this.calculateSecurity(Number(max));
            } catch (error) {
                this.state.error = 'Error generating password from combinations.';
            }
        },

        async toWordsSubmit() {
            this.state.error = '';
            try {
                await loadWordlist();
                const inputnumber = BigInt(this.state.number);

                this.state.password = convertToWords(inputnumber);
                this.state.bits = getBitLength(inputnumber);
                this.state.resultType = 'single';
                this.calculateSecurity(Number(inputnumber));
            } catch (error) {
                this.state.error = 'Error converting number to words.';
            }
        },

        async fromPassword() {
            this.state.error = '';
            try {
                await loadWordlist();
                const number = convertToNumber(this.state.passwordInput);
                this.state.conversionResult = String(number);
                this.state.resultType = 'conversion';
            } catch (error) {
                this.state.error = 'That password cannot be converted to a number.';
            }
        },

        async batchGenerate() {
            this.state.error = '';
            try {
                await loadWordlist();
                const wordCount = parseInt(this.state.words);
                const passwordCount = parseInt(this.state.count);

                if (passwordCount > 1000) {
                    this.state.error = `Do you really need ${passwordCount} passwords?`;
                    return;
                }

                const passwords = [];
                for (let i = 0; i < passwordCount; i++) {
                    passwords.push(await generateWithLength(wordCount));
                }

                this.state.passwords = passwords;
                this.state.bits = Math.floor(Math.log2(Math.pow(55454, wordCount)));
                this.state.resultType = 'batch';
                this.calculateSecurity(Math.pow(55454, wordCount));
            } catch (error) {
                this.state.error = 'Error generating batch passwords.';
            }
        },

        async regenerate() {
            if (this.state.resultType === 'batch') {
                await this.batchGenerate();
            } else {
                await this.fromWords();
            }
        },

        handleWordsChange() {
            this.fromWords();
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
            <div class="spwg">
                <h1>Secure Passphrase Generator</h1>

                <!-- Error display -->
                ${when(this.state.error, html`
                    <div class="section error-banner">
                        ${this.state.error}
                    </div>
                `)}

                <p><strong>I want a password with...</strong></p>

                <!-- Generation options - ON TOP -->
                <div class="section">
                    <form on-submit-prevent="fromBits">
                        <label>
                            <input class="sm" x-model="entropy" type="number" min="1" max="512">
                            bits of entropy.
                        </label>
                        <input type="submit" value="Generate">
                    </form>

                    <form on-submit-prevent="fromWords">
                        <label>
                            <input class="sm" x-model="words" type="number" min="1" max="15" on-change="handleWordsChange">
                            words.
                        </label>
                        <input type="submit" value="Generate">
                    </form>

                    <form on-submit-prevent="fromMax">
                        <label>
                            <input x-model="combinations" type="number" min="1" style="width: 150px;">
                            possible combinations.
                        </label>
                        <input type="submit" value="Generate">
                    </form>
                </div>

                <!-- Single password result -->
                ${when(this.state.resultType === 'single', html`
                    <div class="section result">
                        <label>Generated Password:</label>
                        <div class="password-row">
                            <input type="text" class="password-display" value="${this.state.password}" readonly>
                            <button type="button" class="icon-btn" on-click="regenerate" title="Regenerate">🔄</button>
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

                <!-- Batch result -->
                ${when(this.state.resultType === 'batch', html`
                    <div class="section result">
                        <label>Generated Passwords:</label>
                        <div class="batch-header">
                            <button type="button" class="icon-btn" on-click="regenerate" title="Regenerate">🔄</button>
                        </div>
                        <textarea rows="10" readonly>${this.state.passwords.join('\n')}</textarea>
                        <p class="info">These passwords were generated with <strong>${this.state.bits}</strong> bits of randomness.</p>

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

                <!-- Conversion result -->
                ${when(this.state.resultType === 'conversion', html`
                    <div class="section result">
                        <label>Your number is:</label>
                        <input type="text" class="password-display" value="${this.state.conversionResult}" readonly>
                    </div>
                `)}

                <!-- Conversion tools -->
                <div class="section">
                    <h3>Conversion Tools</h3>

                    <form on-submit-prevent="toWordsSubmit">
                        <label>
                            Convert the number
                            <input x-model="number" type="text" style="width: 200px;" placeholder="Enter a number">
                            to a password.
                        </label>
                        <input type="submit" value="Convert">
                    </form>

                    <form on-submit-prevent="fromPassword">
                        <label>
                            Convert the password
                            <input x-model="passwordInput" type="text" style="width: 200px;">
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
                            with <input class="sm" x-model="words" type="number" min="1" max="15"> words.
                        </label>
                        <input type="submit" value="Generate Batch">
                    </form>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .spwg {
            max-width: 700px;
        }

        form {
            display: block;
            margin: 15px 0;
        }

        label {
            display: inline;
            margin-right: 10px;
        }

        .sm {
            width: 4em;
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

        .batch-header {
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

        .result textarea {
            width: 100%;
            font-family: monospace;
            font-size: 14px;
            box-sizing: border-box;
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

        .error-banner {
            background: var(--error-bg, #f8d7da);
            color: var(--error-text, #721c24);
            padding: 15px;
            border-radius: 8px;
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
    `
});
