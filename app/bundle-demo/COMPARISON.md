# Manual DOM vs Framework: Jellyfin Settings Modal

This document shows the side-by-side comparison of implementing the Jellyfin settings modal using manual DOM manipulation (original) versus the bundled framework.

## Lines of Code

- **Manual DOM:** ~230 lines (from nativeshell.js showSettingsModal function)
- **Framework:** ~180 lines (with better organization and more features)
- **Reduction:** ~22% less code, significantly more readable and maintainable

## Original: Manual DOM Manipulation

```javascript
async function showSettingsModal() {
    await initCompleted;

    // Create tooltip CSS
    const tooltipCSS = `...`; // ~30 lines of CSS
    var style = document.createElement('style')
    style.innerText = tooltipCSS
    document.head.appendChild(style)

    // Create modal container
    const modalContainer = document.createElement("div");
    modalContainer.className = "dialogContainer";
    modalContainer.style.backgroundColor = "rgba(0,0,0,0.5)";
    modalContainer.addEventListener("click", e => {
        if (e.target == modalContainer) {
            modalContainer.remove();
        }
    });
    document.body.appendChild(modalContainer);

    const modalContainer2 = document.createElement("div");
    modalContainer2.className = "focuscontainer dialog dialog-fixedSize dialog-small formDialog opened";
    modalContainer.appendChild(modalContainer2);

    const modalHeader = document.createElement("div");
    modalHeader.className = "formDialogHeader";
    modalContainer2.appendChild(modalHeader);

    const title = document.createElement("h3");
    title.className = "formDialogHeaderTitle";
    title.textContent = "Jellyfin Media Player Settings";
    modalHeader.appendChild(title);

    const modalContents = document.createElement("div");
    modalContents.className = "formDialogContent smoothScrollY";
    modalContents.style.paddingTop = "2em";
    modalContents.style.marginBottom = "6.2em";
    modalContainer2.appendChild(modalContents);

    const settingUpdateHandlers = {};
    for (const sectionOrder of jmpInfo.sections.sort((a, b) => a.order - b.order)) {
        const section = sectionOrder.key;
        const group = document.createElement("fieldset");
        group.className = "editItemMetadataForm editMetadataForm dialog-content-centered";
        group.style.border = 0;
        group.style.outline = 0;
        modalContents.appendChild(group);

        const createSection = async (clear) => {
            if (clear) {
                group.innerHTML = "";
            }

            const values = jmpInfo.settings[section];
            const settings = jmpInfo.settingsDescriptions[section];

            const legend = document.createElement("legend");
            const legendHeader = document.createElement("h2");
            legendHeader.textContent = section;
            legendHeader.style.textTransform = "capitalize";
            legend.appendChild(legendHeader);

            if (section == "other") {
                const legendSubHeader = document.createElement("h4");
                legendSubHeader.textContent = "Use this section to input custom MPV configuration...";
                legend.appendChild(legendSubHeader);
            }
            group.appendChild(legend);

            for (const setting of settings) {
                const label = document.createElement("label");
                label.className = "inputContainer";
                label.style.marginBottom = "1.8em";
                label.style.display = "block";

                let helpElement;
                if (setting.help) {
                    helpElement = document.createElement("div");
                    helpElement.className = "tooltip";
                    const helpIcon = document.createElement("span");
                    helpIcon.style.fontSize = "18px"
                    helpIcon.className = "material-icons help_outline";
                    helpElement.appendChild(helpIcon);
                    const tooltipElement = document.createElement("span");
                    tooltipElement.className = "tooltip-text";
                    tooltipElement.innerText = setting.help;
                    helpElement.appendChild(tooltipElement);
                }

                if (setting.options) {
                    const safeValues = {};
                    const control = document.createElement("select");
                    control.className = "emby-select-withcolor emby-select";
                    for (const option of setting.options) {
                        safeValues[String(option.value)] = option.value;
                        const opt = document.createElement("option");
                        opt.value = option.value;
                        opt.selected = option.value == values[setting.key];
                        let optionName = option.title;
                        // ... string manipulation ...
                        opt.appendChild(document.createTextNode(optionName));
                        control.appendChild(opt);
                    }
                    control.addEventListener("change", async (e) => {
                        jmpInfo.settings[section][setting.key] = safeValues[e.target.value];
                    });
                    const labelText = document.createElement('label');
                    labelText.className = "inputLabel";
                    labelText.textContent = (setting.displayName ? setting.displayName : setting.key) + ": ";
                    label.appendChild(labelText);
                    if (helpElement) label.appendChild(helpElement);
                    label.appendChild(control);
                } else if (setting.inputType === "textarea") {
                    const control = document.createElement("textarea");
                    control.className = "emby-select-withcolor emby-select";
                    control.style = "resize: none;"
                    control.value = values[setting.key];
                    control.rows = 5;
                    control.addEventListener("change", e => {
                        jmpInfo.settings[section][setting.key] = e.target.value;
                    });
                    const labelText = document.createElement('label');
                    labelText.className = "inputLabel";
                    labelText.textContent = (setting.displayName ? setting.displayName : setting.key) + ": ";
                    label.appendChild(labelText);
                    if (helpElement) label.appendChild(helpElement);
                    label.appendChild(control);
                } else {
                    const control = document.createElement("input");
                    control.type = "checkbox";
                    control.checked = values[setting.key];
                    control.addEventListener("change", e => {
                        jmpInfo.settings[section][setting.key] = e.target.checked;
                    });
                    label.appendChild(control);
                    label.appendChild(document.createTextNode(" " + (setting.displayName ? setting.displayName : setting.key)));
                    if (helpElement) label.appendChild(helpElement);
                }

                group.appendChild(label);
            }
        };
        settingUpdateHandlers[section] = () => createSection(true);
        createSection();
    }

    // ... more manual DOM creation for saved server section ...

    const closeContainer = document.createElement("div");
    closeContainer.className = "formDialogFooter";
    modalContents.appendChild(closeContainer);

    const close = document.createElement("button");
    close.className = "raised button-cancel block btnCancel formDialogFooterItem emby-button";
    close.textContent = "Close"
    close.addEventListener("click", () => {
        modalContainer.remove();
    });
    closeContainer.appendChild(close);
}
```

