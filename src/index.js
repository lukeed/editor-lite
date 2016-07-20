'use strict';

var domsel = require('dom-selection');

// various shortnames
var doc = document;
var slice = [].slice;
var each = [].forEach;
var acts = 'click touch';
var attr = 'contentEditable';

var keys = {
	u: 'u',
	b: 'b',
	i: 'i',
	']': 'in',
	'[': 'out',
	// shift + code
	s55: 'ol',
	s56: 'ul',
	s69: 'center',
	s74: 'full',
	s76: 'left',
	s82: 'right'
};

var cmds = {
	ul: ['insertUnorderedList'],
	ol: ['insertOrderedList'],
	u: ['underline', 1], // `1` = requires selection
	b: ['bold', 1],
	i: ['italic', 1],
	a : ['createLink', 1],
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
 * Capitalize a string. Assumes gives lowercase.
 * @param  {String} str
 * @return {String}
 */
function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate a function name from string.
 * @param  {String} str
 * @return {String}
 */
function funk(str) {
	return 'on' + capitalize(str);
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
	if (el.nodeType !== 1) {
		throw new Error('Must provide a valid Element Node.');
	} else if (!(attr in doc.body)) {
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

	var self = this;

	// attach event listeners
	each.call(['blur', 'focus', 'mouseup', 'keydown'], function (evt) {
		on(el, evt, self[funk(evt)].bind(self));
	});

	// debounced key listeners
	each.call(['keyup', 'keydown', 'keypress'], function (evt) {
		on(el, evt, debounce(function (e) {
			self.opts[funk(e.type)].apply(self, keyEvent(e));
		}, self.opts.throttle));
	});

	// toolbar listeners
	var btns = [];
	each.call([this.opts.toolbar, this.opts.airbar], function (el) {
		el && (btns = btns.concat(slice.call(el.getElementsByTagName('button'))));
	});

	var cb = this.onBtnClick.bind(this);
	each.call(btns, function (btn) {
		on(btn, acts, cb);
	});
}

Editor.prototype = {
	/**
	 * Callback for `blur` event.
	 * @param  {Event} e
	 */
	onBlur: function (e) {
		this.hideAirbar();
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
	 * On `keydown` event, check if a keybind was attempted.
	 * If yes & found, will run the associated command.
	 * @param  {Event} e
	 */
	onKeydown: function (e) {
		if (e.metaKey && e.key !== 'Meta') {
			// find a shortcut w/ this key
			var k = e.shiftKey ? ('s' + e.keyCode) : e.key;
			this.runCommand(keys[k], e);
		}
	},

	/**
	 * Handler for toolbar buttons' `click`.
	 * @param  {Event} e
	 */
	onBtnClick: function (e) {
		var tag = e.target.getAttribute('data-tag');
		tag === 'a' ? console.log('handle link') : this.runCommand(tag, e);
	},

	/**
	 * Callback for the `mouseup` event.
	 * @param  {Event} e
	 */
	onMouseup: function () {
		var sel = this.hasSelection();
		// hide airbar if no selection
		sel ? this.onSelection(sel) : this.hideAirbar();
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
		this.showAirbar();
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
	 * Execute a Doc.Command by its abbreviation (key).
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
	 * @param  {String} tag  The command block's key/tag name.
	 * @param  {Event}  e    An optional event to cancel.
	 * @return {Boolean}     The command was run successfully.
	 */
	runCommand: function (tag, e) {
		var cmd = cmds[tag];
		if (!tag || !cmd) return;
		// found cmd, cancel native handler
		e && e.preventDefault();
		// expand the caret if cmd requires a selection & non active
		cmd[1] && !this.hasSelection() && this.expandSelection();
		// run the command
		execute(cmd[0]);
	},

	insertLink: function (e) {
		e.preventDefault();
		prompt()
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
		var bar = this.opts.airbar;
		if (bar && !this.airActive) {
			bar.classList.add('active');
			this.airActive = true;
		}
	},

	hideAirbar: function () {
		var bar = this.opts.airbar;
		if (bar && this.airActive) {
			bar.classList.remove('active');
			this.airActive = false;
		}
	},

	toggleAirbar: function () {
		var act = this.airActive ? 'hide' : 'show';
		this[act + 'Airbar']();
	}
};

window.Editor = Editor;
