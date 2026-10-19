---
title: Физика, Raycast и пространственные запросы
section: roblox
order: 9
summary: Anchored/CanCollide, констрейнты, силы, Raycast, GetPartBoundsInBox, коллизии и PathfindingService.
time: 30
level: Средний
---

## Основы физики

Roblox симулирует физику автоматически: части падают, сталкиваются, катятся — если не `Anchored`.

| Свойство | Значение |
|---|---|
| `Anchored` | закреплена: не двигается физикой |
| `CanCollide` | сталкивается с другими частями |
| `CanTouch` | вызывает события `Touched` |
| `CanQuery` | попадает под `Raycast` и пространственные запросы |
| `Massless` | не добавляет массу сборке |
| `CustomPhysicalProperties` | плотность, трение, упругость |
| `AssemblyLinearVelocity` / `AssemblyAngularVelocity` | скорость сборки |

**Сборка (assembly)** — группа частей, соединённых сварками/шарнирами; физика считается для сборки целиком.

Силы и движение — современные объекты-констрейнты вместо старых `BodyVelocity/BodyForce/BodyPosition/BodyGyro` (deprecated):

| Нужно | Современный объект |
|---|---|
| задать скорость | `LinearVelocity` |
| тянуть к позиции | `AlignPosition` |
| поворачивать к ориентации | `AlignOrientation` |
| постоянная сила | `VectorForce` |
| вращение | `AngularVelocity`, `Torque` |
| пружина/верёвка | `SpringConstraint`, `RopeConstraint` |
| шарнир/мотор/дверь | `HingeConstraint`, `BallSocketConstraint`, `PrismaticConstraint` |
| мгновенный толчок | `part:ApplyImpulse(Vector3)` |

```lua
-- толчок вперёд
local root = character.HumanoidRootPart
root:ApplyImpulse(root.CFrame.LookVector * 500 * root.AssemblyMass)
```

## Raycast — луч в мире

Луч от точки в направлении (длина вектора = дальность). Возвращает `RaycastResult` или `nil`.

```lua
local origin = character.Head.Position
local direction = character.Head.CFrame.LookVector * 100

local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances = { character }       -- не попадать в самого себя
params.IgnoreWater = true

local result = workspace:Raycast(origin, direction, params)
if result then
  print(result.Instance, result.Position, result.Normal, result.Material, result.Distance)
else
  print("ничего не задето")
end
```

| Поле `RaycastResult` | Значение |
|---|---|
| `Instance` | задетая часть |
| `Position` | точка попадания |
| `Normal` | нормаль поверхности |
| `Material` | материал |
| `Distance` | расстояние от начала луча |

Применения: выстрелы hitscan, проверка «стоит ли на земле», линия видимости, размещение объектов на поверхности под курсором, камеры.

:::note Старые функции
`workspace:FindPartOnRay…` и `Ray.new` для запросов — устарели. Используйте `workspace:Raycast`. `FilterType.Blacklist/Whitelist` переименованы в `Exclude/Include`.
:::

### Луч от курсора мыши (клиент)

```lua
local UserInputService = game:GetService("UserInputService")
local camera = workspace.CurrentCamera

local function mouseWorldPosition()
  local pos = UserInputService:GetMouseLocation()
  local ray = camera:ViewportPointToRay(pos.X, pos.Y)
  local result = workspace:Raycast(ray.Origin, ray.Direction * 500)
  return result and result.Position
end
```

## Запросы по области

```lua
-- все части в объёме (замена Region3)
local params = OverlapParams.new()
params.FilterDescendantsInstances = { workspace.Map }
params.FilterType = Enum.RaycastFilterType.Include

local parts = workspace:GetPartBoundsInBox(CFrame.new(0, 5, 0), Vector3.new(20, 10, 20), params)
local near = workspace:GetPartBoundsInRadius(position, 15, params)
local touching = workspace:GetPartsInPart(somePart, params)

-- AoE-урон:
for _, p in ipairs(near) do
  local hum = p.Parent:FindFirstChildOfClass("Humanoid")
  if hum then hum:TakeDamage(20) end
end
```

:::tip Не хватает Touched?
Для урона по области, «мин» и зон лучше периодически вызывать `GetPartBoundsInRadius`/`GetPartsInPart` (каждые 0.1–0.25 с), чем полагаться на `Touched`: он срабатывает непредсказуемо и не срабатывает для «стоящих» частей.
:::

## Группы коллизий

Чтобы игроки не мешали друг другу или NPC проходили сквозь определённые объекты:

