// Cross-file inheritance fixture: base class imported by t1-imported.js.
import { Component, html } from '../../app/lib/framework.js';

export class SharedBase extends Component {
    static props = { compact: false };
    closeAll() {}
    get badgeText() { return this.props.compact ? '' : 'x'; }
}

export default class SharedDefault extends Component {
    static props = { level: 0 };
    ping() {}
}
