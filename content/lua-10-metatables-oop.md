---
title: Метатаблицы и ООП
section: lua
order: 10
summary: setmetatable, __index, классы, методы, наследование, перегрузка операторов и шаблон класса для Roblox.
time: 35
level: Средний
---

## Метатаблица — «настройки поведения» таблицы

У любой таблицы может быть **метатаблица**: набор правил, что делать при операциях, которых у самой таблицы нет (чтение отсутствующего ключа, сложение, вызов как функции и т.д.).

```lua run
local defaults = {color = "red", size = 10}
local obj = setmetatable({}, {__index = defaults})

print(obj.color, obj.size)    -- red 10  (взято из defaults)
obj.color = "blue"
print(obj.color, defaults.color)   -- blue red  (запись идёт в obj)
```

`setmetatable(t, mt)` возвращает `t`. `getmetatable(t)` вернёт `mt`.

## Основные метаметоды

| Метаметод | Когда срабатывает |
|---|---|
| `__index` | чтение отсутствующего ключа (таблица или функция) |
| `__newindex` | запись нового ключа |
| `__call` | вызов таблицы как функции `t(...)` |
| `__tostring` | `tostring(t)` / `print(t)` |
| `__len` | оператор `#` |
| `__eq`, `__lt`, `__le` | `==`, `<`, `<=` |
| `__add`, `__sub`, `__mul`, `__div`, `__mod`, `__pow`, `__unm`, `__idiv` | арифметика |
| `__concat` | `..` |
| `__iter` | пользовательский обход в `for … in` (Luau) |
| `__metatable` | защита метатаблицы от `getmetatable/setmetatable` |
| `__mode` | слабые ссылки (`"k"`, `"v"`, `"kv"`) |

```lua run
local Vec = {}
Vec.__index = Vec

local function new(x, y) return setmetatable({x = x, y = y}, Vec) end

Vec.__add = function(a, b) return new(a.x + b.x, a.y + b.y) end
Vec.__eq = function(a, b) return a.x == b.x and a.y == b.y end
Vec.__tostring = function(v) return "(" .. v.x .. ", " .. v.y .. ")" end
Vec.__len = function(v) return 2 end

local a, b = new(1, 2), new(3, 4)
print(tostring(a + b), a + b == new(4, 6), #a)
```

## Классы: стандартный шаблон

Lua не имеет `class`, но ООП строится на таблицах:

```lua run
local Animal = {}
Animal.__index = Animal            -- методы ищутся в самом классе

function Animal.new(name, sound)
  local self = setmetatable({}, Animal)
  self.name = name
  self.sound = sound
  return self
end

function Animal:speak()            -- : добавляет параметр self
  return self.name .. " говорит " .. self.sound
end

local cat = Animal.new("Мурка", "мяу")
print(cat:speak())
```

Как это работает: `cat:speak()` → у `cat` нет ключа `speak` → смотрим `getmetatable(cat).__index` (то есть `Animal`) → нашли функцию → вызываем с `cat` как `self`.

## Наследование

```lua run
local Animal = {}
Animal.__index = Animal
function Animal.new(name)
  return setmetatable({name = name}, Animal)
end
function Animal:describe() return "Животное " .. self.name end

local Dog = setmetatable({}, {__index = Animal})   -- Dog наследует Animal
Dog.__index = Dog

function Dog.new(name)
  local self = Animal.new(name)    -- создаём «базовую часть»
  setmetatable(self, Dog)          -- и переключаем на класс Dog
  self.tricks = {}
  return self
end

function Dog:describe()            -- переопределение
  return "Пёс " .. self.name .. " знает " .. #self.tricks .. " трюков"
end
function Dog:learn(t) table.insert(self.tricks, t) end

local d = Dog.new("Рекс")
d:learn("сидеть")
print(d:describe())
print(Animal.describe(d))          -- вызов метода базового класса
```

:::tip Композиция лучше наследования
В играх обычно выгоднее собирать объекты из компонентов («у игрока есть `Health`, `Inventory`, `Stats`»), чем строить глубокие иерархии. Глубина наследования ≤ 2 уровня — разумное правило.
:::

