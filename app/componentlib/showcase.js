/**
 * Component Showcase - VDX-UI Component Library
 */
import { defineComponent, html, when, each, raw, contain, Component } from '../lib/framework.js';

// Import all example components (which also import the library components)
import './example-components.js';

// Import shell component
import './layout/shell.js';

// Editable, runnable source panels
import './misc/code-runner.js';

import { componentExamples } from './examples.js';

export class ComponentShowcase extends Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedComponent: null,
            selectedTab: 'demo',
            searchQuery: '',
            darkMode: false,
            categories: [
                { name: 'Form', key: 'form', icon: '📝' },
                { name: 'Selection', key: 'selection', icon: '☑️' },
                { name: 'Data', key: 'data', icon: '📊' },
                { name: 'Panel', key: 'panel', icon: '📦' },
                { name: 'Overlay', key: 'overlay', icon: '🪟' },
                { name: 'Button', key: 'button', icon: '🔘' },
                { name: 'Layout', key: 'layout', icon: '📐' },
                { name: 'Misc', key: 'misc', icon: '🧩' }
            ]
        };
    }

    mounted() {
        // Check for component in URL hash
        this.loadFromHash();

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.loadFromHash());
    }

    unmounted() {
        window.removeEventListener('hashchange', () => this.loadFromHash());
    }

    loadFromHash() {
        const hash = window.location.hash.slice(1); // Remove the #
        if (hash && componentExamples[hash]) {
            this.state.selectedComponent = componentExamples[hash];
        } else {
            // Select first component by default
            const firstComponent = Object.values(componentExamples)[0];
            if (firstComponent) {
                this.state.selectedComponent = firstComponent;
                // Update URL without triggering hashchange
                history.replaceState(null, '', '#' + firstComponent.id);
            }
        }
    }

    selectComponent(component) {
        this.state.selectedComponent = component;
        this.state.selectedTab = 'demo';
        // Update URL hash
        history.pushState(null, '', '#' + component.id);
    }

    selectTab(tab) {
        this.state.selectedTab = tab;
    }

    getComponentsByCategory(category) {
        if (!componentExamples) return [];
        return Object.values(componentExamples).filter(c => c && c.category === category);
    }

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
    }

    getMenuItems() {
        const filteredComponents = this.getFilteredComponents();
        const hasSearch = this.state.searchQuery.trim().length > 0;

        // When searching, return flat list of matching components for easier browsing
        if (hasSearch) {
            return Object.values(filteredComponents).map(comp => ({
                label: comp.name,
                icon: this.getCategoryIcon(comp.category),
                key: comp.id
            }));
        }

        // Normal view - show categories with sub-items
        return this.state.categories
            .map(category => {
                const components = this.getComponentsByCategory(category.key);
                const visibleComponents = components.filter(c => filteredComponents[c.id]);
                if (visibleComponents.length === 0) return null;

                return {
                    label: category.name,
                    icon: category.icon,
                    key: category.key,
                    items: visibleComponents.map(comp => ({
                        label: comp.name,
                        key: comp.id
                    }))
                };
            })
            .filter(Boolean);
    }

    getCategoryIcon(categoryKey) {
        const category = this.state.categories.find(c => c.key === categoryKey);
        return category ? category.icon : '';
    }

    handleMenuChange(e, key) {
        const component = componentExamples[key];
        if (component) {
            this.selectComponent(component);
        }
    }

    handleSearch(e) {
        this.state.searchQuery = e.target.value;
    }

    handleSearchKeydown(e) {
        // On Enter key, open the sidebar on mobile to show search results
        if (e.key === 'Enter') {
            const shell = this.querySelector('cl-shell');
            if (shell && shell.state && shell.state.isMobile && !shell.state.sidebarOpen) {
                shell.state.sidebarOpen = true;
            }
            e.preventDefault();
        }
    }

    toggleDarkMode() {
        this.state.darkMode = !this.state.darkMode;
        document.body.classList.toggle('dark', this.state.darkMode);
    }

    // Turn an example (source + demo) into a runnable project for cl-code-runner.
    // A raw-HTML source runs as-is (all cl-* are available via the barrel); a
    // JS-class source defines the example component and the demo mounts it.
    exampleFiles(comp) {
        if (!comp) return {};
        const source = comp.source || '';
        const demo = comp.demo || '';
        const page = (body, importScript) =>
            `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${body}\n`
            + `<script type="module">${importScript}<\/script>\n</body>\n</html>\n`;

        // Strip leading whitespace + comments before deciding: a source can be
        // raw usage HTML introduced by an explanatory comment.
        const stripped = source.replace(/^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/, '').trimStart();
        if (stripped.startsWith('<')) {
            return { 'index.html': page(source, "import 'vdx/componentlib/all.js';") };
        }
        let preamble =
            "import { defineComponent, Component, html, when, each, raw, contain, memoEach, "
            + "untracked, awaitThen, computed, createStore, flushSync } from 'vdx/lib/framework.js';\n"
            + "import 'vdx/componentlib/all.js';\n";
        // Pull in the list controllers only when a source actually uses them.
        if (/\bcreateWindowing\b/.test(source)) {
            preamble += "import { createWindowing } from 'vdx/lib/windowing.js';\n";
        }
        if (/\bcreateRowGestures\b|\bgroupReorderTargets\b|\bgapTo\w+\b/.test(source)) {
            preamble += "import { createRowGestures, groupReorderTargets, gapToRemoveInsertIndex, gapToGapIndex } from 'vdx/lib/gestures.js';\n";
        }
        preamble += "\n";
        return {
            'App.js': preamble + source,
            'index.html': page(demo, "import './App.js';")
        };
    }

    template() {
        const current = this.state.selectedComponent;
        const menuItems = this.getMenuItems();

        return html`
            <cl-shell
                title="VDX-UI"
                subtitle="Component Library"
                menuItems="${menuItems}"
                activeItem="${current ? current.id : null}"
                on-change="handleMenuChange">

                <div slot="topbar" class="topbar-controls">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Search components..."
                        value="${this.state.searchQuery}"
                        on-input="handleSearch"
                        on-keydown="handleSearchKeydown">
                    <a class="topbar-link" href="/tutorial.html">Tutorial ↗</a>
                    <a class="topbar-link" href="/tutorial/playground.html">Playground ↗</a>
                    <button class="dark-mode-btn" on-click="toggleDarkMode" title="Toggle dark mode">
                        ${this.state.darkMode ? '☀️' : '🌙'}
                    </button>
                </div>

                <div class="showcase-content">
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
                                    Edit &amp; Run
                                </div>
                            </div>

                            <div class="tab-content">
                                <!-- Isolate the demo in a reactive boundary keyed to the
                                     selected component + tab, so re-renders from unrelated
                                     state (dark mode, search) don't re-insert raw(demo) and
                                     wipe the live component's state. -->
                                ${contain(() => {
                                    const comp = this.state.selectedComponent;
                                    return this.state.selectedTab === 'demo'
                                        ? html`<div class="demo-section">${comp ? raw(comp.demo) : ''}</div>`
                                        : html`<div class="source-section"><cl-code-runner files="${this.exampleFiles(comp)}" previewLabel="Preview"></cl-code-runner></div>`;
                                })}
                            </div>
                        </div>
                    `, html`
                        <div class="empty-state">
                            <h2>Welcome to VDX-UI</h2>
                            <p>Select a component from the sidebar to view examples</p>
                        </div>
                    `)}
                </div>
            </cl-shell>
        `;
    }

    static styles = /*css*/`
        :host {
            display: block;
            height: 100vh;
        }

        .topbar-controls {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .topbar-controls .search-input {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: rgba(255,255,255,0.2);
            color: white;
            font-size: 14px;
            width: 200px;
        }

        .topbar-controls .search-input::placeholder {
            color: rgba(255,255,255,0.7);
        }

        .topbar-controls .search-input:focus {
            outline: none;
            background: rgba(255,255,255,0.3);
        }

        .topbar-link {
            color: white;
            text-decoration: none;
            font-size: 13px;
            font-weight: 550;
            padding: 6px 10px;
            border-radius: 4px;
            white-space: nowrap;
        }
        .topbar-link:hover { background: rgba(255,255,255,0.2); }

        .dark-mode-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 4px;
            padding: 6px 10px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.2s;
        }

        .dark-mode-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        .showcase-content {
            height: 100%;
        }

        .component-view {
            max-width: 1200px;
        }

        .component-header {
            background: var(--card-bg, white);
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .component-header h2 {
            margin: 0 0 8px 0;
            font-size: 28px;
            color: var(--text-color, #333);
        }

        .component-header p {
            margin: 0;
            font-size: 15px;
            color: var(--text-muted, #6c757d);
        }

        .tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
        }

        .tab {
            padding: 12px 24px;
            background: var(--card-bg, white);
            border-radius: 6px 6px 0 0;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted, #6c757d);
            cursor: pointer;
            transition: all 0.2s;
        }

        .tab:hover {
            color: var(--text-color, #333);
            background: var(--hover-bg, #f8f9fa);
        }

        .tab.active {
            color: var(--primary-color, #1976d2);
            background: var(--card-bg, white);
            box-shadow: 0 -2px 0 var(--primary-color, #1976d2) inset;
        }

        .tab-content {
            background: var(--card-bg, white);
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

        .source-section { max-width: 100%; }
        .source-section cl-code-runner {
            display: block;
            max-width: 100%;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            text-align: center;
            color: var(--text-muted, #6c757d);
        }

        .empty-state h2 {
            margin: 0 0 12px 0;
            font-size: 24px;
        }

        .empty-state p {
            margin: 0;
            font-size: 15px;
        }

        @media (max-width: 767px) {
            .topbar-search input {
                width: 140px;
            }

            .component-header {
                padding: 16px;
            }

            .component-header h2 {
                font-size: 22px;
            }

            .tabs {
                overflow-x: auto;
            }

            .tab {
                padding: 10px 16px;
                white-space: nowrap;
            }

            .tab-content {
                padding: 16px;
            }
        }
    `
}

export default defineComponent('component-showcase', ComponentShowcase);
