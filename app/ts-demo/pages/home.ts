/**
 * Home Page - Landing page with overview
 */
import { defineComponent, html, each } from '../lib/framework.js';
import tasksStore, { taskActions } from '../stores/tasks.js';

// =============================================================================
// Component Definition
// =============================================================================

// Define stores - TypeScript infers the unwrapped types automatically
const stores = { tasks: tasksStore };

export default defineComponent('demo-home', {
    stores,

    template() {
        const counts = taskActions.getTaskCounts();

        const stats = [
            { label: 'Total Tasks', value: counts.all, color: '#3b82f6' },
            { label: 'To Do', value: counts.todo, color: '#f59e0b' },
            { label: 'In Progress', value: counts['in-progress'], color: '#8b5cf6' },
            { label: 'Completed', value: counts.done, color: '#22c55e' }
        ];

        return html`
            <div class="home-page">
                <section class="hero">
                    <h2>Welcome to Task Manager</h2>
                    <p>A demo application showcasing VDX framework with TypeScript support.</p>
                </section>

                <section class="stats-grid">
                    ${each(stats, (stat) => html`
                        <div class="stat-card" style="border-left-color: ${stat.color}">
                            <div class="stat-value">${stat.value}</div>
                            <div class="stat-label">${stat.label}</div>
                        </div>
                    `)}
                </section>

                <section class="features">
                    <h3>TypeScript Features Demonstrated</h3>
                    <ul>
                        <li><strong>Typed Components</strong> - Props, state, and stores are fully typed</li>
                        <li><strong>Typed Router</strong> - Route parameters and navigation are type-safe</li>
                        <li><strong>Typed Stores</strong> - Centralized state management with type inference</li>
                        <li><strong>Function References</strong> - Type-checked event handlers</li>
                    </ul>
                </section>

                <div class="cta">
                    <router-link to="/tasks/">View All Tasks</router-link>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .home-page {
            display: flex;
            flex-direction: column;
            gap: 32px;
        }

        .hero {
            text-align: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 12px;
            color: white;
        }

        .hero h2 {
            font-size: 28px;
            margin-bottom: 8px;
        }

        .hero p {
            opacity: 0.9;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
        }

        .stat-card {
            background: var(--card-bg, white);
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .stat-value {
            font-size: 36px;
            font-weight: 700;
            color: var(--text-color);
        }

        .stat-label {
            color: var(--text-muted);
            font-size: 14px;
            margin-top: 4px;
        }

        .features {
            background: var(--card-bg, white);
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .features h3 {
            margin-bottom: 16px;
            color: var(--text-color);
        }

        .features ul {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .features li {
            padding-left: 24px;
            position: relative;
        }

        .features li::before {
            content: "\\2713";
            position: absolute;
            left: 0;
            color: var(--success-color, #22c55e);
            font-weight: bold;
        }

        .cta {
            text-align: center;
        }

        .cta a {
            display: inline-block;
            padding: 12px 32px;
            background: var(--primary-color, #3b82f6);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.2s;
        }

        .cta a:hover {
            background: #2563eb;
        }
    `
});
