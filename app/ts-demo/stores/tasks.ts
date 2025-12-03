/**
 * Task Store - Demonstrates typed store with VDX
 */
import { createStore } from '../lib/framework.js';
import type { Store } from '../lib/framework.js';

// =============================================================================
// Types
// =============================================================================

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    createdAt: Date;
    completedAt: Date | null;
}

export interface TasksState {
    tasks: Task[];
    filter: TaskStatus | 'all';
}

// =============================================================================
// Store Implementation
// =============================================================================

const STORAGE_KEY = 'vdx-ts-demo-tasks';

function generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Serialize tasks to JSON (convert Dates to ISO strings)
function serializeTasks(tasks: Task[]): string {
    return JSON.stringify(tasks.map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        completedAt: task.completedAt?.toISOString() ?? null
    })));
}

// Deserialize tasks from JSON (convert ISO strings back to Dates)
function deserializeTasks(json: string): Task[] {
    const parsed = JSON.parse(json);
    return parsed.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : null
    }));
}

// Load tasks from localStorage or use defaults
function loadInitialState(): TasksState {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const tasks = deserializeTasks(saved);
            if (tasks.length > 0) {
                return { tasks, filter: 'all' };
            }
        }
    } catch (e) {
        console.warn('Failed to load tasks from localStorage:', e);
    }

    // Default tasks for first-time users
    return {
        tasks: [
            {
                id: generateId(),
                title: 'Learn VDX Framework',
                description: 'Understand the core concepts: components, reactivity, routing, and stores.',
                priority: 'high',
                status: 'in-progress',
                createdAt: new Date(),
                completedAt: null
            },
            {
                id: generateId(),
                title: 'Add TypeScript Support',
                description: 'Create .d.ts files for type checking and better IDE support.',
                priority: 'medium',
                status: 'done',
                createdAt: new Date(Date.now() - 86400000),
                completedAt: new Date()
            },
            {
                id: generateId(),
                title: 'Build Demo App',
                description: 'Create a task manager to demonstrate TypeScript integration.',
                priority: 'high',
                status: 'todo',
                createdAt: new Date(),
                completedAt: null
            }
        ],
        filter: 'all'
    };
}

// Save tasks to localStorage
function saveTasks(tasks: Task[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, serializeTasks(tasks));
    } catch (e) {
        console.warn('Failed to save tasks to localStorage:', e);
    }
}

// Create the store with proper typing
const store: Store<TasksState> = createStore(loadInitialState());

// Subscribe to save changes
store.subscribe(state => {
    saveTasks(state.tasks);
});

// =============================================================================
// Store Actions (methods that modify state)
// =============================================================================

export const taskActions = {
    /**
     * Add a new task
     */
    addTask(title: string, description: string, priority: TaskPriority = 'medium'): Task {
        const task: Task = {
            id: generateId(),
            title,
            description,
            priority,
            status: 'todo',
            createdAt: new Date(),
            completedAt: null
        };

        store.state.tasks = [...store.state.tasks, task];
        return task;
    },

    /**
     * Update a task's status
     */
    updateTaskStatus(taskId: string, status: TaskStatus): void {
        const tasks = store.state.tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    status,
                    completedAt: status === 'done' ? new Date() : null
                };
            }
            return task;
        });
        store.state.tasks = tasks;
    },

    /**
     * Update a task
     */
    updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
        const tasks = store.state.tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, ...updates };
            }
            return task;
        });
        store.state.tasks = tasks;
    },

    /**
     * Delete a task
     */
    deleteTask(taskId: string): void {
        store.state.tasks = store.state.tasks.filter(task => task.id !== taskId);
    },

    /**
     * Set the filter
     */
    setFilter(filter: TaskStatus | 'all'): void {
        store.state.filter = filter;
    },

    /**
     * Get filtered tasks
     */
    getFilteredTasks(): Task[] {
        const { tasks, filter } = store.state;
        if (filter === 'all') {
            return tasks;
        }
        return tasks.filter(task => task.status === filter);
    },

    /**
     * Get a task by ID
     */
    getTask(taskId: string): Task | undefined {
        return store.state.tasks.find(task => task.id === taskId);
    },

    /**
     * Get task counts by status
     */
    getTaskCounts(): Record<TaskStatus | 'all', number> {
        const tasks = store.state.tasks;
        return {
            all: tasks.length,
            todo: tasks.filter(t => t.status === 'todo').length,
            'in-progress': tasks.filter(t => t.status === 'in-progress').length,
            done: tasks.filter(t => t.status === 'done').length
        };
    }
};

export default store;
