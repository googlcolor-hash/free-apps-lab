const state = {
  rawApps: [],
  filteredApps: [],
  filters: {
    search: "",
    category: "",
    platform: "",
    openSourceOnly: false,
    recommendedOnly: false,
    sort: "name_asc",
  },
};

const ui = {
  searchInput: document.getElementById("searchInput"),
  categorySelect: document.getElementById("categorySelect"),
  platformSelect: document.getElementById("platformSelect"),
  openSourceOnly: document.getElementById("openSourceOnly"),
  recommendedOnly: document.getElementById("recommendedOnly"),
  sortSelect: document.getElementById("sortSelect"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  resultCount: document.getElementById("resultCount"),
  cardsGrid: document.getElementById("cardsGrid"),
  quickStats: document.getElementById("quickStats"),
  cardTemplate: document.getElementById("appCardTemplate"),
};

function sortApps(apps, mode) {
  const copied = [...apps];
  copied.sort((a, b) => {
    if (mode === "name_desc") {
      return b.name.localeCompare(a.name);
    }
    if (mode === "category_asc") {
      return `${a.section_l1}/${a.section_l2}`.localeCompare(`${b.section_l1}/${b.section_l2}`);
    }
    return a.name.localeCompare(b.name);
  });
  return copied;
}

function applyFilters() {
  const searchValue = state.filters.search.toLowerCase().trim();

  const filtered = state.rawApps.filter((app) => {
    if (state.filters.category && app.section_l1 !== state.filters.category) return false;
    if (state.filters.platform && !app.platforms.includes(state.filters.platform)) return false;
    if (state.filters.openSourceOnly && !app.is_open_source) return false;
    if (state.filters.recommendedOnly && !app.is_recommended) return false;

    if (searchValue) {
      const haystack =
        `${app.name} ${app.description} ${app.section_l1} ${app.section_l2} ${app.platforms.join(" ")}`.toLowerCase();
      if (!haystack.includes(searchValue)) return false;
    }

    return true;
  });

  state.filteredApps = sortApps(filtered, state.filters.sort);
}

function renderQuickStats() {
  const total = state.rawApps.length;
  const visible = state.filteredApps.length;
  const openSource = state.filteredApps.filter((a) => a.is_open_source).length;
  const recommended = state.filteredApps.filter((a) => a.is_recommended).length;

  const stats = [
    { label: "Всего в базе", value: total },
    { label: "Показано", value: visible },
    { label: "Open-source", value: openSource },
    { label: "Recommended", value: recommended },
  ];

  ui.quickStats.innerHTML = stats
    .map((item) => `<article class="quick-stat"><b>${item.value}</b><span>${item.label}</span></article>`)
    .join("");
}

function renderCards() {
  ui.cardsGrid.innerHTML = "";
  ui.resultCount.textContent = `Результатов: ${state.filteredApps.length}`;

  if (!state.filteredApps.length) {
    ui.cardsGrid.innerHTML = "<p>По текущим фильтрам ничего не найдено.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();

  state.filteredApps.forEach((app) => {
    const card = ui.cardTemplate.content.firstElementChild.cloneNode(true);
    const link = card.querySelector(".card__link");
    const pillRow = card.querySelector(".pill-row");

    link.textContent = app.name;
    link.href = app.url;

    if (app.platforms.length) {
      app.platforms.forEach((platform) => {
        const span = document.createElement("span");
        span.className = "pill";
        span.textContent = platform;
        pillRow.appendChild(span);
      });
    }

    if (app.is_open_source) {
      const open = document.createElement("span");
      open.className = "pill pill--open";
      open.textContent = "open-source";
      pillRow.appendChild(open);
    }
    if (app.is_recommended) {
      const rec = document.createElement("span");
      rec.className = "pill pill--recommended";
      rec.textContent = "recommended";
      pillRow.appendChild(rec);
    }

    card.querySelector(".card__description").textContent = app.description || "Описание не указано";
    card.querySelector(".meta__category").textContent = app.section_l2
      ? `${app.section_l1} / ${app.section_l2}`
      : app.section_l1;
    card.querySelector(".meta__source").textContent = `${app.source_file}:${app.source_line}`;

    fragment.appendChild(card);
  });

  ui.cardsGrid.appendChild(fragment);
}

function refresh() {
  applyFilters();
  renderQuickStats();
  renderCards();
}

function fillFilterOptions() {
  const categories = Array.from(new Set(state.rawApps.map((app) => app.section_l1))).sort();
  const platforms = Array.from(new Set(state.rawApps.flatMap((app) => app.platforms))).sort();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    ui.categorySelect.appendChild(option);
  });

  platforms.forEach((platform) => {
    const option = document.createElement("option");
    option.value = platform;
    option.textContent = platform;
    ui.platformSelect.appendChild(option);
  });
}

function bindEvents() {
  ui.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    refresh();
  });

  ui.categorySelect.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    refresh();
  });

  ui.platformSelect.addEventListener("change", (event) => {
    state.filters.platform = event.target.value;
    refresh();
  });

  ui.openSourceOnly.addEventListener("change", (event) => {
    state.filters.openSourceOnly = event.target.checked;
    refresh();
  });

  ui.recommendedOnly.addEventListener("change", (event) => {
    state.filters.recommendedOnly = event.target.checked;
    refresh();
  });

  ui.sortSelect.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    refresh();
  });

  ui.resetFiltersBtn.addEventListener("click", () => {
    state.filters = {
      search: "",
      category: "",
      platform: "",
      openSourceOnly: false,
      recommendedOnly: false,
      sort: "name_asc",
    };

    ui.searchInput.value = "";
    ui.categorySelect.value = "";
    ui.platformSelect.value = "";
    ui.openSourceOnly.checked = false;
    ui.recommendedOnly.checked = false;
    ui.sortSelect.value = "name_asc";
    refresh();
  });
}

async function bootstrap() {
  try {
    const response = await fetch("./data/apps.json");
    const apps = await response.json();
    state.rawApps = apps;
    fillFilterOptions();
    bindEvents();
    refresh();
  } catch (error) {
    console.error(error);
    ui.resultCount.textContent = "Не удалось загрузить данные.";
  }
}

bootstrap();

