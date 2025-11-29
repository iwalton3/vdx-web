/**
 * Stepper - Multi-step form/wizard component
 *
 * @example
 * <cl-stepper
 *     steps="${[
 *         { label: 'Shipping', icon: '📦' },
 *         { label: 'Payment', icon: '💳' },
 *         { label: 'Review', icon: '✓' }
 *     ]}"
 *     activeIndex="${this.state.currentStep}"
 *     linear="true"
 *     on-change="handleStepChange"
 *     on-complete="handleComplete">
 *
 *     <div slot="step-0">Shipping form content...</div>
 *     <div slot="step-1">Payment form content...</div>
 *     <div slot="step-2">Review content...</div>
 * </cl-stepper>
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-stepper', {
    props: {
        steps: [],           // Array of { label: string, icon?: string, optional?: boolean }
        activeIndex: 0,      // Current step (0-indexed)
        linear: false,       // If true, must complete steps in order
        showButtons: true,   // Show built-in navigation buttons
        backLabel: 'Back',
        nextLabel: 'Continue',
        completeLabel: 'Complete',
        orientation: 'horizontal' // 'horizontal' or 'vertical'
    },

    data() {
        return {
            currentStep: 0,
            completedSteps: new Set(),
            validationError: ''
        };
    },

    mounted() {
        this.state.currentStep = this.props.activeIndex || 0;
    },

    propsChanged(prop, newValue) {
        if (prop === 'activeIndex') {
            this.state.currentStep = newValue;
        }
    },

    methods: {
        /**
         * Navigate to a specific step
         * @param {number} index - Step index to navigate to
         * @returns {boolean} Whether navigation succeeded
         */
        goToStep(index) {
            const steps = this.props.steps || [];
            if (index < 0 || index >= steps.length) return false;

            // If linear, can only go forward one step at a time or back freely
            if (this.props.linear && index > this.state.currentStep + 1) {
                return false;
            }

            // If linear and going forward, validate current step
            if (this.props.linear && index > this.state.currentStep) {
                // Emit validation event, parent can call preventDefault
                const event = new CustomEvent('validate', {
                    detail: {
                        step: this.state.currentStep,
                        nextStep: index
                    },
                    cancelable: true
                });
                const allowed = this.dispatchEvent(event);
                if (!allowed) {
                    return false;
                }
            }

            const oldStep = this.state.currentStep;
            this.state.currentStep = index;
            this.state.validationError = '';

            // Mark previous step as completed when moving forward
            if (index > oldStep) {
                const newCompleted = new Set(this.state.completedSteps);
                newCompleted.add(oldStep);
                this.state.completedSteps = newCompleted;
            }

            this.emitChange(null, {
                step: index,
                previousStep: oldStep,
                direction: index > oldStep ? 'forward' : 'backward'
            });

            return true;
        },

        /**
         * Go to next step
         */
        nextStep() {
            const steps = this.props.steps || [];
            if (this.state.currentStep < steps.length - 1) {
                return this.goToStep(this.state.currentStep + 1);
            }
            return false;
        },

        /**
         * Go to previous step
         */
        prevStep() {
            if (this.state.currentStep > 0) {
                return this.goToStep(this.state.currentStep - 1);
            }
            return false;
        },

        /**
         * Mark current step as complete and emit complete event
         */
        complete() {
            // Emit validation for final step
            const event = new CustomEvent('validate', {
                detail: { step: this.state.currentStep, isComplete: true },
                cancelable: true
            });
            const allowed = this.dispatchEvent(event);
            if (!allowed) {
                return false;
            }

            // Mark all steps as completed
            const newCompleted = new Set();
            const steps = this.props.steps || [];
            for (let i = 0; i < steps.length; i++) {
                newCompleted.add(i);
            }
            this.state.completedSteps = newCompleted;

            // Emit complete event
            this.dispatchEvent(new CustomEvent('complete', {
                detail: { completedSteps: Array.from(this.state.completedSteps) }
            }));

            return true;
        },

        /**
         * Set validation error message
         */
        setError(message) {
            this.state.validationError = message;
        },

        /**
         * Clear validation error
         */
        clearError() {
            this.state.validationError = '';
        },

        /**
         * Check if a step can be clicked (for non-linear or completed steps)
         */
        canClickStep(index) {
            if (!this.props.linear) return true;
            // Can always go back
            if (index <= this.state.currentStep) return true;
            // Can go to next step only
            if (index === this.state.currentStep + 1) return true;
            return false;
        },

        /**
         * Handle step header click
         */
        handleStepClick(index) {
            if (this.canClickStep(index)) {
                this.goToStep(index);
            }
        },

        /**
         * Check if step is completed
         */
        isCompleted(index) {
            return this.state.completedSteps.has(index);
        },

        /**
         * Handle next/complete button click
         */
        handleNextClick() {
            const steps = this.props.steps || [];
            if (this.state.currentStep === steps.length - 1) {
                this.complete();
            } else {
                this.nextStep();
            }
        }
    },

    template() {
        const steps = this.props.steps || [];
        const isHorizontal = this.props.orientation === 'horizontal';
        const isLastStep = this.state.currentStep === steps.length - 1;

        // Get children for current step from slots
        const stepSlotName = `step-${this.state.currentStep}`;
        const stepContent = this.props.slots[stepSlotName] || this.props.children;

        return html`
            <div class="cl-stepper ${isHorizontal ? 'horizontal' : 'vertical'}">
                <!-- Step Headers -->
                <div class="stepper-header">
                    ${each(steps, (step, index) => html`
                        <div class="step-wrapper">
                            <div
                                class="step-item ${index === this.state.currentStep ? 'active' : ''} ${this.isCompleted(index) ? 'completed' : ''} ${this.canClickStep(index) ? 'clickable' : ''}"
                                on-click="${() => this.handleStepClick(index)}">
                                <div class="step-indicator">
                                    ${when(this.isCompleted(index) && index !== this.state.currentStep,
                                        html`<span class="check">✓</span>`,
                                        html`<span class="number">${step.icon || (index + 1)}</span>`
                                    )}
                                </div>
                                <div class="step-label">${step.label}</div>
                            </div>
                            ${when(index < steps.length - 1, html`
                                <div class="step-connector ${index < this.state.currentStep ? 'completed' : ''}"></div>
                            `)}
                        </div>
                    `)}
                </div>

                <!-- Step Content -->
                <div class="stepper-content">
                    ${stepContent}
                </div>

                <!-- Validation Error -->
                ${when(this.state.validationError, html`
                    <div class="stepper-error">
                        ${this.state.validationError}
                    </div>
                `)}

                <!-- Navigation Buttons -->
                ${when(this.props.showButtons, html`
                    <div class="stepper-actions">
                        <div class="left-actions">
                            ${when(this.state.currentStep > 0, html`
                                <button class="btn-secondary" on-click="prevStep">
                                    ← ${this.props.backLabel}
                                </button>
                            `)}
                        </div>
                        <div class="right-actions">
                            <button class="btn-primary" on-click="handleNextClick">
                                ${isLastStep ? this.props.completeLabel : this.props.nextLabel} ${when(!isLastStep, html`→`)}
                            </button>
                        </div>
                    </div>
                `)}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-stepper {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        /* Horizontal Stepper Header */
        .horizontal .stepper-header {
            display: flex;
            align-items: flex-start;
            justify-content: center;
        }

        .horizontal .step-wrapper {
            display: flex;
            align-items: center;
            flex: 1;
        }

        .horizontal .step-wrapper:last-child {
            flex: 0;
        }

        /* Vertical Stepper Header */
        .vertical .stepper-header {
            display: flex;
            flex-direction: column;
        }

        .vertical .step-wrapper {
            display: flex;
            align-items: flex-start;
        }

        .vertical .step-connector {
            width: 3px;
            height: 40px;
            margin-left: 19px;
            margin-top: 8px;
            margin-bottom: 8px;
        }

        /* Step Item */
        .step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 8px;
            cursor: default;
            transition: all 0.2s;
        }

        .step-item.clickable {
            cursor: pointer;
        }

        .step-item.clickable:hover .step-indicator {
            transform: scale(1.1);
        }

        /* Step Indicator */
        .step-indicator {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--disabled-bg, #e9ecef);
            color: var(--text-muted, #6c757d);
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s;
            border: 2px solid transparent;
        }

        .step-item.active .step-indicator {
            background: var(--primary-color, #007bff);
            color: white;
            border-color: var(--primary-color, #007bff);
            box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.2);
        }

        .step-item.completed .step-indicator {
            background: var(--success-color, #28a745);
            color: white;
            border-color: var(--success-color, #28a745);
        }

        .step-indicator .check {
            font-size: 16px;
        }

        /* Step Label */
        .step-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-muted, #6c757d);
            text-align: center;
            white-space: nowrap;
        }

        .step-item.active .step-label {
            color: var(--primary-color, #007bff);
            font-weight: 600;
        }

        .step-item.completed .step-label {
            color: var(--success-color, #28a745);
        }

        /* Step Connector */
        .step-connector {
            flex: 1;
            height: 3px;
            background: var(--disabled-bg, #e9ecef);
            margin: 0 8px;
            margin-top: 20px;
            transition: background 0.3s;
        }

        .step-connector.completed {
            background: var(--success-color, #28a745);
        }

        /* Content */
        .stepper-content {
            min-height: 200px;
        }

        /* Error */
        .stepper-error {
            padding: 12px 16px;
            background: var(--error-bg, #f8d7da);
            border: 1px solid var(--error-border, #f5c6cb);
            border-radius: 6px;
            color: var(--error-color, #dc3545);
            font-size: 14px;
        }

        /* Actions */
        .stepper-actions {
            display: flex;
            justify-content: space-between;
            padding-top: 16px;
            border-top: 1px solid var(--input-border, #dee2e6);
        }

        .left-actions, .right-actions {
            display: flex;
            gap: 8px;
        }

        /* Buttons */
        button {
            font-family: inherit;
            font-size: 14px;
            font-weight: 500;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .btn-primary {
            background: var(--primary-color, #007bff);
            color: white;
            border: none;
        }

        .btn-primary:hover {
            background: var(--primary-hover, #0056b3);
        }

        .btn-secondary {
            background: transparent;
            color: var(--text-color, #333);
            border: 1px solid var(--input-border, #ced4da);
        }

        .btn-secondary:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        /* Responsive */
        @media (max-width: 600px) {
            .horizontal .stepper-header {
                transform: scale(0.85);
                transform-origin: center;
            }

            .step-label {
                font-size: 11px;
            }

            .step-connector {
                margin: 0 4px;
            }

            .stepper-actions {
                flex-direction: column;
                gap: 12px;
            }

            .left-actions, .right-actions {
                justify-content: center;
            }
        }
    `
});
