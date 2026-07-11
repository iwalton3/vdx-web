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
import './06-stores.js';
import './07-static.js';

export const chapters = [
    { id: 'first', num: 1, group: 'Getting started', title: 'Your first component', mount: '<tut-ch-first></tut-ch-first>' },
    { id: 'state', num: 2, group: 'Getting started', title: 'Working with state', mount: '<tut-ch-state></tut-ch-state>' },
    { id: 'events', num: 3, group: 'Getting started', title: 'Event handling', mount: '<tut-ch-events></tut-ch-events>' },
    { id: 'binding', num: 4, group: 'Working with data', title: 'Two-way binding', mount: '<tut-ch-binding></tut-ch-binding>' },
    { id: 'helpers', num: 5, group: 'Working with data', title: 'Lists & conditionals', mount: '<tut-ch-helpers></tut-ch-helpers>' },
    { id: 'stores', num: 6, group: 'Working with data', title: 'State management with stores', mount: '<tut-ch-stores></tut-ch-stores>' },
    { id: 'static', num: 7, group: 'Going further', title: 'Static-site integration', mount: '<tut-ch-static></tut-ch-static>' }
];
