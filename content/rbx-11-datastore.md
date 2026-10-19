---
title: DataStore: сохранения без потери данных
section: roblox
order: 11
summary: DataStoreService, лимиты, UpdateAsync, session locking, повторные попытки, автосохранение, BindToClose, ProfileStore и лидерборды.
time: 45
level: Продвинутый
---

:::danger Потеря данных игроков = смерть проекта
Сбой сохранения ломает доверие и вызывает возвраты денег. Относитесь к DataStore как к банковскому коду: повторные попытки, блокировка сессии, версии схемы, тесты.
:::

## Основы

```lua
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("PlayerData_v1")     -- имя = «таблица»

local key = "Player_" .. player.UserId                            -- ключ: UserId, а не имя!

local ok, data = pcall(function()
  return store:GetAsync(key)
end)
```

| Метод | Назначение |
|---|---|
| `GetAsync(key)` | прочитать (`nil`, если нет) |
| `SetAsync(key, value)` | записать (перезапись!) |
| `UpdateAsync(key, fn)` | **атомарное** чтение-изменение-запись |
| `IncrementAsync(key, delta)` | прибавить к числу |
| `RemoveAsync(key)` | удалить (с сохранением версии) |
| `GetOrderedDataStore(name)` | упорядоченное хранилище (лидерборды) |

Что можно хранить: числа, строки, булевы, таблицы (JSON-подобные). **Нельзя**: `Instance`, `Vector3`, `Color3` (преобразуйте в таблицы/числа), функции, метатаблицы, ключи-нестроки в словарях смешанных с массивами, `nil` в массивах.

## Лимиты (основные, проверяйте в документации)

- Размер значения: до ~4 МБ на ключ; длина ключа — до 50 символов.
- Бюджет запросов зависит от числа игроков (около 60 + N×10 запросов/мин на тип операций).
- Частота записи в один ключ — не чаще раза в ~6 секунд.
- В Studio нужно включить **Game Settings → Security → Enable Studio Access to API Services**, иначе `GetAsync` вернёт ошибку.

При превышении запросы встают в очередь/отклоняются. Пишите «аккуратно»: сохраняйте при выходе, периодически (автосохранение 60–300 с) и при важных событиях, но не каждую секунду.

## Базовый шаблон с повторными попытками

```lua
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local store = DataStoreService:GetDataStore("PlayerData_v1")

local DEFAULT_DATA = { Coins = 0, Level = 1, Inventory = {} }

local sessionData = {}     -- [player] = data

local function retry(fn, attempts)
  local lastErr
  for i = 1, attempts do
    local ok, result = pcall(fn)
    if ok then return true, result end
    lastErr = result
    warn(("DataStore attempt %d failed: %s"):format(i, tostring(result)))
    task.wait(2 ^ i)                      -- 2, 4, 8 с
  end
  return false, lastErr
end

local function deepCopy(t)
  local c = {}
  for k, v in pairs(t) do c[k] = type(v) == "table" and deepCopy(v) or v end
  return c
end

local function load(player)
  local key = "Player_" .. player.UserId
  local ok, data = retry(function() return store:GetAsync(key) end, 3)
  if not ok then
    player:Kick("Не удалось загрузить данные. Зайдите позже.")  -- лучше кик, чем перезапись пустыми данными
    return
  end
  data = data or deepCopy(DEFAULT_DATA)
  for k, v in pairs(DEFAULT_DATA) do        -- миграция: добавить новые поля
    if data[k] == nil then data[k] = type(v) == "table" and deepCopy(v) or v end
  end
  sessionData[player] = data
end

local function save(player)
  local data = sessionData[player]
  if not data then return end               -- данные не загружались — НЕ сохраняем
  local key = "Player_" .. player.UserId
  retry(function()
    store:UpdateAsync(key, function() return data end)
  end, 3)
end

Players.PlayerAdded:Connect(load)
Players.PlayerRemoving:Connect(function(player)
  save(player)
  sessionData[player] = nil
end)

game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do
    task.spawn(save, player)
  end
  task.wait(3)                              -- дать время (в Studio — меньше; у BindToClose лимит ~30 с)
end)

-- автосохранение
task.spawn(function()
  while true do
    task.wait(120)
    for _, player in ipairs(Players:GetPlayers()) do
      task.spawn(save, player)
    end
  end
end)
```

:::warn Три главные ошибки
1. **Сохранить пустые/дефолтные данные поверх настоящих**, если загрузка не удалась. Решение: не сохранять, пока загрузка не прошла успешно (`sessionData[player]` существует).
2. **Нет `BindToClose`** — при остановке сервера игроки теряют прогресс.
3. **Запись напрямую `SetAsync`** без блокировки сессии — два сервера перезаписывают друг друга (см. ниже).
:::

