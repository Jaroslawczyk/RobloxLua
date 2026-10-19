---
title: Онлайн и мультиплеер: серверы, лобби, матчмейкинг, лаги
section: roblox
order: 17
summary: Как устроены серверы Roblox, телепорты, приватные серверы, MemoryStore и MessagingService, матчмейкинг, сетевые задержки и тестирование нескольких игроков.
time: 40
level: Продвинутый
---

:::note Проверяйте лимиты
Размеры серверов, квоты MemoryStore/MessagingService и параметры API меняются. Точные числа смотрите в [документации Roblox](https://create.roblox.com/docs). Здесь — устройство и паттерны.
:::

## Как устроен онлайн в Roblox

- **Experience** запускается как множество независимых **серверов** (экземпляров). Игрок попадает на один из них; серверы друг друга «не видят».
- У каждого сервера свой `game.JobId`. Максимум игроков задаётся в настройках Experience (`Max Players`) — выбирайте под жанр: 8–16 для боёв и хорроров, 30–100+ для социальных и симуляторов.
- Платформа сама создаёт новые серверы при росте онлайна и подбирает игрока на подходящий (учитывает друзей, пинг, заполненность).
- **Общего состояния между серверами нет.** Всё общее (сохранения, рейтинги, события) идёт через DataStore, MemoryStore, MessagingService.

| Тип сервера | Что это | Как определить |
|---|---|---|
| **Публичный** | создаётся платформой | `game.PrivateServerId == ""` |
| **Приватный (VIP)** | арендуется игроком за Robux (если включено) | `game.PrivateServerId ~= ""`, владелец — `game.PrivateServerOwnerId` |
| **Зарезервированный** | создаётся вашим кодом для матча/лобби | `game.PrivateServerId ~= ""` и `PrivateServerOwnerId == 0` |

## Телепорты между местами и серверами

```lua
local TeleportService = game:GetService("TeleportService")

local MATCH_PLACE_ID = 1234567890

local function sendToMatch(players)
  local options = Instance.new("TeleportOptions")
  options.ShouldReserveServer = true                         -- создать отдельный сервер под матч
  options:SetTeleportData({ mode = "ranked", teamSize = 3 }) -- передать данные

  local ok, result = pcall(function()
    return TeleportService:TeleportAsync(MATCH_PLACE_ID, players, options)
  end)
  if not ok then
    warn("Teleport failed:", result)
  end
end

TeleportService.TeleportInitFailed:Connect(function(player, resultEnum, message)
  warn(player.Name, resultEnum, message)   -- вернуть игрока в лобби, показать сообщение
end)
```

На принимающей стороне: `player:GetJoinData().TeleportData`. Телепорт — сетевой вызов: всегда `pcall`, повтор при сбое, понятное сообщение игроку.

## Архитектура лобби → матч

```text
[Лобби-плейс (много игроков)]
   │  игроки встают в очередь (MemoryStore)
   ▼
[Матчмейкер на сервере-лобби]  — собирает группы нужного размера/уровня
   │  TeleportAsync + ShouldReserveServer
   ▼
[Матч-плейс (reserved server)] — одна игра на сервер, по завершении возврат в лобби
```

Преимущества: матч изолирован (чёткие правила, стабильный пинг), лобби лёгкое.

## MemoryStore: быстрая общая память серверов

| Структура | Для чего |
|---|---|
| `SortedMap` | рейтинги, поиск по ключу с TTL, списки игроков в очереди |
| `Queue` | очередь матчмейкинга/заданий |
| `HashMap` | быстрый общий кэш/флаги |

Данные живут ограниченное время (TTL), не заменяют DataStore. Все вызовы — через `pcall`, учитывайте квоты.

```lua
local MemoryStoreService = game:GetService("MemoryStoreService")
local queue = MemoryStoreService:GetQueue("RankedQueue")

-- добавить игрока в очередь на 60 с
pcall(function() queue:AddAsync({ userId = player.UserId, rating = 1200 }, 60) end)

-- матчмейкер: прочитать до 4 записей, ждать до 5 с
local ok, items, id = pcall(function() return queue:ReadAsync(4, false, 5) end)
-- обработав записи, удалить их: queue:RemoveAsync(id)
```

## MessagingService: сообщения между серверами

```lua
local MessagingService = game:GetService("MessagingService")

pcall(function()
  MessagingService:SubscribeAsync("GlobalAnnounce", function(message)
    print("Объявление:", message.Data)
  end)
end)

pcall(function() MessagingService:PublishAsync("GlobalAnnounce", "Обновление через 5 минут!") end)
```

Подходит для объявлений, глобальных событий, мягкого перезапуска. **Не гарантирует доставку** и имеет лимиты частоты — не используйте для денег и сохранений.

## Синхронизация в реальном времени

Главная сложность — **задержка (ping)**: игрок видит мир на десятки и сотни миллисекунд «в прошлом».

| Проблема | Решение |
|---|---|
| Управление «вязкое» | **Client-side prediction**: клиент сразу двигает своего персонажа, сервер потом подтверждает |
| Рывки чужих игроков | интерполяция между полученными позициями |
| Попадания «не засчитываются» | проверка на сервере с небольшой **компенсацией задержки** (учёт позиции цели на момент выстрела), но с лимитами против читов |
| Много данных | отправлять изменения, объединять события, `UnreliableRemoteEvent` для эффектов |
| Рассинхрон физики | `SetNetworkOwner`: важные объекты — на сервере, личные — у владельца |
| Часы клиента и сервера | `workspace:GetServerTimeNow()` для общего времени |

Базовое правило: **сервер решает исход**, клиент отображает и предсказывает.

## Состояние матча и раунды

- Храните состояние раунда на сервере (`Lobby → Countdown → Playing → Results`), клиенты получают его через атрибуты или события.
- Обрабатывайте выход игрока посреди матча: `PlayerRemoving` → пересчёт команд, досрочная победа, передача хоста.
- Добавляйте **минимум игроков** и таймаут ожидания: если не набралось — старт с ботами или отмена.
- **Балансировка команд** по рейтингу и по числу, а не по порядку захода.

## Друзья, приглашения, группы

- `SocialService:PromptGameInvite(player)` — показать окно приглашения друзей.
- Данные входа: `player:GetJoinData()` (откуда пришёл, `TeleportData`).
- «Играть с друзьями» повышает удержание — продумайте партии/группы (party) на сервере лобби.

## Чат и общение

- Используйте `TextChatService`; пользовательский текст в ваших интерфейсах — только через `TextService:FilterStringAsync`.
- Учитывайте возрастные ограничения чата и голоса — см. [[money-07-age-ratings]].
- Дайте игрокам инструменты: **mute**, **report**, предустановленные фразы для детей.

## Тестирование мультиплеера

1. **Test → Local Server** в Studio с 2–8 клиентами: репликация, Remote, раунды.
2. Эмуляция сети: в Studio можно включить **Network Emulation** (задержка, потеря пакетов) — проверьте при 150–300 мс.
3. Нагрузка: боты/скрипты, имитирующие игроков; смотреть Developer Console (F9) и MicroProfiler.
4. Сценарии: выход игрока при телепорте, выход хоста, одновременная покупка, потеря соединения.

## Типичные ошибки

:::warn
- Хранить общий рейтинг в переменной сервера (на другом сервере его нет).
- Телепорт без `pcall` и без обработки `TeleportInitFailed`.
- Доверять `TeleportData` как защищённым данным: клиент может быть подделан — проверяйте на сервере.
- Использовать `MessagingService` как надёжную очередь.
- Матч без обработки выхода игроков.
- Слишком большой `Max Players` для тяжёлой игры → лаги на телефонах.
:::

## Задания

::::task mid Балансировка команд (чистый Lua)
Напишите `balanceTeams(players)`: `players` — массив `{name, rating}`. Разделите на две команды по очереди «жадно»: сортировка по убыванию рейтинга, каждый следующий игрок идёт в команду с меньшей суммой рейтинга (при равенстве — в первую). Вернуть два массива имён.

:::starter
```lua
local function balanceTeams(players)
end
```
:::
:::test
```lua
local a, b = balanceTeams({
  {name = "A", rating = 1500}, {name = "B", rating = 1400},
  {name = "C", rating = 1300}, {name = "D", rating = 1000},
})
assert(table.concat(a, ",") == "A,D")
assert(table.concat(b, ",") == "B,C")
local x, y = balanceTeams({})
assert(#x == 0 and #y == 0)
```
:::
:::answer
```lua
local function balanceTeams(players)
  local sorted = {}
  for i, p in ipairs(players) do sorted[i] = p end
  table.sort(sorted, function(p, q) return p.rating > q.rating end)
  local t1, t2, s1, s2 = {}, {}, 0, 0
  for _, p in ipairs(sorted) do
    if s1 <= s2 then
      table.insert(t1, p.name); s1 += p.rating
    else
      table.insert(t2, p.name); s2 += p.rating
    end
  end
  return t1, t2
end
```
:::
::::

::::task mid Очередь матчмейкинга (чистый Lua)
Напишите `makeMatchmaker(size, maxGap)`: объект с `:add(name, rating)` и `:tryMatch()`. `tryMatch` ищет `size` игроков (в порядке добавления), у которых разница max−min рейтинга ≤ `maxGap`; если найдены — удаляет их из очереди и возвращает массив имён, иначе `nil`.

:::starter
```lua
local function makeMatchmaker(size, maxGap)
end
```
:::
:::test
```lua
local m = makeMatchmaker(2, 100)
m:add("A", 1000); m:add("B", 1500); m:add("C", 1050)
local g = m:tryMatch()
assert(g and table.concat(g, ",") == "A,C")
assert(m:tryMatch() == nil)
m:add("D", 1480)
assert(table.concat(m:tryMatch(), ",") == "B,D")
```
:::
:::answer
```lua
local function makeMatchmaker(size, maxGap)
  local queue = {}
  local self = {}
  function self:add(name, rating)
    table.insert(queue, {name = name, rating = rating})
  end
  function self:tryMatch()
    local n = #queue
    -- перебор групп из size игроков с сохранением порядка добавления
    local function search(start, chosen)
      if #chosen == size then return chosen end
      for i = start, n do
        local ok = true
        for _, j in ipairs(chosen) do
          if math.abs(queue[j].rating - queue[i].rating) > maxGap then ok = false break end
        end
        if ok then
          table.insert(chosen, i)
          local r = search(i + 1, chosen)
          if r then return r end
          table.remove(chosen)
        end
      end
      return nil
    end
    local found = search(1, {})
    if not found then return nil end
    local names = {}
    for _, i in ipairs(found) do table.insert(names, queue[i].name) end
    for k = #found, 1, -1 do table.remove(queue, found[k]) end
    return names
  end
  return self
end
```
:::
::::

## Проверьте себя

::::quiz
Можно ли хранить общий рейтинг всех игроков в переменной серверного скрипта?
- [ ] Да
- [x] Нет: серверы изолированы, общее — через DataStore/MemoryStore/MessagingService
- [ ] Да, если сервер публичный
У каждого сервера своя память.
::::

::::quiz
Кто решает, попал ли выстрел?
- [ ] Клиент стрелявшего
- [x] Сервер (с учётом компенсации задержки)
- [ ] Клиент цели
Иначе читеры сами «засчитают» попадания.
::::
