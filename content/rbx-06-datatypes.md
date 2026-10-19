---
title: Типы данных Roblox
section: roblox
order: 6
summary: Vector3, CFrame, Color3, UDim2, Enum, TweenInfo, Random, DateTime и другие встроенные типы с примерами.
time: 30
level: Средний
---

Типы Roblox — это значения (иммутабельные «структуры»), а не объекты `Instance`. Их создают конструкторами `Тип.new(...)` и хранят в свойствах. Их нельзя изменить «на месте»: `v.X = 5` — ошибка, нужно создать новое значение.

## Vector3 / Vector2

```lua
local a = Vector3.new(1, 2, 3)
local b = Vector3.new(4, 0, 1)

print(a + b, a - b, a * 2, a / 2, -a)
print(a.X, a.Y, a.Z)
print(a.Magnitude)                 -- длина вектора
print(a.Unit)                      -- единичный вектор того же направления
print(a:Dot(b), a:Cross(b))
print((a - b).Magnitude)           -- расстояние между точками
print(a:Lerp(b, 0.5))              -- линейная интерполяция
```

Константы: `Vector3.zero`, `Vector3.one`, `Vector3.xAxis`, `Vector3.yAxis`, `Vector3.zAxis`. `Vector2` — то же для 2D (экран, UI).

Расстояние до игрока:

```lua
local distance = (part.Position - character.HumanoidRootPart.Position).Magnitude
if distance < 10 then ... end
```

## CFrame — положение + поворот

`CFrame` хранит и позицию, и ориентацию в одном значении. Используется для частей, камеры и моделей.

```lua
local cf = CFrame.new(0, 10, 0)                              -- позиция
local look = CFrame.lookAt(Vector3.new(0, 5, 0), target)     -- встать в точку и смотреть на target
local rot = CFrame.Angles(0, math.rad(90), 0)                -- повороты в радианах (X, Y, Z)

local moved = part.CFrame * CFrame.new(0, 5, 0)              -- сместить на 5 вверх ОТНОСИТЕЛЬНО самой части
local rotated = part.CFrame * CFrame.Angles(0, math.rad(45), 0)

print(cf.Position, cf.LookVector, cf.RightVector, cf.UpVector)
print(cf:ToWorldSpace(offsetCf), cf:ToObjectSpace(worldCf))
```

| Выражение | Смысл |
|---|---|
| `cfA * cfB` | применить `cfB` в системе координат `cfA` (порядок важен!) |
| `cf + Vector3` | сдвиг в мировых координатах |
| `cf:Inverse()` | обратное преобразование |
| `cf:Lerp(other, t)` | плавное перемещение/поворот |
| `cf.Position`, `cf.LookVector` | позиция, направление «вперёд» |

:::tip Для моделей используйте PivotTo
`model:PivotTo(cf)` — современный способ переместить любую `Model`/часть вместе с потомками. Устаревшие `SetPrimaryPartCFrame`/`MoveTo` избегайте.
:::

## Color3 / BrickColor

```lua
Color3.fromRGB(255, 128, 0)         -- 0..255
Color3.new(1, 0.5, 0)               -- 0..1
Color3.fromHSV(0.6, 1, 1)           -- оттенок, насыщенность, яркость, 0..1
Color3.fromHex("#FF8800")

local c = Color3.fromRGB(10, 20, 30):Lerp(Color3.new(1, 1, 1), 0.5)
print(c.R, c.G, c.B)                -- компоненты 0..1
print(c:ToHex())
```

## UDim2 / UDim (интерфейс)

```lua
UDim2.new(0.5, 0, 0, 40)         -- X: 50% родителя + 0 px, Y: 0% + 40 px
UDim2.fromScale(0.5, 0.2)        -- только пропорции
UDim2.fromOffset(200, 50)        -- только пиксели
```

`Scale` — доля от размера родителя (0..1), `Offset` — пиксели. Для адаптивного UI используйте **Scale** и ограничения (`UIAspectRatioConstraint`, `UISizeConstraint`) — см. страницу про UI.

## Enum

Перечисления — именованные константы свойств:

```lua
part.Material = Enum.Material.Neon
part.Shape = Enum.PartType.Ball
humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
```

Обход всех значений: `for _, item in ipairs(Enum.Material:GetEnumItems()) do ... end`. У значения есть `.Name`, `.Value`.

## TweenInfo

```lua
local info = TweenInfo.new(
  1,                              -- Time
  Enum.EasingStyle.Quad,          -- EasingStyle
  Enum.EasingDirection.Out,       -- EasingDirection
  0,                              -- RepeatCount (−1 = бесконечно)
  false,                          -- Reverses
  0                               -- DelayTime
)
```

## Random

```lua
local rng = Random.new()           -- seed случайный
local rng2 = Random.new(42)        -- воспроизводимый
print(rng:NextInteger(1, 6))       -- включительно
print(rng:NextNumber())            -- 0..1
print(rng:NextNumber(5, 10))
print(rng:NextUnitVector())        -- случайное направление
local pick = items[rng:NextInteger(1, #items)]
```

## DateTime