## UpdateAsync против SetAsync

`UpdateAsync(key, transform)` получает текущее значение и возвращает новое — операция выполняется атомарно (с повтором при конфликте). Это безопаснее для счётчиков и для случаев, когда в ключ могут писать разные серверы.

```lua
store:UpdateAsync(key, function(old)
  old = old or { Coins = 0 }
  old.Coins += 100
  return old                    -- вернуть nil — отменить запись
end)
```

`transform` не должна «ждать» (`task.wait`) и вызывать другие yield-функции.

## Блокировка сессии (session locking)

Проблема: игрок быстро перезаходит на другой сервер; старый сервер ещё не сохранил, а новый уже загрузил старые данные → откат прогресса и **дюп предметов**.

Решение — «замок»: при загрузке в данные записывают `{ LockedBy = game.JobId, LockTime = os.time() }`; другой сервер, увидев замок, ждёт/отказывает. При сохранении замок снимается.

Не пишите это сами без крайней необходимости — используйте проверенную библиотеку:

| Библиотека | Особенности |
|---|---|
| **ProfileStore** (преемник ProfileService, автор loleris) | сессионная блокировка, авто-сохранение, переносы данных, активно поддерживается |
| **ProfileService** | классика, больше не развивается, много туториалов |
| **DataStore2** | устарела |
| **Lapis** | современная, типизированная, с валидацией схемы |

Проверяйте актуальность библиотек в их репозиториях и на DevForum.

```lua
-- Идея ProfileStore (псевдокод, смотрите документацию библиотеки)
local ProfileStore = require(ServerScriptService.ProfileStore)
local store = ProfileStore.New("PlayerData", { Coins = 0, Level = 1 })

Players.PlayerAdded:Connect(function(player)
  local profile = store:StartSessionAsync("Player_" .. player.UserId, {
    Cancel = function() return player.Parent ~= Players end,
  })
  if profile then
    profile:AddUserId(player.UserId)       -- GDPR/права
    profile:Reconcile()                     -- добавить новые поля из шаблона
    profile.OnSessionEnd:Connect(function() player:Kick("Сессия завершена") end)
    profiles[player] = profile
  else
    player:Kick("Данные не загрузились")
  end
end)

Players.PlayerRemoving:Connect(function(player)
  local profile = profiles[player]
  if profile then profile:EndSession() end
end)
```

## Версионирование схемы данных

Данные игроков живут годами. Новые версии игры должны уметь читать старые данные:

```lua
local CURRENT_VERSION = 3

local migrations = {
  [1] = function(d) d.Gems = 0 end,                          -- v1 → v2
  [2] = function(d) d.Settings = { Music = true } end,       -- v2 → v3
}

local function migrate(d)
  d.Version = d.Version or 1
  while d.Version < CURRENT_VERSION do
    migrations[d.Version](d)
    d.Version += 1
  end
  return d
end
```

## OrderedDataStore: лидерборды

```lua
local ods = DataStoreService:GetOrderedDataStore("TopCoins_v1")

ods:SetAsync(tostring(player.UserId), player.leaderstats.Coins.Value)

local pages = ods:GetSortedAsync(false, 10)        -- false = по убыванию, 10 на страницу
local top = pages:GetCurrentPage()
for rank, entry in ipairs(top) do
  print(rank, entry.key, entry.value)
end
```

Обновляйте не чаще раза в минуту на игрока и кэшируйте результат на 1–5 минут для всех серверов.

## Другие сервисы данных

| Сервис | Применение |
|---|---|
| **MemoryStoreService** | быстрая временная общая память между серверами (очереди, матчмейкинг, кэш, TTL до 45 дней) |
| **MessagingService** | сообщения между серверами в реальном времени (глобальные события, объявления) |
| **Cloud / Open Cloud Data Stores API** | доступ к DataStore снаружи Roblox (миграции, админка) |

## Тестирование без боли

- Используйте **разные имена DataStore** для разработки и продакшена (`PlayerData_dev` / `PlayerData_v1`) — по `game.PlaceId` или через флаг.
- Тестируйте сценарии: быстрый перезаход, падение сервера, закрытие сервера, потеря сети (имитация ошибок через обёртку).
- Логи: при сбое логируйте UserId и ошибку (но не персональные данные).

## Задания

