---
title: Ошибки: error, assert, pcall
section: lua
order: 11
summary: Как создавать и ловить ошибки, объекты ошибок, повторные попытки, отладочный вывод и защитное программирование.
time: 25
level: Средний
---

## Виды ошибок

1. **Синтаксические** — код не запускается (`'then' expected`). Показываются сразу в редакторе.
2. **Ошибки выполнения** — `attempt to index nil with 'Name'`, `attempt to call a nil value`. Прерывают текущий скрипт/поток.
3. **Логические** — программа работает, но неправильно. Находятся тестами и отладкой.

## error и assert

```lua run
-- error(сообщение, уровень)
local function withdraw(balance, amount)
  if amount > balance then
    error("недостаточно средств", 2)   -- 2: ошибкой считать вызывающий код
  end
  return balance - amount
end

local ok, err = pcall(withdraw, 10, 50)
print(ok, err)

-- assert(условие, сообщение)
local function sqrt(x)
  assert(type(x) == "number" and x >= 0, "ожидалось неотрицательное число")
  return math.sqrt(x)
end
print(pcall(sqrt, -4))
print(pcall(sqrt, 16))
```

`assert(v, msg)` возвращает `v`, если оно истинно, иначе вызывает `error(msg)` — удобно для проверки входных данных.

## pcall — «защищённый вызов»

`pcall(f, ...)` вызывает `f` и **не даёт ошибке пробить стек**. Возвращает `true, результаты…` или `false, сообщение`.

```lua run
local ok, result = pcall(function()
  local t = nil
  return t.value          -- ошибка: индексирование nil
end)
print(ok)
print(result)
```

В Roblox `pcall` необходим для всего, что может упасть по внешним причинам:
- `DataStore:GetAsync / SetAsync / UpdateAsync` (сеть, лимиты);
- `MarketplaceService:GetProductInfo`;
- `HttpService:RequestAsync`;
- `TeleportService`, `SocialService` и др.

```lua
-- шаблон для DataStore (Studio)
local success, data = pcall(function()
  return store:GetAsync(key)
end)
if not success then
  warn("DataStore error:", data)
  return nil
end
```

## xpcall и traceback

`xpcall(f, handler, ...)` позволяет перехватить ошибку обработчиком до размотки стека — удобно получить трассировку:

```lua run
local function handler(err)
  return "ОШИБКА: " .. tostring(err)
end
local function risky() error("что-то сломалось") end
print(xpcall(risky, handler))
```

В Studio: `xpcall(f, function(e) return debug.traceback(e, 2) end)`.

## Объекты ошибок

В `error` можно передать **таблицу** — тогда обработчик получает структурированные данные, а не просто строку:

```lua run
local function fail(code, msg)
  error({code = code, message = msg}, 0)
end

local ok, e = pcall(fail, 404, "не найдено")
if not ok and type(e) == "table" then
  print("код", e.code, "сообщение", e.message)
end
```

Уровень `0` отключает добавление «файл:строка» к строковым сообщениям.

## Повторные попытки с задержкой (retry/backoff)

```lua run
local function retry(fn, attempts, delay)
  local lastErr
  for i = 1, attempts do
    local ok, result = pcall(fn)
    if ok then return true, result end
    lastErr = result
    task.wait(delay * 2 ^ (i - 1))    -- 1, 2, 4... секунды
  end
  return false, lastErr
end

local n = 0
local ok, res = retry(function()
  n += 1
  if n < 3 then error("сеть недоступна") end
  return "данные"
end, 5, 0.1)
print(ok, res, "попыток:", n)
```

Это основной приём для DataStore, HTTP и MemoryStore: лимиты запросов и сетевые сбои — норма.

## Паттерн «Result» без исключений

Для ожидаемых ошибок (неверный ввод, нет денег) удобнее возвращать `ok, значение_или_причина`, а `error` оставлять для «невозможных» ситуаций:

```lua run
local function buy(player, price)
  if player.coins < price then
    return false, "not_enough_coins"
  end
  player.coins -= price
  return true
end

local p = {coins = 30}
print(buy(p, 50))
print(buy(p, 20), p.coins)
```

## warn, print и отладка в Studio

