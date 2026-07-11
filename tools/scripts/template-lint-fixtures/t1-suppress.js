// T1 fixture: suppression comments.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class SuppressDemo extends Component {
    ok() {}
    template() {
        return html`
            <button on-click="ok">fine</button>
            <!-- vdx-lint-disable-next-line t1-handler -->
            <button on-click="attachedAtRuntime">suppressed by id</button>
            <!-- vdx-lint-disable-next-line -->
            <button on-click="alsoDynamic">suppressed (bare disable)</button>
            <!-- vdx-lint-disable-next-line t2-xmodel -->
            <button on-click="wrongIdStillReported">bad</button> <!-- LINT-EXPECT: t1-handler -->
        `;
    }
}
export default defineComponent('suppress-demo', SuppressDemo);