## Приватные поля

Настоящей приватности нет. Договорённости:
1. Имя с подчёркиванием `_cache` — «не трогать снаружи».
2. Хранение данных в замыкании или в таблице-«сейфе» по ключу `self`.

```lua run
local Wallet = {}
Wallet.__index = Wallet
local balances = setmetatable({}, {__mode = "k"})  -- слабые ключи: нет утечек

function Wallet.new(x)
  local self = setmetatable({}, Wallet)
  balances[self] = x
  return self
end
function Wallet:get() return balances[self] end
function Wallet:add(x) balances[self] += x end

local w = Wallet.new(10)
w:add(5)
print(w:get(), w.balance)   -- 15 nil
```

## Контроль доступа: __newindex

```lua run
local function readonly(t)
  return setmetatable({}, {
    __index = t,
    __newindex = function(_, key)
      error("поле '" .. tostring(key) .. "' доступно только для чтения", 2)
    end,
    __len = function() return #t end,
  })
end

local config = readonly({speed = 10})
print(config.speed)
local ok, err = pcall(function() config.speed = 99 end)
print(ok, err)
```

В Luau для этого есть `table.freeze(t)`.

## Шаблон класса с типами (Roblox / Luau)

В настоящих проектах классы описывают с типами и `export type` — линтер ловит ошибки:

```lua
--!strict
local Inventory = {}
Inventory.__index = Inventory

export type Inventory = typeof(setmetatable(
  {} :: { items: { [string]: number } },
  Inventory
))

function Inventory.new(): Inventory
  return setmetatable({ items = {} }, Inventory)
end

function Inventory.add(self: Inventory, name: string, count: number)
  self.items[name] = (self.items[name] or 0) + count
end

return Inventory
```

(Подробнее о типах — урок 14.)

## Распространённые ошибки

:::warn
1. **Забыли `Class.__index = Class`** — методы не находятся: «attempt to call a nil value (method 'x')».
2. **Вызвали через точку вместо двоеточия**: `obj.method()` вместо `obj:method()` — `self` будет `nil`.
3. **Общая таблица в классе.** Если написать `Class.items = {}` и менять `self.items[...]`, все экземпляры будут делить один массив. Создавайте изменяемые поля в `new`.
4. **Циклические ссылки** без очистки → утечки; у объектов с подписками делайте метод `Destroy`.
:::

## Метод Destroy и очистка

Любой класс, который подписывается на события или создаёт объекты, должен уметь прибираться:

```lua run
local Timer = {}
Timer.__index = Timer

function Timer.new()
  return setmetatable({running = true, cleanup = {}}, Timer)
end
function Timer:onDestroy(fn) table.insert(self.cleanup, fn) end
function Timer:Destroy()
  for _, fn in ipairs(self.cleanup) do fn() end
  self.cleanup = {}
  self.running = false
  setmetatable(self, nil)
end

local t = Timer.new()
t:onDestroy(function() print("отключили события") end)
t:Destroy()
```

## Задания

::::task easy Класс Counter
Создайте класс `Counter` с конструктором `Counter.new(start)` и методами `:inc()` (прибавляет 1), `:get()`.

:::starter
```lua
local Counter = {}
Counter.__index = Counter

-- допишите new, inc, get
```
:::
:::test
```lua
local c = Counter.new(5)
c:inc(); c:inc()
assert(c:get() == 7)
local d = Counter.new(0)
assert(d:get() == 0 and c:get() == 7)
```
:::
:::answer
```lua
local Counter = {}
Counter.__index = Counter

function Counter.new(start)
  return setmetatable({value = start or 0}, Counter)
end

function Counter:inc()
  self.value += 1
end

function Counter:get()
  return self.value
end
```
:::
::::

::::task mid Банковский счёт
Класс `Account`: `Account.new(balance)`, `:deposit(x)`, `:withdraw(x)` — вернуть `true` при успехе и `false`, если денег не хватает (баланс не меняется), `:getBalance()`. Положить или снять нужно только положительные суммы (иначе `false`).