```lua
local now = DateTime.now()
print(now.UnixTimestamp, now.UnixTimestampMillis)
print(now:FormatUniversalTime("YYYY-MM-DD HH:mm", "ru-ru"))
print(now:FormatLocalTime("LLL", "ru-ru"))

local t = DateTime.fromUnixTimestamp(1700000000)
```

Серверное время для кулдаунов и ежедневных наград: `os.time()` или `workspace:GetServerTimeNow()` (отсинхронизирован и на клиенте).

## Остальные типы

| Тип | Для чего |
|---|---|
| `Ray` / `RaycastResult` | лучи, попадания |
| `Region3` | область в мире (устаревает → `GetPartBoundsInBox`) |
| `Rect` | прямоугольник |
| `NumberRange` | диапазон (частицы) |
| `NumberSequence` / `ColorSequence` | кривая значения/цвета во времени (частицы, лучи) |
| `Font` | шрифт (`Font.new(...)`, `Font.fromEnum`) |
| `PhysicalProperties` | плотность, трение, упругость |
| `Axes` / `Faces` | наборы осей/граней |
| `Instance` | объект, а не значение |
| `RBXScriptSignal` / `RBXScriptConnection` | событие / подписка |
| `buffer` | двоичные данные |

## Задания

::::task easy Расстояние (чистый Lua)
В чистом Lua нет `Vector3`, поэтому смоделируйте: напишите `distance(a, b)` для таблиц `{x, y, z}`.

:::starter
```lua
local function distance(a, b)
end
```
:::
:::test
```lua
assert(distance({x=0,y=0,z=0}, {x=3,y=4,z=0}) == 5)
assert(distance({x=1,y=1,z=1}, {x=1,y=1,z=1}) == 0)
assert(math.abs(distance({x=0,y=0,z=0}, {x=1,y=1,z=1}) - math.sqrt(3)) < 1e-9)
```
:::
:::answer
```lua
local function distance(a, b)
  local dx, dy, dz = a.x - b.x, a.y - b.y, a.z - b.z
  return math.sqrt(dx * dx + dy * dy + dz * dz)
end
```
В Studio: `(a - b).Magnitude`.
:::
::::

::::task mid Интерполяция цвета (чистый Lua)
Напишите `lerpColor(c1, c2, t)` для цветов `{r, g, b}` (0–255): линейная интерполяция, результат округлить до целого (`math.floor(x + 0.5)`).

:::starter
```lua
local function lerpColor(c1, c2, t)
end
```
:::
:::test
```lua
local r = lerpColor({r=0,g=0,b=0}, {r=255,g=100,b=50}, 0.5)
assert(r.r == 128 and r.g == 50 and r.b == 25)
local s = lerpColor({r=10,g=10,b=10}, {r=20,g=20,b=20}, 0)
assert(s.r == 10 and s.g == 10 and s.b == 10)
local e = lerpColor({r=10,g=10,b=10}, {r=20,g=20,b=20}, 1)
assert(e.r == 20)
```
:::
:::answer
```lua
local function lerpColor(c1, c2, t)
  local function mix(a, b)
    return math.floor(a + (b - a) * t + 0.5)
  end
  return {r = mix(c1.r, c2.r), g = mix(c1.g, c2.g), b = mix(c1.b, c2.b)}
end
```
В Studio: `Color3:Lerp`.
:::
::::

::::task mid Размещение «по кругу»
Напишите `circlePositions(n, radius)`, возвращающую `n` точек `{x, z}` на окружности радиуса `radius` с центром в начале координат (первая точка — `radius, 0`).

:::starter
```lua
local function circlePositions(n, radius)
end
```
:::
:::test
```lua
local p = circlePositions(4, 10)
assert(#p == 4)
assert(math.abs(p[1].x - 10) < 1e-9 and math.abs(p[1].z) < 1e-9)
assert(math.abs(p[2].x) < 1e-9 and math.abs(p[2].z - 10) < 1e-9)
assert(math.abs(p[3].x + 10) < 1e-9)
```
:::
:::answer
```lua
local function circlePositions(n, radius)
  local result = {}
  for i = 0, n - 1 do
    local angle = (i / n) * 2 * math.pi
    result[#result + 1] = {x = math.cos(angle) * radius, z = math.sin(angle) * radius}
  end
  return result
end
```
Так расставляют питомцев вокруг игрока, враги по волнам, декорации.
:::
::::

## Проверьте себя

::::quiz
Как правильно сместить деталь на 5 стадов вверх относительно её поворота?
- [ ] `part.Position.Y += 5`
- [x] `part.CFrame = part.CFrame * CFrame.new(0, 5, 0)`
- [ ] `part.Position = 5`
`Position` — значение `Vector3`, его компоненты нельзя изменять по отдельности; сдвиг в локальных осях выполняется умножением `CFrame`.
::::

::::quiz
Что означает `UDim2.new(0.5, 0, 0, 40)`?
- [ ] 50 px по X и 40% по Y
- [x] X: 50% ширины родителя, Y: 40 пикселей
- [ ] Ширина 0.5 px, высота 40 px
Порядок: `(ScaleX, OffsetX, ScaleY, OffsetY)`.
::::
