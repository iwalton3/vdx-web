/**
 * VDX-Web Framework Bundle
 * https://github.com/iwalton3/vdx-web
 * Generated: 2025-11-30T06:30:25.076Z
 *
 * Includes Preact (https://preactjs.com/)
 * Copyright (c) 2015-present Jason Miller
 * Licensed under MIT
 *
 * Zero-dependency reactive web framework with Web Components support.
 * No build step required - runs directly in the browser.
 */

// ============= constants.js =============

const MODE_HYDRATE = 1 << 5;

const MODE_SUSPENDED = 1 << 7;

const INSERT_VNODE = 1 << 2;

const MATCHED = 1 << 1;

const RESET_MODE = ~(MODE_HYDRATE | MODE_SUSPENDED);

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

const NULL = null;
const UNDEFINED = undefined;
const EMPTY_OBJ =  ({});
const EMPTY_ARR = [];
const IS_NON_DIMENSIONAL =
	/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

// ============= util.js =============
const isArray = Array.isArray;

function assign(obj, props) {

	for (let i in props) obj[i] = props[i];
	return  (obj);
}

function removeNode(node) {
	if (node && node.parentNode) node.parentNode.removeChild(node);
}

const slice = EMPTY_ARR.slice;

// ============= catch-error.js =============
function _catchError(error, vnode, oldVNode, errorInfo) {

	let component,

		ctor,

		handled;

	for (; (vnode = vnode._parent); ) {
		if ((component = vnode._component) && !component._processingException) {
			try {
				ctor = component.constructor;

				if (ctor && ctor.getDerivedStateFromError != NULL) {
					component.setState(ctor.getDerivedStateFromError(error));
					handled = component._dirty;
				}

				if (component.componentDidCatch != NULL) {
					component.componentDidCatch(error, errorInfo || {});
					handled = component._dirty;
				}

				if (handled) {
					return (component._pendingError = component);
				}
			} catch (e) {
				error = e;
			}
		}
	}

	throw error;
}

// ============= options.js =============
const options = {
	_catchError
};

options;

// ============= create-element.js =============
let vnodeId = 0;

function createElement(type, props, children) {
	let normalizedProps = {},
		key,
		ref,
		i;
	for (i in props) {
		if (i == 'key') key = props[i];
		else if (i == 'ref') ref = props[i];
		else normalizedProps[i] = props[i];
	}

	if (arguments.length > 2) {
		normalizedProps.children =
			arguments.length > 3 ? slice.call(arguments, 2) : children;
	}

	if (typeof type == 'function' && type.defaultProps != NULL) {
		for (i in type.defaultProps) {
			if (normalizedProps[i] === UNDEFINED) {
				normalizedProps[i] = type.defaultProps[i];
			}
		}
	}

	return createVNode(type, normalizedProps, key, ref, NULL);
}

function createVNode(type, props, key, ref, original) {

	const vnode = {
		type,
		props,
		key,
		ref,
		_children: NULL,
		_parent: NULL,
		_depth: 0,
		_dom: NULL,
		_component: NULL,
		constructor: UNDEFINED,
		_original: original == NULL ? ++vnodeId : original,
		_index: -1,
		_flags: 0
	};

	if (original == NULL && options.vnode != NULL) options.vnode(vnode);

	return vnode;
}

function createRef() {
	return { current: NULL };
}

function Fragment(props) {
	return props.children;
}

const isValidElement = vnode =>
	vnode != NULL && vnode.constructor == UNDEFINED;

// ============= children.js =============
function diffChildren(
	parentDom,
	renderResult,
	newParentVNode,
	oldParentVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue
) {
	let i,

		oldVNode,

		childVNode,

		newDom,

		firstChildDom;

	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	let newChildrenLength = renderResult.length;

	oldDom = constructNewChildrenArray(
		newParentVNode,
		renderResult,
		oldChildren,
		oldDom,
		newChildrenLength
	);

	for (i = 0; i < newChildrenLength; i++) {
		childVNode = newParentVNode._children[i];
		if (childVNode == NULL) continue;

		if (childVNode._index == -1) {
			oldVNode = EMPTY_OBJ;
		} else {
			oldVNode = oldChildren[childVNode._index] || EMPTY_OBJ;
		}

		childVNode._index = i;

		let result = diff(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating,
			refQueue
		);

		newDom = childVNode._dom;
		if (childVNode.ref && oldVNode.ref != childVNode.ref) {
			if (oldVNode.ref) {
				applyRef(oldVNode.ref, NULL, childVNode);
			}
			refQueue.push(
				childVNode.ref,
				childVNode._component || newDom,
				childVNode
			);
		}

		if (firstChildDom == NULL && newDom != NULL) {
			firstChildDom = newDom;
		}

		let shouldPlace = !!(childVNode._flags & INSERT_VNODE);
		if (shouldPlace || oldVNode._children === childVNode._children) {
			oldDom = insert(childVNode, oldDom, parentDom, shouldPlace);
		} else if (typeof childVNode.type == 'function' && result !== UNDEFINED) {
			oldDom = result;
		} else if (newDom) {
			oldDom = newDom.nextSibling;
		}

		childVNode._flags &= ~(INSERT_VNODE | MATCHED);
	}

	newParentVNode._dom = firstChildDom;

	return oldDom;
}

function constructNewChildrenArray(
	newParentVNode,
	renderResult,
	oldChildren,
	oldDom,
	newChildrenLength
) {

	let i;

	let childVNode;

	let oldVNode;

	let oldChildrenLength = oldChildren.length,
		remainingOldChildren = oldChildrenLength;

	let skew = 0;

	newParentVNode._children = new Array(newChildrenLength);
	for (i = 0; i < newChildrenLength; i++) {

		childVNode = renderResult[i];

		if (
			childVNode == NULL ||
			typeof childVNode == 'boolean' ||
			typeof childVNode == 'function'
		) {
			newParentVNode._children[i] = NULL;
			continue;
		}

		else if (
			typeof childVNode == 'string' ||
			typeof childVNode == 'number' ||

			typeof childVNode == 'bigint' ||
			childVNode.constructor == String
		) {
			childVNode = newParentVNode._children[i] = createVNode(
				NULL,
				childVNode,
				NULL,
				NULL,
				NULL
			);
		} else if (isArray(childVNode)) {
			childVNode = newParentVNode._children[i] = createVNode(
				Fragment,
				{ children: childVNode },
				NULL,
				NULL,
				NULL
			);
		} else if (childVNode.constructor == UNDEFINED && childVNode._depth > 0) {

			childVNode = newParentVNode._children[i] = createVNode(
				childVNode.type,
				childVNode.props,
				childVNode.key,
				childVNode.ref ? childVNode.ref : NULL,
				childVNode._original
			);
		} else {
			childVNode = newParentVNode._children[i] = childVNode;
		}

		const skewedIndex = i + skew;
		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		const matchingIndex = (childVNode._index = findMatchingIndex(
			childVNode,
			oldChildren,
			skewedIndex,
			remainingOldChildren
		));

		oldVNode = NULL;
		if (matchingIndex != -1) {
			oldVNode = oldChildren[matchingIndex];
			remainingOldChildren--;
			if (oldVNode) {
				oldVNode._flags |= MATCHED;
			}
		}

		const isMounting = oldVNode == NULL || oldVNode._original == NULL;

		if (isMounting) {
			if (matchingIndex == -1) {

				if (newChildrenLength > oldChildrenLength) {
					skew--;
				} else if (newChildrenLength < oldChildrenLength) {
					skew++;
				}
			}

			if (typeof childVNode.type != 'function') {
				childVNode._flags |= INSERT_VNODE;
			}
		} else if (matchingIndex != skewedIndex) {

			if (matchingIndex == skewedIndex - 1) {
				skew--;
			} else if (matchingIndex == skewedIndex + 1) {
				skew++;
			} else {
				if (matchingIndex > skewedIndex) {
					skew--;
				} else {
					skew++;
				}

				childVNode._flags |= INSERT_VNODE;
			}
		}
	}

	if (remainingOldChildren) {
		for (i = 0; i < oldChildrenLength; i++) {
			oldVNode = oldChildren[i];
			if (oldVNode != NULL && (oldVNode._flags & MATCHED) == 0) {
				if (oldVNode._dom == oldDom) {
					oldDom = getDomSibling(oldVNode);
				}

				unmount(oldVNode, oldVNode);
			}
		}
	}

	return oldDom;
}

function insert(parentVNode, oldDom, parentDom, shouldPlace) {

	if (typeof parentVNode.type == 'function') {
		let children = parentVNode._children;
		for (let i = 0; children && i < children.length; i++) {
			if (children[i]) {

				children[i]._parent = parentVNode;
				oldDom = insert(children[i], oldDom, parentDom, shouldPlace);
			}
		}

		return oldDom;
	} else if (parentVNode._dom != oldDom) {
		if (shouldPlace) {
			if (oldDom && parentVNode.type && !oldDom.parentNode) {
				oldDom = getDomSibling(parentVNode);
			}
			parentDom.insertBefore(parentVNode._dom, oldDom || NULL);
		}
		oldDom = parentVNode._dom;
	}

	do {
		oldDom = oldDom && oldDom.nextSibling;
	} while (oldDom != NULL && oldDom.nodeType == 8);

	return oldDom;
}

function toChildArray(children, out) {
	out = out || [];
	if (children == NULL || typeof children == 'boolean') {
	} else if (isArray(children)) {
		children.some(child => {
			toChildArray(child, out);
		});
	} else {
		out.push(children);
	}
	return out;
}

function findMatchingIndex(
	childVNode,
	oldChildren,
	skewedIndex,
	remainingOldChildren
) {
	const key = childVNode.key;
	const type = childVNode.type;
	let oldVNode = oldChildren[skewedIndex];
	const matched = oldVNode != NULL && (oldVNode._flags & MATCHED) == 0;

	let shouldSearch =

		remainingOldChildren > (matched ? 1 : 0);

	if (
		(oldVNode === NULL && childVNode.key == null) ||
		(matched && key == oldVNode.key && type == oldVNode.type)
	) {
		return skewedIndex;
	} else if (shouldSearch) {
		let x = skewedIndex - 1;
		let y = skewedIndex + 1;
		while (x >= 0 || y < oldChildren.length) {
			const childIndex = x >= 0 ? x-- : y++;
			oldVNode = oldChildren[childIndex];
			if (
				oldVNode != NULL &&
				(oldVNode._flags & MATCHED) == 0 &&
				key == oldVNode.key &&
				type == oldVNode.type
			) {
				return childIndex;
			}
		}
	}

	return -1;
}

