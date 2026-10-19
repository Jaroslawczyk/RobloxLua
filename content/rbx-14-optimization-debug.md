---
title: Оптимизация и отладка
section: roblox
order: 14
summary: MicroProfiler, Script Profiler, память, StreamingEnabled, объектные пулы, сеть и частые источники лагов.
time: 30
level: Продвинутый
---

:::note Главное правило
Не оптимизируйте «на глаз». Сначала **измерьте** (профайлер/консоль), найдите узкое место, исправьте, измерьте снова.
:::

## Инструменты

| Инструмент | Показывает | Как открыть |
|---|---|---|
| **Output** | ошибки, warn, print | View → Output |
| **Developer Console** | лог, память, сеть, скрипты (в игре) | `F9` / чат `/console` |
| **MicroProfiler** | разбор кадра по миллисекундам | `Ctrl + F6` в игре |
| **Script Profiler** | какие функции жрут время CPU | Developer Console → Scripts |
| **Memory** (Dev Console) | потребление памяти по категориям | Dev Console → Memory |
| **Network** | трафик репликации | Dev Console → Network / Stats |
| **Script Analysis** | предупреждения анализатора | View → Script Analysis |
| **Debugger** | точки останова, Watch, Call Stack | клик слева от номера строки |
| **Performance Stats** | FPS, Ping, Memory, данные | включается в меню настроек игры (Settings → Performance Stats) |

Метки для профайлера:

```lua
debug.profilebegin("PetUpdate")
updatePets(dt)
debug.profileend()
```

## Типичные причины лагов (по убыванию частоты)

1. **Слишком много частей/сложная геометрия** на клиенте: тысячи `Part`, `MeshPart` с огромным числом треугольников. Лечится: `StreamingEnabled`, упрощение мешей, `CanCollide/CanTouch/CanQuery = false` где не нужно, `Anchored = true` для статики, объединение частей, LOD.
2. **Тяжёлые циклы по кадрам**: `RunService.Heartbeat/RenderStepped` с `GetDescendants()`, `FindFirstChild` по сотням объектов.
3. **Утечки памяти**: соединения без `Disconnect`, таблицы, которые только растут, `Instance` без `Destroy`.
4. **Лишняя репликация**: частое изменение свойств у множества объектов на сервере.
5. **Много эффектов**: тысячи частиц, света, `Beam/Trail`, `Decal`.
6. **Физика**: тысячи неякорных тел, сложные констрейнты.
7. **Большие `GetAsync/SetAsync`-блоки**, запросы в цикле.

## Как писать быстрый Luau

```lua
-- 1. Кэшируйте ссылки и глобалы в локальные переменные
local mathFloor, mathRandom = math.floor, math.random
local rayParams = RaycastParams.new()       -- создайте один раз, а не каждый кадр

-- 2. Не создавайте таблицы в горячем цикле
local reusable = {}
local function update(dt)
  table.clear(reusable)
  ...
end

-- 3. table.insert vs индекс — оба быстры; важнее не делать table.remove(t, 1) на больших массивах (O(n))

-- 4. Склейка строк — table.concat, а не `..` в цикле

-- 5. Используйте типизацию (--!strict + native codegen для горячих функций)
--!native
local function hot(a: number, b: number): number
  return a * b + 1
end
```

`--!native` включает нативную компиляцию (Luau Native Codegen) для вычислительно тяжёлого кода (математика, циклы по числам); не помогает коду, который в основном вызывает API движка.

## Пулы объектов

Создание/удаление сотен объектов в секунду (пули, монеты, эффекты) дорого. Держите пул заранее созданных и переиспользуйте:

```lua
local Pool = {}
Pool.__index = Pool

function Pool.new(template, size)
  local self = setmetatable({ _free = {}, _template = template }, Pool)
  for _ = 1, size do
    local obj = template:Clone()
    obj.Parent = nil
    table.insert(self._free, obj)
  end
  return self
end

function Pool:Get()
  return table.remove(self._free) or self._template:Clone()
end

function Pool:Release(obj)
  obj.Parent = nil
  table.insert(self._free, obj)
end
```

## Работа со StreamingEnabled

Подгружает только близкие части: снижает память и время входа; особенно важно для телефонов.

- Критичные объекты (`SpawnLocation`, важные модели) — `ModelStreamingMode = Persistent`.
- Клиент: `WaitForChild` с таймаутом, не предполагайте наличие далёких объектов.
- Для «видимых издалека» объектов (горы) — упрощённые LOD-модели.

## Оптимизация под телефоны

