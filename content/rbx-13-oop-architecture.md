---
title: ООП и архитектура в Roblox
section: roblox
order: 13
summary: Классы, Signal, Maid/Trove, компоненты через теги, сервисы и контроллеры, состояния и правила именования.
time: 40
level: Продвинутый
---

В уроке 10 вы узнали базу ООП в Lua. Здесь — как применять её в реальной игре и **как называть** вещи, чтобы код читали и ИИ, и люди.

## Классы в Roblox: полный шаблон

```lua
--!strict
-- ServerStorage/Classes/Enemy (ModuleScript)
local Signal = require(game.ReplicatedStorage.Shared.Signal)
local Maid = require(game.ReplicatedStorage.Shared.Maid)

local Enemy = {}
Enemy.__index = Enemy

export type Enemy = typeof(setmetatable({} :: {
  Model: Model,
  Health: number,
  _maid: any,
  Died: any,
}, Enemy))

function Enemy.new(model: Model, maxHealth: number): Enemy
  local self = setmetatable({}, Enemy)
  self.Model = model
  self.Health = maxHealth
  self._maid = Maid.new()
  self.Died = Signal.new()

  local humanoid = model:FindFirstChildOfClass("Humanoid")
  if humanoid then
    self._maid:Add(humanoid.Died:Connect(function() self:Destroy() end))
  end
  return self
end

function Enemy.TakeDamage(self: Enemy, amount: number)
  self.Health = math.max(0, self.Health - amount)
  if self.Health == 0 then
    self.Died:Fire()
    self:Destroy()
  end
end

function Enemy.Destroy(self: Enemy)
  self._maid:Destroy()          -- отключаем все соединения/объекты
  self.Model:Destroy()
end

return Enemy
```

## Signal — собственные события

Самый полезный строительный блок: легче и быстрее `BindableEvent`, передаёт значения по ссылке (без копирования таблиц).

```lua
-- ReplicatedStorage/Shared/Signal (ModuleScript, упрощённо)
local Signal = {}
Signal.__index = Signal

function Signal.new()
  return setmetatable({ _handlers = {} }, Signal)
end

function Signal:Connect(fn)
  local connection = { _fn = fn, Connected = true }
  table.insert(self._handlers, connection)
  function connection.Disconnect()
    connection.Connected = false
    local i = table.find(self._handlers, connection)
    if i then table.remove(self._handlers, i) end
  end
  return connection
end

function Signal:Fire(...)
  for _, c in ipairs(table.clone(self._handlers)) do
    if c.Connected then task.spawn(c._fn, ...) end
  end
end

function Signal:Wait()
  local thread = coroutine.running()
  local c
  c = self:Connect(function(...)
    c.Disconnect()
    task.spawn(thread, ...)
  end)
  return coroutine.yield()
end

function Signal:Destroy() table.clear(self._handlers) end

return Signal
```

На практике берут проверенные реализации: **GoodSignal**, **Signal+** или `RBXScriptSignal`-совместимые из пакетов (Wally).

## Maid / Janitor / Trove — уборка за собой

Объект, который подписывается на события, создаёт части и тривиально «забывает» отключиться — главная причина утечек памяти. **Maid** собирает «мусор» и чистит одним вызовом.

```lua
-- упрощённый Maid
local Maid = {}
Maid.__index = Maid

function Maid.new() return setmetatable({ _tasks = {} }, Maid) end

function Maid:Add(task)
  table.insert(self._tasks, task)
  return task
end

function Maid:Destroy()
  for _, t in ipairs(self._tasks) do
    local kind = typeof(t)
    if kind == "RBXScriptConnection" then t:Disconnect()
    elseif kind == "Instance" then t:Destroy()
    elseif kind == "function" then t()
    elseif kind == "table" and t.Destroy then t:Destroy()
    elseif kind == "thread" then task.cancel(t) end
  end
  table.clear(self._tasks)
end

return Maid
```

Готовые решения: **Janitor**, **Trove** (Sleitnick), **Maid** (Quenty).

## Компоненты через CollectionService

«Один модуль — много объектов». Тег = «роль»; класс-компонент создаётся для каждого объекта с тегом.

```lua
-- ServerScriptService/Components/Door (ModuleScript)
local CollectionService = game:GetService("CollectionService")
local Maid = require(game.ReplicatedStorage.Shared.Maid)

local Door = {}
Door.__index = Door
Door.Tag = "Door"

function Door.new(instance: BasePart)
  local self = setmetatable({}, Door)
  self.Instance = instance
  self._maid = Maid.new()
  self.Open = false

  local prompt = instance:FindFirstChildOfClass("ProximityPrompt")
  if prompt then
    self._maid:Add(prompt.Triggered:Connect(function(player) self:Toggle(player) end))
  end
  return self
end

function Door:Toggle(player)
  self.Open = not self.Open
  self.Instance.Transparency = self.Open and 0.7 or 0
  self.Instance.CanCollide = not self.Open
end

function Door:Destroy() self._maid:Destroy() end

-- запуск: для существующих и новых
function Door.Start()
  local objects = {}
  local function bind(inst)
    objects[inst] = Door.new(inst)
  end
  local function unbind(inst)
    if objects[inst] then objects[inst]:Destroy(); objects[inst] = nil end
  end
  for _, inst in ipairs(CollectionService:GetTagged(Door.Tag)) do bind(inst) end
  CollectionService:GetInstanceAddedSignal(Door.Tag):Connect(bind)
  CollectionService:GetInstanceRemovedSignal(Door.Tag):Connect(unbind)
end

return Door
```

