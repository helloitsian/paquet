const { getFileData } = require("./util");
const { findDependencies } = require("./find-dependencies");
const babel = require("@babel/core");

let ID = 0;

const filesMap = new Map();

class File {
  constructor(filePath, mutators=[], plugins=[]) {
    this.path = filePath;
    this.id = ID++;
    this.code = null;
    this.modules = null;
    this.mutators = mutators;
    this.plugins = plugins;
    this.create();
  }

  executeMutators(code, mutators, absolutePath, relativePath) {
    return mutators.reduce((mutatedCode, mutator) => mutator(mutatedCode, absolutePath, relativePath), code);
  }
  
  create() {
    // check to see if we've already created file before
    if (filesMap.has(this.path)) filesMap.get(this.path)
    // if not get the absolute path and file data (utf-8 string)
    const { absolutePath, data: fileData, dirname } = getFileData(this.path);
    // execute before mutators
    const beforeCode = this.executeMutators(fileData, this.mutators.before, absolutePath, this.path);
    // fetch dependencies of the file
    this.modules = findDependencies(dirname, beforeCode);
    // transpile to es5 code
    const { code } = babel.transformSync(beforeCode, {
      presets: ["@babel/preset-env"],
    });
    // execute "after" mutators
    this.code = this.executeMutators(code, this.mutators.after);
    // cache file for repeated use
    filesMap.set(this.path, this);
    return this;
  }
} 

module.exports = File;
