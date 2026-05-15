# Free Apps Intelligence Hub

Интерактивная база на основе [Axorax/awesome-free-apps](https://github.com/Axorax/awesome-free-apps) с нормализованными данными, аналитикой, CI и сопутствующими артефактами.

## Что внутри

- `data/apps.json` — нормализованный каталог приложений.
- `data/apps.csv` — плоский экспорт для BI/таблиц.
- `data/stats.json` — агрегированные метрики.
- `public/index.html` — интерактивный каталог.
- `public/stats.html` — аналитическая страница.
- `.circleci/config.yml` — пайплайн `validate-data -> build-web -> smoke`.
- `deliverables/free_apps_catalog.xlsx` — таблица (Raw/Categories/Platforms/Flags/TopCategories).
- `deliverables/free_apps_overview.pptx` — краткая презентация.

## Быстрый старт

```bash
npm install
npm run build
npm run smoke
```

Локальный просмотр:

```bash
cd dist
python -m http.server 4173
# открыть http://localhost:4173
```

## Источники данных

- `README.md`
- `MOBILE.md`
- `filter/*.md`

Апп-поля:

- `id`
- `name`
- `url`
- `description`
- `section_l1`
- `section_l2`
- `platforms[]`
- `is_open_source`
- `is_recommended`
- `source_file`
- `source_line`

## Команды

- `npm run build:data` — парсинг и экспорт данных.
- `npm run validate-data` — валидация схемы/дедупа/источников.
- `npm run build-web` — сборка `dist`.
- `npm run smoke` — smoke-проверки артефактов.
- `npm run build` — полный цикл.

## Figma

- File: `Free Apps Intelligence Hub`
- URL: https://www.figma.com/design/jJu4qasZ3YqYXF42aJefX7