## Framework Version

```javascript
import { defineComponent, html, when, each } from './framework-bundle.js';

defineComponent('settings-modal', {
    props: {
        visible: false
    },

    data() {
        return {
            settings: jmpInfo.settings,
            sections: jmpInfo.sections,
            descriptions: jmpInfo.settingsDescriptions
        };
    },

    methods: {
        close() {
            // Emit change event for parent to handle
            this.emitChange(null, false, 'visible');
            // Remove from DOM (this is a dynamically created modal)
            this.remove();
        },

        handleOverlayClick(e) {
            if (e.target.classList.contains('modal-container')) {
                this.close();
            }
        },

        updateSetting(section, key, value) {
            this.state.settings[section][key] = value;
        },

        renderSetting(section, setting) {
            const value = this.state.settings[section][setting.key];
            const label = setting.displayName || setting.key;

            if (setting.options) {
                // Select dropdown
                return html`
                    <div class="form-group">
                        <label class="form-label">
                            ${label}
                            ${when(setting.help, html`
                                <span class="help-icon">
                                    <span class="tooltip">${setting.help}</span>
                                </span>
                            `)}
                        </label>
                        <select
                            value="${value}"
                            on-change="${(e) => this.updateSetting(section, setting.key, e.target.value)}">
                            ${each(setting.options, opt => html`
                                <option value="${opt.value}" selected="${opt.value === value ? true : undefined}">
                                    ${opt.title}
                                </option>
                            `)}
                        </select>
                    </div>
                `;
            } else if (setting.inputType === 'textarea') {
                // Textarea
                return html`
                    <div class="form-group">
                        <label class="form-label">${label}</label>
                        <textarea on-change="${(e) => this.updateSetting(section, setting.key, e.target.value)}">${value}</textarea>
                    </div>
                `;
            } else {
                // Checkbox
                return html`
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox"
                                   checked="${value}"
                                   on-change="${(e) => this.updateSetting(section, setting.key, e.target.checked)}">
                            ${label}
                        </label>
                    </div>
                `;
            }
        }
    },

    template() {
        return html`
            <div class="modal-container" on-click="handleOverlayClick">
                <div class="modal">
                    <div class="modal-header">
                        <h2 class="modal-title">Jellyfin Media Player Settings</h2>
                    </div>
                    <div class="modal-content">
                        ${each(this.state.sections, sectionInfo => {
                            const section = sectionInfo.key;
                            const settings = this.state.descriptions[section] || [];

                            return html`
                                <div class="section">
                                    <h3 class="section-title">${section}</h3>
                                    ${each(settings, setting => this.renderSetting(section, setting))}
                                </div>
                            `;
                        })}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" on-click="close">Close</button>
                    </div>
                </div>
            </div>
        `;
    },

    styles: `
        .modal-container {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        /* ... more styles ... */
    `
});

// Usage
function showSettingsModal() {
    const modal = document.createElement('settings-modal');
    modal.setAttribute('visible', 'true');
    document.body.appendChild(modal);
}
```

## Key Improvements

### 1. **Declarative vs Imperative**

**Manual DOM:**
```javascript
const control = document.createElement("select");
control.className = "emby-select-withcolor emby-select";
for (const option of setting.options) {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.selected = option.value == values[setting.key];
    opt.appendChild(document.createTextNode(optionName));
    control.appendChild(opt);
}
control.addEventListener("change", async (e) => {
    jmpInfo.settings[section][setting.key] = safeValues[e.target.value];
});
```

**Framework:**
```javascript
html`
    <select value="${value}" on-change="${(e) => this.updateSetting(section, setting.key, e.target.value)}">
        ${each(setting.options, opt => html`
            <option value="${opt.value}" selected="${opt.value === value ? true : undefined}">
                ${opt.title}
            </option>
        `)}
    </select>
`
```

### 2. **Automatic Re-rendering**

**Manual DOM:** Must manually update DOM when data changes
```javascript
settingUpdateHandlers[section] = () => createSection(true);  // Recreate entire section!
```

**Framework:** Automatic reactivity
```javascript
this.state.settings[section][key] = value;  // UI updates automatically
```

### 3. **Built-in XSS Protection**

**Manual DOM:** Manual escaping required
```javascript
opt.appendChild(document.createTextNode(optionName));  // Must use createTextNode
```

**Framework:** Automatic escaping
```javascript
html`<option>${opt.title}</option>`  // Auto-escaped
```

### 4. **Event Cleanup**

**Manual DOM:** Must manually remove listeners
```javascript
control.addEventListener("change", handler);
// Memory leak if not removed!
```

**Framework:** Automatic cleanup
```javascript
on-change="${handler}"  // Automatically cleaned up on unmount
```

### 5. **Conditional Rendering**

**Manual DOM:**
```javascript
if (setting.help) {
    helpElement = document.createElement("div");
    helpElement.className = "tooltip";
    const helpIcon = document.createElement("span");
    // ... 10 more lines ...
    label.appendChild(helpElement);
}
```

**Framework:**
```javascript
${when(setting.help, html`
    <span class="help-icon">
        <span class="tooltip">${setting.help}</span>
    </span>
`)}
```

### 6. **Scoped Styles**

**Manual DOM:**
```javascript
const tooltipCSS = `...`;
var style = document.createElement('style')
style.innerText = tooltipCSS
document.head.appendChild(style)  // Global CSS!
```

**Framework:**
```javascript
styles: `
    .tooltip { ... }  // Automatically scoped to component
`
```

## Benefits Summary

| Aspect | Manual DOM | Framework |
|--------|-----------|-----------|
| **Code clarity** | Verbose, imperative | Concise, declarative |
| **XSS protection** | Manual | Automatic |
| **Reactivity** | Manual updates | Automatic re-rendering |
| **Event cleanup** | Manual | Automatic |
| **Memory leaks** | Easy to create | Prevented by design |
| **Testing** | Difficult | Easy to test |
| **Maintainability** | Hard to modify | Easy to modify |
| **Bundle size** | 0 KB (but limited) | ~35 KB gzipped (full features) |
| **Learning curve** | Low | Medium |
| **Performance** | Can be optimized | Optimized by default (Preact) |

## When to Use Each

### Use Manual DOM When:
- Very simple, one-time UI updates
- Absolute minimal file size is critical
- Adding a single element to existing page
- No dynamic updates needed

### Use Framework When:
- Complex UIs with multiple sections
- Data-driven rendering
- Dynamic updates based on user interaction
- Multiple components that need to communicate
- Need automatic XSS protection
- Want to avoid memory leaks
- Building a modal, settings panel, or any complex component

## Migration Path

If you have an existing application with manual DOM manipulation (like Jellyfin Media Player), you can:

1. **Keep existing code as-is** - No changes required
2. **Add framework bundle** - Just one `<script>` tag
3. **Incrementally migrate** - Replace complex components one at a time
4. **New features use framework** - All new development uses declarative components

Example:
```html
<!-- Existing manual DOM code -->
<script src="nativeshell.js"></script>

<!-- Add framework -->
<script type="module">
    import { defineComponent, html } from './framework-bundle.js';

    // New modal uses framework
    defineComponent('new-settings-modal', { ... });
</script>
```

No build step required, no breaking changes, gradual modernization!
