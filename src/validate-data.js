const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const APPS_PATH = path.join(DATA_DIR, "apps.json");
const STATS_PATH = path.join(DATA_DIR, "stats.json");

function normalizeUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "").toLowerCase();
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

async function main() {
  const errors = [];
  const apps = JSON.parse(await fs.readFile(APPS_PATH, "utf8"));
  const stats = JSON.parse(await fs.readFile(STATS_PATH, "utf8"));

  assert(Array.isArray(apps), "apps.json must be an array", errors);
  assert(apps.length > 0, "apps.json must not be empty", errors);

  const bySource = new Map();
  const seen = new Set();

  apps.forEach((app, idx) => {
    const prefix = `apps[${idx}]`;
    assert(app.id && typeof app.id === "string", `${prefix}.id missing`, errors);
    assert(app.name && typeof app.name === "string", `${prefix}.name missing`, errors);
    assert(app.url && /^https?:\/\//i.test(app.url), `${prefix}.url invalid`, errors);
    assert(Array.isArray(app.platforms), `${prefix}.platforms must be array`, errors);
    assert(typeof app.is_open_source === "boolean", `${prefix}.is_open_source must be boolean`, errors);
    assert(typeof app.is_recommended === "boolean", `${prefix}.is_recommended must be boolean`, errors);
    assert(app.source_file && typeof app.source_file === "string", `${prefix}.source_file missing`, errors);
    assert(Number.isInteger(app.source_line) && app.source_line > 0, `${prefix}.source_line invalid`, errors);
    if (app.source_files !== undefined) {
      assert(Array.isArray(app.source_files), `${prefix}.source_files must be array`, errors);
      if (Array.isArray(app.source_files)) {
        assert(app.source_files.length > 0, `${prefix}.source_files empty`, errors);
        assert(
          app.source_files.every((s) => typeof s === "string" && s.length > 0),
          `${prefix}.source_files contains invalid values`,
          errors
        );
      }
    }

    const key = normalizeUrl(app.url);
    if (seen.has(key)) {
      errors.push(`duplicate app url key: ${key}`);
    }
    seen.add(key);
    bySource.set(app.source_file, (bySource.get(app.source_file) || 0) + 1);

    if (/filter\/.*open/i.test(app.source_file)) {
      assert(app.is_open_source === true, `${prefix} expected is_open_source=true for open filter`, errors);
    }
    if (/filter\/.*recommend/i.test(app.source_file)) {
      assert(app.is_recommended === true, `${prefix} expected is_recommended=true for recommendation filter`, errors);
    }
  });

  const sourceFiles = Array.from(bySource.keys());
  const hasReadme = sourceFiles.includes("README.md");
  const hasMobile = sourceFiles.includes("MOBILE.md");
  const hasFilter = sourceFiles.some((file) => file.startsWith("filter/"));

  assert(hasReadme, "No entries from README.md", errors);
  assert(hasMobile, "No entries from MOBILE.md", errors);
  assert(hasFilter, "No entries from filter/*.md", errors);

  assert(typeof stats.total_apps === "number", "stats.total_apps must be number", errors);
  assert(stats.total_apps === apps.length, "stats.total_apps must match apps length", errors);
  assert(stats.open_source_count <= apps.length, "stats.open_source_count invalid", errors);
  assert(stats.recommended_count <= apps.length, "stats.recommended_count invalid", errors);
  if (stats.multi_source_apps !== undefined) {
    assert(typeof stats.multi_source_apps === "number", "stats.multi_source_apps must be number", errors);
    assert(stats.multi_source_apps <= apps.length, "stats.multi_source_apps invalid", errors);
  }

  if (errors.length) {
    console.error("Validation failed:");
    errors.forEach((err) => console.error(`- ${err}`));
    process.exit(1);
  }

  console.log(`Validation passed for ${apps.length} apps`);
  console.log(`Sources found: ${sourceFiles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
