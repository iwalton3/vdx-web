/**
 * Chapter registry. Importing a chapter module registers its custom element;
 * the exported list drives the sidebar nav and the content pane (each `mount`
 * is the tag the shell inserts for that chapter).
 *
 * To add a chapter: create ./NN-slug.js defining <tut-ch-slug>, import it here,
 * and add an entry below.
 */
import './01-first-component.js';
import './02-state.js';
import './03-events.js';
import './04-binding.js';
import './05-helpers.js';
import './06-communication.js';
import './07-lifecycle.js';
import './08-stores.js';
import './09-routing.js';
import './10-static.js';
import './11-performance.js';
import './12-advanced.js';
import './13-best-practices.js';
import './14-legacy.js';
import './15-security.js';
import './16-reactivity.js';
import './17-components.js';
import './18-production.js';

export const chapters = [
    { id: 'first', num: 1, group: 'Getting started', title: 'Your first component', mount: '<tut-ch-first></tut-ch-first>' },
    { id: 'state', num: 2, group: 'Getting started', title: 'Working with state', mount: '<tut-ch-state></tut-ch-state>' },
    { id: 'events', num: 3, group: 'Getting started', title: 'Event handling', mount: '<tut-ch-events></tut-ch-events>' },
    { id: 'binding', num: 4, group: 'Working with data', title: 'Two-way binding', mount: '<tut-ch-binding></tut-ch-binding>' },
    { id: 'helpers', num: 5, group: 'Working with data', title: 'Lists & conditionals', mount: '<tut-ch-helpers></tut-ch-helpers>' },
    { id: 'communication', num: 6, group: 'Working with data', title: 'Component communication', mount: '<tut-ch-communication></tut-ch-communication>' },
    { id: 'lifecycle', num: 7, group: 'Working with data', title: 'Lifecycle hooks', mount: '<tut-ch-lifecycle></tut-ch-lifecycle>' },
    { id: 'stores', num: 8, group: 'Working with data', title: 'State management with stores', mount: '<tut-ch-stores></tut-ch-stores>' },
    { id: 'routing', num: 9, group: 'Building apps', title: 'Routing', mount: '<tut-ch-routing></tut-ch-routing>' },
    { id: 'static', num: 10, group: 'Building apps', title: 'Static-site integration', mount: '<tut-ch-static></tut-ch-static>' },
    { id: 'performance', num: 11, group: 'Building apps', title: 'Performance', mount: '<tut-ch-performance></tut-ch-performance>' },
    { id: 'advanced', num: 12, group: 'Going further', title: 'Advanced patterns', mount: '<tut-ch-advanced></tut-ch-advanced>' },
    { id: 'best', num: 13, group: 'Going further', title: 'Best practices', mount: '<tut-ch-best></tut-ch-best>' },
    { id: 'legacy', num: 14, group: 'Going further', title: 'The legacy format', mount: '<tut-ch-legacy></tut-ch-legacy>' },
    { id: 'security', num: 15, group: 'Guides', title: 'Security & trusted HTML', mount: '<tut-ch-security></tut-ch-security>' },
    { id: 'reactivity', num: 16, group: 'Guides', title: 'Reactivity in depth', mount: '<tut-ch-reactivity></tut-ch-reactivity>' },
    { id: 'components', num: 17, group: 'Guides', title: 'The component library', mount: '<tut-ch-components></tut-ch-components>' },
    { id: 'production', num: 18, group: 'Guides', title: 'Shipping to production', mount: '<tut-ch-production></tut-ch-production>' }
];