| Инструмент | Применение |
|---|---|
| `print(...)` | быстрый вывод в Output |
| `warn(...)` | жёлтое предупреждение (заметнее) |
| `error(...)` | красная ошибка с трассировкой |
| `debug.traceback()` | строка со стеком вызовов |
| **Breakpoints** | точки останова: клик слева от номера строки |
| **Watch / Call Stack** | панели отладчика (View → Script Debugger) |
| `assert` | проверка инвариантов |
| **Script Analysis** | подсказки об ошибках до запуска |

## Защитное программирование

- Проверяйте **типы и диапазоны** данных, пришедших от клиента (RemoteEvent) — всегда.
- Не предполагайте, что объект уже существует: `WaitForChild` / `FindFirstChild`.
- Не ловите ошибки «молча»: логируйте `warn` с контекстом.
- Не оборачивайте в `pcall` весь код подряд — вы скроете настоящие баги; защищайте только то, что реально может упасть снаружи.

## Задания

::::task easy Безопасное деление
Напишите `safeDivide(a, b)`: если `b == 0` — вернуть `nil, "деление на ноль"`, иначе `a / b`.

:::starter
```lua
local function safeDivide(a, b)
end
```
:::
:::test
```lua
assert(safeDivide(10, 2) == 5)
local r, e = safeDivide(1, 0)
assert(r == nil and e == "деление на ноль")
```
:::
:::answer
```lua
local function safeDivide(a, b)
  if b == 0 then
    return nil, "деление на ноль"
  end
  return a / b
end
```
:::
::::

::::task mid Попытки до успеха
Напишите `tryUntil(fn, maxAttempts)`: вызывает `fn()` через `pcall` до `maxAttempts` раз; при первом успехе вернуть `true, результат`; если все попытки провалились — `false, последняя_ошибка`.

:::starter
```lua
local function tryUntil(fn, maxAttempts)
end
```
:::
:::test
```lua
local n = 0
local ok, v = tryUntil(function() n += 1; if n < 3 then error("fail" .. n, 0) end; return "ok" end, 5)
assert(ok == true and v == "ok" and n == 3)
local ok2, e2 = tryUntil(function() error("boom", 0) end, 2)
assert(ok2 == false and e2 == "boom")
```
:::
:::answer
```lua
local function tryUntil(fn, maxAttempts)
  local lastErr
  for _ = 1, maxAttempts do
    local ok, result = pcall(fn)
    if ok then
      return true, result
    end
    lastErr = result
  end
  return false, lastErr
end
```
:::
::::

::::task mid Валидация данных от клиента
Напишите `validatePurchase(request)`, где `request = {item = string, amount = number}`. Вернуть `false, "причина"` если: `request` не таблица (`"bad_request"`), `item` не непустая строка (`"bad_item"`), `amount` не целое число от 1 до 99 (`"bad_amount"`). Иначе `true`.

:::starter
```lua
local function validatePurchase(request)
end
```
:::
:::test
```lua
assert(validatePurchase({item = "sword", amount = 3}) == true)
local ok, why = validatePurchase(nil)
assert(ok == false and why == "bad_request")
ok, why = validatePurchase({item = "", amount = 1})
assert(why == "bad_item")
ok, why = validatePurchase({item = "x", amount = 0})
assert(why == "bad_amount")
ok, why = validatePurchase({item = "x", amount = 1.5})
assert(why == "bad_amount")
ok, why = validatePurchase({item = "x", amount = "9"})
assert(why == "bad_amount")
```
:::
:::answer
```lua
local function validatePurchase(request)
  if type(request) ~= "table" then
    return false, "bad_request"
  end
  if type(request.item) ~= "string" or request.item == "" then
    return false, "bad_item"
  end
  local a = request.amount
  if type(a) ~= "number" or a ~= math.floor(a) or a < 1 or a > 99 then
    return false, "bad_amount"
  end
  return true
end
```
Это ровно то, что нужно делать в обработчике `RemoteEvent.OnServerEvent` — клиенту доверять нельзя.
:::
::::

## Проверьте себя

::::quiz
Что вернёт `pcall(error, "x", 0)`?
- [ ] `true, "x"`
- [x] `false, "x"`
- [ ] `nil`
Первое значение `pcall` — признак успеха; при ошибке — `false` и сообщение.
::::

::::quiz
Какой код нужно обязательно оборачивать в `pcall` в Roblox?
- [ ] Арифметику
- [x] Вызовы DataStore и HTTP
- [ ] Объявление переменных
Любые сетевые/внешние вызовы могут завершиться ошибкой по причинам вне вашего контроля.
::::
