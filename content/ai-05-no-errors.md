---
title: Как работать с ИИ без ошибок: процесс, проверки, CI
section: ai
order: 5
summary: Типичные ошибки ИИ в Roblox, конвейер «ТЗ → код → линтер → тест → ревью», чек-лист безопасности и GitHub Actions.
time: 35
level: Продвинутый
---

## Почему ИИ ошибается именно в Roblox

1. **Устаревшее API.** В обучающих данных много старых туториалов: `wait()`, `BodyVelocity`, `Humanoid:LoadAnimation`, `FindPartOnRay`.
2. **Выдуманные свойства и методы** (особенно для редких классов).
3. **Путаница клиент/сервер:** код с `Players.LocalPlayer` на сервере, `FireClient` на клиенте, «награда по клику» без проверки.
4. **Нет понимания репликации/стриминга:** предполагает, что объект уже есть (`workspace.Map.Door`), а он ещё не подгрузился.
5. **Забывает про жизненный цикл:** утечки соединений, `Destroy`, персонаж `nil`, респавн.
6. **Доверяет клиенту** (цены, суммы, урон от клиента).
7. **Небезопасный DataStore:** `SetAsync` без `pcall`, сохраняет пустые данные поверх, нет `BindToClose`.
8. **Одна «большая» стена кода** без модулей.
9. **Уверенный тон при неправильном ответе.**

## Конвейер надёжной разработки

```text
ТЗ → План → Код → Автопроверки → Запуск в Studio → Ревью безопасности → Коммит
```

### 1. ТЗ (контракт) — коротко и точно

```markdown
## Задача: модуль PetService (сервер)
Вход: события OnServerEvent "EquipPet"(petId: string).
Выход: обновляет player.Data.Equipped; шлёт клиенту "PetEquipped".
Ограничения: не более 3 питомцев; petId должен существовать в PetConfig; rate limit 5/сек.
Не делать: не трогать UI, не менять DataService.
Критерии: сигнатуры ниже, тесты T1–T4 проходят, selene без warnings.
```

Для ИИ ТЗ важнее красивых слов: **входы, выходы, ограничения, что не делать, критерии готовности**.

### 2. План до кода

Попросите: «Сначала план в 5 пунктах и список рисков (клиент/сервер, nil, утечки). Код не пиши». Исправьте план.

### 3. Код с проверками на лету

- `--!strict` + `luau-lsp`: ошибки типов видны сразу.
- **StyLua** — единый стиль.
- **Selene** — ловит неиспользуемые переменные, затенение, устаревшие вызовы (при правильной конфигурации стандартной библиотеки Roblox).
- **Свой «линтер запретов»** на 20 строк (см. ниже) — ищет `wait(`, `BodyVelocity` и т.п.

### 4. Тесты чистой логики

Логику, не зависящую от движка (формулы, шансы, инвентарь, экономика, сериализация, миграции), выносите в отдельные модули **без обращений к `game`** — их можно тестировать вне Studio (Lune/Luau CLI) и в браузере на странице этого справочника. Это покрывает до половины багов экономики.

```lua
-- Shared/Economy.luau — чистая логика
local Economy = {}

function Economy.priceOfUpgrade(level: number): number
  return math.floor(100 * 1.15 ^ level)
end

return Economy
```

Тест (Lune/Jest-Lua/самодельный):

```lua
local Economy = require("../Shared/Economy")
assert(Economy.priceOfUpgrade(0) == 100)
assert(Economy.priceOfUpgrade(10) == 404)
```

### 5. Запуск в Studio

- Test → Local Server (2+ игрока): репликация, Remote.
- Output без красного. Проверьте: выход/вход, смерть/респавн, ошибка DataStore (имитация).
- Телефон: Device Emulator.

### 6. Ревью безопасности (другой моделью или вами)

Чек-лист ниже — можно вставлять в промпт ревьюеру.

### 7. Коммит

Небольшие коммиты с понятным сообщением. Откат — одна команда. **Никогда не коммитьте «рабочее» в одном огромном коммите с 40 файлами.**

## Чек-лист безопасности (вставьте ревьюеру)

