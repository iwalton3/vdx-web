/**
 * Task Detail Page - View and edit a single task
 */
import { defineComponent, html, when } from '../lib/framework.js';
import { getRouter } from '../lib/router.js';
import tasksStore, { taskActions } from '../stores/tasks.js';
import type { Task, TasksState, TaskStatus, TaskPriority } from '../stores/tasks.js';

// =============================================================================
// Component Types
// =============================================================================

interface TaskDetailProps {
    params: { id?: string };
    query: Record<string, string>;
}

interface TaskDetailState {
    isEditing: boolean;
    editTitle: string;
    editDescription: string;
    editPriority: TaskPriority;
    editStatus: TaskStatus;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =============================================================================
// Component Definition
// =============================================================================

// Define stores - TypeScript infers the unwrapped types automatically
const stores = { tasks: tasksStore };

export default defineComponent('demo-task-detail', {
    props: {
        params: {},
        query: {}
    } as TaskDetailProps,

    stores,

    data(): TaskDetailState {
        return {
            isEditing: false,
            editTitle: '',
            editDescription: '',
            editPriority: 'medium',
            editStatus: 'todo'
        };
    },

    methods: {
        getTask(): Task | undefined {
            const taskId = this.props.params.id;
            if (!taskId) return undefined;
            return taskActions.getTask(taskId);
        },

        goBack(): void {
            const router = getRouter();
            if (router) {
                router.navigate('/tasks/');
            }
        },

        startEditing(): void {
            const task = this.getTask();
            if (!task) return;

            this.state.isEditing = true;
            this.state.editTitle = task.title;
            this.state.editDescription = task.description;
            this.state.editPriority = task.priority;
            this.state.editStatus = task.status;
        },

        cancelEditing(): void {
            this.state.isEditing = false;
        },

        handleTitleInput(e: Event): void {
            this.state.editTitle = (e.target as HTMLInputElement).value;
        },

        handleDescriptionInput(e: Event): void {
            this.state.editDescription = (e.target as HTMLTextAreaElement).value;
        },

        handlePriorityChange(e: Event): void {
            this.state.editPriority = (e.target as HTMLSelectElement).value as TaskPriority;
        },

        handleStatusChange(e: Event): void {
            this.state.editStatus = (e.target as HTMLSelectElement).value as TaskStatus;
        },

        saveChanges(): void {
            const task = this.getTask();
            if (!task) return;

            taskActions.updateTask(task.id, {
                title: this.state.editTitle,
                description: this.state.editDescription,
                priority: this.state.editPriority,
                status: this.state.editStatus,
                completedAt: this.state.editStatus === 'done' ? new Date() : null
            });

            this.state.isEditing = false;
        },

        deleteTask(): void {
            const task = this.getTask();
            if (!task) return;

            if (confirm('Are you sure you want to delete this task? This cannot be undone.')) {
                taskActions.deleteTask(task.id);
                this.goBack();
            }
        }
    },

    template() {
        const task = this.getTask();

        if (!task) {
            return html`
                <div class="not-found">
                    <h2>Task Not Found</h2>
                    <p>The task you're looking for doesn't exist.</p>
                    <button class="btn" on-click="${() => this.goBack()}">
                        Back to Tasks
                    </button>
                </div>
            `;
        }

        const priorityOptions: TaskPriority[] = ['low', 'medium', 'high'];
        const statusOptions: TaskStatus[] = ['todo', 'in-progress', 'done'];

        return html`
            <div class="task-detail">
                <div class="detail-header">
                    <button class="back-btn" on-click="${() => this.goBack()}">
                        ← Back
                    </button>
                    <div class="header-actions">
                        ${when(!this.state.isEditing,
                            () => html`
                                <button class="btn edit-btn" on-click="${() => this.startEditing()}">
                                    Edit
                                </button>
                            `,
                            () => html`
                                <button class="btn cancel-btn" on-click="${() => this.cancelEditing()}">
                                    Cancel
                                </button>
                                <button class="btn save-btn" on-click="${() => this.saveChanges()}">
                                    Save
                                </button>
                            `
                        )}
                        <button class="btn delete-btn" on-click="${() => this.deleteTask()}">
                            Delete
                        </button>
                    </div>
                </div>

                ${when(this.state.isEditing,
                    () => html`
                        <div class="edit-form">
                            <div class="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value="${this.state.editTitle}"
                                    on-input="${(e: Event) => this.handleTitleInput(e)}">
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea
                                    rows="4"
                                    on-input="${(e: Event) => this.handleDescriptionInput(e)}">${this.state.editDescription}</textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Priority</label>
                                    <select
                                        value="${this.state.editPriority}"
                                        on-change="${(e: Event) => this.handlePriorityChange(e)}">
                                        <option value="low">low</option>
                                        <option value="medium">medium</option>
                                        <option value="high">high</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Status</label>
                                    <select
                                        value="${this.state.editStatus}"
                                        on-change="${(e: Event) => this.handleStatusChange(e)}">
                                        <option value="todo">todo</option>
                                        <option value="in-progress">in-progress</option>
                                        <option value="done">done</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `,
                    () => html`
                        <div class="task-view">
                            <div class="badges">
                                <span class="badge priority ${task.priority}">${task.priority}</span>
                                <span class="badge status ${task.status}">${task.status}</span>
                            </div>

                            <h1 class="task-title ${task.status === 'done' ? 'completed' : ''}">
                                ${task.title}
                            </h1>

                            ${when(task.description, () => html`
                                <div class="task-description">
                                    <h3>Description</h3>
                                    <p>${task.description}</p>
                                </div>
                            `)}

                            <div class="task-meta">
                                <div class="meta-item">
                                    <span class="meta-label">Created</span>
                                    <span class="meta-value">${formatDate(task.createdAt)}</span>
                                </div>
                                ${when(task.completedAt, () => html`
                                    <div class="meta-item">
                                        <span class="meta-label">Completed</span>
                                        <span class="meta-value">${formatDate(task.completedAt)}</span>
                                    </div>
                                `)}
                                <div class="meta-item">
                                    <span class="meta-label">Task ID</span>
                                    <span class="meta-value mono">${task.id}</span>
                                </div>
                            </div>
                        </div>
                    `
                )}
            </div>
        `;
    },

    styles: /*css*/`
        .task-detail {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .not-found {
            text-align: center;
            padding: 60px 20px;
            background: var(--card-bg, white);
            border-radius: 8px;
        }

        .not-found h2 {
            margin-bottom: 8px;
        }

        .not-found p {
            color: var(--text-muted);
            margin-bottom: 24px;
        }

        .detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .back-btn {
            background: none;
            border: none;
            color: var(--primary-color, #3b82f6);
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .back-btn:hover {
            text-decoration: underline;
        }

        .header-actions {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s;
        }

        .edit-btn {
            background: var(--primary-color, #3b82f6);
            color: white;
        }

        .edit-btn:hover {
            background: #2563eb;
        }

        .save-btn {
            background: var(--success-color, #22c55e);
            color: white;
        }

        .save-btn:hover {
            background: #16a34a;
        }

        .cancel-btn {
            background: #e5e7eb;
            color: var(--text-color);
        }

        .cancel-btn:hover {
            background: #d1d5db;
        }

        .delete-btn {
            background: var(--danger-color, #ef4444);
            color: white;
        }

        .delete-btn:hover {
            background: #dc2626;
        }

        .task-view {
            background: var(--card-bg, white);
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .badges {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .badge {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            padding: 4px 12px;
            border-radius: 4px;
        }

        .badge.priority.high { background: #fecaca; color: #991b1b; }
        .badge.priority.medium { background: #fed7aa; color: #9a3412; }
        .badge.priority.low { background: #bbf7d0; color: #166534; }

        .badge.status.todo { background: #fef3c7; color: #92400e; }
        .badge.status.in-progress { background: #e9d5ff; color: #6b21a8; }
        .badge.status.done { background: #dcfce7; color: #166534; }

        .task-title {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 24px 0;
        }

        .task-title.completed {
            text-decoration: line-through;
            color: var(--text-muted);
        }

        .task-description {
            margin-bottom: 24px;
        }

        .task-description h3 {
            font-size: 14px;
            color: var(--text-muted);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .task-description p {
            font-size: 16px;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .task-meta {
            border-top: 1px solid var(--border-color, #e5e7eb);
            padding-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .meta-item {
            display: flex;
            gap: 16px;
        }

        .meta-label {
            font-size: 14px;
            color: var(--text-muted);
            min-width: 100px;
        }

        .meta-value {
            font-size: 14px;
        }

        .meta-value.mono {
            font-family: monospace;
            font-size: 12px;
            background: #f3f4f6;
            padding: 2px 8px;
            border-radius: 4px;
        }

        .edit-form {
            background: var(--card-bg, white);
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-group label {
            font-weight: 500;
            font-size: 14px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
            padding: 10px 12px;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px;
            font-family: inherit;
            font-size: 14px;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--primary-color, #3b82f6);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
    `
});
