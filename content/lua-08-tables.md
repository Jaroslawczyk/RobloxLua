---
title: Таблицы: массивы и словари
section: lua
order: 8
summary: Единственная структура данных Lua: массивы, словари, вложенность, копирование, сортировка, стеки и очереди.
time: 30
level: Новичок
---

## Таблица — это всё

В Lua всего одна составная структура данных — **таблица** (`table`). Она работает и как массив, и как словарь, и как объект, и как множество.

```lua run
-- массив (индексы с 1)
local fruits = {"яблоко", "груша", "слива"}
print(fruits[1], #fruits)

-- словарь (ключ → значение)
local player = {name = "Ann", level = 5, ["is-vip"] = true}
print(player.name, player["level"], player["is-vip"])

-- смешанная таблица
local mixed = {10, 20, name = "mix"}
print(mixed[2], mixed.name)
```

`t.name` — сокращение для `t["name"]`. Ключом может быть что угодно, кроме `nil` и `NaN`: число, строка, функция, другая таблица, объект Roblox.

## Массивы: основные операции

```lua run
local t = {}
table.insert(t, "a")          -- в конец
table.insert(t, "b")
table.insert(t, 1, "start")   -- в позицию 1 (остальные сдвигаются)
print(table.concat(t, ", "))  -- start, a, b

local last = table.remove(t)  -- удалить и вернуть последний
local first = table.remove(t, 1)
print(last, first, #t)

t[#t + 1] = "c"               -- ещё один способ добавить
print(#t)
```

| Функция | Что делает | Сложность |
|---|---|---|
| `table.insert(t, v)` | добавить в конец | O(1) |
| `table.insert(t, i, v)` | вставить на позицию | O(n) |
| `table.remove(t)` | удалить последний | O(1) |
| `table.remove(t, i)` | удалить по индексу | O(n) |
| `table.sort(t, cmp)` | сортировка на месте | O(n log n) |
| `table.concat(t, sep)` | склеить в строку | |
| `table.unpack(t, i, j)` | элементы как значения | |
| `table.find(t, v)` | индекс значения (Luau) | O(n) |
| `table.clone(t)` | поверхностная копия (Luau) | |
| `table.clear(t)` | очистить (Luau) | |
| `table.freeze(t)` | сделать неизменяемой (Luau) | |
| `table.move(a, f, e, t, b)` | копировать диапазон | |
| `table.create(n, v)` | массив заранее нужного размера (Luau) | |

## Сортировка

```lua run
local scores = {50, 10, 80, 30}
table.sort(scores)                          -- по возрастанию
print(table.concat(scores, " "))

table.sort(scores, function(a, b) return a > b end)   -- по убыванию
print(table.concat(scores, " "))

local players = {
  {name = "A", score = 30},
  {name = "B", score = 90},
  {name = "C", score = 60},
}
table.sort(players, function(x, y) return x.score > y.score end)
for rank, p in ipairs(players) do print(rank, p.name, p.score) end
```

:::warn Функция сравнения должна быть «строгой»
Используйте `<` или `>`, а не `<=`/`>=`: при равных элементах `<=` может вызвать ошибку «invalid order function for sorting». Сортировка в Luau **не стабильна** — равные элементы могут поменяться местами.
:::

## Длина и «дырки»

Оператор `#` надёжен **только для последовательностей** (1…n без пропусков).

```lua run
local good = {1, 2, 3}
print(#good)
local bad = {1, 2, nil, 4}
print(#bad)   -- 4 или 2 — поведение не гарантировано!
```

:::danger Не ставьте nil в середину массива
`t[3] = nil` в середине массива ломает `#t` и `ipairs`. Для «удаления» элементов с сохранением индексов используйте `false`/специальный маркер или `table.remove`.
:::

## Словари и множества

```lua run
local inventory = {sword = 1, potion = 5}
inventory.potion += 2
inventory.shield = 1
inventory.sword = nil           -- удалить ключ

for item, count in pairs(inventory) do print(item, count) end

-- количество ключей (для словаря # не работает)
local n = 0
for _ in pairs(inventory) do n += 1 end
print("ключей:", n)

-- множество
local banned = {Ann = true, Bob = true}
print(banned["Ann"], banned["Zed"])
```

## Вложенные таблицы

```lua run
local game = {
  players = {
    {name = "Ann", items = {"sword", "bow"}},
    {name = "Bob", items = {}},
  },
  settings = {difficulty = "hard"},
}
print(game.players[1].items[2], game.settings.difficulty)
game.players[2].items[1] = "shield"
print(#game.players[2].items)
```

## Копирование: ссылка, поверхностная и глубокая

Таблицы передаются **по ссылке**:

```lua run
local a = {1, 2, 3}
local b = a            -- b — та же таблица!
b[1] = 99
print(a[1])            -- 99

local function shallowCopy(t)
  local c = {}
  for k, v in pairs(t) do c[k] = v end
  return c
end

local function deepCopy(t)
  if type(t) ~= "table" then return t end
  local c = {}
  for k, v in pairs(t) do c[deepCopy(k)] = deepCopy(v) end
  return setmetatable(c, getmetatable(t))
end

local nested = {list = {1, 2}}
local s = shallowCopy(nested)
local d = deepCopy(nested)
nested.list[1] = "X"
print(s.list[1], d.list[1])   -- X  1
```

В Studio вместо ручной копии есть `table.clone(t)` (поверхностная).

## Стек и очередь