:::starter
```lua
local Account = {}
Account.__index = Account
```
:::
:::test
```lua
local a = Account.new(100)
assert(a:deposit(50) == true and a:getBalance() == 150)
assert(a:withdraw(200) == false and a:getBalance() == 150)
assert(a:withdraw(30) == true and a:getBalance() == 120)
assert(a:deposit(-5) == false and a:withdraw(0) == false)
```
:::
:::answer
```lua
local Account = {}
Account.__index = Account

function Account.new(balance)
  return setmetatable({balance = balance or 0}, Account)
end

function Account:deposit(x)
  if x <= 0 then return false end
  self.balance += x
  return true
end

function Account:withdraw(x)
  if x <= 0 or x > self.balance then return false end
  self.balance -= x
  return true
end

function Account:getBalance()
  return self.balance
end
```
:::
::::

::::task mid Перегрузка операторов
Создайте тип «деньги» `Money.new(amount)` с операторами `+`, `==`, `<` и `tostring` (формат `"$12"`).

:::starter
```lua
local Money = {}
Money.__index = Money
```
:::
:::test
```lua
local a, b = Money.new(5), Money.new(7)
assert((a + b).amount == 12)
assert(Money.new(3) == Money.new(3))
assert(a < b and not (b < a))
assert(tostring(a + b) == "$12")
```
:::
:::answer
```lua
local Money = {}
Money.__index = Money

function Money.new(amount)
  return setmetatable({amount = amount}, Money)
end

Money.__add = function(a, b) return Money.new(a.amount + b.amount) end
Money.__eq = function(a, b) return a.amount == b.amount end
Money.__lt = function(a, b) return a.amount < b.amount end
Money.__tostring = function(m) return "$" .. m.amount end
```
:::
::::

::::task hard Наследование: Warrior
Есть класс `Character` (`new(name, hp)`, `:takeDamage(n)`, `:isAlive()`). Сделайте `Warrior`, наследующий его, с дополнительным полем `armor` (из конструктора `Warrior.new(name, hp, armor)`). У воина `takeDamage` уменьшает урон на `armor` (но не меньше 1 урона).

:::starter
```lua
local Character = {}
Character.__index = Character

function Character.new(name, hp)
  return setmetatable({name = name, hp = hp}, Character)
end
function Character:takeDamage(n) self.hp -= n end
function Character:isAlive() return self.hp > 0 end

local Warrior = setmetatable({}, {__index = Character})
Warrior.__index = Warrior
-- допишите new и takeDamage
```
:::
:::test
```lua
local w = Warrior.new("Грог", 100, 5)
w:takeDamage(20)
assert(w.hp == 85, "hp=" .. w.hp)
w:takeDamage(2)
assert(w.hp == 84, "минимум 1 урон")
assert(w:isAlive() and w.armor == 5)
local c = Character.new("Маг", 30)
c:takeDamage(20)
assert(c.hp == 10)
```
:::
:::answer
```lua
local Character = {}
Character.__index = Character

function Character.new(name, hp)
  return setmetatable({name = name, hp = hp}, Character)
end
function Character:takeDamage(n) self.hp -= n end
function Character:isAlive() return self.hp > 0 end

local Warrior = setmetatable({}, {__index = Character})
Warrior.__index = Warrior

function Warrior.new(name, hp, armor)
  local self = Character.new(name, hp)
  setmetatable(self, Warrior)
  self.armor = armor
  return self
end

function Warrior:takeDamage(n)
  local reduced = math.max(1, n - self.armor)
  Character.takeDamage(self, reduced)
end
```
:::
::::

## Проверьте себя

::::quiz
Что делает строка `Class.__index = Class`?
- [ ] Создаёт копию класса
- [x] Говорит: «если у экземпляра нет ключа — ищи его в самом классе», благодаря чему работают методы
- [ ] Запрещает изменять класс
Метатаблица экземпляров — сам класс, а `__index` указывает на него же.
::::

::::quiz
Почему `Class.items = {}` в определении класса опасно?
- [ ] Это синтаксическая ошибка
- [x] Все экземпляры будут разделять одну таблицу
- [ ] Таблица будет пустой
Изменяемые поля создавайте в конструкторе `new` для каждого экземпляра.
::::
