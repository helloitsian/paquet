# paquet

A simple module bundler written in JavaScript. Handles `import` and `require`, bundles your `node_modules` as well!

## Getting Started
Paquet is very simple to use. Simply specify your entry file and output file and let Paquet do the rest!
```
  paquet --entry path/to/entry.js --out path/of/bundle.js
```

## Specifying Environment Variables
```
paquet --entry path/to/entry.js --out path/of/bundle.js --env { VAR1: "VAR1", VAR2: "VAR2" }
```

## Using a confg file
**Example `paquet.config.js` File**
```
module.exports = {
  entry: 'path/to/entry.js',
  out: 'path/to/dist/bundle.js',
  env: { VAR1: "VAR1", },
  mutators: [
    // { before: (code) => code, after: (code) => code }
  ],
  plugins: [
    // not implemented yet
  ]
}
```

## Mutators
Mutators are functions that change code at the module level, you can have a mutator for before ES6->ES5 code transpilation or after.

## Plugins
**Not implemented yet.**