// ============= props.js =============
function setStyle(style, key, value) {
	if (key[0] == '-') {
		style.setProperty(key, value == NULL ? '' : value);
	} else if (value == NULL) {
		style[key] = '';
	} else if (typeof value != 'number' || IS_NON_DIMENSIONAL.test(key)) {
		style[key] = value;
	} else {
		style[key] = value + 'px';
	}
}

const CAPTURE_REGEX = /(PointerCapture)$|Capture$/i;

let eventClock = 0;

function setProperty(dom, name, value, oldValue, namespace) {
	let useCapture;

	o: if (name == 'style') {
		if (typeof value == 'string') {
			dom.style.cssText = value;
		} else {
			if (typeof oldValue == 'string') {
				dom.style.cssText = oldValue = '';
			}

			if (oldValue) {
				for (name in oldValue) {
					if (!(value && name in value)) {
						setStyle(dom.style, name, '');
					}
				}
			}

			if (value) {
				for (name in value) {
					if (!oldValue || value[name] != oldValue[name]) {
						setStyle(dom.style, name, value[name]);
					}
				}
			}
		}
	}

	else if (name[0] == 'o' && name[1] == 'n') {
		useCapture = name != (name = name.replace(CAPTURE_REGEX, '$1'));
		const lowerCaseName = name.toLowerCase();

		if (lowerCaseName in dom || name == 'onFocusOut' || name == 'onFocusIn')
			name = lowerCaseName.slice(2);
		else name = name.slice(2);

		if (!dom._listeners) dom._listeners = {};
		dom._listeners[name + useCapture] = value;

		if (value) {
			if (!oldValue) {
				value._attached = eventClock;
				dom.addEventListener(
					name,
					useCapture ? eventProxyCapture : eventProxy,
					useCapture
				);
			} else {
				value._attached = oldValue._attached;
			}
		} else {
			dom.removeEventListener(
				name,
				useCapture ? eventProxyCapture : eventProxy,
				useCapture
			);
		}
	} else {
		if (namespace == SVG_NAMESPACE) {

			name = name.replace(/xlink(H|:h)/, 'h').replace(/sName$/, 's');
		} else if (
			name != 'width' &&
			name != 'height' &&
			name != 'href' &&
			name != 'list' &&
			name != 'form' &&

			name != 'tabIndex' &&
			name != 'download' &&
			name != 'rowSpan' &&
			name != 'colSpan' &&
			name != 'role' &&
			name != 'popover' &&
			name in dom
		) {
			try {
				dom[name] = value == NULL ? '' : value;

				break o;
			} catch (e) {}
		}

		if (typeof value == 'function') {

		} else if (value != NULL && (value !== false || name[4] == '-')) {
			dom.setAttribute(name, name == 'popover' && value == true ? '' : value);
		} else {
			dom.removeAttribute(name);
		}
	}
}

function createEventProxy(useCapture) {

	return function (e) {
		if (this._listeners) {
			const eventHandler = this._listeners[e.type + useCapture];
			if (e._dispatched == NULL) {
				e._dispatched = eventClock++;

			} else if (e._dispatched < eventHandler._attached) {
				return;
			}
			return eventHandler(options.event ? options.event(e) : e);
		}
	};
}

const eventProxy = createEventProxy(false);
const eventProxyCapture = createEventProxy(true);

// ============= index.js =============
function diff(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue
) {

	let tmp,
		newType = newVNode.type;

	if (newVNode.constructor != UNDEFINED) return NULL;

	if (oldVNode._flags & MODE_SUSPENDED) {
		isHydrating = !!(oldVNode._flags & MODE_HYDRATE);
		oldDom = newVNode._dom = oldVNode._dom;
		excessDomChildren = [oldDom];
	}

	if ((tmp = options._diff)) tmp(newVNode);

	outer: if (typeof newType == 'function') {
		try {
			let c, isNew, oldProps, oldState, snapshot, clearProcessingException;
			let newProps = newVNode.props;
			const isClassComponent =
				'prototype' in newType && newType.prototype.render;

			tmp = newType.contextType;
			let provider = tmp && globalContext[tmp._id];
			let componentContext = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: globalContext;

			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException = c._pendingError;
			} else {

				if (isClassComponent) {

					newVNode._component = c = new newType(newProps, componentContext); 
				} else {

					newVNode._component = c = new BaseComponent(
						newProps,
						componentContext
					);
					c.constructor = newType;
					c.render = doRender;
				}
				if (provider) provider.sub(c);

				c.props = newProps;
				if (!c.state) c.state = {};
				c.context = componentContext;
				c._globalContext = globalContext;
				isNew = c._dirty = true;
				c._renderCallbacks = [];
				c._stateCallbacks = [];
			}

			if (isClassComponent && c._nextState == NULL) {
				c._nextState = c.state;
			}

			if (isClassComponent && newType.getDerivedStateFromProps != NULL) {
				if (c._nextState == c.state) {
					c._nextState = assign({}, c._nextState);
				}

				assign(
					c._nextState,
					newType.getDerivedStateFromProps(newProps, c._nextState)
				);
			}

			oldProps = c.props;
			oldState = c.state;
			c._vnode = newVNode;

			if (isNew) {
				if (
					isClassComponent &&
					newType.getDerivedStateFromProps == NULL &&
					c.componentWillMount != NULL
				) {
					c.componentWillMount();
				}

				if (isClassComponent && c.componentDidMount != NULL) {
					c._renderCallbacks.push(c.componentDidMount);
				}
			} else {
				if (
					isClassComponent &&
					newType.getDerivedStateFromProps == NULL &&
					newProps !== oldProps &&
					c.componentWillReceiveProps != NULL
				) {
					c.componentWillReceiveProps(newProps, componentContext);
				}

				if (
					(!c._force &&
						c.shouldComponentUpdate != NULL &&
						c.shouldComponentUpdate(
							newProps,
							c._nextState,
							componentContext
						) === false) ||
					newVNode._original == oldVNode._original
				) {

					if (newVNode._original != oldVNode._original) {

						c.props = newProps;
						c.state = c._nextState;
						c._dirty = false;
					}

					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
					newVNode._children.some(vnode => {
						if (vnode) vnode._parent = newVNode;
					});

					for (let i = 0; i < c._stateCallbacks.length; i++) {
						c._renderCallbacks.push(c._stateCallbacks[i]);
					}
					c._stateCallbacks = [];

					if (c._renderCallbacks.length) {
						commitQueue.push(c);
					}

					break outer;
				}

				if (c.componentWillUpdate != NULL) {
					c.componentWillUpdate(newProps, c._nextState, componentContext);
				}

				if (isClassComponent && c.componentDidUpdate != NULL) {
					c._renderCallbacks.push(() => {
						c.componentDidUpdate(oldProps, oldState, snapshot);
					});
				}
			}

			c.context = componentContext;
			c.props = newProps;
			c._parentDom = parentDom;
			c._force = false;

			let renderHook = options._render,
				count = 0;
			if (isClassComponent) {
				c.state = c._nextState;
				c._dirty = false;

				if (renderHook) renderHook(newVNode);

				tmp = c.render(c.props, c.state, c.context);

				for (let i = 0; i < c._stateCallbacks.length; i++) {
					c._renderCallbacks.push(c._stateCallbacks[i]);
				}
				c._stateCallbacks = [];
			} else {
				do {
					c._dirty = false;
					if (renderHook) renderHook(newVNode);

					tmp = c.render(c.props, c.state, c.context);

					c.state = c._nextState;
				} while (c._dirty && ++count < 25);
			}

			c.state = c._nextState;

			if (c.getChildContext != NULL) {
				globalContext = assign(assign({}, globalContext), c.getChildContext());
			}

			if (isClassComponent && !isNew && c.getSnapshotBeforeUpdate != NULL) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			let isTopLevelFragment =
				tmp != NULL && tmp.type === Fragment && tmp.key == NULL;
			let renderResult = tmp;

			if (isTopLevelFragment) {
				renderResult = cloneNode(tmp.props.children);
			}

			oldDom = diffChildren(
				parentDom,
				isArray(renderResult) ? renderResult : [renderResult],
				newVNode,
				oldVNode,
				globalContext,
				namespace,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating,
				refQueue
			);

			c.base = newVNode._dom;

			newVNode._flags &= RESET_MODE;

			if (c._renderCallbacks.length) {
				commitQueue.push(c);
			}

			if (clearProcessingException) {
				c._pendingError = c._processingException = NULL;
			}
		} catch (e) {
			newVNode._original = NULL;

			if (isHydrating || excessDomChildren != NULL) {
				if (e.then) {
					newVNode._flags |= isHydrating
						? MODE_HYDRATE | MODE_SUSPENDED
						: MODE_SUSPENDED;

					while (oldDom && oldDom.nodeType == 8 && oldDom.nextSibling) {
						oldDom = oldDom.nextSibling;
					}

					excessDomChildren[excessDomChildren.indexOf(oldDom)] = NULL;
					newVNode._dom = oldDom;
				} else {
					for (let i = excessDomChildren.length; i--; ) {
						removeNode(excessDomChildren[i]);
					}
					markAsForce(newVNode);
				}
			} else {
				newVNode._dom = oldVNode._dom;
				newVNode._children = oldVNode._children;
				if (!e.then) markAsForce(newVNode);
			}
			options._catchError(e, newVNode, oldVNode);
		}
	} else if (
		excessDomChildren == NULL &&
		newVNode._original == oldVNode._original
	) {
		newVNode._children = oldVNode._children;
		newVNode._dom = oldVNode._dom;
	} else {
		oldDom = newVNode._dom = diffElementNodes(
			oldVNode._dom,
			newVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			isHydrating,
			refQueue
		);
	}

	if ((tmp = options.diffed)) tmp(newVNode);

	return newVNode._flags & MODE_SUSPENDED ? undefined : oldDom;
}

