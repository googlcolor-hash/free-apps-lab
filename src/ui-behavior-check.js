const fs = require("node:fs/promises");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractCount(text) {
  const m = String(text).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

async function main() {
  const [html, js, appsRaw] = await Promise.all([
    fs.readFile(path.join(ROOT, "public", "index.html"), "utf8"),
    fs.readFile(path.join(ROOT, "public", "assets", "app.js"), "utf8"),
    fs.readFile(path.join(ROOT, "data", "apps.json"), "utf8"),
  ]);

  const apps = JSON.parse(appsRaw);
  assert(Array.isArray(apps) && apps.length > 0, "apps.json is empty");

  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/index.html" });
  const { window } = dom;
  window.fetch = async () => ({ ok: true, json: async () => apps });
  window.eval(js);
  await new Promise((resolve) => setTimeout(resolve, 20));

  const doc = window.document;
  const resultCount = doc.getElementById("resultCount");
  const searchInput = doc.getElementById("searchInput");
  const categorySelect = doc.getElementById("categorySelect");
  const platformSelect = doc.getElementById("platformSelect");
  const openSourceOnly = doc.getElementById("openSourceOnly");
  const sortSelect = doc.getElementById("sortSelect");
  const resetFiltersBtn = doc.getElementById("resetFiltersBtn");

  const initial = extractCount(resultCount.textContent);
  assert(initial === apps.length, `initial count mismatch: ${initial} !== ${apps.length}`);

  searchInput.value = "audacity";
  searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const afterSearch = extractCount(resultCount.textContent);
  assert(afterSearch > 0 && afterSearch < initial, "search filter did not reduce results");

  resetFiltersBtn.click();
  const afterReset = extractCount(resultCount.textContent);
  assert(afterReset === initial, "reset filters did not restore full dataset");

  const firstCategory = categorySelect.options[1]?.value;
  const firstPlatform = platformSelect.options[1]?.value;
  assert(firstCategory, "category options not populated");
  assert(firstPlatform, "platform options not populated");

  categorySelect.value = firstCategory;
  categorySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  const afterCategory = extractCount(resultCount.textContent);
  assert(afterCategory > 0 && afterCategory < initial, "category filter did not reduce results from full dataset");

  platformSelect.value = firstPlatform;
  platformSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  const afterPlatform = extractCount(resultCount.textContent);
  assert(afterPlatform >= 0 && afterPlatform <= afterCategory, "platform filter invalid behavior");

  sortSelect.value = "name_desc";
  sortSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

  openSourceOnly.checked = true;
  openSourceOnly.dispatchEvent(new window.Event("change", { bubbles: true }));
  const afterOpen = extractCount(resultCount.textContent);
  assert(afterOpen >= 0 && afterOpen <= afterPlatform, "open-source filter invalid behavior");

  const firstCardLink = doc.querySelector(".app-card .card__link");
  const emptyMessage = doc.querySelector("#cardsGrid p");
  assert((afterOpen > 0 && firstCardLink) || (afterOpen === 0 && emptyMessage), "render state invalid after filters/sort");

  console.log(`UI behavior passed: initial=${initial}, search=${afterSearch}, reset=${afterReset}, category=${afterCategory}, platform=${afterPlatform}, open=${afterOpen}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
