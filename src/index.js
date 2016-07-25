'use strict';

var domsel = require('dom-selection');

// various shortnames
var doc = document;
var slice = [].slice;
var each = [].forEach;
var acts = 'click touch';

var keyID = 'keyIdentifier';
var nodeType = 'nodeName';
var nodeParent = 'parentNode';

var keys = {
	85: 'u',
	66: 'b',
	73: 'i',
	221: 'in',
	219: 'out',
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
	a: ['createLink', 1],
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
// function off(el, evts, cb) {
// 	each.call(evts.split(' '), function (evt) {
// 		el.removeEventListener(evt, cb);
// 	});
// }

/**
 * Format the Key{Down,Press,Up} event
 * @param  {Event} e
 * @return {Array}
 */
function keyEvent(e) {
	return [e, {
		alt: e.altKey,
		ctrl: e.ctrlKey,
		meta: e.metaKey || e[keyID] === 'Meta',
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
	return args.length && doc.execCommand.apply(doc, args);
}

/**
 * Editor Class Constructor
 * @param {Node} el
 * @param {Object} opts
 */
function Editor(el, opts) {
	if (el.nodeType !== 1) {
		throw new Error('Must provide a valid Element Node.');
	} else if (!('contentEditable' in doc.body)) {
		throw new Error('Your browser does not support the `contenteditable` attribute. For more: http://caniuse.com/#feat=contenteditable');
	}

	this.el = el;
	this.opts = extend({
		airbar: false,
		toolbar: false,
		input: false,
		onBlur: noop,
		onFocus: noop,
		onKeydown: noop,
		onKeyup: noop,
		onKeypress: noop,
		onSelection: noop,
		onSave: noop,
		onSync: noop,
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

	// `save` & `sync` listeners
	each.call(['save', 'sync'], function (evt) {
		var op = 'auto' + capitalize(evt);
		var ms = self.opts[op]; // throttle (ms)

		// raw listener
		on(el, 'editor_' + evt, self.opts[funk(evt)].bind(self));

		if (ms) {
			// enforce a lower limit for throttling: 1500ms
			ms = self.opts[op] = Math.max(ms, 1500);
			// debounced `editor_auto(save|sync)` listener
			// call the method verb ==> verb handler
			// eg: 'autosave' + debounce( this.save() ) = this.opts.onSave
			on(el, 'editor_auto' + evt, debounce(self[evt].bind(self), ms));
		}
	});

	// toolbar listeners
	var btns = [];
	each.call([this.opts.toolbar, this.opts.airbar], function (el) {
		el && (btns = btns.concat(slice.call(el.getElementsByTagName('button'))));
	});

	var bcb = this.onBtnClick.bind(this);
	each.call(btns, function (btn) {
		on(btn, acts, bcb);
	});

	self.buttons = btns;
}

Editor.prototype = {
	/**
	 * Callback for `blur` event.
	 * @param  {Event} e
	 */
	onBlur: function (e) {
		if (this.buttons.indexOf(e.relatedTarget) !== -1) {
			return false;
		}
		this.sync();
		this.hideAirbar();
		this.opts.onBlur(e);
	},

	/**
	 * Callback for `focus` event.
	 * @param  {Event} e
	 */
	onFocus: function (e) {
		this.hasSelection() && this.showAirbar();
		this.opts.onFocus(e);
	},

	/**
	 * On `keydown` event, check if a keybind was attempted.
	 * If yes & found, will run the associated command.
	 * @param  {Event} e
	 */
	onKeydown: function (e) {
		var code = e.keyCode || e.which;

		if (e.metaKey && e[keyID] !== 'Meta') {
			// find a shortcut w/ this key
			var k = e.shiftKey ? ('s' + code) : code;
			this.runCommand(keys[k], e);
		}

		// check if entering a new, empty line
		if (code === 13) {
			var node = domsel.getRange().startContainer;
			if (node[nodeType] === 'DIV' || (node[nodeType] === '#text' && (node[nodeParent][nodeType] === 'DIV' || node[nodeParent][nodeParent][nodeType] === 'DIV'))) {
				// insert new or wrap with `<p>`
				execute('formatBlock', null, 'p');
			}
		}

		// if auto(sav|sync)ing, emit event
		this.opts.autoSave && this.emit('autosave');
		this.opts.autoSync && this.emit('autosync');
	},

	/**
	 * Handler for toolbar buttons' `click`.
	 * @param  {Event} e
	 */
	onBtnClick: function (e) {
		var tag = e.target.getAttribute('data-tag');
		switch (tag) {
			case 'a': return this.insertLink();
			case 'img': return this.insertImage();
			default: this.runCommand(tag, e);
		}
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
	 * Emit an event.
	 * @param {String} name  The event name.
	 */
	emit: function (name) {
		if (!name) return;
		var en = 'editor_' + name;
		var ev = doc.createEvent('Event');
		ev.initEvent(en, 1, 1);
		this.el.dispatchEvent(ev);
	},

	/**
	 * Emit the `editor_save` event to trigger `onSave()`
	 */
	save: function () {
		this.emit('save');
	},

	/**
	 * Sync the contents with an input.
	 */
	sync: function () {
		var el = this.opts.input;
		el && (el.value = this.minifyHTML());
		this.emit('sync');
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

	insertLink: function () {
		console.log('inside insertLink');
	},

	insertImage: function () {
		console.log('inside insertImage');
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
			// .replace(/[\s]style="[^"]*"/gi, '') // remove style attrs
			// .replace(/<[\/]?span>/gi, '') // remove plain `<span>` tags
			.replace(/\n|<br[\/]?>/g, '') // newline / carriage return
			.replace(/<div><\/div>|<p><\/p>/g, '') // empty div/p tags
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

	removeTags: function () {
	},

	removeStyles: function () {
	},

	/**
	 * Show the Airbar, if set & inactive.
	 */
	showAirbar: function () {
		var bar = this.opts.airbar;
		if (bar && !this.airActive) {
			bar.classList.add('active');
			this.airActive = true;
		}
	},

	/**
	 * Hide the Airbar, if set & active.
	 */
	hideAirbar: function () {
		var bar = this.opts.airbar;
		if (bar && this.airActive) {
			bar.classList.remove('active');
			this.airActive = false;
		}
	},

	/**
	 * Toggle the Airbar visibility.
	 */
	toggleAirbar: function () {
		var act = this.airActive ? 'hide' : 'show';
		this[act + 'Airbar']();
	}
};

window.Editor = Editor;