::::task easy Слияние со значениями по умолчанию (чистый Lua)
Напишите `reconcile(data, defaults)`: добавляет в `data` недостающие поля из `defaults` (рекурсивно для вложенных таблиц), существующие не трогает. Вернуть `data`.

:::starter
```lua
local function reconcile(data, defaults)
end
```
:::
:::test
```lua
local d = reconcile({Coins = 5}, {Coins = 0, Level = 1, Settings = {Music = true, Sfx = true}})
assert(d.Coins == 5 and d.Level == 1)
assert(d.Settings.Music == true and d.Settings.Sfx == true)
local e = reconcile({Settings = {Music = false}}, {Settings = {Music = true, Sfx = true}})
assert(e.Settings.Music == false and e.Settings.Sfx == true)
```
:::
:::answer
```lua
local function reconcile(data, defaults)
  for key, value in pairs(defaults) do
    if data[key] == nil then
      if type(value) == "table" then
        data[key] = reconcile({}, value)
      else
        data[key] = value
      end
    elseif type(value) == "table" and type(data[key]) == "table" then
      reconcile(data[key], value)
    end
  end
  return data
end
```
Так добавляются новые поля в старые сохранения без потери данных.
:::
::::

::::task mid Миграции схемы
Реализуйте `migrate(data)`, поднимающую версию данных до 3 по правилам: `v1→v2`: добавить `Gems = 0`; `v2→v3`: переименовать `Coins` в `Cash`. Данные без `Version` считать версией 1.

:::starter
```lua
local function migrate(data)
end
```
:::
:::test
```lua
local d = migrate({Coins = 50})
assert(d.Version == 3 and d.Gems == 0 and d.Cash == 50 and d.Coins == nil)
local e = migrate({Version = 2, Coins = 7})
assert(e.Version == 3 and e.Cash == 7 and e.Gems == nil)
local f = migrate({Version = 3, Cash = 1})
assert(f.Version == 3 and f.Cash == 1)
```
:::
:::answer
```lua
local function migrate(data)
  data.Version = data.Version or 1
  if data.Version == 1 then
    data.Gems = 0
    data.Version = 2
  end
  if data.Version == 2 then
    data.Cash = data.Coins
    data.Coins = nil
    data.Version = 3
  end
  return data
end
```
:::
::::

::::task hard Симуляция безопасной загрузки
Напишите `loadWithRetry(fetch, attempts)`: вызывает `fetch()` через `pcall` до `attempts` раз; при успехе возвращает `"ok", data` (data может быть `nil` — новый игрок); если все попытки неудачны — `"failed", errMsg`. В отличие от «нового игрока» (`"ok", nil`), состояние `"failed"` НЕ должно приводить к сохранению пустых данных — проверьте это в логике `shouldSave(status)`.

:::starter
```lua
local function loadWithRetry(fetch, attempts)
end

local function shouldSave(status)
end
```
:::
:::test
```lua
local calls = 0
local status, data = loadWithRetry(function() calls += 1; if calls < 3 then error("net", 0) end; return {Coins = 5} end, 3)
assert(status == "ok" and data.Coins == 5 and calls == 3)
local s2, d2 = loadWithRetry(function() return nil end, 3)
assert(s2 == "ok" and d2 == nil)
local s3, e3 = loadWithRetry(function() error("down", 0) end, 2)
assert(s3 == "failed" and e3 == "down")
assert(shouldSave("ok") == true and shouldSave("failed") == false)
```
:::
:::answer
```lua
local function loadWithRetry(fetch, attempts)
  local lastErr
  for _ = 1, attempts do
    local ok, result = pcall(fetch)
    if ok then
      return "ok", result
    end
    lastErr = result
  end
  return "failed", lastErr
end

local function shouldSave(status)
  return status == "ok"
end
```
:::
::::

## Проверьте себя

::::quiz
Что использовать как ключ данных игрока?
- [ ] `player.Name`
- [x] `"Player_" .. player.UserId`
- [ ] `player.DisplayName`
Имя меняется, `UserId` — нет.
::::

::::quiz
Что произойдёт без `game:BindToClose`?
- [ ] Ничего
- [x] При остановке сервера (обновление, краш) последние изменения игроков могут не сохраниться
- [ ] DataStore перестанет работать
`BindToClose` даёт время сохранить всех игроков перед закрытием.
::::

::::quiz
Зачем нужна блокировка сессии?
- [ ] Ускоряет загрузку
- [x] Не даёт двум серверам одновременно работать с данными игрока (откат, дюп)
- [ ] Шифрует данные
Без неё быстрые перезаходы приводят к потере прогресса и дупу.
::::
