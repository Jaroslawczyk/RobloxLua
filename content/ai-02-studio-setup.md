---
title: Как подключить ИИ к Roblox Studio (пошагово)
section: ai
order: 2
summary: Assistant, Rojo + внешний редактор, MCP-сервер Studio, плагины — установка, структура проекта и безопасные настройки.
time: 40
level: Средний
---

:::note Проверяйте версии
Инструменты ниже обновляются часто. Команды приведены как **ориентир**; всегда сверяйтесь с README соответствующего проекта и официальной документацией Roblox. Официальная страница про MCP: [Connect to the Roblox Studio MCP server](https://create.roblox.com/docs/studio/mcp).
:::

## Путь A: встроенный Roblox Assistant

1. Обновите Studio до последней версии.
2. Откройте панель **Assistant** (кнопка в правом верхнем углу Studio).
3. Пишите задачи обычным языком: «сделай скрипт, который при касании плиты прибавляет 1 к leaderstats».
4. Всегда **просматривайте код перед применением** и запускайте.

Подходит для первых экспериментов и мелочей. Для командной работы и больших проектов нужен путь B.

## Путь B: Rojo + Git + внешний редактор + ИИ-агент (основной)

Идея: **код — это файлы** на вашем диске, Studio — только «окно просмотра и запуска».

### 1. Установите инструменты

| Инструмент | Зачем |
|---|---|
| **Git** + аккаунт GitHub | история, ветки, ревью |
| **VS Code** (или Cursor) | редактор с ИИ |
| **Rokit** (или Aftman/Foreman) | менеджер Roblox-инструментов проекта |
| **Rojo** | синхронизация файлов ↔ Studio |
| **Wally** | менеджер пакетов (Signal, Trove, ProfileStore и т.д.) |
| **StyLua** | автоформатирование |
| **Selene** | линтер |
| **luau-lsp** | анализатор/автодополнение с типами Roblox |
| **Lune** (необяз.) | запуск Luau-скриптов вне Studio (тесты чистой логики, автоматизация) |

Плагин **Rojo** ставится в Studio (из Creator Store / по инструкции на rojo.space).

### 2. Создайте проект

```bash
mkdir mygame && cd mygame
git init
rokit init                                    # создаёт rokit.toml
rokit add rojo-rbx/rojo
rokit add JohnnyMorganz/StyLua
rokit add Kampfkarren/selene
rokit add UpliftGames/wally
rokit add JohnnyMorganz/luau-lsp
rojo init                                     # default.project.json + src/
```

### 3. Структура

```text
mygame/
├─ default.project.json        # карта «папка → дерево Studio»
├─ rokit.toml                  # версии инструментов
├─ wally.toml                  # пакеты
├─ selene.toml                 # std = "roblox"
├─ stylua.toml
├─ AGENTS.md  (или CLAUDE.md)  # правила проекта для ИИ — см. ниже
├─ .gitignore
├─ src/
│  ├─ server/        → ServerScriptService   (*.server.luau, модули)
│  ├─ client/        → StarterPlayerScripts  (*.client.luau, модули)
│  └─ shared/        → ReplicatedStorage     (модули, типы, конфиги)
└─ Packages/         # Wally (в .gitignore)
```

`default.project.json` (пример):

```json
{
  "name": "MyGame",
  "tree": {
    "$className": "DataModel",
    "ReplicatedStorage": {
      "Shared": { "$path": "src/shared" },
      "Packages": { "$path": "Packages" }
    },
    "ServerScriptService": {
      "Server": { "$path": "src/server" }
    },
    "StarterPlayer": {
      "StarterPlayerScripts": {
        "Client": { "$path": "src/client" }
      }
    },
    "Workspace": {
      "$className": "Workspace",
      "$ignoreUnknownInstances": true
    }
  }
}
```

(Содержимое `Workspace` сильно зависит от проекта — часто карту собирают в Studio и хранят отдельным `.rbxl`/`.rbxm`, а Rojo ведёт только код; `$ignoreUnknownInstances` говорит Rojo не трогать объекты, которых нет в файлах. Детали — в документации Rojo.)

### 4. Запуск и цикл работы

```bash
rojo serve                  # запускает сервер синхронизации
# В Studio: плагин Rojo → Connect — изменения файлов появляются в игре мгновенно
```

Цикл: **ИИ правит файлы → Rojo синхронизирует → вы жмёте Play → смотрите Output → описываете результат ИИ**. При этом линтеры работают в редакторе/терминале:

```bash
stylua src                  # форматирование
selene src                  # линтер
```

### 5. Подключите ИИ

- **Cursor / VS Code + Copilot**: откройте папку проекта — ИИ увидит файлы. Добавьте правила проекта (`.cursor/rules`, `.github/copilot-instructions.md`) — те же правила, что в `AGENTS.md`.
- **CLI-агент (Claude Code / Codex CLI / Gemini CLI)**: запустите агента в папке проекта; он будет читать файлы, запускать `stylua`/`selene`, править код. Правила — в `CLAUDE.md` / `AGENTS.md`.
- **Чат-бот**: копируйте только нужные файлы/выжимки (см. экономию токенов).

### 6. `AGENTS.md` / `CLAUDE.md` для Roblox-проекта (шаблон)

```markdown
# Проект: MyGame (Roblox, Luau)

## Стек и команды
- Luau, Rojo 7, Wally. Формат: `stylua src`. Линт: `selene src`.
- Типы: файлы с `--!strict`. Анализ: `luau-lsp analyze` (см. CI).
- Запуск: `rojo serve` (Studio подключается плагином).

## Структура
- src/server  → ServerScriptService (серверная логика, DataStore, экономика)
- src/client  → StarterPlayerScripts (UI, ввод, эффекты)
- src/shared  → ReplicatedStorage/Shared (конфиги, типы, утилиты; НЕ секреты)

## Железные правила
1. Сервер авторитетен. Клиент присылает только намерение (id), никогда цены/суммы/результат.
2. Каждый RemoteEvent.OnServerEvent: проверка типа, диапазона, существования, права, rate limit.
3. DataStore/HTTP/Marketplace — только через pcall + retry; UserId как ключ; сохранять только после успешной загрузки.
4. Покупки — только ProcessReceipt, идемпотентно (PurchaseId).
5. Не использовать устаревшее: wait/spawn/delay, BodyMovers, Humanoid:LoadAnimation, FindPartOnRay, MoveTo/SetPrimaryPartCFrame, Instance.new(class, parent).
6. Parent задавать последним. Соединения — через Trove/Maid, всегда отключать.
7. Имена: Классы/модули PascalCase, переменные camelCase, константы UPPER_SNAKE.
8. Один модуль — одна ответственность; без циклических зависимостей.

## Как работать
- Сначала план (3–6 пунктов), потом код. Меняй минимум файлов.
- Показывай diff/изменённые функции, а не весь файл.
- После правок запусти stylua и selene; исправь предупреждения.
- Если не уверен в API — скажи об этом, не выдумывай свойства. Отметь в комментарии TODO(verify).
```

Такой файл — самая дешёвая и эффективная «настройка» ИИ: он читается в начале сессии и резко снижает число ошибок.

## Путь C: MCP-сервер Roblox Studio

**MCP (Model Context Protocol)** — стандарт, по которому ИИ-клиент (Claude Desktop/Code, Cursor и др.) вызывает «инструменты» внешней программы. Для Roblox Studio это означает: ИИ может **работать внутри открытой Studio**: смотреть дерево объектов, читать/создавать/править скрипты, выполнять код, запускать плейтест и читать Output.

Варианты:
1. **Встроенный в Studio MCP-сервер** (по документации Roblox): включается в настройках Assistant («Manage MCP Servers» / «Enable Studio as MCP server» — названия пунктов уточняйте в документации) и подключается в настройках вашего ИИ-клиента. Нужна актуальная версия Studio.
2. **Open-source реализация** Roblox: репозиторий `Roblox/studio-rust-mcp-server` (плагин Studio + локальный сервер, stdio) — установка по README.
3. Сторонние MCP-серверы (с расширенными наборами инструментов) — используйте осторожно: проверьте исходники и права.

Типичная схема подключения для клиента (общий вид; точные поля — по документации клиента):

```json
{
  "mcpServers": {
    "roblox-studio": {
      "command": "<путь к исполняемому файлу MCP-сервера из документации>",
      "args": ["--stdio"]
    }
  }
}
```

:::warn Безопасность MCP
Сервер MCP даёт ИИ **реальный контроль над вашей Studio**: он может менять и удалять объекты и выполнять код. Рекомендации: работайте с копией места или под системой контроля версий; делайте частые сохранения/коммиты; включайте подтверждение действий в клиенте; не подключайте сторонние серверы без проверки; не оставляйте включённым «на всякий случай».
:::

### Rojo vs MCP: что выбрать

| | Rojo + файлы | MCP в Studio |
|---|---|---|
| Основа | код в Git | живая сцена в Studio |
| Лучше для | логики, архитектуры, команды | работы с объектами, UI в Explorer, быстрых правок сцены, тестирования |
| Ревью/история | отличные (Git) | слабее (двоичные .rbxl) |
| Совместно | **да, комбинируются**: код — через Rojo; сцена/объекты/запуск — через MCP | |

Рабочая связка для малой команды: **Rojo+Git для кода**, **Team Create/файл `.rbxl` для карты и объектов**, **ИИ-агент с MCP** для рутинных правок сцены и автотестов.

## Путь D: плагины

- **Написать свой плагин с помощью ИИ**: массовая замена свойств, расстановка объектов по сетке, проверка нарушений (например, «найти все части без `CanQuery=false` внутри декораций»), экспорт данных. ИИ хорошо пишет плагины, если дать ему текст [Plugin API](https://create.roblox.com/docs/reference/engine/classes/Plugin) и пример.
- **Готовые плагины** из Creator Store — проверяйте издателя, отзывы и права. Плагин имеет широкий доступ к вашему месту.

Каркас плагина:

```lua
-- Script с RunContext Plugin / сохранить как Local Plugin
local toolbar = plugin:CreateToolbar("My Tools")
local button = toolbar:CreateButton("Align", "Выровнять выбранное", "")

button.Click:Connect(function()
  local ChangeHistoryService = game:GetService("ChangeHistoryService")
  local selection = game:GetService("Selection"):Get()

  local recording = ChangeHistoryService:TryBeginRecording("Align parts")
  for _, obj in ipairs(selection) do
    if obj:IsA("BasePart") then
      obj.Position = Vector3.new(math.round(obj.Position.X / 4) * 4, obj.Position.Y, math.round(obj.Position.Z / 4) * 4)
    end
  end
  ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
end)
```

(Ctrl+Z будет работать благодаря `ChangeHistoryService`.)

## Задания

::::task easy Порядок настройки
Расставьте шаги подключения Rojo в правильном порядке: запишите в `order` номера шагов: 1 — «Установить плагин Rojo в Studio», 2 — «Создать проект `rojo init`», 3 — «Запустить `rojo serve`», 4 — «Нажать Connect в плагине Rojo», 5 — «Установить Rojo через Rokit».

:::starter
```lua
local order = {} -- например {5, 1, 2, 3, 4}
```
:::
:::test
```lua
local function idx(n) for i, v in ipairs(order) do if v == n then return i end end return 99 end
assert(#order == 5)
assert(idx(5) < idx(2), "сначала установить Rojo")
assert(idx(2) < idx(3), "сначала проект, потом serve")
assert(idx(3) < idx(4), "serve до Connect")
assert(idx(1) < idx(4), "плагин нужен до Connect")
```
:::
:::answer
```lua
local order = {5, 1, 2, 3, 4}
```
Допустимы и другие порядки, если соблюдены зависимости (например, плагин можно поставить в начале).
:::
::::

::::task mid Проверка правил проекта (чистый Lua)
Напишите `checkProjectRules(text)`: принимает содержимое `AGENTS.md` и возвращает массив отсутствующих разделов из списка `{"Железные правила", "Как работать", "Структура"}` (проверка по вхождению подстроки).

:::starter
```lua
local function checkProjectRules(text)
end
```
:::
:::test
```lua
local missing = checkProjectRules("# Проект\n## Структура\nbla\n## Как работать\nblabla")
assert(#missing == 1 and missing[1] == "Железные правила")
assert(#checkProjectRules("Железные правила Как работать Структура") == 0)
assert(#checkProjectRules("") == 3)
```
:::
:::answer
```lua
local function checkProjectRules(text)
  local required = {"Железные правила", "Как работать", "Структура"}
  local missing = {}
  for _, section in ipairs(required) do
    if not text:find(section, 1, true) then
      table.insert(missing, section)
    end
  end
  return missing
end
```
:::
::::

## Проверьте себя

::::quiz
Зачем нужен файл `AGENTS.md` / `CLAUDE.md`?
- [ ] Чтобы ускорить Studio
- [x] Чтобы один раз описать ИИ правила и структуру проекта — меньше ошибок и повторных объяснений
- [ ] Это конфигурация Rojo
ИИ читает файл в начале сессии и следует правилам.
::::

::::quiz
В чём главный риск MCP-сервера Studio?
- [ ] Он замедляет игру
- [x] ИИ получает реальный контроль над Studio и может испортить сцену — работайте с копией и в Git
- [ ] Он шифрует файлы
Всегда держите резервные копии.
::::
