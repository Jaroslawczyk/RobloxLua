---
title: Игроки, персонаж и Humanoid
section: roblox
order: 4
summary: Players, Player, Character, Humanoid, leaderstats, респавн, команды и работа с жизненным циклом игрока.
time: 30
level: Средний
---

## Игрок и персонаж — разные вещи

| Объект | Что это | Живёт |
|---|---|---|
| **Player** (`Players.Ann`) | сам игрок: ID, имя, `leaderstats`, `PlayerGui`, `Backpack` | пока игрок в игре |
| **Character** (модель в `Workspace`) | тело аватара: `HumanoidRootPart`, `Humanoid`, части тела, аксессуары | до смерти/респавна |

Многие баги — из-за путаницы: данные игрока хранят в `Player`/в своих таблицах по `UserId`, а не в персонаже (он пересоздаётся при каждой смерти).

```lua
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
  print(player.Name, player.UserId, player.DisplayName)

  player.CharacterAdded:Connect(function(character)
    local humanoid = character:WaitForChild("Humanoid")
    humanoid.Died:Connect(function()
      print(player.Name, "погиб")
    end)
  end)
end)

Players.PlayerRemoving:Connect(function(player)
  print(player.Name, "вышел — здесь сохраняем данные")
end)
```

## Свойства и методы Player

| Член | Описание |
|---|---|
| `UserId` | **постоянный** числовой ID — используйте как ключ DataStore (не `Name`!) |
| `Name`, `DisplayName` | имя / отображаемое имя |
| `Character` | текущий персонаж или `nil` |
| `PlayerGui`, `Backpack`, `PlayerScripts` | контейнеры игрока |
| `Team`, `TeamColor` | команда |
| `MembershipType` | `Enum.MembershipType.Premium` / `None` |
| `AccountAge` | возраст аккаунта в днях |
| `RespawnLocation` | `SpawnLocation` для этого игрока |
| `LoadCharacter()` | (пере)создать персонажа вручную |
| `Kick(message)` | выкинуть из игры |
| `GetRankInGroup(groupId)`, `IsInGroup(groupId)` | группы |
| `Players.LocalPlayer` | игрок-владелец клиента (только `LocalScript`) |

Полезные методы `Players`: `GetPlayers()`, `GetPlayerFromCharacter(model)`, `GetPlayerByUserId(id)`, `GetUserIdFromNameAsync(name)`, `GetNameFromUserIdAsync(id)`, `GetCharacterAppearanceAsync`, `GetHumanoidDescriptionFromUserId`.

## Humanoid

`Humanoid` управляет здоровьем, ходьбой и состояниями персонажа.

```lua
local humanoid = character:FindFirstChildOfClass("Humanoid")

humanoid.WalkSpeed = 24
humanoid.UseJumpPower = true
humanoid.JumpPower = 55
humanoid.MaxHealth = 200
humanoid.Health = 200

humanoid:TakeDamage(15)           -- учитывает ForceField
humanoid.Health -= 15              -- напрямую (игнорирует ForceField)
humanoid:MoveTo(Vector3.new(0, 0, 50))
humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
```

| Свойство | Значение по умолчанию | Смысл |
|---|---|---|
| `WalkSpeed` | 16 | скорость ходьбы (стад./с) |
| `JumpPower` / `JumpHeight` | 50 / 7.2 | сила / высота прыжка (см. `UseJumpPower`) |
| `Health` / `MaxHealth` | 100 | здоровье |
| `HipHeight` | зависит | высота «бёдер» над землёй |
| `AutoRotate` | true | поворачиваться по ходу |
| `DisplayDistanceType` | | как показывать имя/хп-бар |
| `RigType` | R6 / R15 | тип скелета |

События: `Died`, `HealthChanged`, `Running(speed)`, `Jumping`, `StateChanged(old, new)`, `Touched`.

## Безопасная работа с персонажем

```lua
local function onCharacterAdded(character)
  local humanoid = character:WaitForChild("Humanoid")
  local root = character:WaitForChild("HumanoidRootPart")
  -- настраиваем персонажа
end

local function onPlayerAdded(player)
  if player.Character then
    onCharacterAdded(player.Character)
  end
  player.CharacterAdded:Connect(onCharacterAdded)
end
```

:::warn Персонажа может не быть
`player.Character` — `nil`, пока он не загрузился или сразу после смерти. Всегда проверяйте (`if not character then return end`) или используйте `player.Character or player.CharacterAdded:Wait()`.
:::

## Лидерборд (leaderstats) с данными

```lua
local function setupLeaderstats(player, data)
  local folder = Instance.new("Folder")
  folder.Name = "leaderstats"

  local coins = Instance.new("IntValue")
  coins.Name = "Coins"
  coins.Value = data.Coins
  coins.Parent = folder

  folder.Parent = player
end
```