function markAsForce(vnode) {
	if (vnode && vnode._component) vnode._component._force = true;
	if (vnode && vnode._children) vnode._children.forEach(markAsForce);
}

function commitRoot(commitQueue, root, refQueue) {
	for (let i = 0; i < refQueue.length; i++) {
		applyRef(refQueue[i], refQueue[++i], refQueue[++i]);
	}

	if (options._commit) options._commit(root, commitQueue);

	commitQueue.some(c => {
		try {

			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {

				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}

function cloneNode(node) {
	if (
		typeof node != 'object' ||
		node == NULL ||
		(node._depth && node._depth > 0)
	) {
		return node;
	}

	if (isArray(node)) {
		return node.map(cloneNode);
	}

	return assign({}, node);
}

function diffElementNodes(
	dom,
	newVNode,
	oldVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	isHydrating,
	refQueue
) {
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;
	let nodeType =  (newVNode.type);

	let i;

	let newHtml;

	let oldHtml;

	let newChildren;
	let value;
	let inputValue;
	let checked;

	if (nodeType == 'svg') namespace = SVG_NAMESPACE;
	else if (nodeType == 'math') namespace = MATH_NAMESPACE;
	else if (!namespace) namespace = XHTML_NAMESPACE;

	if (excessDomChildren != NULL) {
		for (i = 0; i < excessDomChildren.length; i++) {
			value = excessDomChildren[i];

			if (
				value &&
				'setAttribute' in value == !!nodeType &&
				(nodeType ? value.localName == nodeType : value.nodeType == 3)
			) {
				dom = value;
				excessDomChildren[i] = NULL;
				break;
			}
		}
	}

	if (dom == NULL) {
		if (nodeType == NULL) {
			return document.createTextNode(newProps);
		}

		dom = document.createElementNS(
			namespace,
			nodeType,
			newProps.is && newProps
		);

		if (isHydrating) {
			if (options._hydrationMismatch)
				options._hydrationMismatch(newVNode, excessDomChildren);
			isHydrating = false;
		}

		excessDomChildren = NULL;
	}

	if (nodeType == NULL) {

		if (oldProps !== newProps && (!isHydrating || dom.data != newProps)) {
			dom.data = newProps;
		}
	} else {

		excessDomChildren = excessDomChildren && slice.call(dom.childNodes);

		oldProps = oldVNode.props || EMPTY_OBJ;

		if (!isHydrating && excessDomChildren != NULL) {
			oldProps = {};
			for (i = 0; i < dom.attributes.length; i++) {
				value = dom.attributes[i];
				oldProps[value.name] = value.value;
			}
		}

		for (i in oldProps) {
			value = oldProps[i];
			if (i == 'children') {
			} else if (i == 'dangerouslySetInnerHTML') {
				oldHtml = value;
			} else if (!(i in newProps)) {
				if (
					(i == 'value' && 'defaultValue' in newProps) ||
					(i == 'checked' && 'defaultChecked' in newProps)
				) {
					continue;
				}
				setProperty(dom, i, NULL, value, namespace);
			}
		}

		for (i in newProps) {
			value = newProps[i];
			if (i == 'children') {
				newChildren = value;
			} else if (i == 'dangerouslySetInnerHTML') {
				newHtml = value;
			} else if (i == 'value') {
				inputValue = value;
			} else if (i == 'checked') {
				checked = value;
			} else if (
				(!isHydrating || typeof value == 'function') &&
				oldProps[i] !== value
			) {
				setProperty(dom, i, value, oldProps[i], namespace);
			}
		}

		if (newHtml) {

			if (
				!isHydrating &&
				(!oldHtml ||
					(newHtml.__html != oldHtml.__html && newHtml.__html != dom.innerHTML))
			) {
				dom.innerHTML = newHtml.__html;
			}

			newVNode._children = [];
		} else {
			if (oldHtml) dom.innerHTML = '';

			diffChildren(

				newVNode.type == 'template' ? dom.content : dom,
				isArray(newChildren) ? newChildren : [newChildren],
				newVNode,
				oldVNode,
				globalContext,
				nodeType == 'foreignObject' ? XHTML_NAMESPACE : namespace,
				excessDomChildren,
				commitQueue,
				excessDomChildren
					? excessDomChildren[0]
					: oldVNode._children && getDomSibling(oldVNode, 0),
				isHydrating,
				refQueue
			);

			if (excessDomChildren != NULL) {
				for (i = excessDomChildren.length; i--; ) {
					removeNode(excessDomChildren[i]);
				}
			}
		}

		if (!isHydrating) {
			i = 'value';
			if (nodeType == 'progress' && inputValue == NULL) {
				dom.removeAttribute('value');
			} else if (
				inputValue != UNDEFINED &&

				(inputValue !== dom[i] ||
					(nodeType == 'progress' && !inputValue) ||

					(nodeType == 'option' && inputValue != oldProps[i]))
			) {
				setProperty(dom, i, inputValue, oldProps[i], namespace);
			}

			i = 'checked';
			if (checked != UNDEFINED && checked != dom[i]) {
				setProperty(dom, i, checked, oldProps[i], namespace);
			}
		}
	}

	return dom;
}

function applyRef(ref, value, vnode) {
	try {
		if (typeof ref == 'function') {
			let hasRefUnmount = typeof ref._unmount == 'function';
			if (hasRefUnmount) {

				ref._unmount();
			}

			if (!hasRefUnmount || value != NULL) {

				ref._unmount = ref(value);
			}
		} else ref.current = value;
	} catch (e) {
		options._catchError(e, vnode);
	}
}

function unmount(vnode, parentVNode, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if ((r = vnode.ref)) {
		if (!r.current || r.current == vnode._dom) {
			applyRef(r, NULL, parentVNode);
		}
	}

	if ((r = vnode._component) != NULL) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentVNode);
			}
		}

		r.base = r._parentDom = NULL;
	}

	if ((r = vnode._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) {
				unmount(
					r[i],
					parentVNode,
					skipRemove || typeof vnode.type != 'function'
				);
			}
		}
	}

	if (!skipRemove) {
		removeNode(vnode._dom);
	}

	vnode._component = vnode._parent = vnode._dom = UNDEFINED;
}

function doRender(props, state, context) {
	return this.constructor(props, context);
}

// ============= component.js =============
function BaseComponent(props, context) {
	this.props = props;
	this.context = context;
}

BaseComponent.prototype.setState = function (update, callback) {

	let s;
	if (this._nextState != NULL && this._nextState != this.state) {
		s = this._nextState;
	} else {
		s = this._nextState = assign({}, this.state);
	}

	if (typeof update == 'function') {

		update = update(assign({}, s), this.props);
	}

	if (update) {
		assign(s, update);
	}

	if (update == NULL) return;

	if (this._vnode) {
		if (callback) {
			this._stateCallbacks.push(callback);
		}
		enqueueRender(this);
	}
};

BaseComponent.prototype.forceUpdate = function (callback) {
	if (this._vnode) {

		this._force = true;
		if (callback) this._renderCallbacks.push(callback);
		enqueueRender(this);
	}
};

BaseComponent.prototype.render = Fragment;

function getDomSibling(vnode, childIndex) {
	if (childIndex == NULL) {

		return vnode._parent
			? getDomSibling(vnode._parent, vnode._index + 1)
			: NULL;
	}

	let sibling;
	for (; childIndex < vnode._children.length; childIndex++) {
		sibling = vnode._children[childIndex];

		if (sibling != NULL && sibling._dom != NULL) {

			return sibling._dom;
		}
	}

	return typeof vnode.type == 'function' ? getDomSibling(vnode) : NULL;
}

function renderComponent(component) {
	let oldVNode = component._vnode,
		oldDom = oldVNode._dom,
		commitQueue = [],
		refQueue = [];

	if (component._parentDom) {
		const newVNode = assign({}, oldVNode);
		newVNode._original = oldVNode._original + 1;
		if (options.vnode) options.vnode(newVNode);

		diff(
			component._parentDom,
			newVNode,
			oldVNode,
			component._globalContext,
			component._parentDom.namespaceURI,
			oldVNode._flags & MODE_HYDRATE ? [oldDom] : NULL,
			commitQueue,
			oldDom == NULL ? getDomSibling(oldVNode) : oldDom,
			!!(oldVNode._flags & MODE_HYDRATE),
			refQueue
		);

		newVNode._original = oldVNode._original;
		newVNode._parent._children[newVNode._index] = newVNode;
		commitRoot(commitQueue, newVNode, refQueue);
		oldVNode._dom = oldVNode._parent = null;

		if (newVNode._dom != oldDom) {
			updateParentDomPointers(newVNode);
		}
	}
}

function updateParentDomPointers(vnode) {
	if ((vnode = vnode._parent) != NULL && vnode._component != NULL) {
		vnode._dom = vnode._component.base = NULL;
		for (let i = 0; i < vnode._children.length; i++) {
			let child = vnode._children[i];
			if (child != NULL && child._dom != NULL) {
				vnode._dom = vnode._component.base = child._dom;
				break;
			}
		}

		return updateParentDomPointers(vnode);
	}
}

let rerenderQueue = [];

let prevDebounce;

const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

function enqueueRender(c) {
	if (
		(!c._dirty &&
			(c._dirty = true) &&
			rerenderQueue.push(c) &&
			!process._rerenderCount++) ||
		prevDebounce != options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || defer)(process);
	}
}

const depthSort = (a, b) => a._vnode._depth - b._vnode._depth;

function process() {
	let c,
		l = 1;

	while (rerenderQueue.length) {

		if (rerenderQueue.length > l) {
			rerenderQueue.sort(depthSort);
		}

		c = rerenderQueue.shift();
		l = rerenderQueue.length;

		if (c._dirty) {
			renderComponent(c);
		}
	}
	process._rerenderCount = 0;
}

process._rerenderCount = 0;

