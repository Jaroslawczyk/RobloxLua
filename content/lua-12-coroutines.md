---
title: Корутины и библиотека task
section: lua
order: 12
summary: Кооперативная многозадачность: coroutine, генераторы, а также task.spawn/defer/delay/wait в Roblox.
time: 25
level: Средний
---

## Что такое корутина

**Корутина** — функция, выполнение которой можно **приостановить** (`yield`) и позже **продолжить** (`resume`) с того же места. Это не отдельный поток ОС: в каждый момент работает только одна — они сотрудничают (кооперативная многозадачность).

```lua run
local co = coroutine.create(function(a, b)
  print("старт", a, b)
  local x = coroutine.yield(a + b)       -- пауза, отдаём наружу a+b
  print("получили", x)
  local y = coroutine.yield(x * 2)
  return "конец", y
end)

print(coroutine.resume(co, 1, 2))   -- true 3
print(coroutine.resume(co, 10))     -- true 20
print(coroutine.resume(co, "Z"))    -- true конец Z
print(coroutine.status(co))         -- dead
print(coroutine.resume(co))         -- false cannot resume dead coroutine
```

| Функция | Назначение |
|---|---|
| `coroutine.create(f)` | создать корутину (не запускает) |
| `coroutine.resume(co, ...)` | запустить / продолжить; возвращает `ok, значения…` |
| `coroutine.yield(...)` | приостановить; значения уходят в `resume` |
| `coroutine.status(co)` | `"suspended"`, `"running"`, `"normal"`, `"dead"` |
| `coroutine.wrap(f)` | функция-обёртка: вызов = `resume`, ошибки пробрасываются |
| `coroutine.isyieldable()` | можно ли сейчас `yield` |
| `coroutine.running()` | текущая корутина |
| `coroutine.close(co)` | закрыть приостановленную корутину |

## Генераторы

```lua run
local function range(from, to)
  return coroutine.wrap(function()
    for i = from, to do
      coroutine.yield(i)
    end
  end)
end

for n in range(1, 5) do print(n) end
```

Бесконечные последовательности, парсеры, пошаговые диалоги («реплика → ждём нажатия → следующая»), конечные автоматы — типичные применения.

## Библиотека task в Roblox

В Roblox корутины тесно связаны с **планировщиком**. Вместо ручного `coroutine.resume` используют `task`:

| Функция | Что делает |
|---|---|
| `task.spawn(f, ...)` | запускает `f` **немедленно** в новом потоке (до первого yield) |
| `task.defer(f, ...)` | запускает `f` **в конце текущего цикла** (после текущего кода) |
| `task.delay(t, f, ...)` | запускает `f` через `t` секунд |
| `task.wait(t)` | приостанавливает текущий поток на `t` сек (≈ 1 кадр по умолчанию); возвращает фактическое время |
| `task.cancel(thread)` | отменяет поток, созданный `spawn/defer/delay` |
| `task.synchronize()` / `task.desynchronize()` | переход между параллельной и последовательной фазой (Parallel Luau) |

```lua run
print("1. начало")

task.spawn(function()
  print("2. spawn: стартует сразу")
  task.wait(1)
  print("5. spawn: после ожидания")
end)

task.defer(function()
  print("4. defer: после текущего потока")
end)

task.delay(0.5, function() print("4.5 delay: через 0.5 с") end)

print("3. конец главного кода")
```

:::danger Не используйте устаревшие wait / spawn / delay
Глобальные `wait()`, `spawn()`, `delay()` — старые функции с неточным таймингом и троттлингом. В новом коде используйте только `task.wait`, `task.spawn`, `task.delay`. ИИ-ассистенты часто генерируют `wait()` — заменяйте.
:::

### Когда что использовать

- **`task.spawn`** — запустить параллельную «ветку», не блокируя текущую (например, обработчик, который долго ждёт).
- **`task.defer`** — отложить на конец кадра/цикла (безопасно изменять состояние после текущей обработки события).
- **`task.delay`** — «сделать через N секунд» (таймеры, эффекты, кулдауны).
- **`task.wait`** — пауза **внутри** потока (в цикле, ожидание готовности).

