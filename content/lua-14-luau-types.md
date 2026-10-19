---
title: Luau: типы и строгий режим
section: lua
order: 14
summary: Аннотации типов, --!strict, union, optional, generics, export type и как это снижает число багов (и ошибок ИИ).
time: 30
level: Продвинутый
---

## Зачем типы

Luau — язык с **постепенной типизацией**: код работает и без аннотаций, но с ними Studio подсвечивает ошибки *до запуска* и даёт точное автодополнение. Это самый дешёвый способ сократить баги — а ещё помогает ИИ-ассистентам: типы — компактный и точный контекст.

:::note Типы не влияют на выполнение
Аннотации проверяются только анализатором (Script Analysis). Во время игры они не исполняются и не защищают от неверных данных, пришедших из сети — там нужна runtime-проверка.
:::

## Режимы проверки

Первой строкой файла:

| Директива | Режим |
|---|---|
| `--!nocheck` | проверка выключена |
| `--!nonstrict` | по умолчанию: проверяются только аннотированные места |
| `--!strict` | строгий: выводятся и проверяются все типы |

Для нового кода рекомендуется `--!strict`.

## Базовые аннотации

```lua
--!strict

local health: number = 100
local name: string = "Ann"
local alive: boolean = true
local maybe: string? = nil          -- ? — «или nil» (optional)

local function heal(hp: number, amount: number): number
  return math.min(hp + amount, 100)
end

local function greet(name: string?): string
  return "Hi, " .. (name or "guest")
end
```

Примитивы: `number`, `string`, `boolean`, `nil`, `any`, `unknown`, `never`, а также типы движка: `Instance`, `Player`, `BasePart`, `Vector3`, `CFrame`, `Color3`, `RBXScriptSignal`, `RBXScriptConnection`, `thread`.

## Типы таблиц

```lua
--!strict

-- словарь с известной структурой
type PlayerData = {
  Coins: number,
  Level: number,
  Inventory: { string },        -- массив строк
  Settings: { [string]: boolean }, -- словарь строка → boolean
}

local data: PlayerData = {
  Coins = 0,
  Level = 1,
  Inventory = {},
  Settings = { Music = true },
}

local function addCoins(d: PlayerData, n: number)
  d.Coins += n
end
```

| Запись | Смысл |
|---|---|
| `{ number }` | массив чисел |
| `{ [string]: number }` | словарь |
| `{ Name: string, Age: number }` | «структура» |
| `{ read Name: string }` | поле только для чтения |

## Union, intersection, литералы

```lua
--!strict
type Rarity = "Common" | "Rare" | "Epic" | "Legendary"   -- строковые литералы
type Id = number | string                                  -- union

local function color(r: Rarity): string
  if r == "Common" then return "gray"
  elseif r == "Rare" then return "blue"
  elseif r == "Epic" then return "purple"
  end
  return "gold"
end

color("Rare")       -- ok
-- color("Mythic")  -- ОШИБКА: такого литерала нет в Rarity
```

Литеральные типы заменяют «магические строки» и ловят опечатки.

## Типы функций

```lua
--!strict
type Callback = (player: Player, amount: number) -> ()
type Predicate<T> = (T) -> boolean

local function onReward(cb: Callback) end
```

## Generics

```lua
--!strict
local function first<T>(list: { T }): T?
  return list[1]
end

local n = first({ 1, 2, 3 })        -- number?
local s = first({ "a", "b" })       -- string?
```

## type и export type

```lua
-- ReplicatedStorage/Shared/Types (ModuleScript)
export type Item = {
  Id: string,
  Name: string,
  Price: number,
}

return {}
```

```lua
-- в другом модуле
local Types = require(game.ReplicatedStorage.Shared.Types)
local item: Types.Item = { Id = "sword", Name = "Меч", Price = 100 }
```

## Сужение типов (refinement)

```lua
--!strict
local function f(x: string | number)
  if typeof(x) == "string" then
    return x:upper()      -- здесь анализатор знает: x — string
  else
    return x + 1          -- а здесь number
  end
end

local part: BasePart? = workspace:FindFirstChild("Door") :: BasePart?
if part then
  part.Anchored = true     -- внутри if часть уже не nil
end
```

## Приведение :: и any

`value :: Type` — «поверьте, это именно этот тип» (используйте экономно). `any` отключает проверку для значения — не злоупотребляйте.

```lua
local door = workspace:WaitForChild("Door") :: Model
local humanoid = character:FindFirstChildOfClass("Humanoid") -- уже Humanoid?
```

## Типизированный класс

```lua
--!strict
local Pet = {}
Pet.__index = Pet

export type Pet = typeof(setmetatable({} :: {
  Name: string,
  Power: number,
}, Pet))

function Pet.new(name: string, power: number): Pet
  return setmetatable({ Name = name, Power = power }, Pet)
end

function Pet.GetDamage(self: Pet): number
  return self.Power * 2
end

return Pet
```

## Как типы помогают в работе с ИИ

- Модель видит точные **сигнатуры**, а не гадает — меньше выдуманных полей.
- Анализатор мгновенно показывает, где ИИ ошибся (неверное имя метода, `nil`-доступ).
- Короткий файл `Types.lua` с `export type` — компактный «контракт» проекта, который можно вставлять в промпт.

## Задания

::::task easy Аннотируйте функцию
Какие аннотации типов нужно добавить, чтобы функция принимала строку и число и возвращала строку? Запишите сигнатуру в переменную-строку `signature`.

```lua
local function repeatText(text, times) ... end
```

:::starter
```lua
local signature = ""
```
:::
:::test
```lua
assert(signature:find("text: string", 1, true), "укажите text: string")
assert(signature:find("times: number", 1, true), "укажите times: number")
assert(signature:find("): string", 1, true), "укажите возвращаемый тип")
```
:::
:::answer
```lua
local signature = "local function repeatText(text: string, times: number): string"
```
:::
::::

::::task mid Опишите тип данных игрока
Опишите (устно/в заметке) тип `PlayerData` для сохранений: монеты (число), уровень (число), питомцы (массив строк), настройки (словарь «строка → boolean»), дата последнего входа (число или `nil`). Запишите определение в строку `definition`.

:::starter
```lua
local definition = ""
```
:::
:::test
```lua
assert(definition:find("type PlayerData", 1, true))
assert(definition:find("{ string }", 1, true) or definition:find("{string}", 1, true))
assert(definition:find("[string]: boolean", 1, true))
assert(definition:find("number?", 1, true))
```
:::
:::answer
```lua
local definition = [[
type PlayerData = {
  Coins: number,
  Level: number,
  Pets: { string },
  Settings: { [string]: boolean },
  LastLogin: number?,
}
]]
```
:::
::::

## Проверьте себя

::::quiz
Что означает `string?` в аннотации?
- [ ] Необязательная ошибка
- [x] Значение типа `string` или `nil`
- [ ] Любая строка, включая пустую
`T?` — сокращение для `T | nil`.
::::

::::quiz
Защищают ли аннотации типов от неверных данных из RemoteEvent во время игры?
- [ ] Да, Roblox проверяет типы в рантайме
- [x] Нет, типы проверяются только анализатором; данные от клиента нужно валидировать вручную
- [ ] Только в режиме `--!strict`
Типы стираются при выполнении. Валидация входных данных — ваша обязанность.
::::
