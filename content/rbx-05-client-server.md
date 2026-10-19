---
title: Клиент и сервер: RemoteEvent и безопасность
section: roblox
order: 5
summary: Как устроена сетевая модель Roblox, RemoteEvent/RemoteFunction, валидация данных, защита от читеров и ограничение частоты.
time: 40
level: Средний
---

## Модель «сервер — клиенты»

Игра Roblox — это **один сервер** (авторитетный источник истины) и **много клиентов** (устройства игроков). Игрок сам контролирует только свой клиент, поэтому всё, что приходит с клиента, **считается недоверенным**.

| | Сервер | Клиент |
|---|---|---|
| Исполняет | `Script` | `LocalScript`, `Script` с `RunContext = Client` |
| Видит | всё | то, что реплицировано; не видит `ServerStorage`, `ServerScriptService` |
| Отвечает за | экономику, урон, сохранения, правила | UI, камеру, ввод, эффекты, предсказание |
| Доверие | полное | нулевое |

Правила репликации (упрощённо):
- Изменения в `Workspace`, сделанные **на сервере**, видны всем клиентам.
- Изменения, сделанные **клиентом**, видны только ему (если не владеет физикой этого объекта) и **не** попадают на сервер.
- Исключение: игрок (клиент) — владелец физики своего персонажа (Network Ownership) — поэтому читеры могут телепортировать себя; нужно проверять позиции/скорость на сервере там, где это важно.

## Общение: RemoteEvent и RemoteFunction

Обычно кладут в `ReplicatedStorage/Remotes`.

| Объект | Направление | Ответ |
|---|---|---|
| `RemoteEvent` | клиент→сервер, сервер→клиент(ы) | нет (событие «выстрелил и забыл») |
| `RemoteFunction` | вызов с ожиданием ответа | да |
| `UnreliableRemoteEvent` | как RemoteEvent, но без гарантии доставки/порядка | нет (для частых некритичных данных: позиции эффектов) |

### Клиент → сервер

```lua
-- LocalScript
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local buyEvent = ReplicatedStorage.Remotes.BuyItem

button.Activated:Connect(function()
  buyEvent:FireServer("Sword")       -- player передавать НЕ надо: сервер получает его сам
end)
```

```lua
-- Script (сервер)
local buyEvent = ReplicatedStorage.Remotes.BuyItem

buyEvent.OnServerEvent:Connect(function(player, itemName)
  -- 1-й аргумент ВСЕГДА player (автоматически, подделать нельзя)
  -- остальные — данные клиента: проверять!
end)
```

### Сервер → клиент

```lua
-- сервер
notifyEvent:FireClient(player, "Награда получена!", 100)
notifyEvent:FireAllClients("Начался раунд")

-- клиент
notifyEvent.OnClientEvent:Connect(function(text, amount)
  showToast(text, amount)
end)
```

### RemoteFunction

```lua
-- сервер
getPrice.OnServerInvoke = function(player, itemName)
  return PRICES[itemName]
end

-- клиент
local price = getPrice:InvokeServer("Sword")      -- ждёт ответа
```

:::danger Никогда `InvokeClient`
Вызов `RemoteFunction:InvokeClient(player)` с сервера **опасен**: игрок может не отвечать или вернуть ошибку — ваш серверный поток зависнет навсегда. Для запросов сервер→клиент используйте `RemoteEvent` в паре (запрос/ответ отдельными событиями).
:::

## Золотое правило: валидируй всё

Каждый обработчик `OnServerEvent` должен проверять:

1. **Тип и форму** данных (`typeof(x) == "string"`, длина, диапазон).
2. **Существование** (предмет есть в вашем каталоге).
3. **Право** (хватает денег, достаточный уровень, не на кулдауне, объект рядом).
4. **Состояние** (игрок жив, раунд идёт, не в меню).

```lua
local PRICES = { Sword = 100, Bow = 250 }   -- серверная таблица — единственный источник цен

local lastCall = {}

buyEvent.OnServerEvent:Connect(function(player, itemName)
  -- 1. тип
  if typeof(itemName) ~= "string" then return end
  -- 2. существует ли
  local price = PRICES[itemName]
  if not price then return end
  -- 3. кулдаун
  local now = os.clock()
  if lastCall[player] and now - lastCall[player] < 0.3 then return end
  lastCall[player] = now
  -- 4. право
  local coins = DataService.GetCoins(player)
  if coins < price then
    notifyEvent:FireClient(player, "Недостаточно монет")
    return
  end
  -- действие
  DataService.AddCoins(player, -price)
  InventoryService.Give(player, itemName)
end)

Players.PlayerRemoving:Connect(function(player) lastCall[player] = nil end)
```

