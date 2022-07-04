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

  executeMutators(code, mutators) {
    return mutators.reduce((mutatedCode, mutator) => mutator(mutatedCode), code);
  }
  
  create() {
    // check to see if we've already created file before
    if (filesMap.has(this.path)) return filesMap.get(this.path);

    // if not get the absolute path and file data (utf-8 string)
    const { absolutePath, data: fileData, dirname } = getFileData(this.path);
    // execute before mutators
    const beforeCode = this.executeMutators(fileData, this.mutators.before);
    // fetch dependencies of the file
    const modules = findDependencies(dirname, beforeCode);
    // transpile to es5 code
    const { code } = babel.transformSync(beforeCode, {
      plugins: ["@babel/plugin-transform-modules-commonjs"],
    });
    // execute "after" mutators
    const afterCode = this.executeMutators(code, this.mutators.after);

    this.code = afterCode;
    this.modules = modules;
    
    // cache file for repeated use
    filesMap.set(this.path, this);

    return this;
  }
}

module.exports = File;
