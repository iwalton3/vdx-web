/**
 * Calendar - Date picker component
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-calendar', {
    props: {
        value: '',
        disabled: false,
        label: '',
        min: '',
        max: '',
        inline: false
    },

    data() {
        return {
            showPicker: false,
            viewDate: Date.now(), // Store as timestamp
            selectedDate: null  // Store as timestamp or null
        };
    },

    mounted() {
        this.syncValueToState();

        if (this.props.inline) {
            this.state.showPicker = true;
        }
    },

    propsChanged(prop, newValue, oldValue) {
        // Sync selected date when value prop changes (controlled mode)
        if (prop === 'value' && newValue !== oldValue) {
            this.syncValueToState();
        }
    },

    methods: {
        syncValueToState() {
            if (this.props.value && this.props.value !== '') {
                const date = new Date(this.props.value);
                if (!isNaN(date.getTime())) {
                    this.state.selectedDate = date.getTime();
                    this.state.viewDate = date.getTime();
                }
            } else {
                this.state.selectedDate = null;
            }
        },

        togglePicker() {
            if (!this.props.disabled && !this.props.inline) {
                this.state.showPicker = !this.state.showPicker;
            }
        },

        selectDate(date) {
            this.state.selectedDate = date.getTime();
            const dateStr = date.toISOString().split('T')[0];
            this.emitChange(null, dateStr);

            if (!this.props.inline) {
                this.state.showPicker = false;
            }
        },

        previousMonth() {
            const current = new Date(this.state.viewDate);
            current.setMonth(current.getMonth() - 1);
            this.state.viewDate = current.getTime();
        },

        nextMonth() {
            const current = new Date(this.state.viewDate);
            current.setMonth(current.getMonth() + 1);
            this.state.viewDate = current.getTime();
        },

        getDaysInMonth() {
            const viewDate = new Date(this.state.viewDate);
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();

            const days = [];

            // Add empty cells for days before month starts
            for (let i = 0; i < startingDayOfWeek; i++) {
                days.push(null);
            }

            // Add days of month
            for (let day = 1; day <= daysInMonth; day++) {
                days.push(new Date(year, month, day));
            }

            return days;
        },

        isSelectedDate(date) {
            if (!date || !this.state.selectedDate) return false;
            const selected = new Date(this.state.selectedDate);
            return date.toDateString() === selected.toDateString();
        },

        isToday(date) {
            if (!date) return false;
            const today = new Date();
            return date.toDateString() === today.toDateString();
        },

        formatDisplayDate() {
            if (!this.state.selectedDate) return '';
            const date = new Date(this.state.selectedDate);
            return date.toLocaleDateString();
        },

        getMonthYear() {
            const viewDate = new Date(this.state.viewDate);
            return viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    },

    template() {
        const days = this.getDaysInMonth();
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return html`
            <div class="cl-calendar-wrapper">
                ${when(this.props.label, html`
                    <label class="cl-label">${this.props.label}</label>
                `)}
                ${when(!this.props.inline, html`
                    <div class="calendar-input" on-click="togglePicker">
                        <span class="${this.state.selectedDate ? '' : 'placeholder'}">
                            ${this.state.selectedDate ? this.formatDisplayDate() : 'Select date'}
                        </span>
                        <span class="icon">📅</span>
                    </div>
                `)}
                ${when(this.state.showPicker, html`
                    <div class="calendar-picker ${this.props.inline ? 'inline' : ''}">
                        <div class="calendar-header">
                            <button class="nav-btn" on-click="previousMonth">‹</button>
                            <span class="month-year">${this.getMonthYear()}</span>
                            <button class="nav-btn" on-click="nextMonth">›</button>
                        </div>
                        <div class="calendar-grid">
                            ${each(weekDays, day => html`
                                <div class="weekday">${day}</div>
                            `)}
                            ${each(days, date => {
                                if (!date) {
                                    return html`<div class="day empty"></div>`;
                                }
                                const classes = [
                                    'day',
                                    this.isSelectedDate(date) ? 'selected' : '',
                                    this.isToday(date) ? 'today' : ''
                                ].filter(Boolean).join(' ');

                                return html`
                                    <div class="${classes}" on-click="${() => this.selectDate(date)}">
                                        ${date.getDate()}
                                    </div>
                                `;
                            })}
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

        .cl-calendar-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .cl-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
        }

        .calendar-input {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            background: var(--input-bg, #fff);
            cursor: pointer;
            transition: all 0.2s;
        }

        .calendar-input:hover {
            border-color: var(--primary-color, #007bff);
        }

        .placeholder {
            color: var(--text-muted, #6c757d);
        }

        .calendar-picker {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 4px;
            background: white;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 12px;
            z-index: 1000;
            min-width: 280px;
        }

        .calendar-picker.inline {
            position: static;
            margin-top: 0;
            box-shadow: none;
            z-index: auto;
        }

        .calendar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .month-year {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-color, #333);
        }

        .nav-btn {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            color: var(--text-color, #333);
        }

        .nav-btn:hover {
            background: var(--hover-bg, #f0f0f0);
        }

        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }

        .weekday {
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted, #6c757d);
            padding: 4px;
        }

        .day {
            text-align: center;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }

        .day:not(.empty):hover {
            background: var(--hover-bg, #f0f0f0);
        }

        .day.today {
            border: 1px solid var(--primary-color, #007bff);
        }

        .day.selected {
            background: var(--primary-color, #007bff);
            color: white;
        }

        .day.empty {
            cursor: default;
        }
    `
});
