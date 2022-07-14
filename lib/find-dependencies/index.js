const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse");
const detective = require("detective");
const Module = require("../Module");

const handleImportDeclaration = (dirname, path) => {
  const modules = [];
  const { node } = path;
  const { source } = node;
  const module = new Module(dirname, source.value);

  modules.push(module);
  return modules;
};

module.exports.findDependencies = (dirname, fileData) => {
  const ast = parse(fileData, { sourceType: "module" });
  let modules = [];

  traverse.default(ast, {
    ImportDeclaration: (path) => {
      modules = [...modules, ...handleImportDeclaration(dirname, path)];
    },
  });

  // use browserify/detective to find all requires
  const requirePaths = detective(fileData);
  // iterate requirePaths, create modules for each
  requirePaths.forEach((requirePath) =>
    modules.push(new Module(dirname, requirePath))
  );

  return modules;
};
