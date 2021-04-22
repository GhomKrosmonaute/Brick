# Brick

PHP-like JS-based language for back-end.

## Example:

```js
// included.js

const foo = "bar"
```

```js
// index.js

include("included.js")

console.log(foo) //=> bar
```

## Configuration

Make a `brick.config.json` file in root of your project

```json
{
  "input": "src",
  "output": "dist",
  "filter": "(file) => file.ext === '.js'"
}
```

## Usage

### Install

```shell
npm i -D brick
```

### Use

```shell
brick build [path]
```
