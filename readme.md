# editor-lite [![Build Status](https://travis-ci.org/lukeed/editor-lite.svg?branch=master)](https://travis-ci.org/lukeed/editor-lite)

> The lightest WYSIWYG cross-browser editor. (IE9+)


## Install

```
$ npm install --save editor-lite
```


## Usage

```js
const Editor = require('editor-lite');
const item = document.getElementById('item');

const editor = new Editor(item, {
  onKeyup: function (e, key, modifiers) {
    // ...
  }
});
```


## API

### editorLite(input, [options])

#### input

Type: `string`

Lorem ipsum.

#### options

##### foo

Type: `boolean`<br>
Default: `false`

Lorem ipsum.


## License

MIT © [Luke Edwards](https://lukeed.com)