```markdown
Проверь изменения (diff) по пунктам и для каждого ответь OK / ПРОБЛЕМА + строка:
1. Каждый OnServerEvent/OnServerInvoke проверяет тип, диапазон, существование и право игрока?
2. Клиент присылает только намерение (id), а цены/суммы/результат берутся с сервера?
3. Есть ли rate limit на частые события?
4. DataStore/HTTP/Marketplace вызовы в pcall с retry? Сохранение не затирает данные при неудачной загрузке?
5. ProcessReceipt идемпотентен (PurchaseId), возвращает корректные решения?
6. Все соединения/объекты очищаются (Maid/Disconnect/Destroy)? Нет утечек при смерти/выходе игрока?
7. Нет ли предположений, что объект существует (WaitForChild/FindFirstChild/StreamingEnabled)?
8. Нет устаревших API (wait, spawn, delay, BodyMovers, LoadAnimation, FindPartOnRay…)?
9. Нет ли серверной логики в клиентских/реплицируемых контейнерах и секретов в ReplicatedStorage?
10. Есть ли гонки (два события одновременно меняют одно состояние)? Нужно ли блокирование?
11. Нет ли чрезмерных нагрузок в Heartbeat/RenderStepped?
Формат: таблица пункт | статус | строка | исправление.
```

## Линтер запретов (на чистом Luau)

Простейшая проверка, которую запускают в CI и локально:

```lua run
local FORBIDDEN = {
  {pattern = "[^%w_%.:]wait%(", message = "Используйте task.wait"},
  {pattern = "[^%w_%.:]spawn%(", message = "Используйте task.spawn"},
  {pattern = "[^%w_%.:]delay%(", message = "Используйте task.delay"},
  {pattern = "BodyVelocity", message = "Используйте LinearVelocity"},
  {pattern = "BodyPosition", message = "Используйте AlignPosition"},
  {pattern = "FindPartOnRay", message = "Используйте workspace:Raycast"},
  {pattern = "SetPrimaryPartCFrame", message = "Используйте Model:PivotTo"},
  {pattern = "[hH]umanoid:LoadAnimation", message = "Используйте Animator:LoadAnimation"},
  {pattern = "Instance%.new%(%s*[\"'][%w]+[\"']%s*,", message = "Не передавайте Parent вторым аргументом"},
  {pattern = "InvokeClient", message = "Не используйте InvokeClient"},
}

local function lint(source)
  local problems = {}
  local lineNo = 0
  for line in (source .. "\n"):gmatch("(.-)\n") do
    lineNo += 1
    local padded = " " .. line
    for _, rule in ipairs(FORBIDDEN) do
      if padded:find(rule.pattern) then
        table.insert(problems, ("строка %d: %s"):format(lineNo, rule.message))
      end
    end
  end
  return problems
end

local sample = [[
local part = Instance.new("Part", workspace)
wait(1)
task.wait(1)
local tween = humanoid:LoadAnimation(anim)
]]
for _, p in ipairs(lint(sample)) do print(p) end
```

## GitHub Actions: проверка на каждый PR

`.github/workflows/check.yml`:

```yaml
name: Check
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools (Rokit)
        # Установите Rokit по инструкции из его README и выполните `rokit install`
        # (подтянет stylua, selene, rojo из rokit.toml). Готовые Action-обёртки существуют —
        # выбирайте поддерживаемую и закрепляйте версию.
        run: echo "install rokit + rokit install"

      - name: StyLua (format check)
        run: stylua --check src

      - name: Selene (lint)
        run: selene src

      - name: Build place
        run: rojo build -o build/game.rbxl default.project.json

      # анализ типов: настройте luau-lsp analyze с файлом определений Roblox (см. README luau-lsp)
```

:::note Версии Actions
Номера версий и имена сторонних Actions меняются — сверяйтесь с их страницами на GitHub Marketplace. Секреты (Open Cloud) хранятся только в **Settings → Secrets and variables → Actions**.
:::

## Как исправлять ошибки вместе с ИИ

Шаблон сообщения при баге:

