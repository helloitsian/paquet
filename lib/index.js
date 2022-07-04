const { writeFileSync } = require("fs");
const path = require("path");
const babel = require("@babel/core");
const { getFileData } = require("./util");
const { findDependencies } = require("./find-dependencies");
let chalk = null;
(async () => chalk = (await import("chalk")).default)();

let _id = 0;

const createModules = (dirname, ast) => {
  return findDependencies(dirname, ast);;
}

const filesMap = new Map();

const createFile = (filePath) => {
  // check to see if we've already created file
  if (filesMap.has(filePath))
    return filesMap.get(filePath);
    
  const { absolutePath, data: fileData } = getFileData(filePath);
  const dirname = path.dirname(absolutePath);
  const modules = createModules(dirname, fileData);

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

const bundleGraph = (graph, process) => {
  const entries = [...graph.entries()];
  const dependencies = `{
      ${
        entries.map(([_id, file]) => {
          return (`["${file.id}"]: {
            fn: (require, module, exports, process) => {
              ${file.code}
            },
            links: ${JSON.stringify(file.links)}
          },`)
        }).join('')
      }
  }`;
  const bundle = `((dependencies) => {
    const module = { exports: {} };
    const process = ${JSON.stringify(process)}

    const require = (id) => {
      dependencies[id].fn(
        (path) => {
          return require(dependencies[id].links[path])
        },
        module,
        module.exports,
        process,
      );

      return module.exports;
    }
    require("${entries[0][1].id}");
  })(${dependencies})`

  return bundle;
}

const pack = (entryPath, outPath, process={}) => {
  const entryData = createFile(entryPath);
  const graph = createGraph(entryData);
  const bundled = bundleGraph(graph, process);

  try {
    writeFileSync(outPath, bundled, process);
  } catch(e) {
    console.error(chalk.red.bold("\nError writing file: " + outPath), '\n', e);
    return null;
  }

  return bundled;
}

module.exports = {
  pack,
}