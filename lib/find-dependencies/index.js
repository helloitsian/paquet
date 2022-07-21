const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse");
const detective = require("detective");
const Module = require("../Module");

const handleImportDeclaration = (dirname, path) => {
  const { node } = path;
  const { source } = node;
  const module = new Module(dirname, source.value);

  return module;
};

const handleExportSource = (dirname, path) => {
  const { node } = path;
  const { source } = node;

  if (source) {
    const module = new Module(dirname, source.value);
    console.log(module);
    return module;
  }
}

module.exports.findDependencies = (dirname, fileData) => {
  const ast = parse(fileData, { sourceType: "module" });
  let modules = [];

  traverse.default(ast, {
    ImportDeclaration: (path) => {
      modules = [...modules, handleImportDeclaration(dirname, path)];
    },
    ExportNamedDeclaration: (path) => {
      modules = [...modules, handleExportSource(dirname, path)];
    },
    ExportAllDeclaration: (path) => {
      modules = [...modules, handleExportSource(dirname, path)];
    },
  });

  // use browserify/detective to find all requires
  const requirePaths = detective(fileData);
  // iterate requirePaths, create modules for each
  requirePaths.forEach((requirePath) =>
    modules.push(new Module(dirname, requirePath))
  );

  return modules.filter((module) => module && module.path && module.path.length > 0);
};
