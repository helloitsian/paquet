const path = require("path")

module.exports = {
  entry : "./tests/recursive.test.js",
  output : {
    path: path.resolve(__dirname, "dist"),
    filename: "output.js"
  }
}