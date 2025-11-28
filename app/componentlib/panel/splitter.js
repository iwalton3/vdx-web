/**
 * Splitter - Resizable split panel
 */
import { defineComponent, html } from '../../lib/framework.js';

export default defineComponent('cl-splitter', {
    props: {
        layout: 'horizontal', // 'horizontal' or 'vertical'
        panelsizes: [50, 50] // Percentage sizes
    },

    data() {
        return {
            sizes: [50, 50],
            isDragging: false,
            startPos: 0,
            startSizes: []
        };
    },

    mounted() {
        this.state.sizes = [...this.props.panelsizes];
    },

    methods: {

        handleMouseDown(event) {
            this.state.isDragging = true;
            this.state.startPos = this.props.layout === 'horizontal' ? event.clientX : event.clientY;
            this.state.startSizes = [...this.state.sizes];

            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
            event.preventDefault();
        },

        handleMouseMove(event) {
            if (!this.state.isDragging) return;

            const rect = this.refs.container.getBoundingClientRect();

            const currentPos = this.props.layout === 'horizontal' ? event.clientX : event.clientY;
            const containerSize = this.props.layout === 'horizontal' ? rect.width : rect.height;
            const delta = currentPos - this.state.startPos;
            const deltaPercent = (delta / containerSize) * 100;

            const newSize1 = Math.max(10, Math.min(90, this.state.startSizes[0] + deltaPercent));
            const newSize2 = 100 - newSize1;

            this.state.sizes = [newSize1, newSize2];
        },

        handleMouseUp() {
            if (this.state.isDragging) {
                this.state.isDragging = false;
                document.removeEventListener('mousemove', this.handleMouseMove);
                document.removeEventListener('mouseup', this.handleMouseUp);
                this.emitChange(null, this.state.sizes);
            }
        }
    },

    unmounted() {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    },

    template() {
        const isHorizontal = this.props.layout === 'horizontal';

        // Extract named children for panels
        const panel1Children = this.props.children?.['panel-1'] || [];
        const panel2Children = this.props.children?.['panel-2'] || [];

        return html`
            <div ref="container" class="splitter-container ${isHorizontal ? 'horizontal' : 'vertical'}">
                <div
                    class="splitter-panel panel-1"
                    style="${isHorizontal ? `width: ${this.state.sizes[0]}%` : `height: ${this.state.sizes[0]}%`}">
                    ${panel1Children}
                </div>
                <div class="splitter-gutter" on-mousedown="handleMouseDown"></div>
                <div
                    class="splitter-panel panel-2"
                    style="${isHorizontal ? `width: ${this.state.sizes[1]}%` : `height: ${this.state.sizes[1]}%`}">
                    ${panel2Children}
                </div>
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
            height: 400px;
        }

        .splitter-container {
            display: flex;
            height: 100%;
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            overflow: hidden;
        }

        .splitter-container.horizontal {
            flex-direction: row;
        }

        .splitter-container.vertical {
            flex-direction: column;
        }

        .splitter-panel {
            overflow: auto;
            background: white;
        }

        .splitter-gutter {
            background: var(--input-border, #dee2e6);
            cursor: col-resize;
            transition: background 0.2s;
        }

        .horizontal .splitter-gutter {
            width: 4px;
            cursor: col-resize;
        }

        .vertical .splitter-gutter {
            height: 4px;
            cursor: row-resize;
        }

        .splitter-gutter:hover {
            background: var(--primary-color, #007bff);
        }
    `
});
