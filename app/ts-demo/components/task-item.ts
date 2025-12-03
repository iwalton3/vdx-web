/**
 * Task Item Component - Displays a single task with actions
 */
import { defineComponent, html, when, each } from '../lib/framework.js';
import type { Task, TaskStatus } from '../stores/tasks.js';

// =============================================================================
// Component Types
// =============================================================================

interface TaskItemProps {
    task: Task | null;
}

interface TaskItemState {
    showActions: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'high': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'low': return '#22c55e';
        default: return '#6b7280';
    }
}

function getStatusLabel(status: TaskStatus): string {
    switch (status) {
        case 'todo': return 'To Do';
        case 'in-progress': return 'In Progress';
        case 'done': return 'Done';
        default: return status;
    }
}

// =============================================================================
// Component Definition
// =============================================================================

export default defineComponent('demo-task-item', {
    props: {
        task: null
    } as TaskItemProps,

    data(): TaskItemState {
        return {
            showActions: false
        };
    },

    methods: {
        handleClick(): void {
            // Dispatch click event - parent will handle navigation
            this.dispatchEvent(new CustomEvent('click', { bubbles: true }));
        },

        toggleActions(e: Event): void {
            e.stopPropagation();
            this.state.showActions = !this.state.showActions;
        },

        handleStatusChange(e: Event, status: TaskStatus): void {
            e.stopPropagation();
            this.state.showActions = false;

            this.dispatchEvent(new CustomEvent('status-change', {
                bubbles: true,
                detail: { status }
            }));
        },

        handleDelete(e: Event): void {
            e.stopPropagation();
            this.state.showActions = false;

            this.dispatchEvent(new CustomEvent('task-delete', {
                bubbles: true
            }));
        }
    },

    template() {
        const task = this.props.task;

        if (!task) {
            return html`<div class="task-item empty">No task data</div>`;
        }

        const statusOptions: TaskStatus[] = ['todo', 'in-progress', 'done'];

        return html`
            <div class="task-item ${task.status}" on-click="${() => this.handleClick()}">
                <div class="task-content">
                    <div class="task-header">
                        <span
                            class="priority-badge"
                            style="background-color: ${getPriorityColor(task.priority)}">
                            ${task.priority}
                        </span>
                        <span class="status-badge ${task.status}">
                            ${getStatusLabel(task.status)}
                        </span>
                    </div>
                    <h3 class="task-title">${task.title}</h3>
                    ${when(task.description, () => html`
                        <p class="task-description">${task.description}</p>
                    `)}
                    <div class="task-meta">
                        <span>Created: ${formatDate(task.createdAt)}</span>
                        ${when(task.completedAt, () => html`
                            <span>Completed: ${formatDate(task.completedAt)}</span>
                        `)}
                    </div>
                </div>

                <div class="task-actions">
                    <button
                        class="action-btn"
                        on-click="${(e: Event) => this.toggleActions(e)}">
                        ...
                    </button>

                    ${when(this.state.showActions, () => html`
                        <div class="actions-dropdown">
                            ${each(statusOptions, (status) => html`
                                <button
                                    class="dropdown-item ${task.status === status ? 'active' : ''}"
                                    on-click="${(e: Event) => this.handleStatusChange(e, status)}">
                                    Mark as ${getStatusLabel(status)}
                                </button>
                            `)}
                            <hr>
                            <button
                                class="dropdown-item danger"
                                on-click="${(e: Event) => this.handleDelete(e)}">
                                Delete Task
                            </button>
                        </div>
                    `)}
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .task-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            background: var(--card-bg, white);
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: all 0.2s;
            border-left: 4px solid transparent;
        }

        .task-item:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .task-item.done {
            opacity: 0.7;
            border-left-color: var(--success-color, #22c55e);
        }

        .task-item.in-progress {
            border-left-color: #8b5cf6;
        }

        .task-item.todo {
            border-left-color: #f59e0b;
        }

        .task-content {
            flex: 1;
            min-width: 0;
        }

        .task-header {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .priority-badge {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            padding: 2px 8px;
            border-radius: 4px;
            color: white;
        }

        .status-badge {
            font-size: 11px;
            font-weight: 500;
            padding: 2px 8px;
            border-radius: 4px;
            background: #e5e7eb;
            color: #374151;
        }

        .status-badge.done {
            background: #dcfce7;
            color: #166534;
        }

        .status-badge.in-progress {
            background: #f3e8ff;
            color: #6b21a8;
        }

        .task-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: var(--text-color);
        }

        .task-item.done .task-title {
            text-decoration: line-through;
        }

        .task-description {
            font-size: 14px;
            color: var(--text-muted);
            margin: 0 0 8px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .task-meta {
            font-size: 12px;
            color: var(--text-muted);
            display: flex;
            gap: 16px;
        }

        .task-actions {
            position: relative;
            z-index: 10;
        }

        .action-btn {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            color: var(--text-muted);
        }

        .action-btn:hover {
            background: var(--border-color, #e5e7eb);
        }

        .actions-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            background: var(--card-bg, white);
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 180px;
            z-index: 999999;
            overflow: hidden;
        }

        .dropdown-item {
            display: block;
            width: 100%;
            padding: 10px 16px;
            text-align: left;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-color);
        }

        .dropdown-item:hover {
            background: var(--border-color, #e5e7eb);
        }

        .dropdown-item.active {
            background: rgba(59, 130, 246, 0.1);
            color: var(--primary-color, #3b82f6);
        }

        .dropdown-item.danger {
            color: var(--danger-color, #ef4444);
        }

        .dropdown-item.danger:hover {
            background: rgba(239, 68, 68, 0.1);
        }

        .actions-dropdown hr {
            margin: 4px 0;
            border: none;
            border-top: 1px solid var(--border-color, #e5e7eb);
        }
    `
});
