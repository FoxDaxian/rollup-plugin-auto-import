# rollup-plugin-auto-import

A Rollup plugin which can use utils or npm package direct, this plugin will import them underground

## Install

Using npm:

```console
npm install rollup-plugin-auto-import --save-dev
```

## Usage

Create a `rollup.config.js` [configuration file](https://www.rollupjs.org/guide/en/#configuration-files) and import the plugin:

```js
import autoImport from 'rollup-plugin-auto-import';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [
    resolve(),
    autoImport({
        exclude: [/\.less\b/], // !! exclude unnecessary file
        inject: {
            vue: ['ref'],
        },
    }),
    typescript({
        target: 'es5',
    }),
  ]
};
```

Then call `rollup` either via the [CLI](https://www.rollupjs.org/guide/en/#command-line-reference) or the [API](https://www.rollupjs.org/guide/en/#javascript-api).

## Options

In addition to the properties and values specified for replacement, users may also specify the options below.

### `presetDir`

Type: `String`<br>
Default: `auto-import`

specify he directory loaded by default, the content exposed inside can be used directly.

### `inject`

Type: `{ [key: string]: Array[...string] }`<br>
Default: `{}`

Specify the third party module to be loaded.


### `exclude`

Type: `String` | `Array[...String]`<br>
Default: `null`

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies the files in the build the plugin should _ignore_. By default no files are ignored.

### `include`

Type: `String` | `Array[...String]`<br>
Default: `null`

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted.
