---
title: Модули и организация кода
section: lua
order: 13
summary: ModuleScript, require, кэширование, циклические зависимости и архитектура проекта.
time: 20
level: Средний
---

## Зачем модули

Когда проект вырастает за 200–300 строк, всё в одном скрипте превращается в кашу. **Модуль** — файл с повторно используемым кодом, который возвращает **одно значение** (обычно таблицу с функциями или класс).

В Roblox это объект **`ModuleScript`**: внутри — обычный Luau-код, в конце — `return`.

```lua
-- ReplicatedStorage/Shared/MathUtil (ModuleScript)
local MathUtil = {}

function MathUtil.clamp01(x)
  return math.clamp(x, 0, 1)
end

function MathUtil.lerp(a, b, t)
  return a + (b - a) * t
end

return MathUtil
```

```lua
-- любой Script / LocalScript
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local MathUtil = require(ReplicatedStorage.Shared.MathUtil)

print(MathUtil.lerp(0, 10, 0.5)) --> 5
```

## Как работает require

1. Первый `require(module)` **выполняет** код модуля и запоминает возвращённое значение.
2. Все последующие `require` того же модуля вернут **то же самое значение** (кэш) — код не выполняется повторно.
3. Модуль, выполнившийся на **сервере** и на **клиенте**, — это два независимых экземпляра (у каждой стороны своя копия).
4. Модуль должен вернуть **ровно одно значение** (иначе ошибка «Module code did not return exactly one value»). Лучший вариант — таблица или класс.

:::note Состояние в модуле
Поскольку результат кэшируется, модуль — удобное место для **общего состояния на одной стороне** (например, `Config` или `GameState`). Но состояние между сервером и клиентом нужно синхронизировать через `RemoteEvent` / атрибуты / `Value`-объекты.
:::

## Куда класть модули

| Место | Кто видит | Что хранить |
|---|---|---|
| `ReplicatedStorage` | сервер **и** клиент | общие константы, утилиты, типы, конфигурации |
| `ServerStorage` / `ServerScriptService` | только сервер | секретная логика, DataStore, экономика |
| `StarterPlayerScripts` / `StarterGui` | клиент | UI, камера, ввод |

:::danger Секреты — только на сервере
Всё, что лежит в `ReplicatedStorage` и клиентских контейнерах, можно прочитать читером. Цены, шансы выпадения, проверки и ключи API держите в `ServerStorage` / `ServerScriptService`.
:::

## Модуль как класс

```lua
-- ServerStorage/Classes/Pet (ModuleScript)
local Pet = {}
Pet.__index = Pet

function Pet.new(name, power)
  return setmetatable({Name = name, Power = power}, Pet)
end

function Pet:GetDamage()
  return self.Power * 2
end

return Pet
```

## Модуль-сервис (синглтон)

```lua
local CurrencyService = {}

local balances = {}   -- приватное состояние модуля

function CurrencyService.Get(player)
  return balances[player] or 0
end

function CurrencyService.Add(player, amount)
  balances[player] = (balances[player] or 0) + amount
end

return CurrencyService
```

## Циклические зависимости

Если `A` требует `B`, а `B` требует `A`, получите ошибку «requested module was required recursively». Как избежать:

1. **Вынесите общее** в третий модуль `C`, на который ссылаются оба.
2. Передавайте зависимость **параметром** функции/конструктора (внедрение зависимостей).
3. Делайте «ленивый» `require` внутри функции, а не на верхнем уровне.
4. Общайтесь **событиями** (`Signal`/`BindableEvent`) вместо прямых вызовов.

## Структура проекта (пример)

```text
ReplicatedStorage
├─ Shared
│  ├─ Config           (константы, цены — несекретные)
│  ├─ Types            (export type …)
│  └─ Util             (утилиты)
├─ Remotes             (RemoteEvent / RemoteFunction)
ServerScriptService
├─ Main                (Script — точка входа: подключает сервисы)
└─ Services
   ├─ DataService
   ├─ CurrencyService
   └─ ShopService
StarterPlayer
└─ StarterPlayerScripts
   ├─ Main               (LocalScript — точка входа клиента)
   └─ Controllers
      ├─ UIController
      └─ InputController
```

