---
title: Стиль кода, идиомы и итоговый проект
section: lua
order: 16
summary: Как писать чисто и безопасно, типичные антипаттерны, чек-лист ревью и финальная практика на Lua.
time: 40
level: Средний
---

## Именование (принято в сообществе Roblox)

| Что | Стиль | Пример |
|---|---|---|
| Локальные переменные, параметры | `camelCase` | `playerData`, `walkSpeed` |
| Функции | `camelCase` (локальные), `PascalCase` (публичные методы модулей/классов в Roblox-стиле) | `calculateDamage`, `Pet:GetPower()` |
| Классы, модули, типы | `PascalCase` | `InventoryService`, `PlayerData` |
| Константы | `UPPER_SNAKE_CASE` | `MAX_PETS`, `DEFAULT_SPEED` |
| Приватные поля | `_camelCase` | `_cache` |
| Булевы | с `is/has/can` | `isAlive`, `hasPass` |
| События/сигналы | глагол в прошедшем времени | `Died`, `CoinsChanged` |

Свойства и методы **движка Roblox** уже в `PascalCase` (`Part.Anchored`, `Players:GetPlayers()`), и ваш публичный API полезно делать в том же стиле — единообразно.

## Форматирование

- Отступ — табы или 2/4 пробела; **выберите один стиль для проекта**.
- Автоформатирование: **StyLua** (конфиг `stylua.toml`), линтер: **Selene**; в VS Code — расширение *Luau Language Server*.
- Максимальная длина строки ≈ 100–120 символов.
- Пустая строка между логическими блоками; одна функция — одна ответственность.

## Идиомы

```lua
-- Значение по умолчанию
local speed = config.speed or 16

-- Защитное условие
if not player then return end

-- Таблица вместо цепочки if
local damage = DAMAGE_BY_TYPE[kind] or 0

-- Безопасный доступ
local name = player and player.Name

-- Множество
local isAdmin = ADMINS[player.UserId] == true

-- Обмен
a, b = b, a

-- Накопление строки через table.concat, а не `..` в цикле
local parts = {}
for i = 1, 100 do parts[#parts + 1] = tostring(i) end
local s = table.concat(parts, ",")
```

## Антипаттерны

| Антипаттерн | Почему плохо | Как лучше |
|---|---|---|
| Глобальные переменные | конфликты, медленно | `local` |
| `wait()`, `spawn()`, `delay()` | устарели | `task.wait/spawn/delay` |
| `while true do` без `task.wait` | зависание | `task.wait` или события |
| Опрос состояния в цикле | нагрузка | события (`Changed`, `Touched`, сигналы) |
| Магические числа и строки | ошибки при правке | константы, `type` литералы |
| Копипаста | баги в N местах | функция/модуль |
| Доверие клиенту | читы | проверки на сервере |
| Ловить ошибки молча | скрытые баги | `warn` + контекст |
| `Instance.new("Part", parent)` с родителем в аргументе | медленнее (лишние события) | задать свойства, затем `Parent` |
| Глубокая вложенность | не читается | ранние `return`/`continue`, функции |

## Чек-лист ревью кода

- [ ] Все переменные `local`, нет утечек в `_G`
- [ ] Проверены `nil` и типы входных данных
- [ ] Нет бесконечных циклов без ожидания
- [ ] События отключаются (`Disconnect`) / используются `Maid`, `Destroy`
- [ ] Работа с сетью/DataStore обёрнута в `pcall` и ретраи
- [ ] Серверная логика не доверяет клиенту
- [ ] Нет устаревших API (`wait`, `BodyVelocity`, `Humanoid.Health` без проверок и т.п.)
- [ ] Имена говорящие, функции короткие
- [ ] Типы указаны (`--!strict`) в ключевых модулях
- [ ] Есть тест/сценарий проверки

## Итоговый мини-проект: система инвентаря

Соберите всё из курса: таблицы, функции, метатаблицы, ошибки, замыкания. Это чистый Lua — запускается здесь, а позже подключается в игру.

::::task mid Часть 1. Класс Inventory
Класс `Inventory.new(capacity)`: `:add(name, count)` возвращает `true` или `false, причина` (`"full"` если предметов в сумме станет больше ёмкости, `"bad_count"` если `count` — не целое положительное); `:remove(name, count)` аналогично (`"not_enough"`); `:count(name)`; `:total()` — общее число предметов.

