function createKpi(label, value) {
  return `<article class="kpi"><b>${value}</b><span>${label}</span></article>`;
}

function renderBars(container, entries) {
  const max = Math.max(...entries.map(([, value]) => value), 1);
  container.innerHTML = entries
    .map(([label, value]) => {
      const ratio = Math.round((value / max) * 100);
      return `
        <article class="bar">
          <div class="bar__label"><span>${label}</span><b>${value}</b></div>
          <div class="bar__track">
            <div class="bar__fill" style="width:${ratio}%"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function bootstrap() {
  const kpiGrid = document.getElementById("kpiGrid");
  const platformStats = document.getElementById("platformStats");
  const sourceStats = document.getElementById("sourceStats");
  const categoryStats = document.getElementById("categoryStats");

  try {
    const response = await fetch("./data/stats.json");
    const stats = await response.json();

    kpiGrid.innerHTML = [
      createKpi("Всего приложений", stats.total_apps),
      createKpi("Open-source", stats.open_source_count),
      createKpi("Recommended", stats.recommended_count),
      createKpi("Уникальных платформ", stats.unique_platforms),
    ].join("");

    const platformEntries = Object.entries(stats.by_platform || {}).sort((a, b) => b[1] - a[1]);
    const sourceEntries = Object.entries(stats.by_source_file || {}).sort((a, b) => b[1] - a[1]);
    const categoryEntries = (stats.top_sections || []).map((item) => [item.section, item.count]);

    renderBars(platformStats, platformEntries);
    renderBars(sourceStats, sourceEntries);
    renderBars(categoryStats, categoryEntries);
  } catch (error) {
    console.error(error);
    kpiGrid.innerHTML = "<p>Не удалось загрузить статистику.</p>";
  }
}

bootstrap();