Скрипты-точки входа (`Main`) делают только одно: `require` сервисов и запуск их `Init/Start`. Логика живёт в модулях.

## Модули в обычном Lua (эмуляция в браузере)

Вне Roblox модуль — файл, а `require("имя")` ищет его по `package.path`. Тут нет файлов, но суть та же: функция возвращает таблицу.

```lua run
-- «модуль» как функция, которая вызывается один раз
local loaded = {}
local function fakeRequire(name, factory)
  if loaded[name] == nil then loaded[name] = factory() end
  return loaded[name]
end

local timesRun = 0
local function factory()
  timesRun += 1
  return {hello = function() return "привет из модуля" end}
end

local a = fakeRequire("greeter", factory)
local b = fakeRequire("greeter", factory)
print(a == b, timesRun, a.hello())
```

## Задания

::::task easy Модуль-утилита
Создайте таблицу `StringUtil` с функциями `trim(s)` (убрать пробелы по краям) и `startsWith(s, prefix)`.

:::starter
```lua
local StringUtil = {}

-- допишите функции

```
:::
:::test
```lua
assert(StringUtil.trim("  hi  ") == "hi")
assert(StringUtil.startsWith("hello", "he") == true)
assert(StringUtil.startsWith("hello", "lo") == false)
```
:::
:::answer
```lua
local StringUtil = {}

function StringUtil.trim(s)
  return (s:match("^%s*(.-)%s*$"))
end

function StringUtil.startsWith(s, prefix)
  return s:sub(1, #prefix) == prefix
end

-- в настоящем ModuleScript последней строкой: return StringUtil
```
:::
::::

::::task mid Сервис очков с событиями
Сделайте `ScoreService` с методами `Add(name, n)`, `Get(name)` и `OnChanged(callback)`: колбэк вызывается при каждом `Add` с аргументами `(name, newValue)`.

:::starter
```lua
local ScoreService = {}
```
:::
:::test
```lua
local log = {}
ScoreService.OnChanged(function(name, v) table.insert(log, name .. "=" .. v) end)
ScoreService.Add("A", 5)
ScoreService.Add("A", 3)
ScoreService.Add("B", 1)
assert(ScoreService.Get("A") == 8 and ScoreService.Get("B") == 1 and ScoreService.Get("Z") == 0)
assert(table.concat(log, ";") == "A=5;A=8;B=1")
```
:::
:::answer
```lua
local ScoreService = {}

local scores = {}
local listeners = {}

function ScoreService.Add(name, n)
  scores[name] = (scores[name] or 0) + n
  for _, cb in ipairs(listeners) do
    cb(name, scores[name])
  end
end

function ScoreService.Get(name)
  return scores[name] or 0
end

function ScoreService.OnChanged(cb)
  table.insert(listeners, cb)
end

-- в настоящем ModuleScript последней строкой: return ScoreService
```
Так устроены сигналы: список подписчиков и вызов их при изменении. В Roblox используйте `BindableEvent` или библиотеку Signal.
:::
::::

## Проверьте себя

::::quiz
Сколько раз выполнится код модуля при трёх вызовах `require` одного и того же ModuleScript на сервере?
- [ ] 3
- [x] 1
- [ ] 0
Результат кэшируется: код выполняется один раз, остальные `require` возвращают тот же объект.
::::

::::quiz
Где хранить цены и шансы выпадения предметов?
- [ ] В `ReplicatedStorage`, чтобы удобно читать
- [x] В `ServerStorage` / `ServerScriptService`, чтобы клиент не мог их узнать и подменить
- [ ] В `StarterGui`
Клиентский код читаем игроком; серверные модули — нет.
::::
