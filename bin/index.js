#! /usr/bin/env node
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const { pack } = require("../lib");

// async function to import chalk
(async function () {
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
    .option("config", {
      alias: "c",
      describe: "Config file",
      default: "./paquet.config.js",
    })
    .help().argv;

  const configPath = path.resolve(argv.config);
  const configExists = fs.existsSync(configPath);

  let entryPath = null;
  let outPath = null;
  let envVars = null;

  if (!configExists) {
    const { entry, out, env } = argv;
    entryPath = entry;
    outPath = out;
    envVars = JSON.parse(env);
  } else {
    const config = require(configPath);
    entryPath = config.entry || "./index.js";
    outPath = config.out || "./bundle.js";
    envVars = config.env || {};
    mutators = (config.mutators || []).reduce(
      (seperated, mutator) => ({
        before: [...seperated.before, mutator.before],
        after: [...seperated.after, mutator.after ],
      }),
      { before: [], after: [] }
    );
    plugins = config.plugins || [];
  }

  const spinner = ora(chalk.bold("Bundling..."));
  spinner.color = "blue";
  spinner.start();

  const bundled = pack({
    entryPath,
    outPath,
    process: { env: envVars },
    mutators,
    plugins,
  });

  if (bundled) spinner.succeed("Bundled!");
  else spinner.fail("Error bundling!");
})();
