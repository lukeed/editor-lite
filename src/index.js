'use strict';

var domsel = require('dom-selection');

// various shortnames
var win = window;
var doc = document;
var slice = [].slice;
var each = [].forEach;
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
		onBlur: noop,
		onFocus: noop,
		onKeydown: noop,
		onKeyup: noop,
		onKeypress: noop,
		onSelection: noop
	}, opts || {});
}


window.Editor = Editor;
