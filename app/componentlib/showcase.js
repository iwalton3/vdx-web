/**
 * Component Showcase
 */
import { defineComponent, html, when, each, raw } from '../lib/framework.js';

// Import all example components (which also import the library components)
import './example-components.js';

import { componentExamples } from './examples.js';

export default defineComponent('component-showcase', {
    data() {
        return {
            selectedComponent: null,
            selectedTab: 'demo',
            searchQuery: '',
            categories: [
                { name: 'Form', key: 'form' },
                { name: 'Selection', key: 'selection' },
                { name: 'Data', key: 'data' },
                { name: 'Panel', key: 'panel' },
                { name: 'Overlay', key: 'overlay' },
                { name: 'Button', key: 'button' },
                { name: 'Misc', key: 'misc' }
            ]
        };
    },

    mounted() {
        // Select first component by default
        const firstComponent = Object.values(componentExamples)[0];
        if (firstComponent) {
            this.state.selectedComponent = firstComponent;
        }
    },

    methods: {
        selectComponent(component) {
            this.state.selectedComponent = component;
            this.state.selectedTab = 'demo';
        },

        selectTab(tab) {
            this.state.selectedTab = tab;
        },

        getComponentsByCategory(category) {
            if (!componentExamples) return [];
            return Object.values(componentExamples).filter(c => c && c.category === category);
        },

        getFilteredComponents() {
            if (!componentExamples) return {};
            const query = this.state.searchQuery.toLowerCase();
            if (!query) return componentExamples;

            const filtered = {};
            Object.entries(componentExamples).forEach(([key, comp]) => {
                if (comp && comp.name && (comp.name.toLowerCase().includes(query) ||
                    comp.description.toLowerCase().includes(query))) {
                    filtered[key] = comp;
                }
            });
            return filtered;
        },

        handleSearch(e) {
            this.state.searchQuery = e.target.value;
        }
    },

    template() {
        const current = this.state.selectedComponent;
        const filteredComponents = this.getFilteredComponents();

        return html`
            <div class="showcase-container">
                <div class="sidebar">
                    <div class="sidebar-header">
                        <h1>Component Library</h1>
                        <p>Professional UI components for the framework</p>
                    </div>

                    <div class="search-box">
                        <input
                            type="text"
                            placeholder="Search components..."
                            value="${this.state.searchQuery}"
                            on-input="handleSearch">
                    </div>

                    <div class="components-list">
                        ${each(this.state.categories, category => {
                            const components = this.getComponentsByCategory(category.key);
                            const visible = components.some(c => filteredComponents[c.id]);

                            return when(visible, html`
                                <div class="category">
                                    <div class="category-header">${category.name}</div>
                                    ${each(components, component => {
                                        return when(filteredComponents[component.id], html`
                                            <div
                                                class="component-item ${current && current.id === component.id ? 'active' : ''}"
                                                on-click="${() => this.selectComponent(component)}">
                                                ${component.name}
                                            </div>
                                        `);
                                    })}
                                </div>
                            `);
                        })}
                    </div>
                </div>

                <div class="main-content">
                    ${when(current, html`
                        <div class="component-view">
                            <div class="component-header">
                                <h2>${current ? current.name : ''}</h2>
                                <p>${current ? current.description : ''}</p>
                            </div>

                            <div class="tabs">
                                <div
                                    class="tab ${this.state.selectedTab === 'demo' ? 'active' : ''}"
                                    on-click="${() => this.selectTab('demo')}">
                                    Demo
                                </div>
                                <div
                                    class="tab ${this.state.selectedTab === 'source' ? 'active' : ''}"
                                    on-click="${() => this.selectTab('source')}">
                                    Source Code
                                </div>
                            </div>

                            <div class="tab-content">
                                ${when(this.state.selectedTab === 'demo', html`
                                    <div class="demo-section">
                                        ${current ? raw(current.demo) : ''}
                                    </div>
                                `)}

                                ${when(this.state.selectedTab === 'source', html`
                                    <div class="source-section">
                                        <pre><code>${current ? current.source : ''}</code></pre>
                                    </div>
                                `)}
                            </div>
                        </div>
                    `, html`
                        <div class="empty-state">
                            <h2>Welcome to Component Library</h2>
                            <p>Select a component from the sidebar to view examples</p>
                        </div>
                    `)}
                </div>
            </div>
        `;
    },

    styles: `
        .showcase-container {
            display: flex;
            height: 100vh;
        }

        .sidebar {
            width: 280px;
            background: white;
            border-right: 1px solid #e0e0e0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .sidebar-header {
            padding: 24px 20px;
            border-bottom: 1px solid #e0e0e0;
        }

        .sidebar-header h1 {
            margin: 0 0 8px 0;
            font-size: 20px;
            color: #333;
        }

        .sidebar-header p {
            margin: 0;
            font-size: 13px;
            color: #6c757d;
        }

        .search-box {
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
        }

        .search-box input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
        }

        .search-box input:focus {
            outline: none;
            border-color: #007bff;
        }

        .components-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 0;
        }

        .category {
            margin-bottom: 8px;
        }

        .category-header {
            padding: 12px 20px 8px 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: #6c757d;
            letter-spacing: 0.5px;
        }

        .component-item {
            padding: 10px 20px;
            font-size: 14px;
            color: #333;
            cursor: pointer;
            transition: all 0.2s;
        }

        .component-item:hover {
            background: #f8f9fa;
        }

        .component-item.active {
            background: #e7f3ff;
            color: #007bff;
            font-weight: 500;
            border-right: 3px solid #007bff;
        }

        .main-content {
            flex: 1;
            overflow-y: auto;
            background: #f5f5f5;
        }

        .component-view {
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px;
        }

        .component-header {
            background: white;
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .component-header h2 {
            margin: 0 0 8px 0;
            font-size: 28px;
            color: #333;
        }

        .component-header p {
            margin: 0;
            font-size: 15px;
            color: #6c757d;
        }

        .tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
        }

        .tab {
            padding: 12px 24px;
            background: white;
            border-radius: 6px 6px 0 0;
            font-size: 14px;
            font-weight: 500;
            color: #6c757d;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tab:hover {
            color: #333;
            background: #f8f9fa;
        }

        .tab.active {
            color: #007bff;
            background: white;
            box-shadow: 0 -2px 0 #007bff inset;
        }

        .tab-content {
            background: white;
            border-radius: 0 8px 8px 8px;
            padding: 32px;
            min-height: 400px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .demo-section {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .source-section pre {
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            overflow-x: auto;
        }

        .source-section code {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: #6c757d;
        }

        .empty-state h2 {
            margin: 0 0 12px 0;
            font-size: 24px;
        }

        .empty-state p {
            margin: 0;
            font-size: 15px;
        }
    `
});
