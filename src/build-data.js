const fs = require("node:fs/promises");
const path = require("node:path");

const REPO_OWNER = "Axorax";
const REPO_NAME = "awesome-free-apps";
const BRANCH = "main";

const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;
const CONTENTS_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

const ROOT_SOURCES = [
  { sourceFile: "README.md", url: `${RAW_BASE}/README.md` },
  { sourceFile: "MOBILE.md", url: `${RAW_BASE}/MOBILE.md` },
];

const OUTPUT_DIR = path.resolve(__dirname, "..", "data");
const APPS_JSON_PATH = path.join(OUTPUT_DIR, "apps.json");
const APPS_CSV_PATH = path.join(OUTPUT_DIR, "apps.csv");
const STATS_JSON_PATH = path.join(OUTPUT_DIR, "stats.json");

function cleanText(input) {
  return input
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(input) {
  return cleanText(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeUrl(url) {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function parseFilterName(sourceFile) {
  if (!sourceFile.startsWith("filter/")) {
    return null;
  }
  return sourceFile.replace(/^filter\//, "").replace(/\.md$/i, "");
}

function inferPlatforms({ sourceFile, sectionL1, sectionL2, name, description }) {
  const haystack = `${sourceFile} ${sectionL1} ${sectionL2} ${name} ${description}`.toLowerCase();
  const platforms = new Set();

  const contains = (keyword) => haystack.includes(keyword);

  if (sourceFile === "MOBILE.md" || contains("mobile")) {
    platforms.add("mobile");
  }
  if (contains("android")) platforms.add("android");
  if (contains("ios") || contains("iphone") || contains("ipad")) platforms.add("ios");
  if (contains("windows") || contains("win ")) platforms.add("windows");
  if (contains("macos") || contains("mac ")) platforms.add("macos");
  if (contains("linux")) platforms.add("linux");
  if (contains("web") || contains("browser")) platforms.add("web");
  if (contains("cli") || contains("terminal")) platforms.add("cli");
  if (contains("desktop")) platforms.add("desktop");

  const filterName = parseFilterName(sourceFile);
  if (filterName) {
    const mapped = {
      android: "android",
      ios: "ios",
      windows: "windows",
      linux: "linux",
      macos: "macos",
      web: "web",
      mobile: "mobile",
      cli: "cli",
      desktop: "desktop",
    };
    const parts = filterName.split(/[^a-z0-9]+/i).map((p) => p.toLowerCase());
    for (const part of parts) {
      if (mapped[part]) {
        platforms.add(mapped[part]);
      }
    }
  }

  if (platforms.size === 0) {
    platforms.add("general");
  }

  return Array.from(platforms).sort();
}

function inferFlags({ sourceFile, sectionL1, sectionL2, description }) {
  const haystack = `${sourceFile} ${sectionL1} ${sectionL2} ${description}`.toLowerCase();
  const isOpenSource =
    haystack.includes("open source") ||
    haystack.includes("open-source") ||
    haystack.includes("opensource") ||
    /filter\/.*open/i.test(sourceFile);

  const isRecommended =
    haystack.includes("recommended") ||
    haystack.includes("editor's choice") ||
    haystack.includes("best") ||
    /filter\/.*recommend/i.test(sourceFile);

  return { isOpenSource, isRecommended };
}

function toCsvRow(cells) {
  return cells
    .map((value) => {
      const text = String(value ?? "");
      if (text.includes('"') || text.includes(",") || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    })
    .join(",");
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "free-apps-lab-parser",
      Accept: "text/plain, application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }
  return response.text();
}

async function fetchFilterSources() {
  const response = await fetch(`${CONTENTS_BASE}/filter`, {
    headers: {
      "User-Agent": "free-apps-lab-parser",
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to list filter files: ${response.status}`);
  }

  const entries = await response.json();
  return entries
    .filter((item) => item.type === "file" && /\.md$/i.test(item.name))
    .map((item) => ({
      sourceFile: `filter/${item.name}`,
      url: `${RAW_BASE}/filter/${item.name}`,
    }))
    .sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));
}

function parseMarkdownEntries(content, sourceFile) {
  const entries = [];
  const lines = content.split(/\r?\n/);
  let sectionL1 = sourceFile === "MOBILE.md" ? "Mobile" : "General";
  let sectionL2 = parseFilterName(sourceFile) ? cleanText(parseFilterName(sourceFile)) : "";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      const headingText = cleanText(heading[2]);
      if (level <= 2) {
        sectionL1 = headingText;
        sectionL2 = "";
      } else if (level === 3) {
        sectionL2 = headingText;
      } else if (!sectionL2) {
        sectionL2 = headingText;
      }
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*(?:[-–—:]\s*(.+))?$/);
    if (!bullet) {
      continue;
    }

    const name = cleanText(bullet[1]);
    const url = bullet[2].trim();
    const description = cleanText(bullet[3] || "");
    if (!name || !url) {
      continue;
    }

    const { isOpenSource, isRecommended } = inferFlags({
      sourceFile,
      sectionL1,
      sectionL2,
      description,
    });

    const platforms = inferPlatforms({
      sourceFile,
      sectionL1,
      sectionL2,
      name,
      description,
    });

    entries.push({
      id: "",
      name,
      url,
      description,
      section_l1: sectionL1 || "General",
      section_l2: sectionL2 || "",
      platforms,
      is_open_source: isOpenSource,
      is_recommended: isRecommended,
      source_file: sourceFile,
      source_line: i + 1,
    });
  }

  return entries;
}

function mergeEntries(entries) {
  const mergedByKey = new Map();

  for (const entry of entries) {
    const key = normalizeUrl(entry.url);
    if (!mergedByKey.has(key)) {
      mergedByKey.set(key, { ...entry });
      continue;
    }

    const current = mergedByKey.get(key);
    if ((entry.description || "").length > (current.description || "").length) {
      current.description = entry.description;
    }
    if (!current.section_l1 && entry.section_l1) {
      current.section_l1 = entry.section_l1;
    }
    if (!current.section_l2 && entry.section_l2) {
      current.section_l2 = entry.section_l2;
    }
    current.platforms = Array.from(new Set([...current.platforms, ...entry.platforms])).sort();
    current.is_open_source = current.is_open_source || entry.is_open_source;
    current.is_recommended = current.is_recommended || entry.is_recommended;
  }

  const merged = Array.from(mergedByKey.values()).sort((a, b) => a.name.localeCompare(b.name));

  for (const app of merged) {
    const hostPart = new URL(app.url).hostname.replace(/^www\./, "");
    const tail = hostPart.split(".").slice(0, 2).join("-");
    app.id = `${slugify(app.name)}-${slugify(tail)}`.slice(0, 96);
  }

  return merged;
}

function buildStats(entries) {
  const bySource = {};
  const bySection = {};
  const byPlatform = {};

  for (const app of entries) {
    bySource[app.source_file] = (bySource[app.source_file] || 0) + 1;
    bySection[app.section_l1] = (bySection[app.section_l1] || 0) + 1;
    for (const platform of app.platforms) {
      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
    }
  }

  const topSections = Object.entries(bySection)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([section, count]) => ({ section, count }));

  return {
    generated_at: new Date().toISOString(),
    total_apps: entries.length,
    open_source_count: entries.filter((app) => app.is_open_source).length,
    recommended_count: entries.filter((app) => app.is_recommended).length,
    unique_platforms: Object.keys(byPlatform).length,
    by_source_file: bySource,
    by_section_l1: bySection,
    by_platform: byPlatform,
    top_sections: topSections,
  };
}

async function writeCsv(entries) {
  const header = [
    "id",
    "name",
    "url",
    "description",
    "section_l1",
    "section_l2",
    "platforms",
    "is_open_source",
    "is_recommended",
    "source_file",
    "source_line",
  ];

  const rows = [toCsvRow(header)];
  for (const app of entries) {
    rows.push(
      toCsvRow([
        app.id,
        app.name,
        app.url,
        app.description,
        app.section_l1,
        app.section_l2,
        app.platforms.join("|"),
        app.is_open_source,
        app.is_recommended,
        app.source_file,
        app.source_line,
      ])
    );
  }

  await fs.writeFile(APPS_CSV_PATH, rows.join("\n"), "utf8");
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const filterSources = await fetchFilterSources();
  const allSources = [...ROOT_SOURCES, ...filterSources];

  const parsed = [];
  for (const source of allSources) {
    const text = await fetchText(source.url);
    const apps = parseMarkdownEntries(text, source.sourceFile);
    parsed.push(...apps);
    console.log(`Parsed ${apps.length} entries from ${source.sourceFile}`);
  }

  const mergedEntries = mergeEntries(parsed);
  const stats = buildStats(mergedEntries);

  await fs.writeFile(APPS_JSON_PATH, JSON.stringify(mergedEntries, null, 2), "utf8");
  await writeCsv(mergedEntries);
  await fs.writeFile(STATS_JSON_PATH, JSON.stringify(stats, null, 2), "utf8");

  console.log(`Wrote ${mergedEntries.length} unique apps`);
  console.log(`Outputs: ${APPS_JSON_PATH}, ${APPS_CSV_PATH}, ${STATS_JSON_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

