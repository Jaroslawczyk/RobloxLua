---
title: Шпаргалка по Luau (синтаксис на одной странице)
section: tools
order: 4
summary: Компактная сводка синтаксиса Lua/Luau: переменные, операторы, управление потоком, функции, таблицы, ООП, ошибки, типы.
time: 10
level: Для всех
---

## Базовое

```lua
local x = 10                    -- локальная переменная
local a, b = 1, 2               -- несколько значений
-- комментарий     --[[ многострочный ]]
print(type(x), typeof(x))       -- "number"
x += 1                          -- Luau: += -= *= /= //= %= ^= ..=
```

## Типы

`nil`, `boolean`, `number`, `string`, `table`, `function`, `thread`, `userdata` (+ `vector`, `buffer` в Luau). Ложь: только `nil` и `false`.

## Операторы

```text
+  -  *  /  //  %  ^        арифметика (// — целочисленное деление, ^ — степень)
== ~= < > <= >=             сравнение (~= — «не равно»)
and  or  not                логика (возвращают операнды)
..                          склейка строк
#t                          длина строки/массива
```

## Условия и циклы

```lua
if a > b then ... elseif a == b then ... else ... end

for i = 1, 10, 2 do ... end           -- шаг 2
for i, v in ipairs(arr) do ... end    -- массивы
for k, v in pairs(dict) do ... end    -- словари
while cond do ... end
repeat ... until cond
break      continue                   -- continue — Luau
local r = if cond then "a" else "b"   -- Luau: if-выражение
```

## Функции

```lua
local function add(a, b) return a + b end
local f = function(...) return select("#", ...), ... end
local t = {n = 1}
function t:method(x) return self.n + x end    -- t:method(2)
```

## Строки

```lua
#s   s:upper()   s:lower()   s:sub(i, j)   s:find(p, i, true)
s:match(p)   s:gmatch(p)   s:gsub(p, r)   s:rep(n)   s:split(",")
string.format("%d %s %.2f %05d", 1, "a", 3.14159, 42)
`Привет, {name}!`            -- Luau: интерполяция
```

## Таблицы

```lua
local arr = {1, 2, 3}                local d = {a = 1, ["b c"] = 2}
table.insert(arr, v)  table.insert(arr, i, v)  table.remove(arr, i)
table.sort(arr, function(x, y) return x > y end)
table.concat(arr, ",")  table.find(arr, v)  table.clone(t)  table.freeze(t)
table.unpack(arr)   table.pack(...)   #arr
```

## Метатаблицы и классы

```lua
local C = {}  C.__index = C
function C.new(x) return setmetatable({x = x}, C) end
function C:get() return self.x end
-- метаметоды: __index __newindex __call __tostring __eq __lt __le __add __len __concat __iter
```

## Ошибки

```lua
local ok, result = pcall(fn, args)    -- ok = true/false
error("msg", 2)    assert(cond, "msg")    warn("...")
xpcall(fn, function(e) return debug.traceback(e, 2) end)
```

## Корутины и task

```lua
task.spawn(f, ...)   task.defer(f)   task.delay(2, f)   task.wait(1)   task.cancel(th)
local co = coroutine.wrap(function() coroutine.yield(1) end)
```

## Типы (Luau)

```lua
--!strict
local n: number = 1                     local s: string? = nil
type Item = { Id: string, Price: number }
type Fn = (number, number) -> number
local function f<T>(x: T): T return x end
export type Pet = typeof(setmetatable({} :: { Name: string }, Pet))
local part = workspace:FindFirstChild("A") :: BasePart?
```

## Roblox: самое частое

```lua
local Players = game:GetService("Players")
local part = Instance.new("Part")  part.Anchored = true  part.Parent = workspace
part.Touched:Connect(function(hit) end)
Players.PlayerAdded:Connect(function(player) end)
remote:FireServer(x)   remote.OnServerEvent:Connect(function(player, x) end)
workspace:Raycast(origin, direction, params)
TweenService:Create(obj, TweenInfo.new(1), {Position = Vector3.new(0, 10, 0)}):Play()
```

## Запреты (устарело)

`wait()` `spawn()` `delay()` `BodyVelocity` `Humanoid:LoadAnimation` `FindPartOnRay` `SetPrimaryPartCFrame` `Instance.new(class, parent)` `InvokeClient`.
