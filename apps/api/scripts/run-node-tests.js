const { readdirSync, statSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const distRoot = resolve(__dirname, "..", "dist");
const specFiles = [];

collectSpecs(distRoot, specFiles);

if (specFiles.length === 0) {
  console.log("No compiled spec files found in dist.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["--test", ...specFiles], {
  stdio: "inherit"
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);

function collectSpecs(directory, output) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collectSpecs(fullPath, output);
      continue;
    }

    if (entry.endsWith(".spec.js")) {
      output.push(fullPath);
    }
  }
}
