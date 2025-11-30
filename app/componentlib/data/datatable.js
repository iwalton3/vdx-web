/**
 * DataTable - Advanced data table with sorting, filtering, and selection
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-datatable', {
    props: {
        value: [],
        columns: [],
        selectionmode: 'none', // 'none', 'single', 'multiple'
        selection: null,
        sortfield: '',
        sortorder: 1, // 1 for asc, -1 for desc
        paginator: false,
        rows: 10,
        currentpage: 0
    },

    data() {
        return {
            sortBy: '',
            sortDirection: 1
        };
    },

    mounted() {
        this.state.sortBy = this.props.sortfield;
        this.state.sortDirection = this.props.sortorder;
    },

    methods: {
        getSelectedRows() {
            const selection = this.props.selection;
            if (!selection) return [];
            return Array.isArray(selection) ? selection : [selection];
        },

        handleSort(column) {
            if (!column.sortable) return;

            if (this.state.sortBy === column.field) {
                this.state.sortDirection = this.state.sortDirection * -1;
            } else {
                this.state.sortBy = column.field;
                this.state.sortDirection = 1;
            }

            this.emitEvent('sort', {
                field: this.state.sortBy,
                order: this.state.sortDirection
            });
        },

        handleRowClick(row, index) {
            if (this.props.selectionmode === 'single') {
                this.emitEvent('row-select', { data: row, index });
                this.emitChange(null, row);
            } else if (this.props.selectionmode === 'multiple') {
                const selectedRows = this.getSelectedRows();
                const idx = selectedRows.indexOf(row);
                let newSelection;
                if (idx >= 0) {
                    newSelection = selectedRows.filter((_, i) => i !== idx);
                    this.emitEvent('row-unselect', { data: row, index });
                } else {
                    newSelection = [...selectedRows, row];
                    this.emitEvent('row-select', { data: row, index });
                }
                this.emitChange(null, newSelection);
            }
        },

        isRowSelected(row) {
            const selected = this.getSelectedRows();
            // Use both reference and value equality for robustness with reactive proxies
            if (selected.includes(row)) return true;

            // If row has an id property, compare by id
            if (row && typeof row === 'object' && 'id' in row) {
                return selected.some(s => s && typeof s === 'object' && s.id === row.id);
            }

            // Deep equality check as fallback
            return selected.some(s => JSON.stringify(s) === JSON.stringify(row));
        },

        getSortedData() {
            const value = this.props.value;
            let data = Array.isArray(value) ? [...value] : [];

            if (this.state.sortBy) {
                data.sort((a, b) => {
                    const aVal = a[this.state.sortBy];
                    const bVal = b[this.state.sortBy];

                    if (aVal < bVal) return -1 * this.state.sortDirection;
                    if (aVal > bVal) return 1 * this.state.sortDirection;
                    return 0;
                });
            }

            return data;
        },

        getPaginatedData() {
            const data = this.getSortedData();

            if (!this.props.paginator) {
                return data;
            }

            const start = this.props.currentpage * this.props.rows;
            const end = start + this.props.rows;
            return data.slice(start, end);
        },

        getCellValue(row, column) {
            if (column.body) {
                return column.body(row);
            }
            return row[column.field];
        },

        getSortIcon(column) {
            if (!column.sortable) return '';
            if (this.state.sortBy !== column.field) return '⇅';
            return this.state.sortDirection === 1 ? '↑' : '↓';
        },

        emitEvent(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
        }
    },

    template() {
        const data = this.getPaginatedData();
        const columns = this.props.columns || [];
        const hasSelection = this.props.selectionmode !== 'none';

        return html`
            <div class="cl-datatable">
                <div class="datatable-wrapper">
                    <table>
                        <thead>
                            <tr>
                                ${when(hasSelection && this.props.selectionmode === 'multiple', html`
                                    <th class="selection-col"></th>
                                `)}
                                ${each(columns, column => html`
                                    <th
                                        class="${column.sortable ? 'sortable' : ''}"
                                        on-click="${() => this.handleSort(column)}">
                                        <div class="header-content">
                                            <span>${column.header}</span>
                                            ${when(column.sortable, html`
                                                <span class="sort-icon">${this.getSortIcon(column)}</span>
                                            `)}
                                        </div>
                                    </th>
                                `)}
                            </tr>
                        </thead>
                        <tbody>
                            ${when(data.length === 0, html`
                                <tr>
                                    <td colspan="${columns.length + (hasSelection ? 1 : 0)}" class="empty-message">
                                        No data available
                                    </td>
                                </tr>
                            `)}
                            ${each(data, (row, index) => html`
                                <tr
                                    class="${this.isRowSelected(row) ? 'selected' : ''} ${hasSelection ? 'selectable' : ''}"
                                    on-click="${() => this.handleRowClick(row, index)}">
                                    ${when(hasSelection && this.props.selectionmode === 'multiple', html`
                                        <td class="selection-col">
                                            <input type="checkbox" checked="${this.isRowSelected(row)}" readonly>
                                        </td>
                                    `)}
                                    ${each(columns, column => html`
                                        <td>${this.getCellValue(row, column)}</td>
                                    `)}
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .cl-datatable {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            overflow: hidden;
        }

        .datatable-wrapper {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        thead {
            background: var(--table-header-bg, #f8f9fa);
        }

        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: var(--text-color, #333);
            border-bottom: 2px solid var(--input-border, #dee2e6);
            user-select: none;
        }

        th.sortable {
            cursor: pointer;
        }

        th.sortable:hover {
            background: var(--hover-bg, #e9ecef);
        }

        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .sort-icon {
            font-size: 12px;
            color: var(--text-muted, #6c757d);
        }

        tbody tr {
            border-bottom: 1px solid var(--input-border, #dee2e6);
        }

        tbody tr:last-child {
            border-bottom: none;
        }

        tbody tr.selectable {
            cursor: pointer;
        }

        tbody tr.selectable:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        tbody tr.selected {
            background: var(--selected-bg, #e7f3ff);
        }

        td {
            padding: 12px;
            color: var(--text-color, #333);
        }

        .selection-col {
            width: 40px;
            text-align: center;
        }

        .selection-col input[type="checkbox"] {
            pointer-events: none;
        }

        .empty-message {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted, #6c757d);
        }
    `
});
