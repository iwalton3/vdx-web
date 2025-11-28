/**
 * Debug Enabler - Monkey patches framework for debugging
 * Import this file ONLY when you need debug logging.
 * Zero performance cost when not imported.
 */

import { setDebugReactivityHook } from './core/reactivity.js';
import { setDebugComponentHooks } from './core/component.js';
import { logReactivity, logRenderCycle, vnodeToString, debugLog } from './debug.js';

// Check debug flags
const DEBUG_REACTIVITY = typeof window !== 'undefined' && window.__DEBUG_REACTIVITY;
const DEBUG_COMPONENTS = typeof window !== 'undefined' && window.__DEBUG_COMPONENTS;
const DEBUG_VNODES = typeof window !== 'undefined' && window.__DEBUG_VNODES;

// Enable reactivity debugging if flag is set
if (DEBUG_REACTIVITY) {
    setDebugReactivityHook(logReactivity);
    console.log('[DEBUG] Reactivity logging enabled');
}

// Enable component debugging if flags are set
if (DEBUG_COMPONENTS || DEBUG_VNODES) {
    setDebugComponentHooks({
        renderCycle: DEBUG_COMPONENTS ? logRenderCycle : null,
        propSet: DEBUG_COMPONENTS ? (tagName, propName, parsedValue, value, isMounted) => {
            debugLog('PropSet', `${tagName}.${propName} = ${JSON.stringify(parsedValue)} (from ${JSON.stringify(value)})`);
            if (isMounted) {
                debugLog('PropSet', `Triggering render for ${tagName}`);
            }
        } : null,
        vnode: DEBUG_VNODES ? (component, preactElement) => {
            debugLog('VNode', `${component.tagName} vnode:\n${vnodeToString(preactElement)}`);
        } : null
    });

    if (DEBUG_COMPONENTS) {
        console.log('[DEBUG] Component logging enabled');
    }
    if (DEBUG_VNODES) {
        console.log('[DEBUG] VNode logging enabled');
    }
}

// Export for re-exporting if needed
export { setDebugReactivityHook, setDebugComponentHooks };
