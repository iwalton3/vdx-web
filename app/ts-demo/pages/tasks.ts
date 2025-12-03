/**
 * Tasks Page - Task list with filtering and CRUD operations
 */
import { defineComponent, html, when, each } from '../lib/framework.js';
import { getRouter } from '../lib/router.js';
import tasksStore, { taskActions } from '../stores/tasks.js';
import type { Task, TasksState as TasksStoreState, TaskStatus, TaskPriority } from '../stores/tasks.js';

// Import task item component
import '../components/task-item.js';

// =============================================================================
// Component Types
// =============================================================================

interface TasksProps {
    // Router passes these automatically
    params: Record<string, string>;
    query: Record<string, string>;
}

interface TasksPageState {
    showAddForm: boolean;
    newTitle: string;
    newDescription: string;
    newPriority: TaskPriority;
}

// =============================================================================
// Component Definition
// =============================================================================

// Define stores - TypeScript infers the unwrapped types automatically
const stores = { tasks: tasksStore };

export default defineComponent('demo-tasks', {
    props: {
        params: {},
        query: {}
    } as TasksProps,

    stores,

    data(): TasksPageState {
        return {
            showAddForm: false,
            newTitle: '',
            newDescription: '',
            newPriority: 'medium'
        };
    },

    methods: {
        // Type-safe event handlers using function references

        toggleAddForm(): void {
            this.state.showAddForm = !this.state.showAddForm;
            if (this.state.showAddForm) {
                this.state.newTitle = '';
                this.state.newDescription = '';
                this.state.newPriority = 'medium';
            }
        },

        handleTitleInput(e: Event): void {
            const target = e.target as HTMLInputElement;
            this.state.newTitle = target.value;
        },

        handleDescriptionInput(e: Event): void {
            const target = e.target as HTMLTextAreaElement;
            this.state.newDescription = target.value;
        },

        handlePriorityChange(e: Event): void {
            const target = e.target as HTMLSelectElement;
            this.state.newPriority = target.value as TaskPriority;
        },

        handleAddTask(e: Event): void {
            e.preventDefault();

            if (!this.state.newTitle.trim()) {
                return;
            }

            taskActions.addTask(
                this.state.newTitle.trim(),
                this.state.newDescription.trim(),
                this.state.newPriority
            );

            this.state.showAddForm = false;
            this.state.newTitle = '';
            this.state.newDescription = '';
        },

        handleFilterChange(filter: TaskStatus | 'all'): void {
            taskActions.setFilter(filter);
        },

        handleTaskClick(task: Task): void {
            const router = getRouter();
            if (router) {
                router.navigate(`/tasks/${task.id}/`);
            }
        },

        handleStatusChange(taskId: string, e: CustomEvent): void {
            taskActions.updateTaskStatus(taskId, e.detail.status);
        },

        handleDeleteTask(taskId: string): void {
            if (confirm('Are you sure you want to delete this task?')) {
                taskActions.deleteTask(taskId);
            }
        }
    },

    template() {
        const tasks = taskActions.getFilteredTasks();
        const counts = taskActions.getTaskCounts();
        const currentFilter = this.stores.tasks.filter;

        const filters: Array<{ value: TaskStatus | 'all'; label: string }> = [
            { value: 'all', label: `All (${counts.all})` },
            { value: 'todo', label: `To Do (${counts.todo})` },
            { value: 'in-progress', label: `In Progress (${counts['in-progress']})` },
            { value: 'done', label: `Done (${counts.done})` }
        ];

        return html`
            <div class="tasks-page">
                <div class="tasks-header">
                    <h2>Tasks</h2>
                    <button
                        class="add-btn"
                        on-click="${() => this.toggleAddForm()}">
                        ${this.state.showAddForm ? 'Cancel' : '+ Add Task'}
                    </button>
                </div>

                ${when(this.state.showAddForm, () => html`
                    <form class="add-form" on-submit-prevent="${(e: Event) => this.handleAddTask(e)}">
                        <div class="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value="${this.state.newTitle}"
                                on-input="${(e: Event) => this.handleTitleInput(e)}"
                                placeholder="What needs to be done?"
                                required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea
                                value="${this.state.newDescription}"
                                on-input="${(e: Event) => this.handleDescriptionInput(e)}"
                                placeholder="Add more details..."
                                rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select
                                value="${this.state.newPriority}"
                                on-change="${(e: Event) => this.handlePriorityChange(e)}">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <button type="submit" class="submit-btn">Add Task</button>
                    </form>
                `)}

                <div class="filter-bar">
                    ${each(filters, (filter) => html`
                        <button
                            class="filter-btn ${currentFilter === filter.value ? 'active' : ''}"
                            on-click="${() => this.handleFilterChange(filter.value)}">
                            ${filter.label}
                        </button>
                    `)}
                </div>

                <div class="tasks-list">
                    ${when(tasks.length === 0,
                        () => html`
                            <div class="empty-state">
                                <p>No tasks found. Create one to get started!</p>
                            </div>
                        `,
                        () => each(tasks, (task) => html`
                            <demo-task-item
                                task="${task}"
                                on-click="${() => this.handleTaskClick(task)}"
                                on-status-change="${(e: CustomEvent) => this.handleStatusChange(task.id, e)}"
                                on-task-delete="${() => this.handleDeleteTask(task.id)}">
                            </demo-task-item>
                        `, (task) => task.id)
                    )}
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .tasks-page {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .tasks-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .tasks-header h2 {
            margin: 0;
        }

        .add-btn {
            padding: 8px 16px;
            background: var(--primary-color, #3b82f6);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
        }

        .add-btn:hover {
            background: #2563eb;
        }

        .add-form {
            background: var(--card-bg, white);
            padding: 20px;
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

        .submit-btn {
            padding: 10px 20px;
            background: var(--success-color, #22c55e);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            align-self: flex-start;
        }

        .submit-btn:hover {
            background: #16a34a;
        }

        .filter-bar {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 8px 16px;
            background: var(--card-bg, white);
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }

        .filter-btn:hover {
            border-color: var(--primary-color, #3b82f6);
        }

        .filter-btn.active {
            background: var(--primary-color, #3b82f6);
            border-color: var(--primary-color, #3b82f6);
            color: white;
        }

        .tasks-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
            background: var(--card-bg, white);
            border-radius: 8px;
        }
    `
});
