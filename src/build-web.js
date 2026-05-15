const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DIST_DIR = path.join(ROOT, "dist");
const DIST_DATA_DIR = path.join(DIST_DIR, "data");

async function recreateDist() {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
}

async function main() {
  await recreateDist();
  await fs.cp(PUBLIC_DIR, DIST_DIR, { recursive: true });
  await fs.mkdir(DIST_DATA_DIR, { recursive: true });
  await fs.copyFile(path.join(DATA_DIR, "apps.json"), path.join(DIST_DATA_DIR, "apps.json"));
  await fs.copyFile(path.join(DATA_DIR, "stats.json"), path.join(DIST_DATA_DIR, "stats.json"));
  await fs.copyFile(path.join(DATA_DIR, "apps.csv"), path.join(DIST_DATA_DIR, "apps.csv"));
  console.log(`Build complete in ${DIST_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

