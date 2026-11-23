# История изменений

Все заметные изменения проекта описаны здесь. Формат —
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), версии —
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-11-23

### Добавлено

- В README, рядом с картинкой, добавлен текст запроса, из которого получилась
  диаграмма.

## [0.2.1] - 2026-11-23

### Изменено

- README: единая установка для OpenCode, Claude Code, OpenAI Codex и
  VS Code Copilot; оговорка «проверено только в OpenCode» сохранена.
- Описание репозитория уточнено под несколько агентов.

## [0.2.0] - 2026-11-23

### Добавлено

- Соответствие открытому стандарту Agent Skills: `name: sankeymatic`,
  `license: MIT`, `compatibility`. Скилл можно установить в Claude Code,
  OpenAI Codex и VS Code Copilot по их каталогам скиллов.
- Раздел README «Без OpenCode» с оговоркой, что скилл проверен только в
  OpenCode.
- `local.mjs --open` выбирает `open` / `xdg-open` / `start` по платформе.
- Тест `scripts/skill.test.mjs` проверяет frontmatter по стандарту.

## [0.1.4] - 2026-11-23

### Добавлено

- Пример готовой диаграммы в README: `docs/images/result.png`.

## [0.1.3] - 2026-11-23

### Исправлено

- Подписи больше не налезают по вертикали: высота полотна считается по
  фактическому зазору между узлами (`node h`, `node spacing`) и высоте подписи,
  а не по числу узлов. Русский P&L — 850 px вместо 600.

## [0.1.2] - 2026-11-23

### Исправлено

- Полотно было слишком широким: формула из 0.1.1 резервировала ширину внешних
  подписей дважды. Теперь ширина считается по зазорам между стадиями:
  `поля + стадии * node_w + (стадии − 1) * (ширина подписи + 10)`.
  Русский P&L — 850 px вместо 1400 (−39 %), английский — 700 вместо 1150.

## [0.1.1] - 2026-11-23

### Исправлено

- Длинные подписи больше не налезают на соседние колонки: `scripts/layout.mjs`
  переносит имена по словам и подбирает `size w` / `size h` под длину подписей
  и число стадий.
- Сумма больше не оказывается в одной строке с именем: скилл явно пишет
  `labelvalue position below`, потому что сайт при открытии ссылки подставляет
  `labelvalue position after`.
- Ссылка и вставка в поле Inputs теперь выглядят одинаково:
  `labelposition scheme auto` и `labels relativesize 100` задаются явно.

### Добавлено

- `scripts/layout.mjs` и `references/layout.md` с формулами полотна.
- Golden-кейс с русскими подписями `tests/fixtures/pl-1800-ru.txt`.

## [0.1.0] - 2026-11-23

### Добавлено

- Скилл для OpenCode, превращающий текст в исходник SankeyMATIC: четыре вопроса
  с дефолтами (размер меток 18, высота узлов 20, расстояние 30, тема Categories),
  необязательный вопрос про единицы измерения и правила моделирования
  сбалансированных потоков.
- `scripts/validate.mjs`: синтаксис, список допустимых настроек, неположительные
  суммы, циклы, потоки узла в себя и предупреждения о дисбалансе. Коды выхода
  0/1, флаги `--strict`, `--json`.
- `scripts/link.mjs`: ссылки `?i=` с той же кодировкой, что использует сайт.
- `scripts/local.mjs` и `scripts/assets.mjs`: локальный предпросмотр на
  `127.0.0.1` с закреплёнными файлами и проверкой контрольных сумм; в странице
  не остаётся CDN.
- Golden-фикстура `tests/fixtures/pl-1800.*`: 10 потоков, 11 узлов,
  0 дисбалансов.
- Документация: README, справочники по моделированию, синтаксису и палитрам,
  AGENTS.md, NOTICE с атрибуцией ISC/MIT.

[0.2.2]: https://github.com/teterkin/sankeymatic/releases/tag/v0.2.2
[0.2.1]: https://github.com/teterkin/sankeymatic/releases/tag/v0.2.1
[0.2.0]: https://github.com/teterkin/sankeymatic/releases/tag/v0.2.0
[0.1.4]: https://github.com/teterkin/sankeymatic/releases/tag/v0.1.4
[0.1.3]: https://github.com/teterkin/sankeymatic/releases/tag/v0.1.3
[0.1.2]: https://github.com/teterkin/sankeymatic/releases/tag/v0.1.2
[0.1.1]: https://github.com/teterkin/sankeymatic/releases/tag/v0.1.1
[0.1.0]: https://github.com/teterkin/sankeymatic/releases/tag/v0.1.0