- Целевой ориентир — игра должна быть играбельна на недорогом смартфоне (≥ 30 FPS).
- Ограничивайте количество одновременно видимых частиц/светов, тени от точечных источников.
- Текстуры/`ImageLabel` — небольших размеров; избегайте огромных `UIGradient`/`UIStroke` в сотнях элементов.
- Проверяйте **Device Emulator** и реальные устройства.
- Проверяйте скорость загрузки: `ContentProvider:PreloadAsync` для критичных ассетов, `ReplicatedFirst` для экрана загрузки.

## Параллельный Luau

Для CPU-тяжёлых вычислений (процедурная генерация, много NPC-ИИ) — **Actors** и `task.desynchronize()`:

```lua
-- Script внутри Actor
task.desynchronize()
local result = heavyCompute(data)        -- параллельно на другом ядре
task.synchronize()
part.Position = result                   -- изменения Instance — только в последовательной фазе
```

Параллельные скрипты не могут менять большинство свойств `Instance` и не блокируют остальное.

## Отладка «по науке»

1. **Воспроизведите** баг стабильно (сценарий шагов).
2. **Сузьте** область: отключайте скрипты/части, ищите бисекцией.
3. **Логируйте** состояние перед и после подозрительного места (`print` с контекстом: `("[%s] %s"):format(player.Name, value)`).
4. Используйте **точки останова** и Watch.
5. **Исправьте причину**, а не симптом; добавьте проверку (`assert`), чтобы баг не вернулся.
6. Если баг в вашем ИИ-коде — отдавайте ИИ **точный текст ошибки + строку + 20 строк контекста**, а не «не работает» (см. раздел про ИИ).

## Чек-лист перед релизом

- [ ] Нет красных ошибок в Output при обычном прохождении игры
- [ ] FPS на среднем телефоне ≥ 30; память клиента < ~1 ГБ (ориентир)
- [ ] Нет роста памяти сервера при долгой сессии (проверка 30–60 мин)
- [ ] DataStore: сохранения проверены при перезаходе/закрытии
- [ ] Все RemoteEvent валидируют вход
- [ ] Время загрузки приемлемо (< 10–15 с)
- [ ] Настроены права, возрастной рейтинг, описание, иконка, миниатюры

## Задания

::::task mid Пул (чистый Lua)
Реализуйте `Pool.new(factory)` с `:Get()` (вернуть свободный объект или создать новый через `factory()`), `:Release(obj)` (вернуть в пул). Добавьте поле `created` — сколько объектов создано всего.

:::starter
```lua
local Pool = {}
Pool.__index = Pool
```
:::
:::test
```lua
local n = 0
local pool = Pool.new(function() n += 1; return {id = n} end)
local a = pool:Get()
local b = pool:Get()
assert(a.id == 1 and b.id == 2 and pool.created == 2)
pool:Release(a)
local c = pool:Get()
assert(c == a and pool.created == 2, "должен переиспользовать")
```
:::
:::answer
```lua
local Pool = {}
Pool.__index = Pool

function Pool.new(factory)
  return setmetatable({factory = factory, free = {}, created = 0}, Pool)
end

function Pool:Get()
  local obj = table.remove(self.free)
  if obj then
    return obj
  end
  self.created += 1
  return self.factory()
end

function Pool:Release(obj)
  table.insert(self.free, obj)
end
```
:::
::::

::::task mid Накопитель кадров (чистый Lua)
Напишите `makeThrottle(interval)`: возвращает `step(dt)`, которая накапливает `dt` и возвращает `true` не чаще, чем раз в `interval` секунд (и сбрасывает/вычитает накопленное). Применяется, чтобы тяжёлую логику в `Heartbeat` запускать, например, 4 раза в секунду.

:::starter
```lua
local function makeThrottle(interval)
end
```
:::
:::test
```lua
local step = makeThrottle(0.25)
local fired = 0
for _ = 1, 60 do          -- 60 кадров по 1/60 с = 1 секунда
  if step(1/60) then fired += 1 end
end
assert(fired == 4, "fired=" .. fired)
```
:::
:::answer
```lua
local function makeThrottle(interval)
  local acc = 0
  return function(dt)
    acc += dt
    if acc >= interval - 1e-9 then
      acc -= interval
      return true
    end
    return false
  end
end
```
Допуск `1e-9` защищает от накопления ошибок плавающей точки.
:::
::::

## Проверьте себя

::::quiz
Что делать, если в `Heartbeat` выполняется тяжёлая логика?
- [ ] Ничего: 60 раз в секунду нормально
- [x] Измерить, вынести в события или выполнять реже (throttle), кэшировать результаты
- [ ] Заменить на `while true do end`
Кадровый код должен быть лёгким.
::::

::::quiz
Какой инструмент покажет, какая функция скрипта съедает время CPU?
- [ ] Output
- [x] Script Profiler / MicroProfiler
- [ ] Toolbox
Профайлеры измеряют время выполнения; `print` — нет.
::::
