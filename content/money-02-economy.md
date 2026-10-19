---
title: Экономика игры: источники, стоки и баланс
section: money
order: 2
summary: Как проектировать валюты, цены, ребёрты и шансы, считать время до целей и тестировать баланс симуляциями.
time: 40
level: Продвинутый
---

## Базовые понятия

| Термин | Смысл |
|---|---|
| **Source (источник)** | откуда в игре берётся валюта (сбор, квесты, награды) |
| **Sink (сток)** | куда валюта уходит (апгрейды, покупки, налоги, ремонт) |
| **Inflation** | валюты слишком много → всё дешёвое → пропал смысл |
| **Soft currency** | «мягкая» валюта (монеты), легко зарабатывается |
| **Hard currency** | «жёсткая» (гемы), зарабатывается редко, покупается за Robux |
| **Friction (трение)** | задержка/сложность, ради ускорения которой игрок может заплатить |
| **Progression curve** | как растёт цена целей и награда |
| **ARPDAU/ARPPU** | доход на пользователя в день / на платящего |

## Экспоненциальные цены

Классическая формула апгрейда: **цена(L) = база × k^L**, где `k` — множитель роста (1.07–1.25). Доход тоже растёт, но медленнее цены — иначе нет «стены».

```lua run
local function price(level) return math.floor(100 * 1.15 ^ level) end
local function income(level) return 5 * level end          -- в секунду

for _, lv in ipairs({1, 5, 10, 20, 30}) do
  local seconds = price(lv) / income(lv)
  print(("уровень %2d: цена %7d, доход %3d/с, ждать %6.1f с (%.1f мин)"):format(lv, price(lv), income(lv), seconds, seconds / 60))
end
```

Видите: с ростом уровня время ожидания растёт → появляются «стены», которые игрок либо перепрыгивает за деньги, либо уходит. **Задача дизайнера:** сделать стены **плавными и ожидаемыми**, предложить игроку интересное занятие *во время* ожидания и разные способы ускорения.

## Симуляция прогресса

```lua run
-- сколько секунд нужно, чтобы дойти до целевого уровня при активной игре
local function simulate(targetLevel)
  local level, coins, t = 1, 0, 0
  local function price(l) return math.floor(100 * 1.15 ^ l) end
  local function income(l) return 5 * l end
  while level < targetLevel and t < 1e7 do
    t += 1
    coins += income(level)
    if coins >= price(level) then
      coins -= price(level)
      level += 1
    end
  end
  return t
end

for _, target in ipairs({10, 20, 30, 40}) do
  local t = simulate(target)
  print(("до %d уровня: %.1f ч"):format(target, t / 3600))
end
```

Такие симуляции — самый дешёвый способ «увидеть» баланс до написания игры. ИИ быстро генерирует скрипты симуляции, а вы подбираете параметры.

## Ребёрт (prestige)

Игрок «сбрасывает» прогресс в обмен на **постоянный бонус**. Это продлевает жизнь игры: вместо «конца» — новый цикл с более быстрым ростом.

```lua
local function rebirthMultiplier(rebirths) return 1 + 0.5 * rebirths end   -- +50% за ребёрт
local function rebirthCost(rebirths) return math.floor(1000 * 2.5 ^ rebirths) end
```

Принципы:
- Бонус **заметный** (≥ +25–50%) и виден в UI;
- Первый ребёрт — быстро (в течение 20–40 минут игры), чтобы игрок понял механику;
- Следующие — всё дороже, но с новым контентом (зоны, питомцы).

## Редкость и шансы выпадения (яйца, сундуки, «рулетка»)

Принцип: таблица **весов**, сумма которых даёт 100%.

```lua run
local pets = {
  {name = "Dog",    weight = 60},
  {name = "Cat",    weight = 25},
  {name = "Fox",    weight = 10},
  {name = "Dragon", weight = 4},
  {name = "Phoenix", weight = 1},
}

local function roll(rng)
  local total = 0
  for _, p in ipairs(pets) do total += p.weight end
  local r = rng() * total
  for _, p in ipairs(pets) do
    r -= p.weight
    if r <= 0 then return p.name end
  end
  return pets[#pets].name
end

-- проверка распределения на большой выборке
local counts = {}
local seed = 12345
local function rng()                 -- простой детерминированный генератор для демонстрации
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
end

local N = 100000
for _ = 1, N do
  local n = roll(rng)
  counts[n] = (counts[n] or 0) + 1
end
for _, p in ipairs(pets) do
  print(("%-8s ожидаемо %5.1f%%, получено %5.2f%%"):format(p.name, p.weight, counts[p.name] / N * 100))
end
```

:::danger Платные случайные награды — регулируются
Если игрок получает случайный предмет **за Robux** (напрямую или через внутриигровую валюту, которую можно купить за Robux), правила Roblox требуют **публиковать реальные вероятности** всех исходов (в процентах, в сумме 100%), включая «усилители удачи». Подробнее — в [[money-04-ethics-compliance]].
:::

### Удача (luck) и «pity»

Модификаторы шансов — часть той же таблицы: `luck = 2` увеличивает вес редких. Реализация: вес редкого × `luck`, затем нормализация; **вероятности показывайте с учётом активных усилителей**. «Pity» (гарантия после N неудач) — честный способ снизить фрустрацию; он тоже должен быть описан.

## Время ожидания и ускорители

Ожидание (рост растений, инкубация яиц, таймер сбора) — естественное «трение». Типовые ускорители:
- пропуск за Robux (разово или каждый раз);
- **бесплатные способы ускорить**: активность в игре, друзья, ежедневные задания — они сохраняют ощущение честности и повышают удержание.

