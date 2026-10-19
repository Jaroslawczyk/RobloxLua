---
title: Функции
section: lua
order: 7
summary: Объявление, параметры, несколько возвращаемых значений, ..., функции как значения, рекурсия.
time: 25
level: Новичок
---

## Объявление и вызов

```lua run
local function add(a, b)
  return a + b
end

print(add(2, 3))

-- то же самое, функция как значение:
local mul = function(a, b) return a * b end
print(mul(4, 5))
```

Функции в Lua — **значения первого класса**: их можно хранить в переменных и таблицах, передавать как аргументы и возвращать из других функций.

:::tip Объявляйте local function
`local function f() end` позволяет функции вызывать саму себя (рекурсия). `local f = function() … end` — нет: внутри тела имя `f` ещё не создано.
:::

## Параметры

Лишние аргументы отбрасываются, недостающие становятся `nil`:

```lua run
local function show(a, b, c)
  print(a, b, c)
end
show(1)
show(1, 2, 3, 4)
```

Значения по умолчанию — через `or`:

```lua run
local function greet(name, greeting)
  greeting = greeting or "Привет"
  return greeting .. ", " .. (name or "друг") .. "!"
end
print(greet("Оля"), greet(nil, "Хай"))
```

## Несколько возвращаемых значений

```lua run
local function minMax(list)
  local lo, hi = list[1], list[1]
  for _, v in ipairs(list) do
    if v < lo then lo = v end
    if v > hi then hi = v end
  end
  return lo, hi
end

local a, b = minMax({5, 2, 9, 1})
print(a, b)
print((minMax({5, 2, 9})))   -- скобки оставляют только первое значение
```

Это основа идиом `pcall`, `string.find`, `Instance:WaitForChild` и многих других.

## Переменное число аргументов `...`

```lua run
local function sum(...)
  local total = 0
  for _, v in ipairs({...}) do
    total += v
  end
  return total, select("#", ...)   -- сумма и количество аргументов
end
print(sum(1, 2, 3, 4))

local packed = table.pack(1, nil, 3)
print(packed.n)       -- 3: корректно считает nil в середине
```

:::warn nil в `...`
`#{...}` и `ipairs({...})` ломаются, если среди аргументов есть `nil`. Используйте `select("#", ...)` или `table.pack(...)`.
:::

## Замыкания — коротко

Функция «запоминает» переменные из места, где была создана (подробнее в уроке 9):

```lua run
local function counter()
  local n = 0
  return function()
    n += 1
    return n
  end
end
local c = counter()
print(c(), c(), c())
```

## Функции высшего порядка

```lua run
local function map(list, fn)
  local out = {}
  for i, v in ipairs(list) do out[i] = fn(v) end
  return out
end

local function filter(list, pred)
  local out = {}
  for _, v in ipairs(list) do
    if pred(v) then table.insert(out, v) end
  end
  return out
end

local nums = {1, 2, 3, 4, 5, 6}
local squares = map(nums, function(x) return x * x end)
local evens = filter(nums, function(x) return x % 2 == 0 end)
print(table.concat(squares, ","), table.concat(evens, ","))
```

## Рекурсия

```lua run
local function factorial(n)
  if n <= 1 then return 1 end
  return n * factorial(n - 1)
end
print(factorial(10))

local function fib(n)
  if n < 2 then return n end
  return fib(n - 1) + fib(n - 2)
end
print(fib(15))
```

Глубокая рекурсия (десятки тысяч уровней) вызывает «stack overflow». Для длинных цепочек переписывайте в цикл или используйте хвостовой вызов `return f(x)`.

## Методы и двоеточие

`obj:method(a)` — то же, что `obj.method(obj, a)`: `:` автоматически передаёт объект первым параметром `self`.

```lua run
local account = {balance = 100}
function account:deposit(x)
  self.balance += x
end
account:deposit(50)
print(account.balance)
```

## Хорошие практики

- Функция делает **одну вещь** и называется глаголом: `calculateDamage`, `giveReward`.
- Предпочитайте **чистые функции** (результат зависит только от аргументов) — их легко тестировать.
- Проверяйте входные данные в начале («защитные условия»).
- Не изменяйте переданные таблицы без необходимости — или явно документируйте это.

## Задания

::::task easy Максимум из трёх
Напишите `max3(a, b, c)`.

:::starter
```lua
local function max3(a, b, c)
end
```
:::
:::test
```lua
assert(max3(1, 5, 3) == 5)
assert(max3(-1, -5, -3) == -1)
assert(max3(2, 2, 2) == 2)
```
:::
:::answer
```lua
local function max3(a, b, c)
  return math.max(a, b, c)
end
```
:::
::::

::::task mid Среднее и количество
Напишите `stats(...)`, которая принимает любое число чисел и возвращает **два** значения: среднее и количество. Для пустого вызова вернуть `0, 0`.

:::starter
```lua
local function stats(...)
end
```
:::
:::test
```lua
local avg, n = stats(2, 4, 6)
assert(avg == 4 and n == 3)
local a0, n0 = stats()
assert(a0 == 0 and n0 == 0)
```
:::
:::answer
```lua
local function stats(...)
  local n = select("#", ...)
  if n == 0 then
    return 0, 0
  end
  local total = 0
  for i = 1, n do
    total += (select(i, ...))
  end
  return total / n, n
end
```
:::
::::

::::task mid Составление функций
Напишите `compose(f, g)`, возвращающую функцию `x → f(g(x))`.

:::starter
```lua
local function compose(f, g)
end
```
:::
:::test
```lua
local inc = function(x) return x + 1 end
local dbl = function(x) return x * 2 end
assert(compose(inc, dbl)(5) == 11)
assert(compose(dbl, inc)(5) == 12)
```
:::
:::answer
```lua
local function compose(f, g)
  return function(x)
    return f(g(x))
  end
end
```
:::
::::

::::task hard Каррирование и частичное применение
Напишите `partial(fn, ...)`: возвращает новую функцию, которая вызывает `fn` с запомненными аргументами, а затем с новыми. Например `partial(add, 10)(5)` → `15`.

:::starter
```lua
local function partial(fn, ...)
end
```
:::
:::test
```lua
local function add3(a, b, c) return a + b + c end
assert(partial(add3, 1)(2, 3) == 6)
assert(partial(add3, 1, 2)(3) == 6)
assert(partial(add3)(1, 2, 3) == 6)
```
:::
:::hint
Сохраните запомненные аргументы в `table.pack(...)`, а в возвращаемой функции соберите новый список: запомненные + `...`.
:::
:::answer
```lua
local function partial(fn, ...)
  local saved = table.pack(...)
  return function(...)
    local args = {}
    for i = 1, saved.n do
      args[i] = saved[i]
    end
    local extra = table.pack(...)
    for i = 1, extra.n do
      args[saved.n + i] = extra[i]
    end
    return fn(table.unpack(args, 1, saved.n + extra.n))
  end
end
```
:::
::::

## Проверьте себя

::::quiz
Что выведет `local function f() return 1, 2 end print((f()))`?
- [x] `1`
- [ ] `1 2`
- [ ] `2`
Круглые скобки вокруг вызова оставляют только первое значение.
::::

::::quiz
В чём разница между `a.f(x)` и `a:f(x)`?
- [ ] Никакой
- [x] Во втором случае `a` автоматически передаётся первым аргументом как `self`
- [ ] Второй вариант работает только в Roblox
`a:f(x)` — сахар для `a.f(a, x)`.
::::
