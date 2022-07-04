const path = require("path");
const { readFileSync, existsSync, lstatSync } = require("fs");
let chalk = null;
(async () => chalk = (await import("chalk")).default)();

module.exports.fileExists = (filePath) => existsSync(filePath);

module.exports.isDirectory = (filePath) => lstatSync(filePath).isDirectory(); 

module.exports.isFolderPath = (str) => ["./", "../"].some(condition => str.includes(condition));

module.exports.pathIsScriptFile = (pathStr) => {
  return [ ".js", ".ts", ".cjs", ".mjs" ].some(condition => pathStr.includes(condition));
}

module.exports.getFileData = (filePath) => {
  let absolutePath = path.resolve(filePath);
  const exists = filePath && filePath.length && absolutePath && existsSync(absolutePath);

  if (!exists) {
    console.log(chalk.bold.red(`\npath ${absolutePath} does not exist!`));
    return {
      absolutePath,
      data: "",
    };
  }

  const isDirectory = module.exports.isDirectory(absolutePath);
  if (isDirectory) {
    absolutePath += '/index.js';
  }

  const entryData = readFileSync(absolutePath, { encoding: "utf-8" });
  
  return {
    absolutePath,
    data: entryData,
  };
}