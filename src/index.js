'use strict';

var domsel = require('dom-selection');

// various shortnames
var win = window;
var doc = document;
var slice = [].slice;
var each = [].forEach;
var acts = 'click touch';
var attr = 'contentEditable';

var noop = function () {};

/**
 * Shallow Extend
 * @param  {Object} tar
 * @return {Object}
 */
function extend(tar) {
	slice.call(arguments, 1).forEach(function (src) {
		for (var k in src) {
			if (src.hasOwnProperty(k)) {
				tar[k] = src[k];
			}
		}
	});
	return tar;
}

/**
 * Improved Debounce function
 * @see https://github.com/rhysbrettbowen/debounce/blob/master/debounce.js
 * @param  {Function} func
 * @param  {Integer} wait  The milliseconds to wait.
 * @return {Function}      The debounced version of func.
 */
function debounce(func, wait) {
	// we need to save these in the closure
	var self, args, time, timeout;

	return function () {
		// save details of latest call
		self = this;
		args = arguments;
		time = Date.now();

		// this is where the magic happens
		var later = function () {
			// how long ago was the last call?
			var last = Date.now() - time;

			// if latest call was < wait period, reset timeout
			// else nullify the timer and run the latest
			if (last < wait) {
				timeout = setTimeout(later, wait - last);
			} else {
				timeout = null;
				return func.apply(self, args);
			}
		};

		// we only need to set the timer now if one isn't already running
		if (!timeout) {
			timeout = setTimeout(later, wait);
		}
	}
}

/**
 * Add an EventListener for event(s) on a Node.
 * @param {Node} el
 * @param {String} evts
 * @param {Function} cb
 */
function on(el, evts, cb) {
	each.call(evts.split(' '), function (evt) {
		el.addEventListener(evt, cb);
	});
}

/**
 * Remove an EventListener for event(s) on a Node.
 * @param {Node} el
 * @param {String} evts
 * @param {Function} cb
 */
function off(el, evts, cb) {
	each.call(evts.split(' '), function (evt) {
		el.removeEventListener(evt, cb);
	});
}

/**
 * Format the Key{Down,Press,Up} event
 * @param  {Event} e
 * @return {Array}
 */
function keyEvent(e) {
	return [e, {
		alt: e.altKey,
		ctrl: e.ctrlKey,
		meta: e.metaKey || e.key === 'Meta',
		shift: e.shiftKey
	}];
}

/**
 * Execute a Document Command
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
 * @return {Boolean}     If was applied.
 */
function execute() {
	var args = slice.call(arguments);
	return args.length && doc.execCommand(args);
}

/**
 * Editor Class Constructor
 * @param {Node} el
 * @param {Object} opts
 */
function Editor(el, opts) {
	if (!attr in doc.body) {
		throw new Error('Your browser does not support the `contenteditable` attribute. For more: http://caniuse.com/#feat=contenteditable');
	}

	this.el = el;
	this.opts = extend({
		airbar: false,
		toolbar: false,
		onBlur: noop,
		onFocus: noop,
		onKeydown: noop,
		onKeyup: noop,
		onKeypress: noop,
		onSelection: noop,
		snapSelection: true,
		throttle: 250
	}, opts || {});

	// attach event listeners
	on(el, 'blur', this.onBlur.bind(this));
	on(el, 'focus', this.onFocus.bind(this));
	on(el, 'mouseup', this.onMouseup.bind(this));

	// debounced key listeners
	var ms = this.opts.throttle;
	var cb = this.onKeys.bind(this);
	each.call(['keyup', 'keydown', 'keypress'], function (evt) {
		on(el, evt, debounce(cb, ms));
	});

	// toolbar listeners
	// @todo airbar?
	if (this.opts.toolbar) {
		var bcb = this.onBtnClick.bind(this);
		var btns = slice.call(this.opts.toolbar.getElementsByTagName('button'));
		each.call(btns, function (btn) {
			on(btn, acts, bcb);
		});
	}
}

Editor.prototype = {
	/**
	 * Callback for `blur` event.
	 * @param  {Event} e
	 */
	onBlur: function (e) {
		this.opts.onBlur(e);
	},

	/**
	 * Callback for `focus` event.
	 * @param  {Event} e
	 */
	onFocus: function (e) {
		this.opts.onFocus(e);
	},

	/**
	 * Callback for `key{press,down,up}` events.
	 * @param  {Event} e
	 */
	onKeys: function (e) {
		this.opts['onK' + e.type.substr(1)].apply(this, keyEvent(e));
	},

	/**
	 * Callback for the `mouseup` event.
	 * @param  {Event} e
	 */
	onMouseup: function () {
		var sel = this.hasSelection();
		sel && this.onSelection(sel);
	},

	/**
	 * Callback for when a `Selection` has been made.
	 * @param {Selection} sel  The active selection.
	 */
	onSelection: function (sel) {
		// snap the seleciton?
		this.opts.snapSelection && domsel.snapSelected(sel);
		// user callback
		this.opts.onSelection(sel);
		// trigger airbar
		this.opts.airbar && this.showAirbar();
	},

	/**
	 * Does the Editor currently have an active Selection?
	 * @return {Object|Boolean}
	 */
	hasSelection: function () {
		var sel = domsel.getSelection();
		return !domsel.isCollapsed(sel) && domsel.isWithin(this.el, sel) && sel;
	},

	/**
	 * Get the Selected HTML
	 * @return {String}
	 */
	getSelectedHTML: function () {
		return domsel.getHTML(this.hasSelection());
	},

	/**
	 * Get the Selected Nodes
	 * @return {Array}
	 */
	getSelectedNodes: function () {
		return domsel.getNodes(this.hasSelection());
	},

	/**
	 * Set the Inner HTML contents.
	 * @param {String} str
	 */
	setHTML: function (str) {

	},

	/**
	 * Get the inner HTML contents.
	 * @return {String}
	 */
	getHTML: function () {
		return this.el.innerHTML;
	},

	/**
	 * Remove <script> tags from the HTML string.
	 * @param  {String} str Inner HTML
	 * @return {String}
	 */
	safeHTML: function () {
		return this.getHTML().replace(/<script[^>]*>[\S\s]*?<\/script[^>]*>/ig, '');
	},

	prettyHTML: function (str) {

	},

	minifyHTML: function (str) {

	},

	removeTags: function (nodes) {

	},

	removeStyles: function (nodes) {

	},

	showAirbar: function () {
	},

	hideAirbar: function () {
	},

	toggleAirbar: function () {
	}
};

window.Editor = Editor;
