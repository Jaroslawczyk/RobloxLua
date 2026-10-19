---
title: Область видимости и замыкания
section: lua
order: 9
summary: Где «живёт» переменная, затенение, upvalue, замыкания, фабрики функций и мемоизация.
time: 20
level: Средний
---

## Блоки и область видимости

Локальная переменная видна от места объявления до конца **блока** (`do … end`, тело функции, цикла или `if`).

```lua run
local x = 1
do
  local y = 2
  print(x, y)     -- 1 2
end
print(x, y)       -- 1 nil — y за пределами блока не существует
```

### Затенение (shadowing)

Внутренняя переменная с тем же именем **скрывает** внешнюю — это легальный, но опасный приём:

```lua run
local score = 10
do
  local score = 99
  print("внутри:", score)
end
print("снаружи:", score)
```

:::tip
Не заводите одноимённые переменные в соседних областях без нужды. Линтер Selene и анализатор Luau предупреждают о затенении (`shadowing`).
:::

## Замыкание (closure)

**Замыкание** — функция вместе с переменными из окружающей области (их называют *upvalue*), которые она «захватила». Эти переменные живут, пока жива функция.

```lua run
local function makeCounter()
  local count = 0            -- upvalue
  return function()
    count += 1
    return count
  end
end

local a = makeCounter()
local b = makeCounter()
print(a(), a(), a())   -- 1 2 3
print(b())             -- 1: у каждого счётчика своё состояние
```

Замыкания используются в Roblox постоянно: обработчики событий, `task.delay`, колбэки кнопок, `pcall(function() … end)`.

```lua
-- типичный пример в Roblox
local function connectButton(button, text)
  local clicks = 0
  button.Activated:Connect(function()
    clicks += 1
    print(text, clicks)
  end)
end
```

## Приватные данные через замыкание

```lua run
local function newAccount(initial)
  local balance = initial     -- снаружи недоступна напрямую

  return {
    deposit = function(x) balance += x end,
    withdraw = function(x)
      if x > balance then return false end
      balance -= x
      return true
    end,
    get = function() return balance end,
  }
end

local acc = newAccount(100)
acc.deposit(50)
print(acc.withdraw(500), acc.get())
```

## Фабрики и настраиваемое поведение

```lua run
local function multiplier(k)
  return function(x) return x * k end
end
local double, triple = multiplier(2), multiplier(3)
print(double(10), triple(10))
```

## Замыкания в циклах

В Lua каждая итерация цикла `for` создаёт **новую** локальную переменную, поэтому замыкания захватывают разные значения (в отличие от старого JavaScript с `var`):

```lua run
local fns = {}
for i = 1, 3 do
  fns[i] = function() return i end
end
print(fns[1](), fns[2](), fns[3]())   -- 1 2 3
```

## Мемоизация

Кэширование результатов дорогих чистых функций:

```lua run
local function memoize(fn)
  local cache = {}
  return function(n)
    local v = cache[n]
    if v == nil then
      v = fn(n)
      cache[n] = v
    end
    return v
  end
end

local calls = 0
local slowSquare = function(n) calls += 1; return n * n end
local fast = memoize(slowSquare)
print(fast(9), fast(9), fast(9), "вызовов:", calls)
```

## Глобальное окружение и _G

Имена без `local` попадают в глобальную таблицу окружения. В Roblox каждый скрипт имеет своё окружение, а общий для всех скриптов — таблица `_G` (и `shared`). Пользоваться ими не рекомендуется: передача данных между скриптами делается через **ModuleScript** и события.

:::warn Утечки через замыкания
Замыкание удерживает захваченные объекты в памяти. Подписка `part.Touched:Connect(function() … end)` держит ссылку на всё, что функция использует. Если объект больше не нужен — отключайте соединение (`:Disconnect()`) и обнуляйте ссылки. Подробнее — в разделе про события.
:::

## Задания

::::task easy Счётчик с шагом
Напишите `makeCounter(step)`, возвращающую функцию-счётчик, которая при каждом вызове увеличивает значение на `step` (начиная с 0) и возвращает его.

:::starter
```lua
local function makeCounter(step)
end
```
:::
:::test
```lua
local c = makeCounter(5)
assert(c() == 5 and c() == 10 and c() == 15)
local d = makeCounter(1)
assert(d() == 1)
```
:::
:::answer
```lua
local function makeCounter(step)
  local value = 0
  return function()
    value += step
    return value
  end
end
```
:::
::::

::::task mid Один раз
Напишите `once(fn)` — возвращает функцию, которая вызывает `fn` только при **первом** вызове; последующие вызовы возвращают тот же результат без повторного выполнения.

:::starter
```lua
local function once(fn)
end
```
:::
:::test
```lua
local n = 0
local f = once(function() n += 1; return "result" end)
assert(f() == "result" and f() == "result")
assert(n == 1, "функция вызвана " .. n .. " раз")
```
:::
:::answer
```lua
local function once(fn)
  local called = false
  local result
  return function(...)
    if not called then
      called = true
      result = fn(...)
    end
    return result
  end
end
```
Паттерн полезен для инициализации и защиты от повторных покупок/обработки.
:::
::::

::::task mid Ограничение частоты
Напишите `rateLimiter(maxCalls)`, возвращающую функцию `allow()`: она возвращает `true` для первых `maxCalls` вызовов и `false` для последующих (пока нет сброса — сброс не нужен в этом задании).

:::starter
```lua
local function rateLimiter(maxCalls)
end
```
:::
:::test
```lua
local allow = rateLimiter(2)
assert(allow() == true and allow() == true)
assert(allow() == false and allow() == false)
local other = rateLimiter(1)
assert(other() == true and other() == false)
```
:::
:::answer
```lua
local function rateLimiter(maxCalls)
  local used = 0
  return function()
    if used >= maxCalls then
      return false
    end
    used += 1
    return true
  end
end
```
В реальной игре такую проверку (с временным окном) делают для каждого `RemoteEvent` — защита от спама.
:::
::::

## Проверьте себя

::::quiz
Что выведет код: `local f; do local x = 5; f = function() return x end end; print(f())`?
- [x] `5`
- [ ] `nil`
- [ ] ошибку
Функция захватила `x` как upvalue; переменная остаётся жить, пока жива функция.
::::

::::quiz
Чем плохи глобальные переменные в скрипте?
- [ ] Их нельзя читать
- [x] Конфликты имён, труднее отлаживать, медленнее доступ
- [ ] Они запрещены в Roblox
Предпочитайте `local` и модули.
::::
