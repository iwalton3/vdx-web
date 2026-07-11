/**
 * TutChapter - base class for tutorial chapters.
 *
 * Provides the shared prose styling (headings, paragraphs, lists, inline code,
 * callouts). Chapters extend this and add their own content in template(); the
 * framework merges `static styles` parent-first, so a chapter's styles layer on
 * top of the prose base.
 */
import { Component } from '../../lib/framework.js';

export class TutChapter extends Component {
    static styles = /*css*/`
        :host {
            display: block;
            max-width: 820px;
            margin: 0 auto;
            padding: 8px 4px 96px;
            color: var(--text-color, #24292e);
            line-height: 1.65;
            font-size: 16px;
        }

        .eyebrow {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--primary-color, #0969da);
            margin: 0 0 6px;
        }

        h1 { font-size: 2rem; margin: 0 0 16px; line-height: 1.2; }
        h2 { font-size: 1.35rem; margin: 40px 0 12px; }
        h3 { font-size: 1.1rem; margin: 28px 0 8px; }

        p { margin: 14px 0; }
        ul, ol { margin: 14px 0; padding-left: 22px; }
        li { margin: 6px 0; }

        a { color: var(--primary-color, #0969da); text-decoration: none; }
        a:hover { text-decoration: underline; }

        strong { font-weight: 650; }

        code {
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.86em;
            background: var(--code-bg, rgba(175,184,193,0.2));
            padding: 2px 6px;
            border-radius: 5px;
        }

        .lead {
            font-size: 1.18rem;
            color: var(--text-secondary, #57606a);
            margin: 0 0 8px;
        }

        .callout {
            margin: 20px 0;
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid var(--primary-color, #0969da);
            background: var(--info-bg, #ddf4ff);
            color: var(--info-text, #0a4f8f);
            font-size: 0.96rem;
        }
        .callout.tip { border-left-color: var(--success-color, #1a7f37); background: var(--success-bg, #dafbe1); color: var(--success-text, #116329); }
        .callout.warn { border-left-color: var(--warning-color, #bf8700); background: var(--warning-bg, #fff8c5); color: var(--warning-text, #7d4e00); }
        .callout code { background: rgba(0,0,0,0.06); }

        .try {
            margin-top: 6px;
            font-size: 0.95rem;
            color: var(--text-secondary, #57606a);
        }
    `
}
