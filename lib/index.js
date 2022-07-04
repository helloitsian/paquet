const { writeFileSync } = require("fs");
const File = require("./File");
let chalk = null;
(async () => chalk = (await import("chalk")).default)();

const createFile = (filePath, mutators, plugins) => {
  return new File(filePath, mutators);
};

const createGraph = (entryData, mutators) => {
  const graph = new Map();
  const queue = [entryData];

  for (let i = 0; i < queue.length; i++) {
    const file = queue[i];

    file.links = {};

    file.modules.forEach((module) => {
      const fileData = createFile(module.absolutePath, mutators);
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
    const process = ${process};

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

const pack = ({ entryPath, outPath, process={ env: {} }, mutators=[], plugins=[] }) => {
  const entryData = createFile(entryPath, mutators, plugins);
  const graph = createGraph(entryData, mutators, plugins);
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