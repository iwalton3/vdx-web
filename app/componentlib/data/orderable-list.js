/**
 * OrderableList - Drag and drop reorderable list
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-orderable-list', {
    props: {
        value: [],
        itemlabel: 'label',
        header: 'List Items'
    },

    data() {
        return {
            dragIndex: null,
            dropIndex: null
        };
    },

    methods: {
        handleDragStart(index, event) {
            this.state.dragIndex = index;
            event.dataTransfer.effectAllowed = 'move';
            event.target.classList.add('dragging');
        },

        handleDragEnd(event) {
            event.target.classList.remove('dragging');
            this.state.dragIndex = null;
            this.state.dropIndex = null;
        },

        handleDragOver(index, event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            this.state.dropIndex = index;
        },

        handleDragLeave() {
            this.state.dropIndex = null;
        },

        handleDrop(index, event) {
            event.preventDefault();

            const dragIndex = this.state.dragIndex;
            if (dragIndex === null || dragIndex === index) {
                this.state.dropIndex = null;
                return;
            }

            const items = [...(this.props.value || [])];
            const draggedItem = items[dragIndex];

            // Remove from old position
            items.splice(dragIndex, 1);

            // Insert at new position
            const newIndex = dragIndex < index ? index - 1 : index;
            items.splice(newIndex, 0, draggedItem);

            this.state.dropIndex = null;
            this.emitChange(null, items);
        },

        moveUp(index) {
            if (index === 0) return;

            const items = [...(this.props.value || [])];
            const temp = items[index];
            items[index] = items[index - 1];
            items[index - 1] = temp;

            this.emitChange(null, items);
        },

        moveDown(index) {
            const items = this.props.value || [];
            if (index >= items.length - 1) return;

            const newItems = [...items];
            const temp = newItems[index];
            newItems[index] = newItems[index + 1];
            newItems[index + 1] = temp;

            this.emitChange(null, newItems);
        },

        getItemLabel(item) {
            return typeof item === 'object' ? item[this.props.itemlabel] : item;
        },

        isDropTarget(index) {
            return this.state.dropIndex === index && this.state.dragIndex !== index;
        }
    },

    template() {
        const items = this.props.value || [];

        return html`
            <div class="cl-orderable-list">
                ${when(this.props.header, html`
                    <div class="list-header">${this.props.header}</div>
                `)}
                <div class="list-container">
                    ${when(items.length === 0, html`
                        <div class="empty-message">No items</div>
                    `)}
                    ${each(items, (item, index) => html`
                        <div
                            class="list-item ${this.isDropTarget(index) ? 'drop-target' : ''}"
                            draggable="true"
                            on-dragstart="${(e) => this.handleDragStart(index, e)}"
                            on-dragend="handleDragEnd"
                            on-dragover="${(e) => this.handleDragOver(index, e)}"
                            on-dragleave="handleDragLeave"
                            on-drop="${(e) => this.handleDrop(index, e)}">
                            <span class="drag-handle">⋮⋮</span>
                            <span class="item-label">${this.getItemLabel(item)}</span>
                            <div class="item-controls">
                                <button
                                    class="control-btn"
                                    disabled="${index === 0}"
                                    on-click="${() => this.moveUp(index)}"
                                    title="Move up">↑</button>
                                <button
                                    class="control-btn"
                                    disabled="${index >= items.length - 1}"
                                    on-click="${() => this.moveDown(index)}"
                                    title="Move down">↓</button>
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-orderable-list {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            overflow: hidden;
            background: white;
        }

        .list-header {
            padding: 12px;
            background: var(--table-header-bg, #f8f9fa);
            border-bottom: 1px solid var(--input-border, #dee2e6);
            font-weight: 600;
            font-size: 14px;
        }

        .list-container {
            max-height: 400px;
            overflow-y: auto;
        }

        .list-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-bottom: 1px solid var(--input-border, #dee2e6);
            cursor: move;
            transition: all 0.2s;
            background: white;
        }

        .list-item:last-child {
            border-bottom: none;
        }

        .list-item:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        .list-item.dragging {
            opacity: 0.5;
        }

        .list-item.drop-target {
            border-top: 3px solid var(--primary-color, #007bff);
        }

        .drag-handle {
            color: var(--text-muted, #6c757d);
            font-size: 16px;
            cursor: move;
            user-select: none;
        }

        .item-label {
            flex: 1;
            font-size: 14px;
            color: var(--text-color, #333);
        }

        .item-controls {
            display: flex;
            gap: 4px;
        }

        .control-btn {
            width: 28px;
            height: 28px;
            padding: 0;
            border: 1px solid var(--input-border, #dee2e6);
            background: white;
            color: var(--text-color, #333);
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            transition: all 0.2s;
        }

        .control-btn:hover:not(:disabled) {
            background: var(--hover-bg, #f8f9fa);
            border-color: var(--primary-color, #007bff);
        }

        .control-btn:disabled {
            cursor: not-allowed;
            opacity: 0.3;
        }

        .empty-message {
            padding: 20px;
            text-align: center;
            color: var(--text-muted, #6c757d);
        }
    `
});