```lua
local PhysicsService = game:GetService("PhysicsService")

PhysicsService:RegisterCollisionGroup("Players")
PhysicsService:CollisionGroupSetCollidable("Players", "Players", false)

for _, part in ipairs(character:GetDescendants()) do
  if part:IsA("BasePart") then
    part.CollisionGroup = "Players"
  end
end
```

## Network Ownership

Сервер отдаёт управление физикой частей, на которые «наступил» игрок, его клиенту (плавность). Для объектов, которые влияют на экономику/результат (мячи, ловушки, транспорт на сервере):

```lua
part:SetNetworkOwner(nil)           -- владелец — сервер
print(part:GetNetworkOwner())
```

Читеры управляют физикой своих персонажей. Проверяйте на сервере: скорость, телепортации, расстояния.

## PathfindingService (NPC)

```lua
local PathfindingService = game:GetService("PathfindingService")

local path = PathfindingService:CreatePath({
  AgentRadius = 2, AgentHeight = 5, AgentCanJump = true,
})

local success = pcall(function()
  path:ComputeAsync(npcRoot.Position, targetPosition)
end)

if success and path.Status == Enum.PathStatus.Success then
  for _, waypoint in ipairs(path:GetWaypoints()) do
    npcHumanoid:MoveTo(waypoint.Position)
    if waypoint.Action == Enum.PathWaypointAction.Jump then
      npcHumanoid.Jump = true
    end
    npcHumanoid.MoveToFinished:Wait()
  end
end
```

Пересчитывайте путь, если цель сдвинулась; не вызывайте `ComputeAsync` для сотен NPC каждый кадр. Для простых случаев (преследование на открытой местности) достаточно `Humanoid:MoveTo(target)`.

## Задания

::::task easy Лучи в чистом Lua
Смоделируйте проверку «на земле»: есть поверхности `{y = высота}`; персонаж на высоте `feetY` «на земле», если ближайшая поверхность не выше `feetY` и расстояние ≤ `tolerance`. Напишите `isGrounded(surfaces, feetY, tolerance)`.

:::starter
```lua
local function isGrounded(surfaces, feetY, tolerance)
end
```
:::
:::test
```lua
local s = {{y = 0}, {y = 10}, {y = 5}}
assert(isGrounded(s, 5.2, 0.5) == true)
assert(isGrounded(s, 8, 0.5) == false)
assert(isGrounded(s, 9.9, 0.5) == false, "поверхность y=10 выше ног")
assert(isGrounded({}, 5, 1) == false)
```
:::
:::answer
```lua
local function isGrounded(surfaces, feetY, tolerance)
  local best = nil
  for _, s in ipairs(surfaces) do
    if s.y <= feetY and (best == nil or s.y > best) then
      best = s.y
    end
  end
  return best ~= nil and feetY - best <= tolerance
end
```
:::
::::

::::task mid Цели в радиусе (чистый Lua)
Напишите `inRadius(points, center, radius)` — вернуть имена точек `{name, x, z}`, лежащих не дальше `radius` от `center = {x, z}`, отсортированные по расстоянию (ближайшая первой).

:::starter
```lua
local function inRadius(points, center, radius)
end
```
:::
:::test
```lua
local pts = {
  {name = "A", x = 3, z = 4},
  {name = "B", x = 1, z = 1},
  {name = "C", x = 50, z = 50},
}
local r = inRadius(pts, {x = 0, z = 0}, 10)
assert(table.concat(r, ",") == "B,A")
assert(#inRadius(pts, {x = 0, z = 0}, 1) == 0)
```
:::
:::answer
```lua
local function inRadius(points, center, radius)
  local found = {}
  for _, p in ipairs(points) do
    local dx, dz = p.x - center.x, p.z - center.z
    local d = math.sqrt(dx * dx + dz * dz)
    if d <= radius then
      table.insert(found, {name = p.name, d = d})
    end
  end
  table.sort(found, function(a, b) return a.d < b.d end)
  local names = {}
  for i, f in ipairs(found) do names[i] = f.name end
  return names
end
```
:::
::::

## Проверьте себя

::::quiz
Чем заменить устаревшие `BodyVelocity` и `BodyPosition`?
- [ ] Ничем, они актуальны
- [x] `LinearVelocity` и `AlignPosition` (констрейнты)
- [ ] `Humanoid.WalkSpeed`
Body-объекты deprecated; современные констрейнты предсказуемее и лучше работают с физикой.
::::

::::quiz
Какой `FilterType` в `RaycastParams` нужен, чтобы луч игнорировал собственного персонажа?
- [ ] `Include` со списком персонажа
- [x] `Exclude` со списком `{ character }`
- [ ] Не нужно настраивать
`Exclude` исключает перечисленные объекты и их потомков.
::::
