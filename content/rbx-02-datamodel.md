---
title: DataModel, Instance и сервисы
section: roblox
order: 2
summary: Иерархия объектов Roblox, Instance.new, поиск, свойства, атрибуты, теги и корректная работа с сервисами.
time: 30
level: Новичок
---

## DataModel: «дерево» вашей игры

Всё в Roblox — объекты (**Instance**), выстроенные в дерево. Корень — **`game`** (экземпляр `DataModel`). Его дети — **сервисы**: `Workspace`, `Players`, `ReplicatedStorage`, `Lighting` и т.д.

```text
game (DataModel)
├─ Workspace
│  ├─ Baseplate (Part)
│  └─ Door (Model)
│     ├─ Frame (Part)
│     └─ Handle (Part)
├─ ReplicatedStorage
├─ ServerScriptService
└─ Players
   └─ Ann (Player)
```

Каждый объект имеет: **ClassName** (класс), **Name** (имя, может повторяться), **Parent** (родитель), свойства, методы, события.

## Доступ к сервисам

```lua
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
```

:::tip Всегда `GetService`
`game.Workspace` работает, но `game:GetService("Workspace")` — надёжный и единообразный способ (имена сервисов могут быть переименованы; `GetService` создаёт сервис, если его ещё нет). `workspace` — зарезервированная глобальная ссылка на Workspace, её можно использовать напрямую.
:::

## Создание и удаление объектов

```lua
local part = Instance.new("Part")
part.Name = "MyPart"
part.Size = Vector3.new(4, 1, 4)
part.Position = Vector3.new(0, 10, 0)
part.Color = Color3.fromRGB(255, 120, 0)
part.Anchored = true
part.Parent = workspace            -- Parent ставим ПОСЛЕДНИМ: объект появится в мире уже настроенным

task.delay(5, function()
  part:Destroy()                   -- полностью удалить (отключает события, обнуляет Parent)
end)
```

:::warn Parent — в конце
Установка `Parent` запускает репликацию и обработчики событий. Сначала задайте все свойства, потом `Parent`. Не используйте второй аргумент `Instance.new("Part", parent)`.
:::

| Метод | Назначение |
|---|---|
| `Instance.new(class)` | создать объект |
| `obj:Clone()` | глубокая копия (с потомками); `Parent = nil` у копии |
| `obj:Destroy()` | удалить; после этого объект использовать нельзя |
| `obj:ClearAllChildren()` | удалить всех потомков |

## Поиск объектов

```lua
local door = workspace:FindFirstChild("Door")                   -- или nil
local deep = workspace:FindFirstChild("Handle", true)           -- рекурсивно
local hum  = character:FindFirstChildOfClass("Humanoid")        -- по классу (точное совпадение)
local anyPart = model:FindFirstChildWhichIsA("BasePart")        -- по классу с учётом наследования

local gui = player:WaitForChild("PlayerGui")                    -- ждать появления (с опциональным таймаутом)
local ui = gui:WaitForChild("Shop", 5)                          -- через 5 с вернёт nil
```

| Что нужно | Что использовать |
|---|---|
| Объект точно должен быть (на клиенте он ещё «подгружается») | `WaitForChild` |
| Объект может отсутствовать — проверка | `FindFirstChild` |
| Все дети / потомки | `GetChildren()` / `GetDescendants()` |
| Проверка типа | `obj:IsA("BasePart")` (учитывает наследование), `obj.ClassName == "Part"` |
| Является ли потомком | `obj:IsDescendantOf(model)` |
| Предок нужного типа | `obj:FindFirstAncestorOfClass("Model")` / `FindFirstAncestor("Name")` |

:::warn Антипаттерн: точечная нотация для необязательных объектов
`workspace.Door.Handle` упадёт с ошибкой, если `Door` ещё нет. Для необязательных/подгружаемых объектов — `FindFirstChild` или `WaitForChild`. Для объектов, которые гарантированно лежат в вашем скрипте (`script.Config`) точечная нотация допустима.
:::

## Свойства и иерархия классов

Классы наследуют друг друга: `Instance` → `PVInstance` → `BasePart` → `Part`/`MeshPart`/`UnionOperation`... Проверка `IsA("BasePart")` вернёт `true` для всех вариантов частей.

Важнейшие свойства `BasePart`:

| Свойство | Смысл |
|---|---|
| `Position`, `Orientation`, `CFrame` | положение/поворот |
| `Size` | размеры (Vector3) |
| `Color`, `Material`, `Transparency`, `Reflectance` | внешний вид |
| `Anchored` | закреплена ли (не подвержена физике) |
| `CanCollide`, `CanTouch`, `CanQuery` | столкновения / события касания / лучи |
| `Massless` | не влияет на массу сборки |
| `CollisionGroup` | группа коллизий |
| `AssemblyLinearVelocity` | скорость сборки |

## Model и PivotTo

```lua
local model = workspace.Car
model:PivotTo(CFrame.new(0, 10, 0))                   -- переместить всю модель (правильный способ)
local cf = model:GetPivot()                            -- текущий «центр»
local size = model:GetExtentsSize()                    -- габариты
model:ScaleTo(2)                                       -- масштабировать
```

`MoveTo` и `SetPrimaryPartCFrame` — устаревшие способы перемещения; используйте `PivotTo`.

## Attributes (атрибуты)

