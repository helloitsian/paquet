const path = require("path");
const { fileExists, pathIsScriptFile, isFolderPath, isDirectory } = require("./util");

let ID = 0;

class Module {
  constructor(dirname, relativePath) {
    this.id = ID++;
    this.path = null;
    this.absolutePath = null;
    this.isNodeModule = false;

    this.create(dirname, relativePath);
  }

  handleNodeModule(relativePath) {
    // if is node_module
    const nodeModuleEntry = require.resolve(relativePath, { paths: [process.cwd()] });
    this.absolutePath = nodeModuleEntry;
    this.isNodeModule = true;
    return this;
  }

  create(dirname, relativePath) {
    const isScriptFile = pathIsScriptFile(relativePath);
    const isFolder = isFolderPath(relativePath);
    this.isNodeModule = !isScriptFile && !isFolder;
    this.path = relativePath;

    if (this.isNodeModule)
      return this.handleNodeModule(relativePath);

    this.absolutePath = path.resolve(path.join(dirname, relativePath));
    const exists = fileExists(this.absolutePath)
    const isDir = exists && isDirectory(this.absolutePath);

    if (!isScriptFile && isDir) {
      this.absolutePath += '/index.js';
    }

    // handle requires like: "require('path/to/index')"
    if (!isScriptFile && !isDir)
      this.absolutePath += ".js";

    return this;
  }
}

module.exports = Module;