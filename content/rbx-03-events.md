---
title: События, соединения и RunService
section: roblox
order: 3
summary: Connect/Once/Wait/Disconnect, Touched, Changed, BindableEvent, свои сигналы, Heartbeat и защитные паттерны.
time: 30
level: Средний
---

## Идея событийного программирования

Roblox-игра — это «реакции на события»: игрок зашёл, часть коснулась, кнопка нажата, здоровье изменилось. Вместо постоянного опроса («а не случилось ли что-то?») вы **подписываетесь** на событие, и движок сам вызовет вашу функцию.

```lua
local connection = part.Touched:Connect(function(hit)
  print("Коснулось:", hit.Name)
end)
```

| Метод сигнала | Что делает |
|---|---|
| `:Connect(fn)` | вызывает `fn` при **каждом** срабатывании, возвращает соединение |
| `:Once(fn)` | вызовет `fn` только раз и отключится |
| `:Wait()` | приостанавливает поток до срабатывания и возвращает аргументы события |
| `connection:Disconnect()` | отписаться |
| `connection.Connected` | активно ли соединение |

```lua
local hit = part.Touched:Wait()          -- ждём первого касания
print("Первое касание:", hit.Name)
```

## Самые частые события

| Объект | События |
|---|---|
| `Players` | `PlayerAdded`, `PlayerRemoving` |
| `Player` | `CharacterAdded`, `CharacterRemoving`, `Chatted`(устаревает → `TextChatService`) |
| `Humanoid` | `Died`, `HealthChanged`, `Running`, `Jumping`, `StateChanged` |
| `BasePart` | `Touched`, `TouchEnded` |
| `Instance` | `ChildAdded`, `ChildRemoved`, `DescendantAdded`, `Changed`, `AncestryChanged`, `Destroying`, `GetPropertyChangedSignal(prop)`, `AttributeChanged` |
| `ClickDetector` | `MouseClick` |
| `ProximityPrompt` | `Triggered`, `PromptShown`, `PromptHidden` |
| `TextButton` / `ImageButton` | `Activated` (лучший вариант: работает на мыши, касании, геймпаде), `MouseButton1Click` |
| `UserInputService` | `InputBegan`, `InputEnded`, `InputChanged` |
| `RunService` | `Heartbeat`, `Stepped`, `RenderStepped` (клиент), `PreSimulation`, `PostSimulation` |
| `RemoteEvent` | `OnServerEvent` / `OnClientEvent` |
| `Tween` | `Completed` |
| `Sound` | `Ended`, `Loaded` |

## Подписка на изменение свойства

```lua
humanoid.HealthChanged:Connect(function(health)
  bar.Size = UDim2.fromScale(health / humanoid.MaxHealth, 1)
end)

-- или конкретное свойство любого объекта:
part:GetPropertyChangedSignal("Color"):Connect(function()
  print("новый цвет", part.Color)
end)
```

## Debounce и cooldown

`Touched` срабатывает очень часто. Защита:

```lua
local COOLDOWN = 1
local lastUse = {}

door.Touched:Connect(function(hit)
  local player = Players:GetPlayerFromCharacter(hit.Parent)
  if not player then return end

  local now = os.clock()
  if lastUse[player] and now - lastUse[player] < COOLDOWN then return end
  lastUse[player] = now

  openDoor(player)
end)

Players.PlayerRemoving:Connect(function(player)
  lastUse[player] = nil          -- не забываем чистить: иначе утечка памяти
end)
```

## Отключение и утечки памяти

Каждое соединение удерживает функцию и всё, что она захватила. Если объект удалён (`Destroy`), его события отключаются автоматически, но соединения **с внешними** объектами (сервисами, игроками) остаются навсегда:

```lua
-- плохо: подписка на сервис внутри объекта, который создаётся много раз
function Enemy.new()
  local self = setmetatable({}, Enemy)
  RunService.Heartbeat:Connect(function() self:Update() end)   -- никогда не отключится!
  return self
end

-- хорошо: храним соединение и отключаем в Destroy
function Enemy.new()
  local self = setmetatable({}, Enemy)
  self._conn = RunService.Heartbeat:Connect(function(dt) self:Update(dt) end)
  return self
end

function Enemy:Destroy()
  self._conn:Disconnect()
end
```

Для множества соединений используйте **Maid / Janitor / Trove** (см. раздел «ООП и архитектура»).

## BindableEvent: события внутри одной стороны

`BindableEvent` — связь между скриптами **на сервере** или **на клиенте** (но не между ними).

```lua
local event = Instance.new("BindableEvent")

event.Event:Connect(function(message, n)
  print("Получено:", message, n)
end)

event:Fire("привет", 42)
```

Для кода внутри одного модуля удобнее писать собственный лёгкий класс `Signal` (см. страницу про ООП), он быстрее и не копирует таблицы при передаче.

## RunService: кадровые события

```lua
local RunService = game:GetService("RunService")

RunService.Heartbeat:Connect(function(dt)
  -- после физики, каждый кадр, dt — время кадра (≈ 1/60)
end)

-- только на клиенте — перед отрисовкой (камера, UI-анимации):
RunService.RenderStepped:Connect(function(dt) end)
```

| Событие | Когда | Где |
|---|---|---|
| `PreRender` / `RenderStepped` | перед отрисовкой кадра | клиент |
| `PreAnimation` | перед обновлением анимаций | обе |
| `PreSimulation` / `Stepped` | перед физикой | обе |
| `PostSimulation` / `Heartbeat` | после физики | обе |

