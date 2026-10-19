---
title: Числа и операторы
section: lua
order: 3
summary: Арифметика, приоритеты, сравнения, логические операторы and/or/not, конкатенация и библиотека math.
time: 20
level: Новичок
---

## Арифметика

| Оператор | Значение | Пример | Результат |
|---|---|---|---|
| `+` `-` `*` | сложение, вычитание, умножение | `6 * 7` | `42` |
| `/` | деление (всегда дробное) | `7 / 2` | `3.5` |
| `//` | целочисленное деление (вниз) | `7 // 2` | `3` |
| `%` | остаток от деления | `7 % 3` | `1` |
| `^` | степень | `2 ^ 10` | `1024` |
| `-x` | унарный минус | | |

```lua run
print(7 / 2, 7 // 2, 7 % 3, 2 ^ 10)
print(-7 // 2, -7 % 3)    -- округление «вниз», остаток — со знаком делителя
print(10 % 2 == 0)         -- чётность числа
```

**Приоритет** (от высшего): `^` → унарные `- not #` → `* / // %` → `+ -` → `..` → сравнения → `and` → `or`. Сомневаетесь — ставьте скобки.

:::tip Составные присваивания (Luau)
В Roblox вместо `x = x + 1` можно писать `x += 1`. Доступны `+= -= *= /= //= %= ^= ..=`. На этой странице запускатель сам превращает такие строки в обычные.
:::

```lua run
local coins = 100
coins += 25
coins *= 2
print(coins)   -- 250
```

## Сравнения

`==` `~=` `<` `>` `<=` `>=` — всегда дают `true` или `false`. Сравнивать можно числа с числами и строки со строками (лексикографически). Сравнение числа со строкой вызовет ошибку; а `1 == "1"` — это `false`.

```lua run
print(1 == 1.0, "a" < "b", "10" < "9", 1 == "1")
```

## Логические операторы and / or / not

`and` и `or` не просто возвращают `true/false` — они возвращают **один из своих операндов** и вычисляются «лениво» (короткое замыкание):

- `a and b` → если `a` ложь, то `a`, иначе `b`
- `a or b` → если `a` истина, то `a`, иначе `b`

Отсюда популярные идиомы:

```lua run
-- 1. значение по умолчанию
local function greet(name)
  name = name or "незнакомец"
  return "Привет, " .. name
end
print(greet(), greet("Мила"))

-- 2. «тернарный оператор»
local hp = 30
local status = hp > 50 and "здоров" or "ранен"
print(status)

-- 3. защита от nil
local player = nil
print(player and player.name)  -- nil вместо ошибки
```

:::warn Ловушка: `a and b or c`
Если `b` оказывается `false` или `nil`, результат всегда будет `c`. В Luau для этого есть безопасная форма: `if cond then b else c` (выражение, не оператор) — см. урок про условия.
:::

## Конкатенация и длина

```lua run
local first, last = "Ада", "Лавлейс"
print(first .. " " .. last)      -- склеивание строк
print(#"hello", #{10, 20, 30})   -- длина строки и массива
print("Очки: " .. 5)             -- число превращается в строку
```

## Библиотека math

| Функция | Что делает | Пример |
|---|---|---|
| `math.floor(x)` / `math.ceil(x)` | округление вниз / вверх | `math.floor(3.7)` → `3` |
| `math.round(x)` | к ближайшему (Luau) | `math.round(2.5)` → `3` |
| `math.abs(x)` | модуль | `math.abs(-4)` → `4` |
| `math.min(...)` / `math.max(...)` | минимум / максимум | `math.max(1, 9, 4)` → `9` |
| `math.clamp(x, a, b)` | ограничить диапазоном (Luau) | `math.clamp(15, 0, 10)` → `10` |
| `math.sqrt(x)` | корень | |
| `math.sin/cos/tan`, `math.rad/deg` | тригонометрия (радианы) | |
| `math.huge` | бесконечность | |
| `math.pi` | число π | |
| `math.random(m, n)` | случайное целое от m до n | |
| `math.sign(x)` | знак: -1, 0, 1 (Luau) | |
| `math.lerp(a, b, t)` | линейная интерполяция (Luau) | |

