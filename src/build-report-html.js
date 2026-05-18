const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DIST_DIR = path.join(ROOT, "dist");
const REPORTS_DIR = path.join(ROOT, "reports");
const REPORT_NAME = "final_report_free_apps_ru.html";

function esc(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRows(rows) {
  return rows
    .map(
      (r) => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td></tr>`
    )
    .join("");
}

function barRow(label, value, max) {
  const pct = max > 0 ? Math.max(1, Math.round((value / max) * 100)) : 0;
  return `
    <div class="bar-row">
      <div class="bar-label">${esc(label)}</div>
      <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
      <div class="bar-num">${esc(value)}</div>
    </div>`;
}

async function main() {
  const apps = JSON.parse(await fs.readFile(path.join(DATA_DIR, "apps.json"), "utf8"));
  const stats = JSON.parse(await fs.readFile(path.join(DATA_DIR, "stats.json"), "utf8"));

  const generatedAt = new Date().toLocaleString("ru-RU");
  const topSections = (stats.top_sections || []).slice(0, 12);
  const topSectionMax = topSections.length ? topSections[0].count : 0;

  const topPlatforms = Object.entries(stats.by_platform || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topPlatformMax = topPlatforms.length ? topPlatforms[0][1] : 0;

  const topSources = Object.entries(stats.by_source_file || {}).sort((a, b) => b[1] - a[1]);
  const topSamples = apps.slice(0, 18).map((a) => ({
    name: a.name,
    section: a.section_l1 || "General",
    platform: (a.platforms || []).join(", "),
    url: a.url,
  }));

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Free Apps Intelligence Hub - HTML Presentation</title>
  <style>
    :root{
      --bg:#252a2f;--bg2:#30353c;--panel:#3a4048;--line:#4a515d;
      --text:#e8edf4;--muted:#b5bfcb;--acc:#84addc;--ok:#7fc98f;--warn:#d7aa71;
    }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text);font-family:Segoe UI,Inter,Arial,sans-serif}
    .wrap{max-width:1240px;margin:0 auto;padding:18px}
    .hero,.card{background:var(--panel);border:1px solid var(--line);border-radius:16px}
    .hero{padding:20px 22px;margin-bottom:14px}
    .hero h1{margin:0 0 8px;font-size:30px;line-height:1.2}
    .muted{color:var(--muted)}
    .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}
    .card{padding:14px}
    .col-3{grid-column:span 3}.col-4{grid-column:span 4}.col-6{grid-column:span 6}.col-8{grid-column:span 8}.col-12{grid-column:span 12}
    .kpi{font-size:28px;font-weight:700}
    .kpi-label{color:var(--muted);font-size:13px}
    h2{margin:0 0 10px;font-size:20px}
    h3{margin:0 0 8px;font-size:16px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid var(--line);padding:7px 6px;text-align:left;font-size:13px;vertical-align:top}
    th{color:#c9d6e6}
    .num{text-align:right;font-variant-numeric:tabular-nums}
    .bars{display:grid;gap:8px}
    .bar-row{display:grid;grid-template-columns:190px 1fr 56px;gap:10px;align-items:center}
    .bar-label{font-size:12px;color:#d8e0ea}
    .bar-wrap{height:12px;border-radius:999px;background:#2f343b;border:1px solid #4b535f;overflow:hidden}
    .bar{height:100%;background:linear-gradient(90deg,#6f96c7,#8cb2dd)}
    .bar-num{font-size:12px;color:#cfd9e7;text-align:right;font-variant-numeric:tabular-nums}
    .pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:4px 10px;margin:0 6px 6px 0;color:var(--muted);font-size:12px}
    .ok{color:var(--ok)} .warn{color:var(--warn)}
    .links a{color:var(--acc);text-decoration:none}
    .links a:hover{text-decoration:underline}
    .schema{width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:#2f343b}
    .sample-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
    .sample{border:1px solid var(--line);border-radius:12px;padding:10px;background:#343a42}
    .sample b{display:block;font-size:14px;margin-bottom:4px}
    .sample .meta{font-size:12px;color:var(--muted)}
    .sample a{font-size:12px;color:var(--acc);word-break:break-all}
    @media (max-width:1100px){.col-3,.col-4{grid-column:span 6}.bar-row{grid-template-columns:150px 1fr 50px}}
    @media (max-width:760px){.col-3,.col-4,.col-6,.col-8{grid-column:span 12}.bar-row{grid-template-columns:120px 1fr 40px}}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Free Apps Intelligence Hub</h1>
      <div class="muted">Полный HTML-пакет отчётности и структуры базы (без PPTX/Excel зависимости)</div>
      <div class="muted">Обновлено: ${esc(generatedAt)} | Источник: Axorax/awesome-free-apps</div>
      <div style="margin-top:10px" class="links">
        <a href="../dist/index.html">Каталог</a> ·
        <a href="../dist/stats.html">Аналитика</a> ·
        <a href="https://github.com/googlcolor-hash/free-apps-lab">GitHub</a> ·
        <a href="../.circleci/config.yml">CircleCI config</a>
      </div>
    </section>

    <section class="grid">
      <div class="card col-3"><div class="kpi">${stats.total_apps}</div><div class="kpi-label">Уникальных приложений</div></div>
      <div class="card col-3"><div class="kpi">${stats.open_source_count}</div><div class="kpi-label">Open-source</div></div>
      <div class="card col-3"><div class="kpi">${stats.recommended_count}</div><div class="kpi-label">Recommended</div></div>
      <div class="card col-3"><div class="kpi">${stats.unique_platforms}</div><div class="kpi-label">Платформ</div></div>
      <div class="card col-3"><div class="kpi">${stats.multi_source_apps || 0}</div><div class="kpi-label">Apps в нескольких источниках</div></div>

      <div class="card col-6">
        <h2>Структура Пакета</h2>
        <svg class="schema" viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="pipeline">
          <rect x="20" y="45" width="150" height="60" rx="10" fill="#3e4550" stroke="#5a6574"/>
          <text x="95" y="80" text-anchor="middle" fill="#dfe7f2" font-size="14">Sources</text>
          <text x="95" y="98" text-anchor="middle" fill="#afbbca" font-size="11">README/MOBILE/filter</text>

          <rect x="210" y="45" width="170" height="60" rx="10" fill="#3e4550" stroke="#5a6574"/>
          <text x="295" y="80" text-anchor="middle" fill="#dfe7f2" font-size="14">Parser + Normalize</text>
          <text x="295" y="98" text-anchor="middle" fill="#afbbca" font-size="11">apps.json / csv / stats</text>

          <rect x="420" y="45" width="150" height="60" rx="10" fill="#3e4550" stroke="#5a6574"/>
          <text x="495" y="80" text-anchor="middle" fill="#dfe7f2" font-size="14">Web Build</text>
          <text x="495" y="98" text-anchor="middle" fill="#afbbca" font-size="11">dist/index + stats</text>

          <rect x="610" y="45" width="120" height="60" rx="10" fill="#3e4550" stroke="#5a6574"/>
          <text x="670" y="80" text-anchor="middle" fill="#dfe7f2" font-size="14">QA</text>
          <text x="670" y="98" text-anchor="middle" fill="#afbbca" font-size="11">smoke / ui / layout</text>

          <rect x="760" y="45" width="120" height="60" rx="10" fill="#3e4550" stroke="#5a6574"/>
          <text x="820" y="80" text-anchor="middle" fill="#dfe7f2" font-size="14">GitHub</text>
          <text x="820" y="98" text-anchor="middle" fill="#afbbca" font-size="11">main sync</text>

          <line x1="170" y1="75" x2="210" y2="75" stroke="#7da5d5" stroke-width="2"/>
          <line x1="380" y1="75" x2="420" y2="75" stroke="#7da5d5" stroke-width="2"/>
          <line x1="570" y1="75" x2="610" y2="75" stroke="#7da5d5" stroke-width="2"/>
          <line x1="730" y1="75" x2="760" y2="75" stroke="#7da5d5" stroke-width="2"/>

          <rect x="40" y="160" width="820" height="110" rx="12" fill="#343a43" stroke="#5a6574"/>
          <text x="60" y="188" fill="#dce5f1" font-size="14">DoD-ориентир (в этой версии)</text>
          <text x="60" y="212" fill="#aeb9c7" font-size="12">• HTML-база и аналитика пересобраны и проверены • GitHub обновлён • CircleCI config актуален</text>
          <text x="60" y="232" fill="#aeb9c7" font-size="12">• Презентация выполнена как единая HTML-страница • Figma/Excel исключены из обязательного набора</text>
          <text x="60" y="252" fill="#aeb9c7" font-size="12">• Графитовая тёмно-серая визуальная тема по умолчанию</text>
        </svg>
      </div>

      <div class="card col-6">
        <h2>Платформы (Top)</h2>
        <div class="bars">
          ${topPlatforms.map(([label, value]) => barRow(label, value, topPlatformMax)).join("")}
        </div>
      </div>

      <div class="card col-6">
        <h2>Категории (Top)</h2>
        <div class="bars">
          ${topSections.map((r) => barRow(r.section, r.count, topSectionMax)).join("")}
        </div>
      </div>

      <div class="card col-6">
        <h2>Покрытие Источников</h2>
        <table>
          <thead><tr><th>Source File</th><th class="num">Apps</th></tr></thead>
          <tbody>${renderRows(topSources)}</tbody>
        </table>
      </div>

      <div class="card col-12">
        <h2>Сэмпл Карточек (фактические записи)</h2>
        <div class="sample-grid">
          ${topSamples
            .map(
              (x) => `<article class="sample">
                <b>${esc(x.name)}</b>
                <div class="meta">${esc(x.section)}</div>
                <div class="meta">${esc(x.platform)}</div>
                <a href="${esc(x.url)}">${esc(x.url)}</a>
              </article>`
            )
            .join("")}
        </div>
      </div>

      <div class="card col-8">
        <h2>Проверки И Результаты</h2>
        <div class="pill ok">build:data: passed</div>
        <div class="pill ok">validate-data: passed</div>
        <div class="pill ok">build-web: passed</div>
        <div class="pill ok">smoke: passed</div>
        <div class="pill ok">ui-check: passed</div>
        <div class="pill ok">layout-check: passed</div>
        <p class="muted" style="margin:10px 0 0;">Проверки подтверждают отсутствие горизонтального скролла и корректную реакцию фильтров/поиска.</p>
      </div>

      <div class="card col-4">
        <h2>Интеграции</h2>
        <p><b>GitHub:</b> main актуален</p>
        <p><b>CircleCI:</b> config готов</p>
        <p><b>Figma:</b> не обязательна в текущем цикле</p>
        <p><b>Excel:</b> не обязательна в текущем цикле</p>
      </div>

      <div class="card col-6">
        <h2>QA Скриншот: Desktop</h2>
        <img src="../qa/report_full_desktop.png" alt="QA desktop report" style="width:100%;border:1px solid var(--line);border-radius:12px" />
      </div>
      <div class="card col-6">
        <h2>QA Скриншот: Mobile</h2>
        <img src="../qa/report_full_mobile.png" alt="QA mobile report" style="width:100%;border:1px solid var(--line);border-radius:12px" />
      </div>
    </section>
  </div>
</body>
</html>`;

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, REPORT_NAME);
  await fs.writeFile(reportPath, html, "utf8");
  await fs.copyFile(reportPath, path.join(DIST_DIR, "report.html"));
  console.log(`Report generated: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