:::danger Типичные дыры
- Сервер принимает от клиента **цену**, **урон**, **количество** или **итог** («я получил 1000 монет») — нельзя.
- Сервер принимает `Instance` от клиента и действует без проверки (клиент пришлёт чужой объект).
- Выдача награды по клику, который можно вызвать тысячу раз в секунду — нужен rate limit и проверка условий.
- Скрытые «админ-команды» в клиентском коде.
:::

## Ограничение частоты (rate limit)

```lua
local function makeLimiter(maxPerSecond)
  local buckets = {}
  return function(player)
    local now = os.clock()
    local b = buckets[player]
    if not b or now - b.start >= 1 then
      b = {start = now, count = 0}
      buckets[player] = b
    end
    b.count += 1
    return b.count <= maxPerSecond
  end
end

local allow = makeLimiter(5)
```

## Чистая симуляция: серверная проверка покупки

Это тот же код, что на сервере, но без движка — можно прогнать здесь.

```lua run
local PRICES = {Sword = 100, Bow = 250}
local players = {Ann = {coins = 120, items = {}}}

local function handleBuy(name, itemName)
  local data = players[name]
  if not data then return false, "no_player" end
  if type(itemName) ~= "string" then return false, "bad_type" end
  local price = PRICES[itemName]
  if not price then return false, "unknown_item" end
  if data.coins < price then return false, "not_enough" end
  data.coins -= price
  table.insert(data.items, itemName)
  return true
end

print(handleBuy("Ann", "Sword"))   -- true
print(handleBuy("Ann", "Bow"))     -- false  not_enough
print(handleBuy("Ann", 123))       -- false  bad_type
print(handleBuy("Ann", "Laser"))   -- false  unknown_item
print(players.Ann.coins)           -- 20
```

## Структура сетевого слоя

Лучший паттерн при росте проекта:

- Один модуль `Remotes` создаёт и отдаёт все события по именам.
- Для каждого события — **обработчик в отдельном серверном модуле** + схема валидации.
- Ответственность: клиент **просит**, сервер **решает**.

```lua
-- ReplicatedStorage/Shared/Remotes (ModuleScript)
local Remotes = {}
local folder = script:FindFirstChild("Events") or Instance.new("Folder")

function Remotes.Get(name)
  local r = folder:FindFirstChild(name)
  if not r and game:GetService("RunService"):IsServer() then
    r = Instance.new("RemoteEvent")
    r.Name = name
    r.Parent = folder
  end
  return r or folder:WaitForChild(name)
end

return Remotes
```

(Существуют готовые библиотеки: **Knit**, **ByteNet**, **Red**, **Blink** — генерирует типизированный сетевой код и уменьшает трафик.)

## Оптимизация сети

- Отправляйте **изменения**, а не полные состояния.
- Объединяйте (batch) частые события в один пакет раз в 0.1 с.
- Не отправляйте сложные таблицы с метатаблицами/циклами; `nil` в массивах «ломают» порядок.
- `UnreliableRemoteEvent` — для эффектов, не влияющих на геймплей.
- Данные, которые изменяются редко и нужны всем, храните в **атрибутах**/`Value`-объектах — репликация автоматическая.

## Network Ownership и физика

Сервер по умолчанию отдаёт физику непривязанных частей ближайшему клиенту (игроку) для плавности. Для важных объектов (мяч, транспорт, предметы со стоимостью) можно закрепить владение за сервером: `part:SetNetworkOwner(nil)`. Ограничения: частая смена владельца → рывки.

## StreamingEnabled

При включённом `Workspace.StreamingEnabled` клиент получает только ближайшие части мира: объекты вдали могут **отсутствовать** на клиенте. Поэтому:
- на клиенте используйте `WaitForChild` с таймаутом;
- критичные модели помечайте `ModelStreamingMode = Persistent` (`Atomic`/`PersistentPerPlayer`…);
- серверная логика видит всё — выносите проверки туда.

## Задания

::::task easy Валидатор числа
Напишите `isValidAmount(x)`: `true` только для целых чисел от 1 до 1000 включительно (тип `number`!).

