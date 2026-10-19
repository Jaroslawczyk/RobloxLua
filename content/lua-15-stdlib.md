---
title: Стандартные библиотеки (шпаргалка)
section: lua
order: 15
summary: string, table, math, os, utf8, bit32, buffer, coroutine, debug — что есть в Luau и как это использовать.
time: 25
level: Средний
---

Эта страница — компактный справочник по тому, что доступно «из коробки» в Luau. Подробные описания — на [luau.org/library](https://luau.org/library) и в [Roblox Docs](https://create.roblox.com/docs/reference/engine/libraries).

## Глобальные функции

| Функция | Назначение |
|---|---|
| `print(...)`, `warn(...)`, `error(msg, level)` | вывод и ошибки |
| `assert(v, msg)` | проверка условия |
| `type(v)`, `typeof(v)` | тип значения (`typeof` понимает типы Roblox) |
| `tostring(v)`, `tonumber(s, base)` | преобразования |
| `pairs`, `ipairs`, `next` | итерация |
| `select(n, ...)`, `unpack` / `table.unpack` | работа с `...` |
| `pcall`, `xpcall` | защищённые вызовы |
| `setmetatable`, `getmetatable`, `rawget`, `rawset`, `rawequal`, `rawlen` | метатаблицы |
| `require(module)` | подключение ModuleScript (Roblox) |
| `tick()`, `time()`, `os.clock()`, `os.time()` | время (используйте `os.clock()` для замеров и `os.time()` для дат; `tick` устарел) |

## string

```lua run
print(string.rep("ab", 3, "-"))             -- ab-ab-ab
print(("Hello"):byte(1, 3))                  -- 72 101 108
print(string.char(72, 105))                  -- Hi
print(("a,b,,c"):split(","))                 -- таблица (Luau)
print(("%d%%"):format(50))                   -- 50%
print(("CamelCaseText"):gsub("%u", function(c) return "_" .. c:lower() end))
print(("one two"):find("two"))               -- 5 7
```

## table

```lua run
local t = {5, 3, 8, 1}
table.sort(t)
print(table.concat(t, ","))
print(table.unpack({1, 2, 3}))
print(select("#", table.unpack({1, 2, 3})))
local m = table.move({1, 2, 3}, 1, 3, 2, {9})   -- копирует [1..3] → позиции 2.. в целевой таблице
print(table.concat(m, ","))
print(table.find({"a", "b", "c"}, "b"))          -- 2
local c = table.clone({1, 2})
c[1] = 100
print(c[1])
```

В Studio также: `table.freeze`, `table.isfrozen`, `table.create(n, value)`, `table.clear`.

## math

| Группа | Функции |
|---|---|
| Округление | `floor`, `ceil`, `round` |
| Границы | `min`, `max`, `clamp`, `abs`, `sign` |
| Степени | `sqrt`, `pow`, `exp`, `log(x, base)`, `log10` |
| Тригонометрия | `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `rad`, `deg` |
| Случайность | `random`, `randomseed`, `noise(x, y, z)` |
| Константы | `pi`, `huge` |
| Прочее | `fmod`, `modf`, `lerp`, `frexp`, `ldexp` |

```lua run
print(math.fmod(7, 3), math.modf(3.75))
print(math.deg(math.pi), math.rad(180))
print(math.max(table.unpack({3, 9, 4})))
```

## os

```lua
print(os.time())                       -- секунды Unix
print(os.date("%Y-%m-%d %H:%M", os.time()))    -- в Roblox: локальное или UTC ("!%Y-...")
print(os.date("!*t", os.time()).year)  -- таблица с полями year, month, day, hour, min, sec...
print(os.clock())                      -- процессорное время для профилирования
```

:::tip Для игровой логики времени
Используйте `os.time()` (или `workspace:GetServerTimeNow()` / `DateTime.now()`) — это серверное время. Для кулдаунов и сохранений не доверяйте клиентским часам.
:::

## utf8

```lua run
local s = "Привет!"
print(utf8.len(s), #s)
print(utf8.char(1055, 1088))                       -- Пр
for p, c in utf8.codes("Яд") do print(p, c) end   -- позиция, код
print(utf8.codepoint("Я"))
print(s:sub(1, utf8.offset(s, 4) - 1))             -- первые 3 символа
```

## bit32 (битовые операции)

```lua run
print(bit32.band(12, 10), bit32.bor(12, 10), bit32.bxor(12, 10))
print(bit32.lshift(1, 4), bit32.rshift(256, 4), bit32.bnot(0))
```

Применения: флаги прав/настроек (`local FLAG_VIP = 1; local FLAG_MUTED = 2`), компактное хранение булевых значений, хэши.

## buffer (Luau)

Тип `buffer` — быстрый массив байтов фиксированного размера для сетевых протоколов и компактного хранения:

```lua
local buf = buffer.create(16)
buffer.writeu8(buf, 0, 255)
buffer.writeu32(buf, 4, 123456)
buffer.writef32(buf, 8, 3.14)
print(buffer.readu8(buf, 0), buffer.readu32(buf, 4), buffer.readf32(buf, 8))
print(buffer.len(buf))
```

## coroutine и debug

Корутины — урок 12. `debug.traceback(msg, level)` — стек вызовов в строке; `debug.profilebegin("Имя")` / `debug.profileend()` — метки для MicroProfiler (Roblox).

## Что **нет** в Luau (по сравнению с «обычным» Lua)

| Отсутствует | Альтернатива |
|---|---|
| `io`, `file` | нет файловой системы; хранение — DataStore |
| `os.execute`, `os.getenv` | недоступно (песочница) |
| `load`, `loadstring` | по умолчанию выключены (`ServerScriptService.LoadStringEnabled` — не включайте без веской причины: риск безопасности) |
| `goto` | `continue`, `break`, функции |
| Целочисленный тип | только `number` (double); для битов — `bit32` |
| `dofile`, `require("file")` | `require(ModuleScript)` |

## Задания

::::task easy Заголовок слов
Напишите `titleCase(s)` — первая буква каждого слова заглавная (латиница): `"hello big world"` → `"Hello Big World"`.

:::starter
```lua
local function titleCase(s)
end
```
:::
:::test
```lua
assert(titleCase("hello big world") == "Hello Big World")
assert(titleCase("a") == "A")
assert(titleCase("") == "")
```
:::
:::answer
```lua
local function titleCase(s)
  return (s:gsub("(%a)([%w_']*)", function(first, rest)
    return first:upper() .. rest
  end))
end
```
:::
::::

::::task mid Флаги прав через биты
Реализуйте `hasFlag(flags, flag)` и `addFlag(flags, flag)`, используя `bit32`. Флаги: `1`, `2`, `4`, `8`.

:::starter
```lua
local function hasFlag(flags, flag)
end

local function addFlag(flags, flag)
end
```
:::
:::test
```lua
local f = 0
f = addFlag(f, 2)
f = addFlag(f, 8)
assert(f == 10)
assert(hasFlag(f, 2) == true and hasFlag(f, 8) == true and hasFlag(f, 4) == false)
assert(addFlag(f, 2) == 10)
```
:::
:::answer
```lua
local function hasFlag(flags, flag)
  return bit32.band(flags, flag) ~= 0
end

local function addFlag(flags, flag)
  return bit32.bor(flags, flag)
end
```
:::
::::

::::task mid Разбор CSV-строки
Напишите `parseCsvLine(line)`: разделяет по запятым, обрезает пробелы по краям каждого поля: `"a, b ,c"` → `{"a","b","c"}`.

:::starter
```lua
local function parseCsvLine(line)
end
```
:::
:::test
```lua
local r = parseCsvLine("a, b ,c")
assert(#r == 3 and r[1] == "a" and r[2] == "b" and r[3] == "c")
assert(#parseCsvLine("x") == 1)
```
:::
:::answer
```lua
local function parseCsvLine(line)
  local out = {}
  for _, field in ipairs(line:split(",")) do
    table.insert(out, (field:match("^%s*(.-)%s*$")))
  end
  return out
end
```
:::
::::

## Проверьте себя

::::quiz
Чем в Roblox лучше заменить `tick()`?
- [ ] `time()`
- [x] `os.clock()` для замеров, `os.time()` / `DateTime.now()` для календарного времени
- [ ] `wait()`
`tick` объявлен устаревшим. Для длительностей — `os.clock()`, для даты — `os.time()` или `DateTime`.
::::

::::quiz
Есть ли в Roblox доступ к файловой системе игрока через `io`?
- [ ] Да
- [x] Нет: песочница запрещает; данные сохраняются через DataStore
- [ ] Только в Studio
Библиотеки `io` и большая часть `os` в Luau недоступны.
::::