Готовая библиотека: **Component** (Sleitnick). Дизайнеры ставят тег `Door` — и всё работает без правок кода.

## Сервисы и контроллеры

Практичная архитектура «как у Knit», но без фреймворка:

- **Services (сервер)**: `DataService`, `CurrencyService`, `ShopService`, `PetService`, `QuestService` — модули-синглтоны с методами и событиями.
- **Controllers (клиент)**: `UIController`, `InputController`, `CameraController`, `AudioController`.
- **Точка входа**: `Main.server.luau` / `Main.client.luau` подключает модули и вызывает `Init()` (создание, без зависимостей) → `Start()` (запуск, зависимости доступны).

```lua
-- Main.server.luau
local services = {}
for _, module in ipairs(script.Parent.Services:GetChildren()) do
  services[module.Name] = require(module)
end
for _, s in pairs(services) do if s.Init then s.Init(services) end end
for _, s in pairs(services) do if s.Start then task.spawn(s.Start) end end
```

Правила:
- Сервисы общаются **событиями/вызовами методов**, а не лезут в чужие данные.
- Циклических зависимостей нет: если A требует B, B не требует A (вынесите общее или используйте события).
- Клиентский код не принимает решений о деньгах/уроне.

## Конечные автоматы (State Machine)

Для NPC, раундов, боссов, меню:

```lua
local Machine = {}
Machine.__index = Machine

function Machine.new(states, initial)
  local self = setmetatable({ states = states, current = nil }, Machine)
  self:Change(initial)
  return self
end

function Machine:Change(name, ...)
  if self.current and self.states[self.current].exit then self.states[self.current].exit(self) end
  self.current = name
  if self.states[name].enter then self.states[name].enter(self, ...) end
end

function Machine:Update(dt)
  local s = self.states[self.current]
  if s.update then s.update(self, dt) end
end

return Machine
```

Состояния игры: `Intermission → Round → Results → Intermission`. Состояния NPC: `Idle → Chase → Attack → Dead`.

## Data-driven дизайн: данные отдельно от кода

Параметры предметов, питомцев, зон — в таблицах/модулях-конфигах, а не «вшиты» в логику. Баланс правится без изменения кода, а ИИ/дизайнер может быстро добавлять контент.

```lua
-- ReplicatedStorage/Shared/PetConfig (ModuleScript)
return {
  Dog   = { Rarity = "Common", Power = 1,  Chance = 60 },
  Cat   = { Rarity = "Rare",   Power = 5,  Chance = 30 },
  Dragon = { Rarity = "Epic",  Power = 50, Chance = 10 },
}
```

:::money Для конвейера игр
Один и тот же движок (валюты, питомцы, яйца, апгрейды, ребёрты, магазин, сохранения) + разные таблицы конфигов и арт = быстрая сборка новых игр. См. [[money-05-fast-build]].
:::

## Именование: как называются вещи в Roblox

### Что уже названо движком (запомнить)

| Что | Стиль | Примеры |
|---|---|---|
| Классы | PascalCase | `Part`, `Humanoid`, `RemoteEvent`, `ProximityPrompt` |
| Свойства | PascalCase | `Anchored`, `WalkSpeed`, `Position` |
| Методы | PascalCase | `FindFirstChild`, `GetService`, `LoadAnimation` |
| События | PascalCase | `Touched`, `PlayerAdded`, `Activated` |
| Перечисления | `Enum.Type.Item` | `Enum.Material.Neon` |
| Сервисы | PascalCase + `Service` | `TweenService`, `DataStoreService` |
| Типы данных | PascalCase | `Vector3`, `CFrame`, `UDim2` |
| Глобалы Lua | lowercase | `print`, `pairs`, `table`, `workspace` |

### Что называете вы

| Что | Рекомендация |
|---|---|
| Локальные переменные/параметры | `camelCase` |
| Модули/классы/типы | `PascalCase` |
| Публичные методы/поля класса | `PascalCase` (в стиле Roblox) или `camelCase` — **единообразно в проекте** |
| Приватные | `_prefix` |
| Константы | `UPPER_SNAKE_CASE` |
| Имена объектов в Explorer | `PascalCase`, осмысленные (`SpawnPad`, `CoinTemplate`) — на них ссылаются из кода |
| RemoteEvent | глагол/событие: `BuyItem`, `PetEquipped`, `NotifyPlayer` |
| Теги | `PascalCase`: `Door`, `Coin`, `Lava` |
| Атрибуты | `PascalCase`: `Locked`, `Price` |
| Ассеты в ReplicatedStorage | папки по типу: `Assets/Pets/Dog` |

