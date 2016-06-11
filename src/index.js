'use strict';

var domsel = require('dom-selection');

// Array prototype shortnames
var slice = [].slice;

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

function Editor(el, opts) {
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
