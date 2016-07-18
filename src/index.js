'use strict';

var domsel = require('dom-selection');

// various shortnames
var doc = document;
var slice = [].slice;
var each = [].forEach;
var acts = 'click touch';
var attr = 'contentEditable';

var cmds = {
	ul: ['insertUnorderedList'],
	ol: ['insertOrderedList'],
	u: ['underline', 1], // `1` = requires selection
	b: ['bold', 1],
	i: ['italic', 1],
	sub: ['subscript', 1],
	sup: ['superscript', 1],
	strike: ['strikeThrough', 1],
	center: ['justifyCenter'],
	right: ['justifyRight'],
	left: ['justifyLeft'],
	full: ['justifyFull'],
	out: ['outdent'],
	in: ['indent']
};
// 'link' : ['createLink', true, 'url']
// insertImage
// insertHTML
// removeFormat
// unlink
// foreColor
// hiliteColor
// backColor
// fontName
// fontSize

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
	};
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
	if (!(attr in doc.body)) {
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
	 * Handler for toolbar buttons' `click`.
	 * @param  {Event} e
	 */
	onBtnClick: function (e) {
		e.preventDefault();
		var btn = e.target;
		var tag = btn.getAttribute('data-tag');
		var cmd = cmds[tag]; // cmd info
		if (!tag || !cmd) return;
		// expand the caret if cmd requires a selection & non active
		cmd[1] && !this.hasSelection() && this.expandSelection();
		// run the doc command
		execute(cmd[0]);
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
	 * Expand the Selection/Caret's position to include entire word.
	 */
	expandSelection: function () {
		domsel.expandToWord();
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
		this.el.innerHTML = str || '';
	},

	/**
	 * Get the inner HTML contents.
	 * @return {String}
	 */
	getHTML: function () {
		return this.el.innerHTML;
	},

	/**
	 * Remove `script` tags from the HTML content.
	 * @return {String}
	 */
	safeHTML: function () {
		return this.getHTML().replace(/<script[^>]*>[\S\s]*?<\/script[^>]*>/ig, '');
	},

	/**
	 * Remove unwanted newlines & duplicative spacing.
	 * @return {String}
	 */
	cleanHTML: function () {
		return this.getHTML()
			.replace(/\n|<br>/g, '') // newline / carriage return
			.replace(/&nbsp;/g, ' '); // &nbsp; ==> ' '
	},

	/**
	 * Remove the whitespace & tabs in between HTML tags.
	 * @return {String}
	 */
	minifyHTML: function () {
		return this.cleanHTML()
			.replace(/[\t\t]+</g, '<') // whitespace (space and tabs) before tags
			.replace(/>[\t\t]+</g, '><') // whitespace between tags
			.replace(/>[\t\t]+$/g, '>') // whitespace after tags
			.replace(/\s\s+/g, ' '); // shrink multiple spaces
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
