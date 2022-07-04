#! /usr/bin/env node
const yargs = require("yargs");
const { pack } = require("../lib");

// async function to import chalk
(async function() {
  const chalk = (await import("chalk")).default;
  const ora = (await import("ora")).default;

  const argv = yargs(process.argv)
    .option("entry", {
      alias: "e",
      describe: "Entry file",
      default: "./index.js",
    })
    .option("out", {
      alias: "o",
      describe: "Output Path",
      default: "./bundle.js",
    })
    .option("env", {
      describe: "Environment variables",
      default: "{}",
    })
    .help()
    .argv;

  const { entry, out, env } = argv;
  const envParsed = JSON.parse(env);
  
  const spinner = ora(chalk.bold("Bundling..."));
  spinner.color = "blue";
  spinner.start();
  const bundled = pack(entry, out, envParsed);
  if (bundled)
    spinner.succeed("Bundled!");
  else
    spinner.fail("Error bundling!");
})();
