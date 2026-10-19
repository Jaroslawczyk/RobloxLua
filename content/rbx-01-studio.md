---
title: Roblox Studio: установка и первый скрипт
section: roblox
order: 1
summary: Интерфейс Studio, типы скриптов (Script, LocalScript, ModuleScript), где что лежит и первая программа в игре.
time: 30
level: Новичок
---

## Что нужно, чтобы начать

1. Аккаунт на [roblox.com](https://www.roblox.com) (для некоторых функций и выплат потребуется подтверждение возраста/личности).
2. Установить **Roblox Studio** (бесплатно, Windows/macOS) — через [create.roblox.com](https://create.roblox.com).
3. Создать проект: **File → New → Baseplate** (пустая карта) или шаблон.

:::note Официальные источники
Документация: [create.roblox.com/docs](https://create.roblox.com/docs) (Studio, Scripting, Reference). Обучающие материалы — «Education» там же. Здесь — адаптированный и сжатый маршрут.
:::

## Главные окна

| Окно | Для чего | Как открыть |
|---|---|---|
| **Explorer** | дерево всех объектов игры | View → Explorer |
| **Properties** | свойства выбранного объекта | View → Properties |
| **Toolbox / Creator Store** | готовые модели, звуки, плагины | View → Toolbox |
| **Output** | вывод `print`, ошибки, предупреждения | View → Output |
| **Script Editor** | редактор кода | двойной клик по скрипту |
| **Command Bar** | выполнить строку Luau в Studio мгновенно | View → Command Bar |
| **Developer Console** | консоль в игре: логи, память, сеть (F9) | в игре — `F9` |
| **MicroProfiler** | профайлер кадров | `Ctrl + F6` |

## Режимы запуска

| Кнопка | Что делает |
|---|---|
| **Play** (F5) | запускает вас как игрока: сервер + клиент в одном окне Studio |
| **Play Here** | старт с места камеры |
| **Run** (F8) | серверная симуляция без игрока (для проверки скриптов) |
| **Team Test** | тест с друзьями в реальном времени |
| **Start Server + Players** (Test → Local Server) | отдельные окна: сервер и N клиентов — самое близкое к реальности |

:::tip Всегда тестируйте как «Local Server»
Проверка с несколькими клиентами показывает проблемы репликации, `RemoteEvent` и сохранений, которые не видны в обычном Play.
:::

## Типы скриптов

| Тип | Где выполняется | Где обычно лежит |
|---|---|---|
| **Script** | на **сервере** | `ServerScriptService`, `Workspace` (в частях) |
| **LocalScript** | на **клиенте** (у каждого игрока) | `StarterPlayerScripts`, `StarterGui`, `StarterCharacterScripts`, `StarterPack` |
| **ModuleScript** | там, откуда вызван `require` | `ReplicatedStorage` (общие), `ServerStorage` (серверные) |

Современный вариант: у `Script` есть свойство **RunContext** (`Legacy`, `Server`, `Client`, `Plugin`) — можно создать `Script` с `RunContext = Client`, и он будет выполняться на клиенте независимо от места (в современных проектах так делают клиентские скрипты в Rojo — файлы `*.client.luau`).

## Контейнеры (сервисы): где что хранить

| Сервис | Содержимое | Видят клиенты? |
|---|---|---|
| `Workspace` | физический мир, части, модели | да |
| `ReplicatedStorage` | общие модули, ассеты, `RemoteEvent` | **да** |
| `ReplicatedFirst` | то, что нужно загрузить первым (экран загрузки) | да |
| `ServerStorage` | серверные ассеты и модули | **нет** |
| `ServerScriptService` | серверные скрипты и модули | **нет** |
| `StarterGui` | UI, копируется каждому игроку в `PlayerGui` | да (копия) |
| `StarterPack` | инструменты (`Tool`) на старте | да |
| `StarterPlayer` → `StarterPlayerScripts` / `StarterCharacterScripts` | клиентские скрипты | да |
| `Lighting` | освещение, небо, атмосфера | да |
| `SoundService` | звуки и настройки | да |
| `Teams` | команды | да |

:::danger Правило №1 безопасности
Всё, что лежит в местах, видимых клиенту, игрок может изучить и подделать. Логику денег, наград, урона и проверок держите **только на сервере**.
:::

## Первый скрипт: смертельная плита

1. В `Workspace` вставьте **Part** (Home → Part). Назовите `KillBrick`, покрасьте красным, поставьте `Anchored = true`.
2. ПКМ по `KillBrick` → **Insert Object → Script**.
3. Вставьте код:

```lua
local part = script.Parent

local function onTouched(otherPart)
  local character = otherPart.Parent
  local humanoid = character:FindFirstChildOfClass("Humanoid")
  if humanoid then
    humanoid.Health = 0
  end
end

part.Touched:Connect(onTouched)
```

4. Нажмите **Play** и коснитесь плиты.

Разбор:
- `script.Parent` — объект, внутри которого лежит скрипт (здесь — плита).
- `Touched` — **событие**, срабатывает при касании; `:Connect(функция)` подписывает функцию.
- `otherPart.Parent` — у части тела персонажа родитель — модель персонажа.
- `FindFirstChildOfClass("Humanoid")` — ищем «живое существо»; не нашли — это не игрок/NPC.

## Второй скрипт: счётчик очков (leaderstats)

`ServerScriptService` → **Script**:

```lua
local Players = game:GetService("Players")

local function setupLeaderstats(player)
  local leaderstats = Instance.new("Folder")
  leaderstats.Name = "leaderstats"        -- именно это имя показывает таблицу лидеров

  local coins = Instance.new("IntValue")
  coins.Name = "Coins"
  coins.Value = 0
  coins.Parent = leaderstats

  leaderstats.Parent = player             -- Parent задаём ПОСЛЕДНИМ
end

Players.PlayerAdded:Connect(setupLeaderstats)

-- на случай, если игроки уже зашли до подключения обработчика (важно в Studio!)
for _, player in ipairs(Players:GetPlayers()) do
  setupLeaderstats(player)
end
```

Папка `leaderstats` в `Player` автоматически отображается в таблице игроков справа сверху.

## Где пишется вывод

```lua
print("Информация")
warn("Предупреждение")   -- жёлтый
error("Ошибка")          -- красный, остановит поток
```

Клик по строке ошибки в Output открывает скрипт на нужной строке.

## Горячие клавиши, которые экономят время

| Клавиши | Действие |
|---|---|
| `F5` / `F8` | Play / Run |
| `Ctrl + D` | дублировать выбранное |
| `Ctrl + G` | сгруппировать в Model |
| `Ctrl + Space` | автодополнение |
| `Ctrl + /` | закомментировать |
| `Alt + Click` (на части) | выбрать часть внутри модели (клавиши могут отличаться в версиях — смотрите Studio Settings → Shortcuts) |
| `Ctrl + L` | заблокировать/разблокировать объект |

## Задания

::::task easy Цветная плита
Создайте плиту `ColorChanger`, которая при касании игроком меняет цвет на случайный (`Color3.fromRGB(math.random(0,255), …)`). Опишите (или напишите) скрипт.

:::hint
Используйте `part.Color = Color3.fromRGB(...)` внутри обработчика `Touched`. Добавьте задержку (debounce), чтобы цвет не менялся десятки раз в секунду.
:::
:::answer
```lua
local part = script.Parent
local debounce = false

part.Touched:Connect(function(hit)
  if debounce then return end
  if not hit.Parent:FindFirstChildOfClass("Humanoid") then return end
  debounce = true
  part.Color = Color3.fromRGB(math.random(0, 255), math.random(0, 255), math.random(0, 255))
  task.wait(0.5)
  debounce = false
end)
```
`Touched` срабатывает много раз подряд (каждая часть тела), поэтому «защёлка» (`debounce`) нужна почти всегда.
:::
::::

::::task mid Монетка
Создайте `Part` `Coin`. При касании игроком: прибавить 1 к `leaderstats.Coins` этого игрока и скрыть монету на 5 секунд (потом вернуть).

:::hint
Игрока по персонажу даёт `Players:GetPlayerFromCharacter(character)`. Скрыть: `Transparency = 1`, `CanTouch = false`.
:::
:::answer
```lua
local Players = game:GetService("Players")
local coin = script.Parent
local active = true

coin.Touched:Connect(function(hit)
  if not active then return end
  local player = Players:GetPlayerFromCharacter(hit.Parent)
  if not player then return end

  local stats = player:FindFirstChild("leaderstats")
  local coins = stats and stats:FindFirstChild("Coins")
  if not coins then return end

  active = false
  coins.Value += 1
  coin.Transparency = 1
  coin.CanTouch = false

  task.wait(5)

  coin.Transparency = 0
  coin.CanTouch = true
  active = true
end)
```
:::
::::

## Проверьте себя

::::quiz
Какой тип скрипта выполняется на сервере и безопасен для логики наград?
- [ ] LocalScript
- [x] Script (в `ServerScriptService`)
- [ ] ModuleScript в `StarterGui`
Серверный `Script` недоступен клиенту; всё клиентское можно подделать.
::::

::::quiz
Почему после `PlayerAdded:Connect(...)` часто добавляют цикл по `Players:GetPlayers()`?
- [ ] Чтобы ускорить игру
- [x] Чтобы обработать игроков, которые зашли до подключения обработчика (особенно в Studio)
- [ ] Это требование безопасности
Скрипт может загрузиться позже, чем игрок присоединился — событие уже «прошло».
::::