## Не блокируйте обработчики

События `Connect` выполняются каждое в своём потоке, но долгий код, не отдающий управление, тормозит кадр. Для ожидания внутри обработчика `task.wait` допустим.

```lua
-- Studio: Heartbeat вызывается каждый кадр — тут НЕЛЬЗЯ ждать долго
RunService.Heartbeat:Connect(function(dt)
  -- только лёгкие вычисления
end)

-- таймер: используйте delay или отдельный поток
task.spawn(function()
  while true do
    spawnWave()
    task.wait(30)
  end
end)
```

## Ошибки в потоках

Ошибка внутри `task.spawn`-потока не прерывает остальной код — она печатается в Output, а поток умирает. Если нужно обработать — оборачивайте тело в `pcall`.

```lua run
-- expect-error: ошибка потока будет показана в выводе
task.spawn(function()
  error("упал отдельный поток")
end)
print("основной поток продолжает работу")
```

## Параллельный Luau (кратко)

Для тяжёлых вычислений есть **Actors** и `task.desynchronize()`: код выполняется в нескольких потоках ЦПУ одновременно. Ограничения: нельзя менять `Instance` напрямую в параллельной фазе — нужно вернуться через `task.synchronize()`. Подробнее — в документации «Parallel Luau».

## Задания

::::task easy Генератор чётных
Напишите `evens(limit)`, возвращающую итератор чётных чисел от 2 до `limit` (через `coroutine.wrap`).

:::starter
```lua
local function evens(limit)
end
```
:::
:::test
```lua
local out = {}
for v in evens(10) do table.insert(out, v) end
assert(table.concat(out, ",") == "2,4,6,8,10")
```
:::
:::answer
```lua
local function evens(limit)
  return coroutine.wrap(function()
    for i = 2, limit, 2 do
      coroutine.yield(i)
    end
  end)
end
```
:::
::::

::::task mid Числа Фибоначчи лениво
Напишите `fibGen()`, возвращающую функцию-генератор: каждый вызов даёт следующее число Фибоначчи (0, 1, 1, 2, 3, 5, …).

:::starter
```lua
local function fibGen()
end
```
:::
:::test
```lua
local g = fibGen()
local out = {}
for i = 1, 10 do out[i] = g() end
assert(table.concat(out, ",") == "0,1,1,2,3,5,8,13,21,34")
```
:::
:::answer
```lua
local function fibGen()
  return coroutine.wrap(function()
    local a, b = 0, 1
    while true do
      coroutine.yield(a)
      a, b = b, a + b
    end
  end)
end
```
:::
::::

::::task mid Порядок выполнения
Что выведет программа, и в каком порядке? Запишите последовательность чисел в виде строки в переменную `order`, а затем запустите код, чтобы проверить.

```lua
print(1)
task.spawn(function() print(2); task.wait(); print(4) end)
print(3)
```

:::starter
```lua
local order = ""   -- например "1,2,3,4"
```
:::
:::test
```lua
assert(order == "1,2,3,4", "подумайте: spawn стартует сразу, wait отдаёт управление")
```
:::
:::answer
```lua
local order = "1,2,3,4"
```
`1` → `spawn` сразу печатает `2` и на `task.wait()` засыпает → главный поток печатает `3` → после ожидания печатается `4`.
:::
::::

## Проверьте себя

::::quiz
Чем `task.defer` отличается от `task.spawn`?
- [ ] Ничем
- [x] `spawn` запускает функцию сразу, `defer` — после завершения текущего потока в конце цикла
- [ ] `defer` ждёт 1 секунду
Выбор между ними влияет на порядок выполнения и на безопасность изменения состояния.
::::

::::quiz
Что нужно использовать вместо `wait(1)`?
- [x] `task.wait(1)`
- [ ] `sleep(1)`
- [ ] `os.wait(1)`
`task.wait` — актуальный и точный способ паузы.
::::