Любой `Instance` может хранить собственные именованные значения — удобно для настроек, которые меняют в Properties без изменения кода:

```lua
local door = workspace.Door
door:SetAttribute("Locked", true)
door:SetAttribute("Cost", 100)

print(door:GetAttribute("Cost"))                       --> 100

door:GetAttributeChangedSignal("Locked"):Connect(function()
  print("Locked ->", door:GetAttribute("Locked"))
end)
```

Типы: `string`, `number`, `boolean`, `Vector3`, `Color3`, `UDim2`, `BrickColor`, `NumberSequence` и др. Атрибуты **реплицируются** клиенту (если объект виден клиенту) и подходят для хранения состояния (но не секретов).

## CollectionService: теги

Теги — способ сказать «все объекты с этой ролью». Можно назначать в Studio (окно **Tag Editor**) или кодом.

```lua
local CollectionService = game:GetService("CollectionService")

local function setupLava(part)
  part.Touched:Connect(function(hit)
    local hum = hit.Parent:FindFirstChildOfClass("Humanoid")
    if hum then hum:TakeDamage(10) end
  end)
end

for _, part in ipairs(CollectionService:GetTagged("Lava")) do
  setupLava(part)
end
CollectionService:GetInstanceAddedSignal("Lava"):Connect(setupLava)   -- новые объекты с тегом
```

Это основа **компонентного** подхода: один скрипт управляет сотнями объектов с тегом — вместо сотен копий скрипта внутри каждого.

## Value-объекты и Folder

`IntValue`, `NumberValue`, `StringValue`, `BoolValue`, `ObjectValue`, `Color3Value` — хранят значение и имеют событие `Changed`. Для современной архитектуры чаще используют атрибуты, но `Value`-объекты нужны для `leaderstats`.

`Folder` — просто контейнер для порядка в Explorer.

## Полезные «глобальные» значения

| Выражение | Значение |
|---|---|
| `game.PlaceId` / `game.GameId` | ID плейса / вселенной (experience) |
| `game.JobId` | ID конкретного сервера |
| `script` | сам скрипт; `script.Parent` — его родитель |
| `workspace` | сервис `Workspace` |
| `workspace.CurrentCamera` | камера (клиент) |
| `game:GetService("RunService"):IsStudio()` | запущено в Studio? |

## Задания

::::task easy Покраска детей
В модели `Rainbow` лежит несколько частей. Напишите код: пройти по всем детям; для каждой `BasePart` задать случайный цвет.

:::answer
```lua
local model = workspace:WaitForChild("Rainbow")

for _, child in ipairs(model:GetChildren()) do
  if child:IsA("BasePart") then
    child.Color = Color3.fromHSV(math.random(), 1, 1)
  end
end
```
Для вложенных моделей используйте `GetDescendants()`.
:::
::::

::::task mid Спавнер препятствий
Создайте скрипт, который каждые 2 секунды клонирует шаблон `ServerStorage.Obstacle`, помещает его в `Workspace` в случайную позицию (X от −30 до 30, Y = 50, Z = 0) и удаляет через 8 секунд (`Debris`).

:::answer
```lua
local ServerStorage = game:GetService("ServerStorage")
local Debris = game:GetService("Debris")

local template = ServerStorage:WaitForChild("Obstacle")

while true do
  local clone = template:Clone()
  clone:PivotTo(CFrame.new(math.random(-30, 30), 50, 0))
  clone.Parent = workspace
  Debris:AddItem(clone, 8)
  task.wait(2)
end
```
`Debris:AddItem` безопаснее, чем `task.delay(…, clone.Destroy)`: корректно работает, даже если объект уже удалён.
:::
::::

::::task mid Логика без Studio: фильтрация по тегам
Смоделируйте выборку объектов по тегу на чистом Lua: дан массив таблиц `{name, tags}`; напишите `getTagged(list, tag)` — вернуть имена объектов с этим тегом.

:::starter
```lua
local function getTagged(list, tag)
end
```
:::
:::test
```lua
local list = {
  {name = "L1", tags = {"Lava"}},
  {name = "C1", tags = {"Coin", "Gold"}},
  {name = "L2", tags = {"Lava", "Hot"}},
}
assert(table.concat(getTagged(list, "Lava"), ",") == "L1,L2")
assert(#getTagged(list, "None") == 0)
assert(getTagged(list, "Gold")[1] == "C1")
```
:::
:::answer
```lua
local function getTagged(list, tag)
  local result = {}
  for _, obj in ipairs(list) do
    if table.find(obj.tags, tag) then
      table.insert(result, obj.name)
    end
  end
  return result
end
```
:::
::::

## Проверьте себя

::::quiz
Какой порядок правильный при создании объекта?
- [ ] `Instance.new("Part", workspace)`, затем настройка свойств
- [x] Создать, настроить свойства, **в конце** задать `Parent`
- [ ] Порядок не важен
Родитель в конце избегает лишних событий и промежуточных состояний.
::::

::::quiz
Чем `FindFirstChild` отличается от `WaitForChild`?
- [ ] Ничем
- [x] `FindFirstChild` возвращает `nil` сразу, `WaitForChild` ждёт появления объекта (и может «зависнуть», если его не будет, без таймаута)
- [ ] `WaitForChild` только для клиента
Используйте `WaitForChild` для объектов, которые должны появиться, и задавайте таймаут при сомнениях.
::::
