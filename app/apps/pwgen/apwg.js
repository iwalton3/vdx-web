/**
 * APWG - Advanced Password Generator
 * Generates passwords using word-based patterns
 */
import { defineComponent } from '../../core/component.js';
import { html, raw } from '../../core/template.js';
import { range } from '../../core/utils.js';
import { apwg } from './spwg_api.js';
import '../../components/select-box.js';
import '../../core/x-page.js';

export default defineComponent('apwg-page', {
    data() {
        return {
            response: '',
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
        async updatePassword() {
            try {
                this.state.response = await apwg(this.state.pwType, this.state.length);
            } catch (error) {
                console.error('Failed to generate password:', error);
                this.state.response = '<p class="banner-error">Failed to generate password</p>';
            }
        }
    },

    template() {
        return html`
            <x-page>
                <div class="section">
                    ${raw(this.state.response)}
                </div>
                <form on-submit-prevent="updatePassword">
                    <label style="display: inline;">
                        Generate a
                        <x-select-box
                            x-model="length"
                            options="${this.state.lengthOptions}">
                        </x-select-box>
                         word
                    </label>
                    <label style="display: inline;">
                        password using
                        <x-select-box
                            x-model="pwType"
                            options="${this.state.pwTypeOptions}">
                        </x-select-box>
                         words.
                    </label>
                    <input type="submit" value="Submit">
                </form>
            </x-page>
        `;
    }
});
