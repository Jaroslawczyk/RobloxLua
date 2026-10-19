---
title: Карта классов и сервисов Roblox
section: roblox
order: 16
summary: Иерархия классов, список важнейших сервисов и классов по задачам — чтобы знать, «что искать» в документации.
time: 20
level: Средний
---

Roblox API содержит сотни классов. Нужны вам обычно 50–80. Эта карта показывает, **что для чего**, чтобы вы (и ваш ИИ-ассистент) выбирали правильный инструмент. Интерактивный поиск по основным членам API — в [[tools-api]].

:::note Источник правды
Полный и актуальный список — [Engine API Reference](https://create.roblox.com/docs/reference/engine) (Classes, DataTypes, Enums, Globals, Libraries). Отметки Deprecated в нём — повод не использовать API в новом коде.
:::

## Иерархия классов (упрощённо)

```text
Instance
├─ PVInstance
│  ├─ BasePart
│  │  ├─ Part, WedgePart, TrussPart, SpawnLocation, Seat, VehicleSeat
│  │  ├─ MeshPart
│  │  ├─ UnionOperation (PartOperation)
│  │  └─ Terrain
│  └─ Model (Actor, WorldModel)
├─ Humanoid, Animator, Animation
├─ LuaSourceContainer
│  ├─ BaseScript → Script, LocalScript
│  └─ ModuleScript
├─ GuiBase2d → GuiObject
│  ├─ Frame, ScrollingFrame, CanvasGroup, ViewportFrame
│  ├─ TextLabel, TextButton, TextBox
│  └─ ImageLabel, ImageButton
├─ LayerCollector → ScreenGui, BillboardGui, SurfaceGui
├─ UIComponent → UICorner, UIStroke, UIListLayout, UIGridLayout, UIPadding, UIScale, constraints…
├─ ValueBase → IntValue, NumberValue, StringValue, BoolValue, ObjectValue, Color3Value, CFrameValue…
├─ Folder, Configuration
├─ RemoteEvent, RemoteFunction, UnreliableRemoteEvent, BindableEvent, BindableFunction
├─ Constraint → WeldConstraint, HingeConstraint, SpringConstraint, RopeConstraint, LinearVelocity, AlignPosition…
├─ Attachment, Beam, Trail, ParticleEmitter
├─ Light → PointLight, SpotLight, SurfaceLight
├─ Sound, SoundGroup, SoundEffect…
├─ Tool, Accessory, Clothing (Shirt, Pants), Decal, Texture
├─ Player, Team, Backpack, PlayerGui
└─ Service → Workspace, Players, Lighting, ReplicatedStorage, … (список ниже)
```

Как читать: `part:IsA("BasePart")` — `true`, потому что `Part` наследует `BasePart`. Методы и свойства родительских классов доступны потомкам.

## Сервисы по задачам

| Задача | Сервис |
|---|---|
| Мир, физика, камера | `Workspace`, `PhysicsService`, `PathfindingService`, `Debris` |
| Игроки и персонаж | `Players`, `Teams`, `StarterPlayer`, `StarterPack`, `StarterGui` |
| Данные и сохранения | `DataStoreService`, `MemoryStoreService`, `MessagingService` |
| Деньги и покупки | `MarketplaceService`, `BadgeService`, `PolicyService` |
| Сеть | `RemoteEvent`/`RemoteFunction` (в `ReplicatedStorage`), `HttpService` |
| Ввод и UI | `UserInputService`, `ContextActionService`, `GuiService`, `TextService`, `ProximityPromptService` |
| Время и кадры | `RunService`, `TweenService`, `task` (библиотека) |
| Хранение ассетов | `ReplicatedStorage`, `ServerStorage`, `ReplicatedFirst`, `Lighting` (скайбокс) |
| Звук и графика | `SoundService`, `Lighting`, `MaterialService` |
| Чат и текст | `TextChatService`, `TextService` (фильтрация!) |
| Телепорт и серверы | `TeleportService`, `MessagingService` |
| Социальное | `SocialService` (приглашения друзей), `Players:GetFriendsAsync` |
| Локализация | `LocalizationService`, `LocalizationTable` |
| Организация кода | `CollectionService` (теги), `ServerScriptService`, `ModuleScript` |
| Аналитика | `AnalyticsService` (экономические события и воронки) |

## Что «нельзя» и устарело (частые ошибки ИИ)

| Устаревшее | Современная замена |
|---|---|
| `wait()`, `spawn()`, `delay()` | `task.wait()`, `task.spawn()`, `task.delay()` |
| `Instance.new("Part", parent)` | создать → настроить → задать `Parent` |
| `Humanoid:LoadAnimation()` | `Animator:LoadAnimation()` |
| `BodyVelocity`, `BodyForce`, `BodyPosition`, `BodyGyro` | `LinearVelocity`, `VectorForce`, `AlignPosition`, `AlignOrientation` |
| `workspace:FindPartOnRay…` | `workspace:Raycast()` |
| `Region3` запросы | `GetPartBoundsInBox/Radius`, `GetPartsInPart` |
| `model:MoveTo()`, `SetPrimaryPartCFrame()` | `model:PivotTo()` |
| `RaycastFilterType.Blacklist/Whitelist` | `Exclude` / `Include` |
| `Player.Chatted` и старый чат | `TextChatService` |
| `tick()` | `os.clock()` (замеры) / `os.time()`, `DateTime` |
| `game.Workspace` / `game.Players` | `game:GetService("…")` |
| `PromptProductPurchaseFinished` для выдачи | `ProcessReceipt` |
| `Mouse` (`player:GetMouse()`) в новом коде | `UserInputService`/`ContextActionService` |
| `Touched` для урона по зонам | `GetPartBoundsInRadius` / `ProximityPrompt` |
| `Instance:Destroy()` забыт | очистка соединений/объектов (Maid) |

## Шпаргалка по типам скриптов и местам

| Что вы делаете | Тип | Где |
|---|---|---|
| Серверная логика | Script | `ServerScriptService` |
| Клиентская логика/UI | LocalScript | `StarterPlayerScripts` / `StarterGui` |
| Общий код | ModuleScript | `ReplicatedStorage/Shared` |
| Секретный серверный код | ModuleScript | `ServerStorage` / `ServerScriptService` |
| Скрипт на объекте | Script (RunContext) | внутри части/модели |
| Сетевые события | RemoteEvent/Function | `ReplicatedStorage/Remotes` |

## Задания

::::task easy Классы и наследование
Для каждого объекта — подходит ли проверка `obj:IsA("BasePart")`? Ответьте в таблице `answers` значениями `true`/`false` по порядку: `Part`, `MeshPart`, `Model`, `Humanoid`, `SpawnLocation`, `TextLabel`.

:::starter
```lua
local answers = {} -- например {true, false, ...}
```
:::
:::test
```lua
local expected = {true, true, false, false, true, false}
for i, v in ipairs(expected) do
  assert(answers[i] == v, "пункт " .. i)
end
```
:::
:::answer
```lua
local answers = {true, true, false, false, true, false}
```
`Model` — контейнер (PVInstance, но не BasePart); `Humanoid` и `TextLabel` — из других веток иерархии.
:::
::::

::::task mid Найти устаревшее (чистый Lua)
Напишите `findDeprecated(code)`: возвращает массив найденных в тексте кода устаревших вызовов из списка `{"wait(", "spawn(", "delay(", "BodyVelocity", "LoadAnimation(", "FindPartOnRay", "SetPrimaryPartCFrame"}` (без дубликатов, в порядке списка). Учтите: `task.wait(` — нормально (не считается), а `wait(` — устаревшее; `Animator:LoadAnimation(` — нормально, `Humanoid:LoadAnimation(` — устаревшее (достаточно проверить: перед `LoadAnimation(` стоит `humanoid:` без учёта регистра).

:::starter
```lua
local function findDeprecated(code)
end
```
:::
:::test
```lua
local r = findDeprecated("wait(1) task.wait(2) spawn(f)")
assert(table.concat(r, ",") == "wait(,spawn(")
assert(#findDeprecated("task.wait(1) task.spawn(f) animator:LoadAnimation(a)") == 0)
local r2 = findDeprecated("local t = humanoid:LoadAnimation(a) local b = Instance.new('BodyVelocity')")
assert(table.concat(r2, ",") == "BodyVelocity,LoadAnimation(")
```
:::
:::hint
Для `wait(` проверяйте, что перед ним нет символа `.` или буквы/цифры. Используйте `%f[%w_.]` (граница слова) или искайте через `code:find("(.)wait%(")`.
:::
:::answer
```lua
local function findDeprecated(code)
  local found = {}

  local function standalone(name)
    -- ищем name как отдельный идентификатор: перед ним не буква/цифра/_/./:
    local init = 1
    while true do
      local s = code:find(name, init, true)
      if not s then return false end
      local prev = s > 1 and code:sub(s - 1, s - 1) or " "
      if not prev:match("[%w_%.:]") then return true end
      init = s + 1
    end
  end

  if standalone("wait(") then table.insert(found, "wait(") end
  if standalone("spawn(") then table.insert(found, "spawn(") end
  if standalone("delay(") then table.insert(found, "delay(") end
  if code:find("BodyVelocity", 1, true) then table.insert(found, "BodyVelocity") end
  if code:lower():find("humanoid:loadanimation(", 1, true) then table.insert(found, "LoadAnimation(") end
  if code:find("FindPartOnRay", 1, true) then table.insert(found, "FindPartOnRay") end
  if code:find("SetPrimaryPartCFrame", 1, true) then table.insert(found, "SetPrimaryPartCFrame") end
  return found
end
```
Такой простой «линтер» полезно добавить в CI, чтобы ловить устаревшие вызовы, которые генерирует ИИ.
:::
::::

## Проверьте себя

::::quiz
Что вернёт `workspace.Baseplate:IsA("BasePart")`, если Baseplate — `Part`?
- [x] `true`
- [ ] `false`
`IsA` учитывает наследование: `Part` → `BasePart`.
::::

::::quiz
Чем заменить `wait(1)` в новом коде?
- [x] `task.wait(1)`
- [ ] `sleep(1)`
- [ ] `os.wait(1)`
`task.wait` — актуальный планировщик.
::::
