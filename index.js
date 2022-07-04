const { readFileSync, writeFileSync, existsSync, lstatSync } = require("fs");
const path = require("path");
const babel = require("@babel/core");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse");

let _id = 0;

const isFolderPath = (str) => ["./", "../"].some(condition => str.includes(condition));
const pathIsScriptFile = (pathStr) => {
  return [ ".js", ".ts", ".cjs", ".mjs" ].some(condition => pathStr.includes(condition));
}

const getFileData = (filePath) => {
  let absolutePath = path.resolve(filePath);
  const exists = filePath && filePath.length && absolutePath && existsSync(absolutePath);

  if (!exists) {
    //console.log(`path ${absolutePath} does not exist!`);
    return {
      absolutePath,
      data: "",
    };
  }

  const isDirectory = lstatSync(filePath).isDirectory();
  if (isDirectory) {
    absolutePath += '/index.js';
  }

  const entryData = readFileSync(absolutePath, { encoding: "utf-8" });
  
  return {
    absolutePath,
    data: entryData,
  };
}

const createModule = (dirname, relativePath) => {
  if (typeof relativePath !== "string") return {
    id: _id++,
    path: relativePath,
    absolutePath: '',
    isNodeModule: false,
  }

  const isScriptFile = pathIsScriptFile(relativePath);
  const isFolder = isFolderPath(relativePath);
  const isNodeModule = !isScriptFile && !isFolder;

  // if is node_module
  if (isNodeModule) {
    const nodeModuleEntry = require.resolve(relativePath);

    return {
      id: _id++,
      path: relativePath,
      absolutePath: nodeModuleEntry,
      isNodeModule,
    };
  }

  let absolutePath = path.resolve(path.join(dirname, relativePath));

  // handle requires like: "require('path/to/index')"
  if (!isScriptFile && absolutePath.length)
    absolutePath += ".js";

  return {
    id: _id++,
    path: relativePath,
    absolutePath,
    isNodeModule,
  }
}

const createModules = (dirname, ast) => {
  const modules = [];

  traverse.default(ast, {
    ImportDeclaration: (path) => {
      const { node } = path;
      const { source } = node;
      const module = createModule(source.value);      
      
      modules.push(module);
    },
    VariableDeclaration: (path) => {
      const { node } = path;
      // handle const variable = require()
      const declaration = node.declarations[0];
      const init = declaration.init;
      const initType = init?.type;

      if (initType === "CallExpression") {
        const callee = init.callee;
        const calleeName = callee.name;
        const isRequire = calleeName === "require";
        if (isRequire) {
          const requirePath = init.arguments[0].value;
          const module = createModule(dirname, requirePath);
          modules.push(module);
        }
      } else if (initType === "MemberExpression") {
        const isRequire = init.object?.callee?.name === "require";
        if (isRequire) {
          const requirePath = init?.object?.arguments[0]?.value;
          const module = createModule(dirname, requirePath);
          modules.push(module);
        }
      }
    },
    ExpressionStatement: (path) => {
      const { node } = path;
      
      // handle module.exports = require()
      const expressionRightSide = node.expression?.right;
      if (expressionRightSide) {
        const rightSideRequire = expressionRightSide?.callee?.name || expressionRightSide?.object?.callee?.name;
        console.log(rightSideRequire);
        if (rightSideRequire && rightSideRequire === "require") {
          console.log(expressionRightSide)
          const rightSideArgs = expressionRightSide?.arguments;
          console.log(rightSideArgs)
          if (rightSideArgs) {
            const requirePath = rightSideArgs[0]?.value;
            if (requirePath)
              modules.push(createModule(dirname, requirePath));
          }
        }
      } else {
        // handle func(require())
      }

      
    }
  });

  return modules;
}

const filesMap = new Map();

const createFile = (filePath) => {
  if (filesMap.has(filePath))
    return filesMap.get(filePath);
    
  const { absolutePath, data: fileData } = getFileData(filePath);
  const dirname = path.dirname(absolutePath);
  const ast = parse(fileData, { sourceType: "module" });

  const modules = createModules(dirname, ast);

  const { code, } = babel.transformSync(fileData, {
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });


  const fileMetaData = {
    id: _id++,
    path: filePath,
    code,
    modules,
  }

  filesMap.set(filePath, fileMetaData);

  return fileMetaData;
};

const createGraph = (entryData) => {
  const graph = new Map();
  const queue = [entryData];

  for (let i = 0; i < queue.length; i++) {
    const file = queue[i];

    file.links = {};

    file.modules.forEach((module) => {
      const fileData = createFile(module.absolutePath);
      file.links[module.path] = fileData.id;
      queue.push(fileData);
    });

    graph.set(file.id, file);
  }

  return graph;
}

const bundleGraph = (graph) => {
  const entries = [...graph.entries()];
  const dependencies = `{
      ${
        entries.map(([_id, file]) => {
          return (`["${file.id}"]: {
            fn: (require, module, exports) => {
              ${file.code}
            },
            links: ${JSON.stringify(file.links)}
          },`)
        }).join('')
      }
  }`;
  const bundle = `((dependencies) => {
    const module = { exports: {} };
    const require = (id) => {
      console.log(id);
      dependencies[id].fn(
        (path) => {
          console.log(path);
          return require(dependencies[id].links[path])
        },
        module,
        module.exports,
      );

      return module.exports;
    }
    require("${entries[0][1].id}");
  })(${dependencies})`

  return bundle;
}

const build = (entryPath) => {
  const entryData = createFile(entryPath);
  const graph = createGraph(entryData);
  const bundled = bundleGraph(graph);

  writeFileSync("./bundle.js", bundled);

  return bundled;
}

build("./tests/require.test.js")