```lua run
print(math.floor(3.9), math.ceil(3.1), math.max(3, 8, 5), math.clamp(120, 0, 100))
print(math.sqrt(144), math.abs(-9), math.pi)
```

### Случайные числа

```lua
local roll = math.random(1, 6)      -- бросок кубика
local chance = math.random()        -- дробное в [0, 1)
```

:::note В Roblox для серьёзной случайности используйте `Random`
`local rng = Random.new()` → `rng:NextInteger(1, 100)`, `rng:NextNumber()`. Для лута и шансов выпадения предпочтительнее объект `Random` (можно задать seed для воспроизводимости и тестов).
:::

## Точность чисел с плавающей точкой

```lua run
print(0.1 + 0.2 == 0.3)                       -- false!
print(math.abs((0.1 + 0.2) - 0.3) < 1e-9)     -- true: сравнивайте с допуском
```

## Задания

::::task easy Чётное или нет
Напишите функцию `isEven(n)`, которая возвращает `true` для чётных чисел.

:::starter
```lua
local function isEven(n)
end
```
:::
:::test
```lua
assert(isEven(4) == true)
assert(isEven(7) == false)
assert(isEven(0) == true)
assert(isEven(-2) == true)
```
:::
:::answer
```lua
local function isEven(n)
  return n % 2 == 0
end
```
:::
::::

::::task easy Скидка
Напишите `discount(price, percent)`, возвращающую цену после скидки. Например `discount(200, 15)` → `170`.

:::starter
```lua
local function discount(price, percent)
end
```
:::
:::test
```lua
assert(discount(200, 15) == 170)
assert(discount(100, 0) == 100)
assert(discount(50, 100) == 0)
```
:::
:::answer
```lua
local function discount(price, percent)
  return price * (1 - percent / 100)
end
```
:::
::::

::::task mid Здоровье с границами
Напишите `heal(hp, amount, maxHp)`: прибавляет `amount` к `hp`, но результат не должен выходить за диапазон `[0, maxHp]`.

:::starter
```lua
local function heal(hp, amount, maxHp)
end
```
:::
:::test
```lua
assert(heal(50, 20, 100) == 70)
assert(heal(90, 50, 100) == 100)
assert(heal(10, -50, 100) == 0)
```
:::
:::hint
Используйте `math.clamp` (в Studio) или комбинацию `math.max(0, math.min(maxHp, ...))`.
:::
:::answer
```lua
local function heal(hp, amount, maxHp)
  return math.max(0, math.min(maxHp, hp + amount))
end
-- в Roblox: return math.clamp(hp + amount, 0, maxHp)
```
:::
::::

::::task mid Время в формат М:СС
Напишите `formatTime(seconds)`, возвращающую строку вида `"2:05"` (минуты без нуля, секунды двумя цифрами). `formatTime(125)` → `"2:05"`, `formatTime(59)` → `"0:59"`.

:::starter
```lua
local function formatTime(seconds)
end
```
:::
:::test
```lua
assert(formatTime(125) == "2:05")
assert(formatTime(59) == "0:59")
assert(formatTime(600) == "10:00")
```
:::
:::hint
`seconds // 60` — минуты, `seconds % 60` — секунды. `string.format("%02d", n)` добавляет ведущий ноль. Если `seconds` дробное, сначала округлите `math.floor`.
:::
:::answer
```lua
local function formatTime(seconds)
  seconds = math.floor(seconds)
  local m = seconds // 60
  local s = seconds % 60
  return m .. ":" .. string.format("%02d", s)
end
```
:::
::::

## Проверьте себя

::::quiz
Чему равно `7 // 2`?
- [ ] `3.5`
- [x] `3`
- [ ] `4`
`//` — деление с округлением вниз.
::::

::::quiz
Что вернёт `nil or "запас"`?
- [ ] `nil`
- [x] `"запас"`
- [ ] `true`
`or` возвращает первый «истинный» операнд, а `nil` — ложь.
::::

::::quiz
Почему `0.1 + 0.2 == 0.3` даёт `false`?
- [ ] Это баг Roblox
- [x] Числа с плавающей точкой хранят двоичное приближение; сравнивайте с допуском
- [ ] Из-за приоритета операторов
Это общее свойство двоичной арифметики (IEEE 754).
::::