:::starter
```lua
local function isValidAmount(x)
end
```
:::
:::test
```lua
assert(isValidAmount(1) and isValidAmount(1000) and isValidAmount(500))
assert(not isValidAmount(0) and not isValidAmount(1001))
assert(not isValidAmount(2.5) and not isValidAmount("5") and not isValidAmount(nil))
assert(not isValidAmount(0/0) and not isValidAmount(math.huge))
```
:::
:::answer
```lua
local function isValidAmount(x)
  return type(x) == "number"
    and x == x                       -- отсекаем NaN
    and x >= 1 and x <= 1000
    and x == math.floor(x)
end
```
`NaN` — «число», которое не равно самому себе; клиент способен прислать его специально.
:::
::::

::::task mid Лимитер запросов
Напишите `makeLimiter(maxPerWindow, windowSeconds)` → функция `allow(key, now)`: вернуть `true`, если для `key` в текущем окне ещё не превышено `maxPerWindow` запросов. Окно начинается при первом запросе и длится `windowSeconds`.

:::starter
```lua
local function makeLimiter(maxPerWindow, windowSeconds)
end
```
:::
:::test
```lua
local allow = makeLimiter(3, 1)
assert(allow("A", 0) and allow("A", 0.1) and allow("A", 0.2))
assert(allow("A", 0.3) == false)
assert(allow("B", 0.3) == true)
assert(allow("A", 1.0) == true, "новое окно")
```
:::
:::answer
```lua
local function makeLimiter(maxPerWindow, windowSeconds)
  local buckets = {}
  return function(key, now)
    local b = buckets[key]
    if not b or now - b.start >= windowSeconds then
      b = {start = now, count = 0}
      buckets[key] = b
    end
    b.count += 1
    return b.count <= maxPerWindow
  end
end
```
:::
::::

::::task hard Безопасный магазин
Реализуйте `Shop.new(prices)` с методом `:buy(player, itemName, quantity)`, возвращающим `true` или `false, "причина"`. Проверки (в таком порядке): `quantity` — целое от 1 до 99 (`"bad_quantity"`), предмет есть в `prices` (`"unknown_item"`), хватает монет `player.coins` (`"not_enough"`). При успехе списать `price * quantity` и увеличить `player.inventory[itemName]`.

:::starter
```lua
local Shop = {}
Shop.__index = Shop

function Shop.new(prices)
end
```
:::
:::test
```lua
local shop = Shop.new({apple = 10, gem = 500})
local p = {coins = 100, inventory = {}}
assert(shop:buy(p, "apple", 3) == true and p.coins == 70 and p.inventory.apple == 3)
local ok, why = shop:buy(p, "apple", 0)
assert(ok == false and why == "bad_quantity")
ok, why = shop:buy(p, "apple", 1.5)
assert(why == "bad_quantity")
ok, why = shop:buy(p, "sword", 1)
assert(why == "unknown_item")
ok, why = shop:buy(p, "gem", 1)
assert(why == "not_enough" and p.coins == 70)
assert(shop:buy(p, "apple", 7) == true and p.coins == 0 and p.inventory.apple == 10)
```
:::
:::answer
```lua
local Shop = {}
Shop.__index = Shop

function Shop.new(prices)
  return setmetatable({prices = prices}, Shop)
end

function Shop:buy(player, itemName, quantity)
  if type(quantity) ~= "number" or quantity ~= math.floor(quantity) or quantity < 1 or quantity > 99 then
    return false, "bad_quantity"
  end
  local price = self.prices[itemName]
  if not price then
    return false, "unknown_item"
  end
  local total = price * quantity
  if player.coins < total then
    return false, "not_enough"
  end
  player.coins -= total
  player.inventory[itemName] = (player.inventory[itemName] or 0) + quantity
  return true
end
```
:::
::::

## Проверьте себя

::::quiz
Что первым аргументом получает обработчик `RemoteEvent.OnServerEvent`?
- [ ] Данные клиента
- [x] `Player`, отправивший событие (подставляется сервером автоматически)
- [ ] Сам RemoteEvent
Это защита: клиент не может выдать себя за другого игрока.
::::

::::quiz
Клиент хочет купить предмет. Что должен отправить клиент серверу?
- [ ] Название предмета, цену и новый баланс
- [x] Только идентификатор предмета (и количество); цену и баланс сервер знает сам
- [ ] Ничего, всё делает клиент
Любые значения, влияющие на результат, определяет сервер.
::::

::::quiz
Почему опасен `RemoteFunction:InvokeClient`?
- [ ] Он медленный
- [x] Клиент может не ответить или выбросить ошибку — серверный поток зависнет
- [ ] Он не работает в Studio
Никогда не ждите ответа от клиента на сервере.
::::