// ============= clone-element.js =============
function cloneElement(vnode, props, children) {
	let normalizedProps = assign({}, vnode.props),
		key,
		ref,
		i;

	let defaultProps;

	if (vnode.type && vnode.type.defaultProps) {
		defaultProps = vnode.type.defaultProps;
	}

	for (i in props) {
		if (i == 'key') key = props[i];
		else if (i == 'ref') ref = props[i];
		else if (props[i] === UNDEFINED && defaultProps != UNDEFINED) {
			normalizedProps[i] = defaultProps[i];
		} else {
			normalizedProps[i] = props[i];
		}
	}

	if (arguments.length > 2) {
		normalizedProps.children =
			arguments.length > 3 ? slice.call(arguments, 2) : children;
	}

	return createVNode(
		vnode.type,
		normalizedProps,
		key || vnode.key,
		ref || vnode.ref,
		NULL
	);
}

// ============= create-context.js =============
let i = 0;

function createContext(defaultValue) {
	function Context(props) {
		if (!this.getChildContext) {

			let subs = new Set();
			let ctx = {};
			ctx[Context._id] = this;

			this.getChildContext = () => ctx;

			this.componentWillUnmount = () => {
				subs = NULL;
			};

			this.shouldComponentUpdate = function (_props) {

				if (this.props.value != _props.value) {
					subs.forEach(c => {
						c._force = true;
						enqueueRender(c);
					});
				}
			};

			this.sub = c => {
				subs.add(c);
				let old = c.componentWillUnmount;
				c.componentWillUnmount = () => {
					if (subs) {
						subs.delete(c);
					}
					if (old) old.call(c);
				};
			};
		}

		return props.children;
	}

	Context._id = '__cC' + i++;
	Context._defaultValue = defaultValue;

	Context.Consumer = (props, contextValue) => {
		return props.children(contextValue);
	};

	Context.Provider =
		Context._contextRef =
		Context.Consumer.contextType =
			Context;

	return Context;
}

// ============= render.js =============
function render(vnode, parentDom, replaceNode) {

	if (parentDom == document) {
		parentDom = document.documentElement;
	}

	if (options._root) options._root(vnode, parentDom);

	let isHydrating = typeof replaceNode == 'function';

	let oldVNode = isHydrating
		? NULL
		: (replaceNode && replaceNode._children) || parentDom._children;

	vnode = ((!isHydrating && replaceNode) || parentDom)._children =
		createElement(Fragment, NULL, [vnode]);

	let commitQueue = [],
		refQueue = [];
	diff(
		parentDom,

		vnode,
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.namespaceURI,
		!isHydrating && replaceNode
			? [replaceNode]
			: oldVNode
				? NULL
				: parentDom.firstChild
					? slice.call(parentDom.childNodes)
					: NULL,
		commitQueue,
		!isHydrating && replaceNode
			? replaceNode
			: oldVNode
				? oldVNode._dom
				: parentDom.firstChild,
		isHydrating,
		refQueue
	);

	commitRoot(commitQueue, vnode, refQueue);
}

function hydrate(vnode, parentDom) {
	render(vnode, parentDom, hydrate);
}

// ============= index.js =============

// Preact aliases (from re-exports)
const h = createElement;
const preactRender = render;

// ============= reactivity.js =============

let debugReactivityHook = null;
function setDebugReactivityHook(hook) {
    debugReactivityHook = hook;
}

let activeEffect = null;

const effectStack = [];

function createEffect(fn) {
    let disposed = false;

    const effect = () => {

        if (disposed) return;

        activeEffect = effect;
        effectStack.push(effect);
        try {
            return fn();
        } finally {
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1];
        }
    };

    effect.deps = new Set();

    const dispose = () => {
        if (disposed) return;
        disposed = true;

        effect.deps.forEach(dep => {
            dep.delete(effect);
        });

        effect.deps.clear();

        const index = effectStack.indexOf(effect);
        if (index !== -1) {
            effectStack.splice(index, 1);
        }

        if (activeEffect === effect) {
            activeEffect = null;
        }
    };

    effect();

    return { effect, dispose };
}

function track(target, key) {
    if (activeEffect) {
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        let deps = depsMap.get(key);
        if (!deps) {
            depsMap.set(key, (deps = new Set()));
        }
        deps.add(activeEffect);
        activeEffect.deps.add(deps);
    }
}

function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const deps = depsMap.get(key);
    if (deps) {
        if (debugReactivityHook) {
            debugReactivityHook(target, key, target[key], `trigger(${deps.size} effects)`);
        }
        const effects = [...deps];
        effects.forEach(effect => effect());
    }
}

const targetMap = new WeakMap();

function reactive(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj.__isReactive) {
        return obj;
    }

    if (obj instanceof Set || obj instanceof Map || obj instanceof WeakSet || obj instanceof WeakMap || obj instanceof Promise) {
        return obj;
    }

    const proxy = new Proxy(obj, {
        get(target, key, receiver) {

            if (key === '__isReactive') {
                return true;
            }

            track(target, key);
            const value = Reflect.get(target, key, receiver);

            if (Array.isArray(target) && typeof value === 'function') {
                const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
                if (arrayMethods.includes(key)) {
                    return function(...args) {
                        const result = value.apply(target, args);

                        trigger(target, 'length');
                        return result;
                    };
                }
            }

            if (typeof value === 'object' && value !== null &&
                !(value instanceof Set) && !(value instanceof Map) &&
                !(value instanceof WeakSet) && !(value instanceof WeakMap)) {
                return reactive(value);
            }

            return value;
        },

        set(target, key, value, receiver) {
            const oldValue = target[key];
            const result = Reflect.set(target, key, value, receiver);

            const isObjectAssignment = value !== null && typeof value === 'object';
            if (oldValue !== value || isObjectAssignment) {
                if (debugReactivityHook) {
                    debugReactivityHook(target, key, value, 'set');
                }
                trigger(target, key);
            }

            return result;
        },

        deleteProperty(target, key) {
            const result = Reflect.deleteProperty(target, key);
            trigger(target, key);
            return result;
        }
    });

    return proxy;
}

function computed(getter) {
    let value;
    let dirty = true;
    let firstRun = true;

    const { dispose } = createEffect(() => {
        if (firstRun) {

            value = getter();
            dirty = false;
            firstRun = false;
        } else {

            dirty = true;
        }
    });

    const get = () => {
        if (dirty) {
            value = getter();
            dirty = false;
        }
        return value;
    };

    return { get, dispose };
}

function watch(fn, callback) {
    let oldValue;

    const { dispose } = createEffect(() => {
        const newValue = fn();
        if (callback && oldValue !== undefined) {
            callback(newValue, oldValue);
        }
        oldValue = newValue;
    });

    return dispose;
}

function isReactive(value) {
    return !!(value && value.__isReactive);
}

function memo(fn, deps) {
    let cachedValue;
    let lastDeps = null;
    let dirty = true;

    return (...args) => {

        if (deps) {
            const depsChanged = !lastDeps || deps.some((dep, i) => dep !== lastDeps[i]);
            if (depsChanged) {
                dirty = true;
                lastDeps = [...deps];
            }
        }

        if (dirty) {
            cachedValue = fn(...args);
            dirty = false;
        }

        return cachedValue;
    };
}

function trackAllDependencies(obj, visited = new Set()) {

    if (obj === null || obj === undefined) return;

    if (typeof obj !== 'object') return;

    if (visited.has(obj)) return;
    visited.add(obj);

    if (Array.isArray(obj)) {

        obj.length;

        for (let i = 0; i < obj.length; i++) {
            const item = obj[i];
            if (typeof item === 'object' && item !== null) {
                trackAllDependencies(item, visited);
            }
        }
        return;
    }

    try {
        const keys = Object.keys(obj);
        for (const key of keys) {
            try {
                const value = obj[key];  

                if (typeof value === 'object' && value !== null) {
                    trackAllDependencies(value, visited);
                }
            } catch (e) {

            }
        }
    } catch (e) {

    }
}

// ============= template.js =============
const templateCompiler = {
    compileTemplate: compileTemplate,
    applyValues: applyValues,
    clearTemplateCache: clearTemplateCache,
    pruneTemplateCache: pruneTemplateCache,
    getTemplateCacheSize: getTemplateCacheSize
};

const HTML_MARKER = Symbol('html');
const RAW_MARKER = Symbol('raw');

const isHtml = (obj) => obj && obj[HTML_MARKER] === true;
const isRaw = (obj) => obj && obj[RAW_MARKER] === true;

const OP = {
    STATIC: 0,      
    SLOT: 1,        
    TEXT: 2,        
    ELEMENT: 3,     
    FRAGMENT: 4,    
};

function normalizeInput(input) {
    if (input == null) return '';
    let str = String(input);

    str = str.replace(/\x00/g, '');

    str = str.replace(/^\uFEFF/, '');

    if (typeof str.normalize === 'function') {
        str = str.normalize('NFC');
    }

    str = str.replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, '');

    str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

    return str;
}

