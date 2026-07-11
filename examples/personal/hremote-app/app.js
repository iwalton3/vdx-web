/**
 * Remote Control Application
 * Requires root capability
 */

import Remote from './remote.js';

const app = {
    name: "Remote Control",
    require: "root",
    routes: {
        default: 'remote-control'
    }
};

export default app;