Золотое правило: **бесплатный путь всегда должен быть интересным**, а платный — делать игру удобнее/быстрее/красивее, не превращая её в обязательную статью расходов.

## Большие числа

Симуляторы быстро выходят за 2^53 (≈ 9·10^15), после чего double теряет точность.

Решения:
- Хранить мантиссу и порядок (`{m = 1.5, e = 20}`), «вручную» сложение/умножение (библиотеки BigNum/Notation, например **Notation** модули сообщества).
- Использовать логарифмы: хранить `log10(x)` и сравнивать логарифмы.
- Сжимать масштаб: сбросы (ребёрты) удерживают числа в разумных пределах.
- Для отображения — аббревиатуры (K, M, B, T, Qa…) — см. урок про UI.

## Экономические метрики

| Метрика | Как считать | Что значит |
|---|---|---|
| **Скорость инфляции** | выдано валюты / потрачено за период | >1 — валюта копится, цены «неэффективны» |
| **Время до первой покупки** | от входа до первой покупки в магазине | слишком долго → игрок уходит |
| **Время до ребёрта** | из аналитики | ожидаемо ≈ дизайнерскому |
| **Воронка покупок** | показ → просмотр → покупка | сколько людей видит предложения |
| **Распределение игроков по прогрессу** | гистограмма уровней | «стены» = пик на одном уровне |

Логируйте события через `AnalyticsService:LogEconomyEvent` / `LogOnboardingFunnelStepEvent` и/или свои логи.

## Ежедневные награды и события

- **Daily reward** (серия 7 дней): растущая награда; пропуск сбрасывает (или «замораживает») серию.
- **Таймеры события:** ограниченные по времени мероприятия — повод вернуться. Не злоупотребляйте искусственным дефицитом.
- **Квесты:** короткие (2 мин), средние (20 мин), недельные.
- **Промокоды:** в сообществе (Discord/соцсети) — нужны серверные проверки и учёт использованных кодов.

## Задания

::::task easy Время ожидания
Напишите `waitSeconds(price, incomePerSecond)` — секунды до покупки (округлить вверх). Если доход 0 — вернуть `math.huge`.

:::starter
```lua
local function waitSeconds(price, incomePerSecond)
end
```
:::
:::test
```lua
assert(waitSeconds(100, 5) == 20)
assert(waitSeconds(101, 5) == 21)
assert(waitSeconds(100, 0) == math.huge)
assert(waitSeconds(0, 5) == 0)
```
:::
:::answer
```lua
local function waitSeconds(price, incomePerSecond)
  if incomePerSecond <= 0 then
    return math.huge
  end
  return math.ceil(price / incomePerSecond)
end
```
:::
::::

::::task mid Взвешенный выбор
Напишите `weightedPick(items, r)`: `items` — массив `{name, weight}`, `r` — число из [0, 1). Вернуть имя по накопленным весам (детерминированно, чтобы проверять тестом).

:::starter
```lua
local function weightedPick(items, r)
end
```
:::
:::test
```lua
local items = {{name = "A", weight = 50}, {name = "B", weight = 30}, {name = "C", weight = 20}}
assert(weightedPick(items, 0) == "A")
assert(weightedPick(items, 0.49) == "A")
assert(weightedPick(items, 0.5) == "B")
assert(weightedPick(items, 0.79) == "B")
assert(weightedPick(items, 0.8) == "C")
assert(weightedPick(items, 0.999) == "C")
```
:::
:::answer
```lua
local function weightedPick(items, r)
  local total = 0
  for _, it in ipairs(items) do
    total += it.weight
  end
  local target = r * total
  local acc = 0
  for _, it in ipairs(items) do
    acc += it.weight
    if target < acc then
      return it.name
    end
  end
  return items[#items].name
end
```
:::
::::

::::task mid Проверка таблицы шансов
Напишите `validateOdds(items)`: `true`, если веса положительны и сумма равна 100 (допуск 1e-9); иначе `false, "причина"` (`"sum"` — сумма не 100, `"weight"` — есть вес ≤ 0).

:::starter
```lua
local function validateOdds(items)
end
```
:::
:::test
```lua
assert(validateOdds({{name = "A", weight = 60}, {name = "B", weight = 40}}) == true)
local ok, why = validateOdds({{name = "A", weight = 60}, {name = "B", weight = 39}})
assert(ok == false and why == "sum")
ok, why = validateOdds({{name = "A", weight = 100}, {name = "B", weight = 0}})
assert(ok == false and why == "weight")
assert(validateOdds({{name = "A", weight = 33.3}, {name = "B", weight = 33.3}, {name = "C", weight = 33.4}}) == true)
```
:::
:::answer
```lua
local function validateOdds(items)
  local total = 0
  for _, it in ipairs(items) do
    if it.weight <= 0 then
      return false, "weight"
    end
    total += it.weight
  end
  if math.abs(total - 100) > 1e-9 then
    return false, "sum"
  end
  return true
end
```
Именно такой валидатор нужно запускать в CI, чтобы опубликованные вероятности не расходились с реальными.
:::
::::

## Проверьте себя

::::quiz
Что такое sink в игровой экономике?
- [ ] Источник валюты
- [x] Механика, которая забирает валюту у игрока (покупки, апгрейды)
- [ ] Таблица рекордов
Без стоков валюта инфляционирует.
::::

::::quiz
Почему платные случайные предметы требуют публикации шансов?
- [ ] Это просто совет
- [x] Это требование правил Roblox (и местных законов во многих странах): игрок должен знать реальные вероятности
- [ ] Чтобы игра работала быстрее
Скрытые шансы — основание для санкций и потери доверия.
::::