function escapeUrl(url) {
    const normalized = normalizeInput(url);
    return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/=/g, '&#x3D;')
        .replace(/`/g, '&#x60;');

}

function sanitizeUrl(url) {
    const normalized = normalizeInput(url);

    const cleaned = normalized.replace(/\s/g, '');

    const decoded = cleaned
        .replace(/&colon;/gi, ':')
        .replace(/&#58;/g, ':')
        .replace(/&#x3a;/gi, ':')
        .replace(/&sol;/gi, '/')
        .replace(/&#47;/g, '/')
        .replace(/&#x2f;/gi, '/');

    const schemeMatch = decoded.match(/^([a-zA-Z][a-zA-Z0-9+.-]*?):/);

    if (!schemeMatch) {

        return escapeUrl(normalized);
    }

    const scheme = schemeMatch[1].toLowerCase();

    const safeSchemes = ['http', 'https', 'mailto', 'tel', 'sms', 'ftp', 'ftps'];

    if (!safeSchemes.includes(scheme)) {
        console.warn('[Security] Blocked dangerous URL scheme:', url);
        return '';
    }

    return escapeUrl(normalized);
}

function html(strings, ...values) {
    const { compileTemplate } = html._compiler;
    const compiled = compileTemplate(strings);

    return {
        [HTML_MARKER]: true,
        _compiled: compiled,
        _values: values,
        toString() {
            return '';  
        }
    };
}

function raw(htmlString) {
    return {
        [RAW_MARKER]: true,
        toString() {
            return htmlString;
        }
    };
}

function when(condition, thenValue, elseValue = null) {
    let result = condition ? thenValue : elseValue;

    if (typeof result === 'function') {
        result = result();
    }

    if (!result) {

        return {
            [HTML_MARKER]: true,
            _compiled: {
                op: OP.STATIC,
                vnode: null,
                type: 'fragment',
                wrapped: false,
                children: []
            },
            toString() {
                return '';
            }
        };
    }

    if (isHtml(result)) {

        if (result._compiled) {
            return {
                ...result,
                _compiled: {
                    ...result._compiled,
                    wrapped: true
                }
            };
        }
        return result;
    }

    if (typeof result === 'function') {
        return when(condition, result());
    }

    return result;
}

function each(array, mapFn, keyFn = null) {
    if (!array || !Array.isArray(array)) {

        return {
            [HTML_MARKER]: true,
            _compiled: {
                op: OP.STATIC,
                vnode: null,
                type: 'fragment',
                wrapped: false,
                children: []
            },
            toString() {
                return '';
            }
        };
    }

    const results = array.map((item, index) => {
        const result = mapFn(item, index);

        if (keyFn && result && result._compiled) {
            const key = keyFn(item);

            return {
                ...result,
                _compiled: {
                    ...result._compiled,
                    key: key
                }
            };
        }

        return result;
    });

    const compiledChildren = results
        .map((r, itemIndex) => {
            if (!r || !r._compiled) return null;

            const child = r._compiled;
            const childValues = r._values;  

            if (child.type === 'text' && child.value && /^\s*$/.test(child.value)) {
                return null;
            }

            if (child.type === 'fragment' && !child.wrapped && child.children.length === 1 && child.children[0].type === 'element') {
                const element = child.children[0];
                const key = keyFn ? keyFn(array[itemIndex]) : itemIndex;
                return {...element, key, _itemValues: childValues};
            }

            const key = keyFn ? keyFn(array[itemIndex]) : itemIndex;
            return {...child, key, _itemValues: childValues};
        })
        .filter(Boolean);

    return {
        [HTML_MARKER]: true,
        _compiled: {
            op: OP.FRAGMENT,
            type: 'fragment',
            wrapped: false,  
            fromEach: true,   
            children: compiledChildren
        },
        toString() {
            return '';  
        }
    };
}

function awaitThen(promiseOrValue, thenFn, pendingContent, catchFn = null) {
    return html`
        <x-await-then
            promise="${promiseOrValue}"
            then="${thenFn}"
            pending="${pendingContent}"
            catch="${catchFn}">
        </x-await-then>
    `;
}

html._compiler = templateCompiler;

// ============= component.js =============

let debugRenderCycleHook = null;
let debugPropSetHook = null;
let debugVNodeHook = null;

const componentDefinitions = new Map();

let isRenderingTree = false;

function performTreeRender(root) {

    if (isRenderingTree) {
        return;
    }

    isRenderingTree = true;

    try {

        renderComponentTree(root);
    } finally {
        isRenderingTree = false;
    }
}

function renderComponentTree(component) {
    if (!component._isMounted || component._isDestroyed) {
        return;
    }

    component._doRender();

    if (component._vdxChildComponents) {
        for (const child of component._vdxChildComponents) {
            renderComponentTree(child);
        }
    }
}

function setDebugComponentHooks(hooks) {
    debugRenderCycleHook = hooks.renderCycle;
    debugPropSetHook = hooks.propSet;
    debugVNodeHook = hooks.vnode;
}

const processedStylesCache = new Map();

function stripCSSComments(css) {
    let result = '';
    let i = 0;
    const len = css.length;

    while (i < len) {

        if (css[i] === '/' && i + 1 < len && css[i + 1] === '*') {

            i += 2;
            while (i < len - 1 && !(css[i] === '*' && css[i + 1] === '/')) {
                i++;
            }
            i += 2; 

            result += ' ';
        } else {
            result += css[i];
            i++;
        }
    }

    return result;
}

function namespaceKeyframes(css, tagName) {

    const keyframeNames = new Set();
    const keyframeRegex = /@(?:-webkit-)?keyframes\s+([a-zA-Z_][\w-]*)/g;
    let match;

    while ((match = keyframeRegex.exec(css)) !== null) {
        keyframeNames.add(match[1]);
    }

    if (keyframeNames.size === 0) {
        return css;
    }

    const prefix = tagName + '--';

    let result = css.replace(
        /@(-webkit-)?keyframes\s+([a-zA-Z_][\w-]*)/g,
        (match, webkit, name) => {
            if (keyframeNames.has(name)) {
                return `@${webkit || ''}keyframes ${prefix}${name}`;
            }
            return match;
        }
    );

    for (const name of keyframeNames) {

        const animationRegex = new RegExp(
            `(animation(?:-name)?\\s*:[^;]*?)\\b(${name})\\b`,
            'g'
        );
        result = result.replace(animationRegex, `$1${prefix}${name}`);
    }

    return result;
}

function scopeComponentStyles(css, tagName) {
    let result = '';
    let i = 0;

    css = stripCSSComments(css);

    css = namespaceKeyframes(css, tagName);

    const len = css.length;

    css = css.replace(/:host/g, tagName);

    while (i < len) {

        while (i < len && /\s/.test(css[i])) {
            result += css[i];
            i++;
        }

        if (i >= len) break;

        if (css[i] === '@') {

            let j = i;
            while (j < len && css[j] !== '{') {
                j++;
            }

            const atRuleDecl = css.substring(i, j);
            const isKeyframes = /^@keyframes\s/i.test(atRuleDecl) || /^@-webkit-keyframes\s/i.test(atRuleDecl);

            result += css.substring(i, j + 1);
            i = j + 1;

            let depth = 1;
            let atRuleBody = '';
            while (i < len && depth > 0) {
                if (css[i] === '{') depth++;
                if (css[i] === '}') depth--;

                if (depth > 0) {
                    atRuleBody += css[i];
                }
                i++;
            }

            if (isKeyframes) {
                result += atRuleBody;
            } else {
                result += scopeComponentStyles(atRuleBody, tagName);
            }
            result += '}';
            continue;
        }

        let selector = '';
        while (i < len && css[i] !== '{') {
            selector += css[i];
            i++;
        }

        selector = selector.trim();
        if (!selector) {
            if (i < len) {
                result += css[i];
                i++;
            }
            continue;
        }

        if (i < len && css[i] === '{') {
            i++;
        }

        let depth = 1;
        let body = '';
        while (i < len && depth > 0) {
            if (css[i] === '{') depth++;
            if (css[i] === '}') depth--;

            if (depth > 0) {
                body += css[i];
            }
            i++;
        }

        const scopedSelector = scopeSelector(selector, tagName);
        result += `${scopedSelector} { ${body} }\n`;
    }

    return result;
}

function scopeSelector(selector, tagName) {

    const selectors = selector.split(',').map(s => s.trim());

    return selectors.map(sel => {

        if (sel === '*' || sel === 'body' || sel === 'html' || sel.startsWith('@')) {
            return sel;
        }

        if (sel.startsWith(tagName)) {
            return sel;
        }

        return `${tagName} ${sel}`;
    }).join(', ');
}

function defineComponent(name, options) {

    const reservedNames = new Set([
        'constructor', '__proto__', 'prototype', 'toString',
        'valueOf', 'hasOwnProperty', 'isPrototypeOf'
    ]);

    class Component extends HTMLElement {
        constructor() {
            super();

            this.state = reactive(options.data ? options.data.call(this) : {});

            this.props = {
                children: [],
                slots: {}
            };

            if (this._pendingProps) {
                for (const [propName, value] of Object.entries(this._pendingProps)) {
                    this.props[propName] = value;
                    if (typeof value === 'string') {

                        this.setAttribute(propName, value);
                    }
                }
                delete this._pendingProps;
            }

            if (options.stores) {
                this.stores = {};
                for (const [storeName, store] of Object.entries(options.stores)) {

                    this.stores[storeName] = reactive({ ...store.state });
                }
            }

            this.refs = {};

            if (options.methods) {
                for (const [name, method] of Object.entries(options.methods)) {
                    this[name] = method.bind(this);
                }
            }

            if (options.propsChanged) {
                this.propsChanged = options.propsChanged.bind(this);
            }

            this._isMounted = false;
            this._isDestroyed = false;
            this._suppressAttributeChange = false;

            this._isVdxComponent = true;
            this._vdxParent = null;
            this._vdxChildComponents = null;  
            this._isVdxRoot = false;   

            this._cleanups = [];
        }

        emitChange(e, value, propName = 'value') {

            if (e && e.stopPropagation) {
                e.stopPropagation();
            }

            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                composed: true,
                detail: { value }
            }));
        }

        connectedCallback() {
            if (this._isDestroyed) return;

            this._parseAttributes();

            this._isMounted = true;

            let parent = this.parentElement;
            while (parent) {
                if (parent._isVdxComponent) {
                    this._vdxParent = parent;

                    if (!(parent._vdxChildComponents instanceof Set)) {
                        parent._vdxChildComponents = new Set();
                    }
                    parent._vdxChildComponents.add(this);
                    break;
                }
                parent = parent.parentElement;
            }

            this._isVdxRoot = !this._vdxParent;

            if (options.stores) {
                for (const [storeName, store] of Object.entries(options.stores)) {
                    const unsubscribe = store.subscribe(state => {

                        for (const key of Object.keys(state)) {
                            this.stores[storeName][key] = state[key];
                        }
                    });
                    this._cleanups.push(unsubscribe);
                }
            }

            const { dispose: disposeRenderEffect } = createEffect(() => {

                trackAllDependencies(this.state);

                if (this.stores) {
                    for (const storeState of Object.values(this.stores)) {
                        trackAllDependencies(storeState);
                    }
                }

                if (this._isMounted && !this._isDestroyed) {
                    performTreeRender(this._getVdxRoot());
                }
            });

            this._cleanups.push(disposeRenderEffect);

            if (options.mounted) {

                queueMicrotask(() => {

                    if (this._isMounted && !this._isDestroyed) {
                        options.mounted.call(this);
                    }
                });
            }
        }

        disconnectedCallback() {

            this._isDestroyed = true;
            this._isMounted = false;

            if (this._vdxParent && this._vdxParent._vdxChildComponents) {
                this._vdxParent._vdxChildComponents.delete(this);
            }
            this._vdxParent = null;

            if (this._cleanups && this._cleanups.length > 0) {
                this._cleanups.forEach(fn => fn());
                this._cleanups = [];
            }

            if (options.unmounted) {
                options.unmounted.call(this);
            }

            this.refs = {};

            preactRender(null, this);
        }

        attributeChangedCallback(name, oldValue, newValue) {

            if (!this._isMounted || oldValue === newValue || this._suppressAttributeChange) {
                return;
            }

            if (options.props && name in options.props) {
                this.props[name] = newValue;

                performTreeRender(this._getVdxRoot());
            }
        }

        _getVdxRoot() {
            let current = this;
            while (current._vdxParent) {
                current = current._vdxParent;
            }
            return current;
        }

        static get observedAttributes() {

            return options.props ? Object.keys(options.props) : [];
        }

        _parseAttributes() {

            if (options.props) {
                for (const propName of Object.keys(options.props)) {
                    if (propName === 'style') {

                        continue;
                    }

                    if (propName in this && this[propName] !== undefined && this[propName] !== options.props[propName]) {

                        const value = this[propName];
                        this.props[propName] = value;
                        continue;
                    }

                    const attrValue = this.getAttribute(propName);
                    if (attrValue !== null) {
                        this.props[propName] = attrValue;
                    } else if (!(propName in this.props)) {

                        this.props[propName] = options.props[propName];
                    }
                }
            }
        }

        _doRender() {

            if (this._isDestroyed || !this._isMounted) {
                return;
            }

            if (!options.template) return;

            if (debugRenderCycleHook) {
                debugRenderCycleHook(this, 'before-template');
            }

            if (options.styles && !this._stylesInjected) {
                const styleId = `component-styles-${options.name || this.tagName}`;
                const tagName = this.tagName.toLowerCase();

                if (!document.getElementById(styleId)) {

                    let processedStyles = processedStylesCache.get(tagName);

                    if (!processedStyles) {

                        processedStyles = scopeComponentStyles(options.styles, tagName);

                        processedStylesCache.set(tagName, processedStyles);
                    }

                    const styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    styleEl.textContent = processedStyles;
                    document.head.appendChild(styleEl);
                }
                this._stylesInjected = true;
            }

            const templateResult = options.template.call(this);

            if (debugRenderCycleHook) {
                debugRenderCycleHook(this, 'after-template', {
                    hasCompiled: !!templateResult?._compiled,
                    valuesCount: templateResult?._values?.length || 0
                });
            }

            if (templateResult && templateResult._compiled) {

                const preactElement = applyValues(
                    templateResult._compiled,
                    templateResult._values || [],
                    this
                );

                if (debugRenderCycleHook) {
                    debugRenderCycleHook(this, 'before-vnode', {
                        isNull: preactElement === null,
                        type: preactElement?.type || 'null'
                    });
                }
                if (debugVNodeHook) {
                    debugVNodeHook(this, preactElement);
                }

                preactRender(preactElement, this);

                if (debugRenderCycleHook) {
                    debugRenderCycleHook(this, 'after-vnode');
                }
            } else {

                console.error(`[${this.tagName}] Template was not compiled. Ensure you're using the html\`\` tag.`);
            }

            if (options.afterRender && this._isMounted) {
                Promise.resolve().then(() => {
                    if (!this._isDestroyed && this._isMounted) {
                        options.afterRender.call(this);
                    }
                });
            }
        }

        render() {
            if (this._isMounted && !this._isDestroyed) {
                performTreeRender(this._getVdxRoot());
            }
        }

        $method(name) {
            return options.methods?.[name]?.bind(this);
        }
    }

    const scheduleRender = (component) => {
        if (component._isMounted && !component._isDestroyed) {
            performTreeRender(component._getVdxRoot());
        }
    };

    const createPropSetter = (propName) => ({
        get() {

            return this.props ? this.props[propName] : undefined;
        },
        set(value) {

            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, propName, value, value, this._isMounted);
            }

            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps[propName] = value;
                return;
            }

            const oldValue = this.props[propName];
            this.props[propName] = value;

            this._suppressAttributeChange = true;
            if (typeof value === 'string') {
                this.setAttribute(propName, value);
            } else if (this.hasAttribute(propName)) {

                this.removeAttribute(propName);
            }
            this._suppressAttributeChange = false;

            if (this._isMounted) {
                if (typeof this.propsChanged === 'function' && value !== oldValue) {
                    this.propsChanged(propName, value, oldValue);
                }

                scheduleRender(this);
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Component.prototype, 'children', {
        get() {
            return this.props ? this.props.children : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, 'children', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.children = value;
                return;
            }
            this.props.children = value;
            if (this._isMounted) scheduleRender(this);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Component.prototype, 'slots', {
        get() {
            return this.props ? this.props.slots : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, 'slots', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.slots = value;
                return;
            }
            this.props.slots = value;
            if (this._isMounted) scheduleRender(this);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Component.prototype, '_vdxChildren', {
        get() {
            return this.props ? this.props.children : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, '_vdxChildren', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.children = value;
                return;
            }
            this.props.children = value;
            if (this._isMounted) scheduleRender(this);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Component.prototype, '_vdxSlots', {
        get() {
            return this.props ? this.props.slots : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, '_vdxSlots', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.slots = value;
                return;
            }
            this.props.slots = value;
            if (this._isMounted) scheduleRender(this);
        },
        enumerable: true,
        configurable: true
    });

    if (options.props) {
        for (const propName of Object.keys(options.props)) {
            if (reservedNames.has(propName) || propName === 'children' || propName === 'slots') {
                if (reservedNames.has(propName)) {
                    console.warn(`[Security] Skipping reserved prop name: ${propName}`);
                }
                continue;
            }
            if (propName === 'style') {

                Object.defineProperty(Component.prototype, '_vdxStyle', {
                    get() {
                        return this.props ? this.props.style : undefined;
                    },
                    set(value) {
                        if (debugPropSetHook) {
                            debugPropSetHook(this.tagName || name, '_vdxStyle', value, value, this._isMounted);
                        }
                        if (!this.props) {
                            if (!this._pendingProps) this._pendingProps = {};
                            this._pendingProps.style = value;
                            return;
                        }
                        this.props.style = value;
                        if (this._isMounted) scheduleRender(this);
                    },
                    enumerable: true,
                    configurable: true
                });
                continue;
            }
            Object.defineProperty(Component.prototype, propName, createPropSetter(propName));
        }
    }

    if (!customElements.get(name)) {
        customElements.define(name, Component);
        componentDefinitions.set(name, Component);
    }

    return Component;
}

// ============= template-compiler.js =============

const BOOLEAN_ATTRS = new Set([
    'disabled', 'checked', 'selected', 'readonly', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
    'muted', 'open', 'reversed', 'hidden', 'async', 'defer'
]);

function getNestedValue(obj, path) {
    if (!path || !obj) return undefined;
    if (!path.includes('.')) return obj[path];

    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

function setNestedValue(obj, path, value) {
    if (!path || !obj) return;
    if (!path.includes('.')) {
        obj[path] = value;
        return;
    }

    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

const templateCache = new Map();

const MAX_CACHE_SIZE = 500;

const cacheAccessTimes = new Map();

function compileTemplate(strings) {

    if (templateCache.has(strings)) {
        cacheAccessTimes.set(strings, Date.now());
        return templateCache.get(strings);
    }

    let fullTemplate = '';
    for (let i = 0; i < strings.length; i++) {
        fullTemplate += strings[i];
        if (i < strings.length - 1) {
            fullTemplate += `__SLOT_${i}__`;
        }
    }

    const parsed = parseXMLToTree(fullTemplate);
    const compiled = buildOpTree(parsed);

    templateCache.set(strings, compiled);
    cacheAccessTimes.set(strings, Date.now());

    if (templateCache.size > MAX_CACHE_SIZE) {
        cleanupTemplateCache();
    }

    return compiled;
}

function cleanupTemplateCache() {
    const entries = Array.from(cacheAccessTimes.entries())
        .sort((a, b) => a[1] - b[1]);

    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
        const [staticsArray] = entries[i];
        templateCache.delete(staticsArray);
        cacheAccessTimes.delete(staticsArray);
    }
}

function buildOpTree(node) {
    if (!node) return null;

    if (isFullyStatic(node)) {

        const staticVNode = buildStaticVNode(node);
        return {
            op: OP.STATIC,
            vnode: staticVNode,

            type: 'fragment',
            children: [],  
            isStatic: true
        };
    }

    if (node.type === 'text') {
        if (node.slot !== undefined) {
            return {
                op: OP.SLOT,
                index: node.slot,
                context: node.context || 'content',
                type: 'text'
            };
        }
        return {
            op: OP.TEXT,
            value: node.value,
            type: 'text',
            isStatic: true
        };
    }

    if (node.type === 'fragment') {
        const children = (node.children || [])
            .map(child => buildOpTree(child))
            .filter(Boolean);

        return {
            op: OP.FRAGMENT,
            children,
            wrapped: node.wrapped,
            fromEach: node.fromEach,
            key: node.key,
            type: 'fragment',
            isStatic: children.every(c => c.isStatic)
        };
    }

    if (node.type === 'element') {
        const isCustomElement = componentDefinitions.has(node.tag);

        const staticProps = {};
        const dynamicProps = [];

        for (const [name, attrDef] of Object.entries(node.attrs || {})) {
            if (attrDef.value !== undefined && attrDef.slot === undefined &&
                attrDef.slots === undefined && attrDef.xModel === undefined &&
                attrDef.refName === undefined) {

                staticProps[name] = attrDef.value;
            } else {

                dynamicProps.push({ name, def: attrDef });
            }
        }

        const events = [];
        for (const [eventName, eventDef] of Object.entries(node.events || {})) {
            events.push({ name: eventName, def: eventDef });
        }

        const children = (node.children || [])
            .map(child => buildOpTree(child))
            .filter(Boolean);

        return {
            op: OP.ELEMENT,
            tag: node.tag,
            staticProps,
            dynamicProps,
            events,
            children,
            isCustomElement,
            key: node.key,
            type: 'element',
            isStatic: dynamicProps.length === 0 && events.length === 0 &&
                      children.every(c => c.isStatic)
        };
    }

    return null;
}

function isFullyStatic(node) {
    if (!node) return true;

    if (node.type === 'text') {
        return node.slot === undefined;
    }

    if (node.type === 'fragment') {
        return (node.children || []).every(isFullyStatic);
    }

    if (node.type === 'element') {

        if (componentDefinitions.has(node.tag)) {
            return false;
        }

        for (const attrDef of Object.values(node.attrs || {})) {
            if (attrDef.slot !== undefined || attrDef.slots !== undefined ||
                attrDef.xModel !== undefined || attrDef.refName !== undefined) {
                return false;
            }
        }

        if (Object.keys(node.events || {}).length > 0) {
            return false;
        }

        return (node.children || []).every(isFullyStatic);
    }

    return true;
}

function buildStaticVNode(node) {
    if (!node) return null;

    if (node.type === 'text') {
        return node.value || '';
    }

    if (node.type === 'fragment') {
        const children = (node.children || [])
            .map(child => buildStaticVNode(child))
            .filter(child => child !== null && child !== undefined);

        if (children.length === 0) return null;
        if (children.length === 1) return children[0];

        return h(Fragment, null, ...children);
    }

    if (node.type === 'element') {
        const props = {};

        for (const [name, attrDef] of Object.entries(node.attrs || {})) {
            if (attrDef.value !== undefined) {
                let propName = name;
                if (name === 'class') propName = 'className';
                else if (name === 'for') propName = 'htmlFor';

                if (BOOLEAN_ATTRS.has(propName)) {
                    props[propName] = attrDef.value === propName || attrDef.value === 'true' || attrDef.value === true;
                } else {
                    props[propName] = attrDef.value;
                }
            }
        }

        const children = (node.children || [])
            .map(child => buildStaticVNode(child))
            .filter(child => child !== null && child !== undefined);

        return h(node.tag, props, ...children);
    }

    return null;
}

function applyValues(compiled, values, component = null) {
    if (!compiled) return null;

    if (compiled.op === OP.STATIC) {
        return compiled.vnode;
    }

    switch (compiled.op) {
        case OP.TEXT:
            return compiled.value;

        case OP.SLOT:
            return resolveSlotValue(compiled, values, component);

        case OP.FRAGMENT:
            return applyFragment(compiled, values, component);

        case OP.ELEMENT:
            return applyElement(compiled, values, component);

        default:
            throw new Error(`[applyValues] Unknown op type: ${compiled.op}`);
    }
}

function resolveSlotValue(compiled, values, component) {
    let value = values[compiled.index];

    if (isHtml(value)) {
        if (!('_compiled' in value)) {
            console.error('[applyValues] html() template missing _compiled');
            return null;
        }
        if (value._compiled === null) return null;
        return applyValues(value._compiled, value._values || [], component);
    }

    if (isRaw(value)) {
        return h('span', { dangerouslySetInnerHTML: { __html: value.toString() } });
    }

    if (value === null || value === undefined) return null;

    if (Array.isArray(value)) {
        if (value.length === 0) return null;

        const hasVNodes = value.some(item => {
            if (!item) return false;
            if (typeof item === 'string' || typeof item === 'number') return true;
            if (typeof item === 'object' && ('type' in item || 'props' in item || '__' in item)) return true;
            return false;
        });

        if (hasVNodes) return value;
        return value.join('');
    }

    if (typeof value === 'object') {

        if (value.type || value.props || value.__) {
            return value;
        }

        return Object.prototype.toString.call(value);
    }

    if (typeof value === 'string') {
        value = value.replace(/[\uFEFF\u200B-\u200D\uFFFE\uFFFF]/g, '');
    }

    return value;
}

function applyFragment(compiled, values, component) {
    const children = compiled.children
        .map(child => {
            const childValues = child._itemValues !== undefined ? child._itemValues : values;
            return applyValues(child, childValues, component);
        })
        .filter(child => child !== undefined && child !== false && child !== null);

    if (children.length === 0) return null;

    const props = compiled.key !== undefined ? { key: compiled.key } : null;
    return h(Fragment, props, ...children);
}

function applyElement(compiled, values, component) {
    const props = { ...compiled.staticProps };
    const isCustomElement = compiled.isCustomElement;

    for (const { name, def } of compiled.dynamicProps) {
        const value = resolveProp(name, def, values, component, isCustomElement);
        if (value !== undefined) {

            let propName = name;
            if (name === 'class') propName = 'className';
            else if (name === 'for') propName = 'htmlFor';
            else if (name === 'style' && isCustomElement) {
                props._vdxStyle = value;
                continue;
            }

            if (name === '__ref__') {

                props.ref = createRefCallback(def.refName, component);
                continue;
            }

            if (BOOLEAN_ATTRS.has(propName)) {
                props[propName] = value === true ? true : value === false ? false :
                    typeof value === 'string' ? value : Boolean(value);
            } else {
                props[propName] = value;
            }
        }
    }

    for (const { name, def } of compiled.events) {
        const handler = resolveEventHandler(name, def, values, component, isCustomElement);
        if (handler) {
            if (name === 'clickoutside' || name === 'click-outside') {
                props.ref = createClickOutsideRef(handler, props.ref);
            } else {
                const propName = 'on' + name.charAt(0).toUpperCase() + name.slice(1);
                props[propName] = handler;
            }
        }
    }

    if (compiled.key !== undefined) {
        props.key = compiled.key;
    }

    const children = compiled.children
        .map(child => {
            const childValues = child._itemValues !== undefined ? child._itemValues : values;
            return applyValues(child, childValues, component);
        })
        .filter(child => child !== undefined && child !== false);

    if (isCustomElement && children.length > 0) {
        const { defaultChildren, namedSlots } = groupChildrenBySlot(children);
        return h(compiled.tag, {
            ...props,
            _vdxChildren: defaultChildren,
            _vdxSlots: namedSlots
        });
    }

    return h(compiled.tag, props, ...children);
}

function resolveProp(name, def, values, component, isCustomElement) {

    if (def.xModel !== undefined) {
        if (component && component.state) {
            let value = getNestedValue(component.state, def.xModel);

            if (def.context === 'x-model-checked') {
                return !!value;
            } else if (def.context === 'x-model-radio') {
                return value === def.radioValue;
            } else if (def.context === 'x-model-value' && isCustomElement &&
                       (typeof value === 'object' || typeof value === 'function') && value !== null) {
                return value;
            }
            return value;
        }
        return (def.context === 'x-model-checked' || def.context === 'x-model-radio') ? false : '';
    }

    if (def.slot !== undefined || def.slots !== undefined) {
        let value;

        if (def.slots) {

            value = def.template;
            for (const slotIndex of def.slots) {
                const slotMarker = `__SLOT_${slotIndex}__`;
                const slotValue = values[slotIndex];
                value = value.replace(slotMarker, String(slotValue ?? ''));
            }
        } else {
            value = values[def.slot];
            if (def.template) {
                value = def.template.replace(`__SLOT_${def.slot}__`, String(value));
            }
        }

        if (def.context === 'url') {
            return sanitizeUrl(value) || '';
        } else if (def.context === 'custom-element-attr') {
            return value;
        }

        if (value !== undefined && value !== null && typeof value !== 'boolean') {
            return String(value);
        }
        return value;
    }

    if (def.refName !== undefined) {
        return def;  
    }

    return def.value;
}

function createRefCallback(refName, component) {
    return (el) => {
        if (component) {
            if (el) {
                component.refs[refName] = el;
            } else {
                delete component.refs[refName];
            }
        }
    };
}

function createClickOutsideRef(handler, existingRef) {
    let lastEl = null;

    return (el) => {
        if (existingRef) existingRef(el);

        if (lastEl && lastEl._clickOutsideHandler) {
            document.removeEventListener('click', lastEl._clickOutsideHandler);
            delete lastEl._clickOutsideHandler;
        }

        if (el) {
            const documentHandler = (e) => {
                if (!el.contains(e.target)) {
                    handler(e);
                }
            };
            el._clickOutsideHandler = documentHandler;
            document.addEventListener('click', documentHandler);
            lastEl = el;
        } else {
            lastEl = null;
        }
    };
}

function resolveEventHandler(eventName, def, values, component, isCustomElement) {
    let handler = null;

    if (def.xModel !== undefined) {

        const propName = def.xModel;
        handler = (e) => {
            if (component && component.state) {
                let value;

                if (def.customElement) {
                    value = (e.detail && e.detail.value !== undefined) ? e.detail.value : e.detail;
                } else {
                    const target = e.target;

                    if (target.type === 'checkbox') {
                        value = target.checked;
                    } else if (target.type === 'radio') {
                        if (target.checked) {
                            value = target.value;
                        } else {
                            return;
                        }
                    } else if (target.type === 'number' || target.type === 'range') {
                        value = target.valueAsNumber;
                        if (isNaN(value)) value = target.value;
                    } else if (target.type === 'file') {
                        value = target.files;
                    } else {
                        value = target.value;
                    }
                }

                setNestedValue(component.state, propName, value);
            }
        };
    } else if (def.slot !== undefined) {
        handler = values[def.slot];
    } else if (def.handler && typeof def.handler === 'function') {
        handler = def.handler;
    } else if (def.method && component && component[def.method]) {
        handler = component[def.method].bind(component);
    }

    if (handler && typeof handler === 'function') {

        if (def.modifier === 'prevent') {
            const orig = handler;
            handler = (e) => { e.preventDefault(); return orig(e); };
        }
        if (def.modifier === 'stop') {
            const orig = handler;
            handler = (e) => { e.stopPropagation(); return orig(e); };
        }

        if (def._chainWith) {
            const firstHandler = resolveEventHandler(eventName, def._chainWith, values, component, isCustomElement);
            if (firstHandler) {
                const secondHandler = handler;
                handler = (e) => { firstHandler(e); secondHandler(e); };
            }
        }

        if (isCustomElement && !def.xModel) {
            const orig = handler;
            handler = (e) => {
                const value = (e.detail && e.detail.value !== undefined) ? e.detail.value : e.detail;
                return orig(e, value);
            };
        }
    }

    return handler;
}

function groupChildrenBySlot(children) {
    const defaultChildren = [];
    const namedSlots = {};

    for (const child of children) {
        if (child && typeof child === 'object' && child.props && child.props.slot) {
            const slotName = child.props.slot;
            if (!namedSlots[slotName]) {
                namedSlots[slotName] = [];
            }
            namedSlots[slotName].push(child);
        } else {
            defaultChildren.push(child);
        }
    }

    return { defaultChildren, namedSlots: Object.keys(namedSlots).length > 0 ? namedSlots : {} };
}

function parseXMLToTree(xmlString) {
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                          'link', 'meta', 'param', 'source', 'track', 'wbr'];

    const tagPattern = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    const booleanAttrs = ['checked', 'selected', 'disabled', 'readonly', 'multiple', 'ismap',
                          'defer', 'declare', 'noresize', 'nowrap', 'noshade', 'compact',
                          'autofocus', 'required', 'autoplay', 'controls', 'loop', 'muted',
                          'default', 'open', 'reversed', 'scoped', 'seamless', 'sortable',
                          'novalidate', 'formnovalidate', 'itemscope'];

    xmlString = xmlString.replace('\n', ' ').replace(/>\s+</g, '><').trim();

    xmlString = xmlString.replace(tagPattern, (fullMatch, tagName, attrs) => {
        if (fullMatch.startsWith('</')) return fullMatch;

        let processedAttrs = attrs;
        for (const boolAttr of booleanAttrs) {
            const pattern = new RegExp(`(\\s${boolAttr})(?=\\s|>|/|$)`, 'gi');
            const parts = processedAttrs.split(/("[^"]*"|'[^']*')/);
            processedAttrs = parts.map((part, index) => {
                if (index % 2 === 0) {
                    return part.replace(pattern, `$1="${boolAttr}"`);
                }
                return part;
            }).join('');
        }

        return `<${tagName}${processedAttrs}>`;
    });

    voidElements.forEach(tag => {
        const regex = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
        xmlString = xmlString.replace(regex, (match, attrs) => {
            if (match.trimEnd().endsWith('/>')) return match;
            return `<${tag}${attrs || ''} />`;
        });
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${xmlString}</root>`, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        console.error('[parseXMLToTree] Parse error:', parseError.textContent);
        return { type: 'fragment', wrapped: false, children: [] };
    }

    const root = doc.documentElement;
    if (!root) {
        return { type: 'fragment', wrapped: false, children: [] };
    }

    const children = [];
    for (const node of root.childNodes) {
        const tree = nodeToTree(node);
        if (tree) {
            if (tree.type === 'fragment') {
                children.push(...tree.children);
            } else {
                children.push(tree);
            }
        }
    }

    return { type: 'fragment', wrapped: false, children };
}

function nodeToTree(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;

        const slotMatch = text.match(/^__SLOT_(\d+)__$/);
        if (slotMatch) {
            return {
                type: 'text',
                slot: parseInt(slotMatch[1], 10),
                context: 'content'
            };
        }

        if (text.includes('__SLOT_')) {
            const parts = text.split(/(__SLOT_\d+__)/);
            const children = parts
                .filter(part => part)
                .map(part => {
                    const match = part.match(/^__SLOT_(\d+)__$/);
                    if (match) {
                        return { type: 'text', slot: parseInt(match[1], 10), context: 'content' };
                    }
                    return { type: 'text', value: part };
                });
            return { type: 'fragment', wrapped: false, children };
        }

        if (text) {
            return { type: 'text', value: text };
        }
        return null;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = {};
        const events = {};

        for (const attr of node.attributes) {
            const name = attr.name;
            const value = attr.value;

            if (name === 'x-model') {
                const isCustomElement = componentDefinitions.has(tag);

                if (isCustomElement) {
                    attrs['value'] = { xModel: value, context: 'x-model-value' };
                    events['change'] = { xModel: value, modifier: null, customElement: true };
                } else {
                    const inputType = node.getAttribute('type');

                    if (inputType === 'checkbox') {
                        attrs['checked'] = { xModel: value, context: 'x-model-checked' };
                        events['change'] = { xModel: value, modifier: null };
                    } else if (inputType === 'radio') {
                        const radioValue = node.getAttribute('value');
                        attrs['checked'] = { xModel: value, radioValue, context: 'x-model-radio' };
                        events['change'] = { xModel: value, modifier: null };
                    } else if (inputType === 'file') {
                        events['change'] = { xModel: value, modifier: null };
                    } else {
                        attrs['value'] = { xModel: value, context: 'x-model-value' };
                        events['input'] = { xModel: value, modifier: null };
                    }
                }
                continue;
            }

            if (name === 'ref') {
                attrs['__ref__'] = { refName: value };
                continue;
            }

            if (name.startsWith('on-')) {
                const fullEventName = name.substring(3);
                let eventName, modifier;

                if (fullEventName === 'click-outside') {
                    eventName = 'clickoutside';
                    modifier = null;
                } else {
                    const parts = fullEventName.split('-');
                    eventName = parts[0];
                    modifier = parts.length > 1 ? parts[parts.length - 1] : null;
                }

                const slotMatch = value.match(/^__SLOT_(\d+)__$/);
                let newHandler;

                if (slotMatch) {
                    newHandler = { slot: parseInt(slotMatch[1], 10), modifier };
                } else if (value.match(/__EVENT_/)) {
                    newHandler = { handler: value, modifier };
                } else {
                    newHandler = { method: value, modifier };
                }

                if (events[eventName]) {
                    newHandler._chainWith = events[eventName];
                }

                events[eventName] = newHandler;
                continue;
            }

            const slotMatch = value.match(/^__SLOT_(\d+)__$/);
            if (slotMatch) {
                const slotIndex = parseInt(slotMatch[1], 10);
                let context = 'attribute';

                if (name === 'href' || name === 'src' || name === 'action') {
                    context = 'url';
                } else if (name.startsWith('on')) {
                    context = 'event-handler';
                } else if (name === 'style' || name === 'srcdoc') {
                    context = 'dangerous';
                } else if (tag.includes('-')) {
                    context = 'custom-element-attr';
                }

                attrs[name] = { slot: slotIndex, context, attrName: name };
            } else if (value.includes('__SLOT_')) {
                const matches = value.match(/__SLOT_(\d+)__/g);
                if (matches && matches.length >= 1) {
                    const slots = matches.map(m => parseInt(m.match(/\d+/)[0], 10));
                    attrs[name] = { slots, context: 'attribute', attrName: name, template: value };
                } else {
                    attrs[name] = { value };
                }
            } else {
                attrs[name] = { value };
            }
        }

        const children = [];
        for (const child of node.childNodes) {
            const childTree = nodeToTree(child);
            if (childTree) {
                if (childTree.type === 'fragment') {
                    children.push(...childTree.children);
                } else {
                    children.push(childTree);
                }
            }
        }

        return { type: 'element', tag, attrs, events, slotProps: {}, children };
    }

    if (node.nodeType === Node.COMMENT_NODE) {
        return null;
    }

    return null;
}

function clearTemplateCache() {
    templateCache.clear();
    cacheAccessTimes.clear();
}

function pruneTemplateCache() {
    if (templateCache.size > MAX_CACHE_SIZE * 0.5) {
        cleanupTemplateCache();
    }
}

function getTemplateCacheSize() {
    return templateCache.size;
}

// ============= store.js =============

function createStore(initial) {
    const state = reactive(initial);
    const subscribers = new Set();

    function notifySubscribers() {
        subscribers.forEach(fn => {
            try {
                fn(state);
            } catch (error) {
                console.error('Error in store subscriber:', error);
            }
        });
    }

    let effectRunCount = 0;
    createEffect(() => {
        effectRunCount++;

        trackAllDependencies(state);

        if (effectRunCount > 1) {
            notifySubscribers();
        }
    });

    return {
        get state() {
            return state;
        },

        subscribe(fn) {
            subscribers.add(fn);

            try {
                fn(state);
            } catch (error) {
                console.error('Error in store subscriber (initial call):', error);
            }

            return () => {
                subscribers.delete(fn);
            };
        },

        set(newState) {
            Object.assign(state, newState);
        },

        update(updater) {
            const newState = updater(state);
            if (newState) {
                Object.assign(state, newState);
            }
        }
    };
}

// ============= x-await-then.js =============

defineComponent('x-await-then', {
    props: {
        promise: null,      
        then: null,         
        pending: null,      
        catch: null         
    },

    data() {
        return {
            status: 'pending',
            value: null,
            err: null
        };
    },

    methods: {

        _trackPromise() {
            const promise = this.props.promise;

            if (promise === this._trackedPromise) {
                return;
            }

            this._trackedPromise = promise;

            if (!promise || typeof promise.then !== 'function') {
                this.state.status = 'resolved';
                this.state.value = promise;
                this.state.err = null;
                return;
            }

            this.state.status = 'pending';
            this.state.value = null;
            this.state.err = null;

            const tracked = promise;
            promise.then(
                resolvedValue => {

                    if (this._trackedPromise === tracked) {

                        this.state.value = resolvedValue;
                        this.state.status = 'resolved';
                    }
                },
                error => {
                    if (this._trackedPromise === tracked) {
                        this.state.err = error;
                        this.state.status = 'rejected';
                    }
                }
            );
        },

        _getContent() {
            const { status, value, err } = this.state;

            const thenFn = this.props.then;
            const pendingContent = this.props.pending;
            const catchFn = this.props.catch;

            if (status === 'pending') {
                return pendingContent || html``;
            }

            if (status === 'rejected') {
                if (typeof catchFn === 'function') {
                    return catchFn(err);
                }
                return catchFn || html``;
            }

            if (typeof thenFn === 'function') {
                return thenFn(value);
            }
            return html``;
        }
    },

    template() {

        this._trackPromise();
        return this._getContent();
    }

});

// Export aliases
const Component = BaseComponent;

// ============= Public API =============
export {
    defineComponent,
    html,
    raw,
    when,
    each,
    awaitThen,
    reactive,
    createEffect,
    createStore,
    computed,
    trackAllDependencies,
    isReactive,
    watch,
    memo,
    pruneTemplateCache,
    h,
    Fragment,
    render,
    Component,
    createContext,
};
