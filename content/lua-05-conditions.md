---
title: Условия и ветвление
section: lua
order: 5
summary: if / elseif / else, охранные условия, выражение if-then-else в Luau и типичные ловушки.
time: 15
level: Новичок
---

## Базовая форма

```lua run
local hp = 35

if hp <= 0 then
  print("Игрок погиб")
elseif hp < 40 then
  print("Мало здоровья")
else
  print("Всё хорошо")
end
```

Правила:
- после условия — `then`; блок завершается `end`;
- `elseif` пишется слитно (не `else if` — это бы открыло новый вложенный `if` и потребовало лишний `end`);
- скобки вокруг условия не нужны.

## Сложные условия

```lua run
local level, hasPass = 12, false

if level >= 10 and (hasPass or level >= 20) then
  print("Вход разрешён")
else
  print("Нужен проход или 20 уровень")
end

print(not (level > 5))   -- false
```

## Охранные условия (guard clauses)

Вместо глубокой вложенности — проверяйте «плохие» случаи в начале функции и выходите:

```lua run
local function giveReward(player, amount)
  if not player then return false end
  if amount <= 0 then return false end

  -- основной код без лишних отступов
  player.coins = (player.coins or 0) + amount
  return true
end

local p = {}
print(giveReward(p, 50), p.coins)
print(giveReward(nil, 50))
```

Это резко повышает читаемость и защищает от ошибок «attempt to index nil».

## Выражение if-then-else (Luau)

В Luau `if` может быть **выражением** — безопаснее, чем `a and b or c`:

```lua
local label = if score > 100 then "Мастер" elseif score > 50 then "Игрок" else "Новичок"
```

(В этом запускателе не работает; в Studio — да.)

## Таблица как «переключатель»

В Lua нет `switch`. Для множества вариантов используют таблицу:

```lua run
local rewards = {
  common = 10,
  rare = 50,
  epic = 200,
}

local function rewardFor(rarity)
  return rewards[rarity] or 0
end

print(rewardFor("rare"), rewardFor("unknown"))
```

Или таблицу функций:

```lua run
local handlers = {
  add = function(a, b) return a + b end,
  mul = function(a, b) return a * b end,
}
local op = "mul"
local fn = handlers[op]
print(fn and fn(6, 7))
```

## Частые ловушки

:::warn Сравнение с `nil` и `false`
`if x == nil` и `if not x` — не одно и то же: `not x` истинно и для `false`. Если переменная может быть `false` (например, настройка «выключено»), сравнивайте явно: `if x == nil then`.
:::

:::warn `=` вместо `==`
`if a = 5 then` — синтаксическая ошибка. Одно `=` — присваивание, `==` — сравнение.
:::

## Задания

::::task easy Знак числа
Напишите `sign(n)`: вернуть `-1` для отрицательных, `0` для нуля, `1` для положительных.

:::starter
```lua
local function sign(n)
end
```
:::
:::test
```lua
assert(sign(-5) == -1)
assert(sign(0) == 0)
assert(sign(3.2) == 1)
```
:::
:::answer
```lua
local function sign(n)
  if n < 0 then
    return -1
  elseif n > 0 then
    return 1
  end
  return 0
end
```
:::
::::

::::task mid FizzBuzz-ранг
Напишите `rank(score)`: `>= 1000` → `"S"`, `>= 500` → `"A"`, `>= 100` → `"B"`, иначе `"C"`.

:::starter
```lua
local function rank(score)
end
```
:::
:::test
```lua
assert(rank(1200) == "S")
assert(rank(1000) == "S")
assert(rank(999) == "A")
assert(rank(100) == "B")
assert(rank(99) == "C")
```
:::
:::answer
```lua
local function rank(score)
  if score >= 1000 then return "S" end
  if score >= 500 then return "A" end
  if score >= 100 then return "B" end
  return "C"
end
```
:::
::::

::::task mid Можно ли купить
Напишите `canBuy(player, item)`, где `player = {coins = n, level = m}`, `item = {price = n, minLevel = m}`. Вернуть `true, ""` если можно, иначе `false, "причина"`: `"мало монет"` или `"низкий уровень"` (уровень проверять первым).

:::starter
```lua
local function canBuy(player, item)
end
```
:::
:::test
```lua
local ok, why = canBuy({coins = 100, level = 5}, {price = 50, minLevel = 3})
assert(ok == true)
ok, why = canBuy({coins = 10, level = 5}, {price = 50, minLevel = 3})
assert(ok == false and why == "мало монет")
ok, why = canBuy({coins = 1000, level = 1}, {price = 50, minLevel = 3})
assert(ok == false and why == "низкий уровень")
```
:::
:::answer
```lua
local function canBuy(player, item)
  if player.level < item.minLevel then
    return false, "низкий уровень"
  end
  if player.coins < item.price then
    return false, "мало монет"
  end
  return true, ""
end
```
Это типичная серверная проверка покупки: никогда не доверяйте клиенту, проверяйте условия на сервере.
:::
::::

## Проверьте себя

::::quiz
Что выведет `if nil then print(1) elseif 0 then print(2) else print(3) end`?
- [ ] 1
- [x] 2
- [ ] 3
`nil` — ложь, а `0` — истина, поэтому сработает вторая ветка.
::::

::::quiz
Как правильно написать «иначе-если» в Lua?
- [ ] `else if`
- [x] `elseif`
- [ ] `elif`
`elseif` — одно слово. `else if` открыл бы вложенный `if`, требующий собственный `end`.
::::
