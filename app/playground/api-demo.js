/**
 * API Demo - Demonstrates awaitThen for async data loading
 *
 * Shows the simplified pattern: just pass a promise to awaitThen()
 * No async state management needed - x-await-then handles it all!
 */
import { defineComponent, html, each, awaitThen } from '../lib/framework.js';

// Simulated API calls with delays
function fetchUser(id) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (id === 'error') {
                reject(new Error('User not found'));
            } else {
                resolve({
                    id,
                    name: `User ${id}`,
                    email: `user${id}@example.com`,
                    role: id % 2 === 0 ? 'Admin' : 'User'
                });
            }
        }, 1500);
    });
}

function fetchPosts() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([
                { id: 1, title: 'Getting Started with Suspense', author: 'Alice' },
                { id: 2, title: 'Async Loading Patterns', author: 'Bob' },
                { id: 3, title: 'Error Handling Best Practices', author: 'Charlie' }
            ]);
        }, 2000);
    });
}

export default defineComponent('api-demo', {
    data() {
        return {
            // Store promises in state to control when they're created
            // This prevents re-fetching on every parent re-render
            userPromise: fetchUser(1),
            postsPromise: fetchPosts()
        };
    },

    methods: {
        loadUser(id) {
            // Create new promise - x-await-then will detect the change and re-render
            this.state.userPromise = fetchUser(id);
        },

        loadError() {
            this.state.userPromise = fetchUser('error');
        },

        reloadPosts() {
            this.state.postsPromise = fetchPosts();
        }
    },

    template() {
        return html`
            <h2>Async Data Loading with awaitThen</h2>
            <p>Demonstrates loading states, data display, and error handling.</p>

            <h3>User Profile</h3>
            <div class="controls">
                <button on-click="${() => this.loadUser(1)}">Load User 1</button>
                <button on-click="${() => this.loadUser(2)}">Load User 2</button>
                <button on-click="${() => this.loadUser(3)}">Load User 3</button>
                <button class="danger" on-click="loadError">Trigger Error</button>
            </div>

            <div class="user-card">
                ${awaitThen(
                    this.state.userPromise,
                    user => html`
                        <div class="user-info">
                            <h4>${user.name}</h4>
                            <p>Email: ${user.email}</p>
                            <p>Role: <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span></p>
                        </div>
                    `,
                    html`
                        <div class="loading">
                            <span class="spinner"></span>
                            Loading user...
                        </div>
                    `,
                    error => html`
                        <div class="error">
                            Error: ${error.message}
                        </div>
                    `
                )}
            </div>

            <h3>Posts</h3>
            <div class="controls">
                <button on-click="reloadPosts">Reload Posts</button>
            </div>

            ${awaitThen(
                this.state.postsPromise,
                posts => html`
                    <ul class="post-list">
                        ${each(posts, post => html`
                            <li>
                                <strong>${post.title}</strong>
                                <span class="author">by ${post.author}</span>
                            </li>
                        `)}
                    </ul>
                `,
                html`
                    <div class="loading">
                        <span class="spinner"></span>
                        Loading posts...
                    </div>
                `
            )}
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        h2 {
            margin-top: 0;
            color: var(--heading-color, #333);
            font-size: 1.3em;
            border-bottom: 2px solid var(--primary-color, #0066cc);
            padding-bottom: 8px;
        }

        h3 {
            font-size: 1.1em;
            margin-top: 20px;
            color: var(--text-color, #555);
        }

        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin: 15px 0;
        }

        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: var(--primary-color, #0066cc);
            color: white;
            cursor: pointer;
            font-size: 14px;
        }

        button:hover {
            opacity: 0.9;
        }

        button.danger {
            background: #dc3545;
        }

        .user-card {
            background: var(--card-bg, #f8f9fa);
            border-radius: 8px;
            padding: 16px;
            margin: 15px 0;
            min-height: 80px;
        }

        .user-info h4 {
            margin: 0 0 8px 0;
            color: var(--primary-color, #0066cc);
        }

        .user-info p {
            margin: 4px 0;
        }

        .role-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: bold;
        }

        .role-badge.admin {
            background: #d4edda;
            color: #155724;
        }

        .role-badge.user {
            background: #cce5ff;
            color: #004085;
        }

        .loading {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-muted, #666);
            padding: 20px 0;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #e9ecef;
            border-top-color: var(--primary-color, #0066cc);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 12px 16px;
            border-radius: 4px;
            border: 1px solid #f5c6cb;
        }

        .post-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .post-list li {
            padding: 12px;
            background: var(--list-item-bg, #f8f9fa);
            margin: 8px 0;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .author {
            color: var(--text-muted, #666);
            font-size: 0.9em;
        }
    `
});
