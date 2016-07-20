# editor-lite [![Build Status](https://travis-ci.org/lukeed/editor-lite.svg?branch=master)](https://travis-ci.org/lukeed/editor-lite)

> (WIP) The lightest WYSIWYG cross-browser editor. (IE9+)


## Install

```
$ npm install --save editor-lite
```


## Usage

```js
const Editor = require('editor-lite');
const bar = document.getElementById('bar');
const item = document.getElementById('item');

const editor = new Editor(item, {
  toolbar: bar,
  onFocus: function () {
	bar.classList.add('toolbar__active');
  },
  onBlur: function () {
	bar.classList.remove('toolbar__active');
  },
  onKeyup: function (e, modifiers) {
    console.log(modifiers);
    //=> {alt: false, ctrl: false, meta: false, shift: false}
  }
});
```


## API

crickets

## ToDo's

- [ ] Link, Image, iFrame handlers
- [x] Add `autoSave` (int), `save` (fn), and `onSave` (fn)
- [x] Add `autoSync` (int), `sync` (fn), and `onSync` (fn)
- [ ] Airbar positioning
- [ ] Include bare minimum SASS
- [ ] Add (pretty) demo
- [ ] Add `API` documentation
- [ ] Add headers for AMD/Common/Browser exports

## License

MIT © [Luke Edwards](https://lukeed.com)