```lua run
-- стек (LIFO)
local stack = {}
table.insert(stack, 1); table.insert(stack, 2)
print(table.remove(stack))      -- 2

-- очередь (FIFO) с двумя индексами — быстрее, чем table.remove(t, 1)
local Queue = {first = 1, last = 0, items = {}}
function Queue.push(q, v) q.last += 1; q.items[q.last] = v end
function Queue.pop(q)
  if q.first > q.last then return nil end
  local v = q.items[q.first]
  q.items[q.first] = nil
  q.first += 1
  return v
end
Queue.push(Queue, "a"); Queue.push(Queue, "b")
print(Queue.pop(Queue), Queue.pop(Queue), Queue.pop(Queue))
```

## Производительность

- Для массивов добавляйте в конец (`t[#t+1] = v`) — это быстро.
- Для поиска по значению часто лучше **словарь**, чем перебор массива.
- Не создавайте таблицы в горячем цикле (каждый кадр) без необходимости — давление на сборщик мусора.
- В Luau есть `table.create(n)` и `table.clone` для оптимизации.

## Задания

::::task easy Сумма и максимум массива
Напишите `summary(list)` — вернуть сумму и максимальный элемент. Для пустого массива — `0, nil`.

:::starter
```lua
local function summary(list)
end
```
:::
:::test
```lua
local s, m = summary({3, 9, 2})
assert(s == 14 and m == 9)
local s0, m0 = summary({})
assert(s0 == 0 and m0 == nil)
```
:::
:::answer
```lua
local function summary(list)
  local total, best = 0, nil
  for _, v in ipairs(list) do
    total += v
    if best == nil or v > best then
      best = v
    end
  end
  return total, best
end
```
:::
::::

::::task easy Частоты слов
Напишите `countWords(words)`, принимающую массив слов и возвращающую словарь `слово → сколько раз встретилось`.

:::starter
```lua
local function countWords(words)
end
```
:::
:::test
```lua
local r = countWords({"a", "b", "a", "c", "a"})
assert(r.a == 3 and r.b == 1 and r.c == 1 and r.d == nil)
```
:::
:::answer
```lua
local function countWords(words)
  local counts = {}
  for _, w in ipairs(words) do
    counts[w] = (counts[w] or 0) + 1
  end
  return counts
end
```
Идиома `(t[k] or 0) + 1` — основа подсчёта и накопления.
:::
::::

::::task mid Уникальные элементы
Напишите `unique(list)` — массив без повторов с сохранением порядка первого появления.

:::starter
```lua
local function unique(list)
end
```
:::
:::test
```lua
assert(table.concat(unique({1, 2, 1, 3, 2, 4}), ",") == "1,2,3,4")
assert(#unique({}) == 0)
```
:::
:::answer
```lua
local function unique(list)
  local seen, out = {}, {}
  for _, v in ipairs(list) do
    if not seen[v] then
      seen[v] = true
      table.insert(out, v)
    end
  end
  return out
end
```
:::
::::

::::task mid Топ игроков
Дан массив `{name, score}`. Напишите `top(players, n)` — вернуть массив имён `n` лучших игроков по убыванию очков (исходный массив не менять).

:::starter
```lua
local function top(players, n)
end
```
:::
:::test
```lua
local data = {{name="A", score=10}, {name="B", score=50}, {name="C", score=30}}
local r = top(data, 2)
assert(r[1] == "B" and r[2] == "C" and #r == 2)
assert(data[1].name == "A", "исходный массив изменён")
```
:::
:::hint
Сначала сделайте копию массива, потом `table.sort`, потом возьмите первые `n`.
:::
:::answer
```lua
local function top(players, n)
  local copy = {}
  for i, p in ipairs(players) do
    copy[i] = p
  end
  table.sort(copy, function(a, b)
    return a.score > b.score
  end)
  local names = {}
  for i = 1, math.min(n, #copy) do
    names[i] = copy[i].name
  end
  return names
end
```
:::
::::

::::task hard Группировка
Напишите `groupBy(list, keyFn)` — словарь `ключ → массив элементов`. Например `groupBy({1,2,3,4,5}, function(x) return x % 2 == 0 and "even" or "odd" end)`.

:::starter
```lua
local function groupBy(list, keyFn)
end
```
:::
:::test
```lua
local g = groupBy({1, 2, 3, 4, 5}, function(x) return x % 2 == 0 and "even" or "odd" end)
assert(#g.even == 2 and #g.odd == 3 and g.odd[3] == 5)
```
:::
:::answer
```lua
local function groupBy(list, keyFn)
  local groups = {}
  for _, item in ipairs(list) do
    local key = keyFn(item)
    if not groups[key] then
      groups[key] = {}
    end
    table.insert(groups[key], item)
  end
  return groups
end
```
:::
::::

## Проверьте себя

::::quiz
Что выведет `local a = {1} local b = a b[1] = 5 print(a[1])`?
- [ ] `1`
- [x] `5`
- [ ] ошибку
Таблицы — ссылочный тип: `b` и `a` указывают на один объект.
::::

::::quiz
Какой способ надёжно посчитать ключи в словаре?
- [ ] `#dict`
- [x] цикл `for _ in pairs(dict) do n += 1 end`
- [ ] `dict.length`
`#` работает только для массивов-последовательностей.
::::

::::quiz
Почему `table.sort(t, function(a,b) return a <= b end)` может упасть?
- [ ] Из-за типа данных
- [x] Функция сравнения должна быть строгой (`<`), иначе возможна ошибка invalid order function
- [ ] Сортировка не принимает функции
Используйте `<` или `>`.
::::