Проверка контекста: `RunService:IsServer()`, `:IsClient()`, `:IsStudio()`, `:IsRunning()`.

:::warn Кадровые события — для лёгкого кода
Всё, что вы вешаете на `Heartbeat/RenderStepped`, выполняется 60+ раз в секунду. Не делайте там поиск по всему `Workspace`, создание объектов и `FindFirstChild` по сотням объектов. Лучше события, `task.wait(0.25)` или кеширование.
:::

## Ожидание вместо опроса

```lua
-- плохо: опрос
while not player.Character do task.wait() end

-- хорошо:
local character = player.Character or player.CharacterAdded:Wait()
```

## Паттерн: обработка уже существующих + новых

```lua
local function onPlayer(player) ... end

Players.PlayerAdded:Connect(onPlayer)
for _, p in ipairs(Players:GetPlayers()) do task.spawn(onPlayer, p) end
```

Тот же приём — для `ChildAdded` (обработать текущих детей + новых) и для `CollectionService`.

## Свой Signal (чистый Lua, запускается здесь)

```lua run
local Signal = {}
Signal.__index = Signal

function Signal.new()
  return setmetatable({_handlers = {}}, Signal)
end

function Signal:Connect(fn)
  local handler = {fn = fn}
  table.insert(self._handlers, handler)
  return {
    Disconnect = function()
      local i = table.find(self._handlers, handler)
      if i then table.remove(self._handlers, i) end
    end,
  }
end

function Signal:Fire(...)
  for _, h in ipairs({table.unpack(self._handlers)}) do
    h.fn(...)
  end
end

local coinsChanged = Signal.new()
local c1 = coinsChanged:Connect(function(n) print("UI: монет", n) end)
local c2 = coinsChanged:Connect(function(n) print("Звук: +монеты", n) end)

coinsChanged:Fire(10)
c1.Disconnect()
coinsChanged:Fire(20)
```

## Задания

::::task easy Кулдаун
Напишите `makeCooldown(seconds)`, возвращающую функцию `try(now)`: если с последнего успешного вызова прошло ≥ `seconds`, вернуть `true` и запомнить `now`, иначе `false`. (Время `now` передаётся аргументом — так проще тестировать.)

:::starter
```lua
local function makeCooldown(seconds)
end
```
:::
:::test
```lua
local try = makeCooldown(2)
assert(try(0) == true)
assert(try(1) == false)
assert(try(2) == true)
assert(try(3.5) == false)
assert(try(4) == true)
```
:::
:::answer
```lua
local function makeCooldown(seconds)
  local last = nil
  return function(now)
    if last == nil or now - last >= seconds then
      last = now
      return true
    end
    return false
  end
end
```
В игре: `local try = makeCooldown(1)`, затем `if try(os.clock()) then … end`.
:::
::::

::::task mid Signal с Once
Доработайте `Signal`: добавьте метод `:Once(fn)` — обработчик вызывается один раз и отключается.

:::starter
```lua
local Signal = {}
Signal.__index = Signal

function Signal.new()
  return setmetatable({_handlers = {}}, Signal)
end

function Signal:Connect(fn)
  local handler = {fn = fn}
  table.insert(self._handlers, handler)
  return {Disconnect = function()
    local i = table.find(self._handlers, handler)
    if i then table.remove(self._handlers, i) end
  end}
end

function Signal:Fire(...)
  for _, h in ipairs({table.unpack(self._handlers)}) do h.fn(...) end
end

-- добавьте Signal:Once
```
:::
:::test
```lua
local s = Signal.new()
local calls = 0
s:Once(function(x) calls += x end)
s:Fire(5)
s:Fire(5)
assert(calls == 5, "Once должен сработать один раз, calls=" .. calls)
local m = 0
s:Connect(function() m += 1 end)
s:Fire(); s:Fire()
assert(m == 2)
```
:::
:::answer
```lua
function Signal:Once(fn)
  local conn
  conn = self:Connect(function(...)
    conn.Disconnect()
    fn(...)
  end)
  return conn
end
```
:::
::::

::::task mid Защита от утечки
Опишите, что не так в коде ниже, и как исправить (напишите ответ текстом в переменную `problem` одной фразой, содержащей слово «Disconnect»).

```lua
Players.PlayerAdded:Connect(function(player)
  RunService.Heartbeat:Connect(function()
    updateHud(player)
  end)
end)
```

:::starter
```lua
local problem = ""
```
:::
:::test
```lua
assert(problem:find("Disconnect", 1, true), "упомяните Disconnect")
assert(#problem > 20)
```
:::
:::answer
```lua
local problem = "Соединение с Heartbeat создаётся для каждого игрока и никогда не отключается: нужно сохранить его и вызвать Disconnect в PlayerRemoving."
```
Правильный вариант: хранить `connections[player] = RunService.Heartbeat:Connect(...)` и при выходе игрока `connections[player]:Disconnect()`; ещё лучше — один общий `Heartbeat`, который обходит всех игроков.
:::
::::

## Проверьте себя

::::quiz
Какое событие кнопки правильнее всего использовать для кроссплатформенности?
- [ ] `MouseButton1Down`
- [x] `Activated`
- [ ] `InputBegan` на кнопке
`Activated` срабатывает при клике мышью, касании на телефоне и нажатии на геймпаде.
::::

::::quiz
Что делает `player.CharacterAdded:Wait()`?
- [ ] Создаёт персонажа
- [x] Приостанавливает текущий поток до появления персонажа и возвращает его
- [ ] Подписывается на событие навсегда
`:Wait()` блокирует *текущий поток* до срабатывания события.
::::