:::note Серверное значение — источник истины
`Value`-объекты в `leaderstats` реплицируются клиентам для показа. Изменять их надо **только на сервере**; клиентские правки не передаются на сервер и не должны влиять на экономику.
:::

## Респавн и спавн

- `SpawnLocation` в `Workspace`: свойства `Neutral`, `TeamColor`, `Duration` (время защиты ForceField), `AllowTeamChangeOnTouch`.
- `Players.RespawnTime` (по умолчанию 5 с) — задержка респавна.
- `Players.CharacterAutoLoads = false` — тогда вы сами вызываете `player:LoadCharacter()` (например, после выбора класса или в раундовой игре).

```lua
Players.CharacterAutoLoads = false

local function start(player)
  player:LoadCharacter()
end
```

## Команды

`Teams` сервис, внутри `Team` (с `TeamColor`). Игрок попадает в команду через `player.Team = team`. Для баланса команд: считайте `#team:GetPlayers()`.

## Аватар и внешность

`HumanoidDescription` описывает внешность; можно применять: `humanoid:ApplyDescription(desc)`. Получить описание по `UserId`: `Players:GetHumanoidDescriptionFromUserId(id)`.

## Раунды: простая схема игры

```lua
-- серверный Script (псевдокод)
local MIN_PLAYERS = 2

while true do
  repeat task.wait(1) until #Players:GetPlayers() >= MIN_PLAYERS
  startIntermission(15)
  local alive = startRound(120)
  rewardWinners(alive)
end
```

## Задания

::::task easy Приветствие
Напишите серверный скрипт: при входе игрока писать в Output `"Привет, <DisplayName>! Ваш ID: <UserId>"`, а при выходе — `"Пока, <Name>"`.

:::answer
```lua
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
  print(("Привет, %s! Ваш ID: %d"):format(player.DisplayName, player.UserId))
end)

Players.PlayerRemoving:Connect(function(player)
  print("Пока, " .. player.Name)
end)
```
:::
::::

::::task mid Бонус скорости на 10 секунд
Создайте `Part`-«зелье»: при касании игроком его `WalkSpeed` становится 32 на 10 секунд, потом возвращается к исходному. Зелье исчезает после использования.

:::hint
Запомните исходное значение скорости. Используйте `task.delay`. Проверяйте, что персонаж не умер к моменту возврата.
:::
:::answer
```lua
local Players = game:GetService("Players")
local potion = script.Parent
local used = false

potion.Touched:Connect(function(hit)
  if used then return end
  local player = Players:GetPlayerFromCharacter(hit.Parent)
  local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
  if not (player and humanoid) then return end

  used = true
  local original = humanoid.WalkSpeed
  humanoid.WalkSpeed = 32
  potion.Transparency = 1
  potion.CanTouch = false

  task.delay(10, function()
    if humanoid.Parent then
      humanoid.WalkSpeed = original
    end
    potion:Destroy()
  end)
end)
```
:::
::::

::::task mid Математика здоровья (чистый Lua)
Напишите `applyDamage(hp, maxHp, damage, armor)`: итоговый урон = `max(0, damage * (1 - armor))` (armor от 0 до 1), здоровье не ниже 0. Вернуть новое здоровье и `true`, если игрок погиб (hp стало 0).

:::starter
```lua
local function applyDamage(hp, maxHp, damage, armor)
end
```
:::
:::test
```lua
local hp, dead = applyDamage(100, 100, 30, 0.5)
assert(hp == 85 and dead == false)
hp, dead = applyDamage(10, 100, 50, 0)
assert(hp == 0 and dead == true)
hp, dead = applyDamage(50, 100, -20, 0)
assert(hp == 50 and dead == false, "отрицательный урон не лечит")
```
:::
:::answer
```lua
local function applyDamage(hp, maxHp, damage, armor)
  local dealt = math.max(0, damage * (1 - armor))
  local newHp = math.max(0, math.min(maxHp, hp - dealt))
  return newHp, newHp == 0
end
```
:::
::::

## Проверьте себя

::::quiz
Что использовать как ключ в DataStore для данных игрока?
- [ ] `player.Name`
- [ ] `player.DisplayName`
- [x] `player.UserId`
Имя можно сменить, `UserId` — постоянный.
::::

::::quiz
Почему `player.Character` может быть `nil`?
- [ ] Это баг
- [x] Персонаж ещё не загрузился или только что умер; нужно ждать `CharacterAdded`
- [ ] Только в Studio
Персонаж создаётся и пересоздаётся динамически.
::::