```markdown
**Ожидал:** при нажатии «Купить» списываются монеты и выдаётся предмет.
**Получил:** монеты списались, предмета нет.
**Ошибка из Output (полностью):**
  ServerScriptService.Services.ShopService:42: attempt to index nil with 'Inventory'
**Код (фрагмент ±20 строк вокруг 42):** ```lua …```
**Что уже проверял:** DataService.Get возвращает таблицу; на строке 40 player есть.
Не переписывай файл целиком: объясни причину и дай минимальный patch.
```

Принципы:
- **Одна ошибка — один запрос.**
- Просите **причину**, затем **минимальное исправление**.
- Если после двух попыток не вышло — **смените подход**: попросите план отладки (какие `print` добавить), приведите факты, привлеките сильную модель.
- Попросите ИИ **написать тест/проверку**, воспроизводящую баг, до исправления.

## Защита от «галлюцинаций» API

- Просите: «если не уверен в существовании метода — пометь `-- TODO(verify)` и не выдумывай».
- Добавьте в `docs/api/` выжимки по нужным классам; ссылайтесь на них.
- В Studio, если подчёркивает неизвестный член — это сигнал; **Script Analysis** не врёт.
- Проверяйте новое API в [Engine API Reference](https://create.roblox.com/docs/reference/engine).

## Задания

::::task mid Свой линтер (чистый Lua)
Напишите `findForbidden(source)`: возвращает массив номеров строк (с 1), содержащих устаревший вызов `wait(` как **самостоятельную функцию** (не `task.wait(`).

:::starter
```lua
local function findForbidden(source)
end
```
:::
:::test
```lua
local src = "local a = 1\nwait(1)\ntask.wait(2)\n  wait(3)\nlocal x = somewait(1)\n"
local r = findForbidden(src)
assert(#r == 2 and r[1] == 2 and r[2] == 4, table.concat(r, ","))
assert(#findForbidden("") == 0)
```
:::
:::answer
```lua
local function findForbidden(source)
  local result = {}
  local lineNo = 0
  for line in (source .. "\n"):gmatch("(.-)\n") do
    lineNo += 1
    if (" " .. line):find("[^%w_%.:]wait%(") then
      table.insert(result, lineNo)
    end
  end
  return result
end
```
:::
::::

::::task mid Проверка контракта (чистый Lua)
Напишите `validateShape(value, shape)`: `shape` — таблица `{ключ = "тип"}` (типы Lua: `"number"`, `"string"`, `"boolean"`, `"table"`). Вернуть `true`, если у `value` есть все ключи и типы совпадают; иначе `false, "ключ"` — первый (по алфавиту) проблемный ключ.

:::starter
```lua
local function validateShape(value, shape)
end
```
:::
:::test
```lua
local shape = {coins = "number", name = "string", vip = "boolean"}
assert(validateShape({coins = 1, name = "A", vip = true}, shape) == true)
local ok, key = validateShape({coins = "1", name = "A", vip = true}, shape)
assert(ok == false and key == "coins")
ok, key = validateShape({coins = 1, name = "A"}, shape)
assert(ok == false and key == "vip")
ok, key = validateShape(5, shape)
assert(ok == false and key == "<value>")
```
:::
:::answer
```lua
local function validateShape(value, shape)
  if type(value) ~= "table" then
    return false, "<value>"
  end
  local keys = {}
  for key in pairs(shape) do
    table.insert(keys, key)
  end
  table.sort(keys)
  for _, key in ipairs(keys) do
    if type(value[key]) ~= shape[key] then
      return false, key
    end
  end
  return true
end
```
Такой валидатор пригодится для данных от клиента и для проверки ответов ИИ-генераторов конфигов.
:::
::::

## Проверьте себя

::::quiz
Что должен делать сервер, получив от клиента «я купил предмет за 10 монет»?
- [ ] Поверить и выдать
- [x] Игнорировать «итог» клиента; сам проверить, существует ли предмет, хватает ли денег, и выполнить покупку
- [ ] Записать в лог и выдать
Клиент недоверенный: сервер вычисляет результат сам.
::::

::::quiz
Что лучше всего снижает число ошибок ИИ в Roblox?
- [ ] Просить «пиши аккуратно»
- [x] Правила проекта в файле, строгие типы, линтеры/анализатор в цикле, ревью чек-листом
- [ ] Использовать самую длинную переписку
Автоматические проверки ловят ошибки независимо от «аккуратности» модели.
::::
