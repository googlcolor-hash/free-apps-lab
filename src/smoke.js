const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const REQUIRED_FILES = [
  "index.html",
  "stats.html",
  "assets/styles.css",
  "assets/app.js",
  "assets/stats.js",
  "data/apps.json",
  "data/stats.json",
  "data/apps.csv",
];

let failed = false;

for (const relPath of REQUIRED_FILES) {
  const fullPath = path.join(DIST, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing: ${fullPath}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

const appsPath = path.join(DIST, "data", "apps.json");
const statsPath = path.join(DIST, "data", "stats.json");
const apps = JSON.parse(fs.readFileSync(appsPath, "utf8"));
const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));

if (!Array.isArray(apps) || apps.length === 0) {
  console.error("apps.json is empty or invalid");
  process.exit(1);
}

if (typeof stats.total_apps !== "number" || stats.total_apps !== apps.length) {
  console.error("stats.json does not match apps.json");
  process.exit(1);
}

console.log(`Smoke passed: ${apps.length} apps, ${REQUIRED_FILES.length} files checked`);