:::starter
```lua
local Inventory = {}
Inventory.__index = Inventory

function Inventory.new(capacity)
end
```
:::
:::test
```lua
local inv = Inventory.new(10)
assert(inv:add("potion", 3) == true)
assert(inv:add("sword", 1) == true)
local ok, why = inv:add("potion", 7)
assert(ok == false and why == "full")
ok, why = inv:add("x", 0)
assert(ok == false and why == "bad_count")
ok, why = inv:add("x", 1.5)
assert(why == "bad_count")
assert(inv:count("potion") == 3 and inv:total() == 4)
assert(inv:remove("potion", 2) == true and inv:count("potion") == 1)
ok, why = inv:remove("potion", 5)
assert(ok == false and why == "not_enough")
assert(inv:remove("potion", 1) == true and inv:count("potion") == 0)
assert(inv:total() == 1)
```
:::
:::hint
Храните `self.items = {}` и `self.capacity`, `total` можно пересчитывать суммой или хранить отдельным полем и обновлять.
:::
:::answer
```lua
local Inventory = {}
Inventory.__index = Inventory

function Inventory.new(capacity)
  return setmetatable({capacity = capacity, items = {}, _total = 0}, Inventory)
end

local function validCount(n)
  return type(n) == "number" and n >= 1 and n == math.floor(n)
end

function Inventory:add(name, count)
  if not validCount(count) then
    return false, "bad_count"
  end
  if self._total + count > self.capacity then
    return false, "full"
  end
  self.items[name] = (self.items[name] or 0) + count
  self._total += count
  return true
end

function Inventory:remove(name, count)
  if not validCount(count) then
    return false, "bad_count"
  end
  local have = self.items[name] or 0
  if have < count then
    return false, "not_enough"
  end
  local left = have - count
  self.items[name] = left > 0 and left or nil
  self._total -= count
  return true
end

function Inventory:count(name)
  return self.items[name] or 0
end

function Inventory:total()
  return self._total
end
```
:::
::::

::::task hard Часть 2. События и сериализация
Добавьте к инвентарю: `:onChanged(callback)` — колбэк `(name, newCount)` вызывается после каждого успешного `add/remove`; `:serialize()` — вернуть строку `"имя=число;имя=число"` с **отсортированными по имени** предметами; `Inventory.deserialize(str, capacity)` — восстановить инвентарь.

:::starter
```lua
local Inventory = {}
Inventory.__index = Inventory

function Inventory.new(capacity)
  return setmetatable({capacity = capacity, items = {}, _total = 0, _listeners = {}}, Inventory)
end

function Inventory:add(name, count)
  if self._total + count > self.capacity then return false, "full" end
  self.items[name] = (self.items[name] or 0) + count
  self._total += count
  return true
end

function Inventory:count(name) return self.items[name] or 0 end

-- допишите onChanged, serialize, deserialize и вызов колбэков из add
```
:::
:::test
```lua
local inv = Inventory.new(100)
local log = {}
inv:onChanged(function(name, n) table.insert(log, name .. ":" .. n) end)
inv:add("sword", 1)
inv:add("apple", 5)
inv:add("apple", 2)
assert(table.concat(log, ",") == "sword:1,apple:5,apple:7")
assert(inv:serialize() == "apple=7;sword=1")
local copy = Inventory.deserialize("apple=7;sword=1", 100)
assert(copy:count("apple") == 7 and copy:count("sword") == 1)
assert(Inventory.deserialize("", 10):count("x") == 0)
```
:::
:::answer
```lua
local Inventory = {}
Inventory.__index = Inventory

function Inventory.new(capacity)
  return setmetatable({capacity = capacity, items = {}, _total = 0, _listeners = {}}, Inventory)
end

function Inventory:onChanged(cb)
  table.insert(self._listeners, cb)
end

function Inventory:_fire(name)
  for _, cb in ipairs(self._listeners) do
    cb(name, self.items[name] or 0)
  end
end

function Inventory:add(name, count)
  if self._total + count > self.capacity then return false, "full" end
  self.items[name] = (self.items[name] or 0) + count
  self._total += count
  self:_fire(name)
  return true
end

function Inventory:count(name) return self.items[name] or 0 end

function Inventory:serialize()
  local names = {}
  for name in pairs(self.items) do
    table.insert(names, name)
  end
  table.sort(names)
  local parts = {}
  for _, name in ipairs(names) do
    table.insert(parts, name .. "=" .. self.items[name])
  end
  return table.concat(parts, ";")
end

function Inventory.deserialize(str, capacity)
  local inv = Inventory.new(capacity)
  for name, count in str:gmatch("([^=;]+)=(%d+)") do
    inv:add(name, tonumber(count))
  end
  return inv
end
```
Так устроено сохранение в DataStore: в базу кладут простые данные (таблицы/строки), а классы восстанавливают при загрузке.
:::
::::

## Что дальше

Вы закончили базу языка. Следующий этап — **Roblox Studio**: те же конструкции, но с миром вокруг. Переходите к [[rbx-01-studio]] и возвращайтесь к этому курсу как к справочнику.

## Проверьте себя

::::quiz
Какая константа названа по принятому стилю?
- [ ] `maxPets`
- [x] `MAX_PETS`
- [ ] `Max_pets`
Константы пишут `UPPER_SNAKE_CASE`.
::::

::::quiz
Почему для склейки множества строк лучше `table.concat`, чем `..` в цикле?
- [ ] Это короче
- [x] `..` создаёт новую строку на каждой итерации (O(n²) копирования), а `table.concat` склеивает за один проход
- [ ] `..` не работает в циклах
Для сотен и тысяч фрагментов разница заметна.
::::
