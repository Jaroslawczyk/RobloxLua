---
title: Циклы
section: lua
order: 6
summary: while, repeat-until, числовой и обобщённый for, break и continue, типичные ошибки.
time: 20
level: Новичок
---

## Числовой for

`for i = начало, конец, шаг do … end` — шаг по умолчанию 1; конец включается.

```lua run
for i = 1, 5 do
  print("i =", i)
end

for i = 10, 0, -5 do print("вниз:", i) end
for x = 0, 1, 0.25 do print("дробный шаг:", x) end
```

:::note
Переменная цикла `i` — отдельная локальная переменная; изменять её внутри цикла не имеет смысла: следующий шаг возьмёт значение заново.
:::

## while и repeat-until

```lua run
local n = 1
while n < 100 do
  n *= 2
end
print("первая степень двойки >= 100:", n)

local tries = 0
repeat
  tries += 1
until tries >= 3           -- условие проверяется ПОСЛЕ тела
print("попыток:", tries)
```

`repeat … until` всегда выполнит тело хотя бы раз. Условие `until` видит локальные переменные тела.

:::danger Бесконечный цикл в Roblox
`while true do … end` **без `task.wait()`** внутри заморозит игру (скрипт будет «исчерпан по времени»). Любой бесконечный цикл должен что-то ждать:

```lua
while true do
  -- работа
  task.wait(1)
end
```
Никогда не используйте устаревшее `wait()` — только `task.wait()`.
:::

## Обобщённый for: ipairs и pairs

```lua run
local fruits = {"яблоко", "груша", "слива"}
for index, name in ipairs(fruits) do
  print(index, name)
end

local prices = {apple = 5, pear = 7, plum = 3}
for name, price in pairs(prices) do
  print(name, price)    -- порядок НЕ гарантирован!
end
```

| Итератор | Для чего | Порядок |
|---|---|---|
| `ipairs(t)` | массивы (ключи 1, 2, 3…) | по возрастанию; останавливается на первой «дырке» (`nil`) |
| `pairs(t)` | любые таблицы | не определён |
| `next, t` | то же, что `pairs` | |

:::tip Luau: можно без ipairs/pairs
В Studio допускается `for k, v in t do …` — обобщённая итерация по таблице. Но явные `ipairs`/`pairs` яснее показывают намерение (массив или словарь), так что команды часто их сохраняют.
:::

## break и continue

`break` выходит из цикла. **`continue`** (только Luau) переходит к следующей итерации.

```lua run
for i = 1, 10 do
  if i % 2 == 0 then
    -- чётные пропускаем (в Luau: continue)
  else
    if i > 7 then break end
    print(i)
  end
end
```

В Luau то же самое короче:

```lua
for i = 1, 10 do
  if i % 2 == 0 then continue end
  if i > 7 then break end
  print(i)
end
```

## Вложенные циклы

```lua run
for row = 1, 3 do
  local line = {}
  for col = 1, 3 do
    table.insert(line, row * col)
  end
  print(table.concat(line, " "))
end
```

## Типичные ошибки

:::warn
**1. Удаление элементов во время обхода.** `table.remove` внутри `for i = 1, #t` сдвигает индексы. Идите с конца: `for i = #t, 1, -1 do`.

**2. Изменение словаря при `pairs`.** Присваивать существующим ключам и удалять (`t[k] = nil`) безопасно, а **добавлять новые ключи** — нет.

**3. Ожидание порядка от `pairs`.** Нужен порядок — храните массив ключей и сортируйте.
:::

```lua run
local t = {1, 2, 3, 4, 5, 6}
for i = #t, 1, -1 do
  if t[i] % 2 == 0 then table.remove(t, i) end
end
print(table.concat(t, ","))   -- 1,3,5
```

## Задания

::::task easy Сумма чисел
Напишите `sumTo(n)` — сумма целых чисел от 1 до `n` (циклом).

:::starter
```lua
local function sumTo(n)
end
```
:::
:::test
```lua
assert(sumTo(1) == 1)
assert(sumTo(10) == 55)
assert(sumTo(100) == 5050)
assert(sumTo(0) == 0)
```
:::
:::answer
```lua
local function sumTo(n)
  local total = 0
  for i = 1, n do
    total += i
  end
  return total
end
```
(Формула `n * (n + 1) / 2` даст тот же результат мгновенно, но цикл тренирует базу.)
:::
::::

::::task easy Таблица умножения
Напишите `multiplicationRow(n)` — массив из `n * 1 … n * 10`.

:::starter
```lua
local function multiplicationRow(n)
end
```
:::
:::test
```lua
local r = multiplicationRow(3)
assert(#r == 10 and r[1] == 3 and r[10] == 30)
```
:::
:::answer
```lua
local function multiplicationRow(n)
  local row = {}
  for i = 1, 10 do
    row[i] = n * i
  end
  return row
end
```
:::
::::

::::task mid Простые числа
Напишите `primesUpTo(n)` — массив простых чисел от 2 до `n` включительно.

:::starter
```lua
local function primesUpTo(n)
end
```
:::
:::test
```lua
local p = primesUpTo(30)
assert(table.concat(p, ",") == "2,3,5,7,11,13,17,19,23,29")
assert(#primesUpTo(1) == 0)
```
:::
:::hint
Для каждого `k` проверяйте делители от 2 до `math.floor(math.sqrt(k))`. Если нашёлся делитель — число составное.
:::
:::answer
```lua
local function primesUpTo(n)
  local result = {}
  for k = 2, n do
    local isPrime = true
    for d = 2, math.floor(math.sqrt(k)) do
      if k % d == 0 then
        isPrime = false
        break
      end
    end
    if isPrime then
      table.insert(result, k)
    end
  end
  return result
end
```
:::
::::

::::task mid Первое повторение
Напишите `firstDuplicate(list)` — вернуть первый элемент, который встречается второй раз (при чтении слева направо), или `nil`.

:::starter
```lua
local function firstDuplicate(list)
end
```
:::
:::test
```lua
assert(firstDuplicate({1, 2, 3, 2, 1}) == 2)
assert(firstDuplicate({"a", "b", "a"}) == "a")
assert(firstDuplicate({1, 2, 3}) == nil)
```
:::
:::hint
Заведите таблицу `seen = {}`; ключ — элемент, значение — `true`.
:::
:::answer
```lua
local function firstDuplicate(list)
  local seen = {}
  for _, v in ipairs(list) do
    if seen[v] then
      return v
    end
    seen[v] = true
  end
  return nil
end
```
Это приём «множество через таблицу»: проверка `seen[v]` — O(1).
:::
::::

## Проверьте себя

::::quiz
Сколько раз выполнится тело `for i = 1, 10, 3 do … end`?
- [ ] 10
- [x] 4
- [ ] 3
Значения `i`: 1, 4, 7, 10 — четыре итерации.
::::

::::quiz
Что произойдёт при `while true do end` в скрипте Roblox?
- [ ] Ничего, игра продолжит работать
- [x] Скрипт зависнет и заблокирует игру: внутри цикла нужен `task.wait()`
- [ ] Цикл автоматически остановится через секунду
Цикл без ожидания не отдаёт управление планировщику.
::::

::::quiz
Какой итератор гарантирует порядок 1, 2, 3, …?
- [x] `ipairs`
- [ ] `pairs`
`pairs` порядок не гарантирует, `ipairs` идёт по возрастанию индексов.
::::