### Файлы при работе через Rojo (на диске)

| Файл | Станет в Studio |
|---|---|
| `Main.server.luau` | `Script` (RunContext Server) |
| `Main.client.luau` | `LocalScript`/`Script` (Client) |
| `PetService.luau` | `ModuleScript` |
| `Shared/init.luau` | `ModuleScript` с именем папки `Shared` (вложенные файлы — его дети) |
| `*.model.json`, `*.rbxm`, `*.meta.json` | модели и настройки |

## Антипаттерны ООП в Roblox

| Антипаттерн | Решение |
|---|---|
| God-object `GameManager` на 2000 строк | разбить на сервисы |
| Скрипт в каждой части (200 копий `Coin`) | один скрипт + `CollectionService` |
| Глубокие цепочки `script.Parent.Parent.Parent` | ссылки через `ReplicatedStorage`/константы/WaitForChild |
| Опрос через `while true do ... wait()` | события |
| Состояние в `_G` | модули |
| Клиент решает результат | сервер решает |

## Задания

::::task mid Maid (чистый Lua)
Реализуйте `Maid.new()` с методами `:Add(task)` и `:Destroy()`, где `task` — функция (вызывается при `Destroy`) или таблица с методом `Destroy`. Порядок очистки — **обратный** (последний добавленный чистится первым). После `Destroy` второй вызов ничего не делает.

:::starter
```lua
local Maid = {}
Maid.__index = Maid
```
:::
:::test
```lua
local log = {}
local m = Maid.new()
m:Add(function() table.insert(log, "a") end)
m:Add({Destroy = function() table.insert(log, "b") end})
m:Add(function() table.insert(log, "c") end)
m:Destroy()
assert(table.concat(log, "") == "cba")
m:Destroy()
assert(#log == 3)
```
:::
:::answer
```lua
local Maid = {}
Maid.__index = Maid

function Maid.new()
  return setmetatable({_tasks = {}}, Maid)
end

function Maid:Add(task)
  table.insert(self._tasks, task)
  return task
end

function Maid:Destroy()
  for i = #self._tasks, 1, -1 do
    local t = self._tasks[i]
    if type(t) == "function" then
      t()
    elseif type(t) == "table" and t.Destroy then
      t:Destroy()
    end
  end
  self._tasks = {}
end
```
:::
::::

::::task hard Конечный автомат раунда (чистый Lua)
Реализуйте `Machine.new(states, initial)` с `:Change(name)` (вызывает `exit` текущего и `enter` нового) и `:Update(dt)` (вызывает `update` текущего). Состояния — таблицы с необязательными `enter(machine)`, `exit(machine)`, `update(machine, dt)`.

:::starter
```lua
local Machine = {}
Machine.__index = Machine
```
:::
:::test
```lua
local log = {}
local states = {
  A = {enter = function() table.insert(log, "enterA") end, exit = function() table.insert(log, "exitA") end,
       update = function(m, dt) table.insert(log, "updA" .. dt) end},
  B = {enter = function() table.insert(log, "enterB") end},
}
local m = Machine.new(states, "A")
m:Update(1)
m:Change("B")
m:Update(2)
assert(table.concat(log, ",") == "enterA,updA1,exitA,enterB")
assert(m.current == "B")
```
:::
:::answer
```lua
local Machine = {}
Machine.__index = Machine

function Machine.new(states, initial)
  local self = setmetatable({states = states, current = nil}, Machine)
  self:Change(initial)
  return self
end

function Machine:Change(name)
  local old = self.current and self.states[self.current]
  if old and old.exit then
    old.exit(self)
  end
  self.current = name
  local new = self.states[name]
  if new and new.enter then
    new.enter(self)
  end
end

function Machine:Update(dt)
  local s = self.states[self.current]
  if s and s.update then
    s.update(self, dt)
  end
end
```
:::
::::

## Проверьте себя

::::quiz
Зачем нужен Maid/Janitor/Trove?
- [ ] Для ускорения физики
- [x] Чтобы собирать соединения/объекты и очищать их одним вызовом — защита от утечек памяти
- [ ] Для шифрования данных
Забытые соединения — главная причина утечек в долгоживущих играх.
::::

::::quiz
Как лучше добавить поведение 200 одинаковым монетам?
- [ ] Скопировать скрипт в каждую монету
- [x] Один скрипт + тег `Coin` через CollectionService
- [ ] Сделать 200 LocalScript
Одна копия кода легче поддерживается и быстрее загружается.
::::
