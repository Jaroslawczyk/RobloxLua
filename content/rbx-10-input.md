---
title: Ввод: клавиатура, мышь, касания, геймпад
section: roblox
order: 10
summary: UserInputService, ContextActionService, ProximityPrompt, мобильные кнопки и кроссплатформенное управление.
time: 20
level: Средний
---

Ввод обрабатывается **только на клиенте** (`LocalScript`) — сервер не видит нажатий. Результат действия сообщается серверу через `RemoteEvent`, а сервер проверяет и решает.

## UserInputService

```lua
local UserInputService = game:GetService("UserInputService")

UserInputService.InputBegan:Connect(function(input, gameProcessed)
  if gameProcessed then return end          -- нажатие «съел» UI или чат — игнорируем

  if input.KeyCode == Enum.KeyCode.E then
    print("Нажата E")
  elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
    print("ЛКМ")
  elseif input.UserInputType == Enum.UserInputType.Touch then
    print("Касание")
  end
end)

UserInputService.InputEnded:Connect(function(input, gameProcessed) end)
```

| Что | Как |
|---|---|
| Нажата ли клавиша сейчас | `UserInputService:IsKeyDown(Enum.KeyCode.LeftShift)` |
| Позиция мыши | `UserInputService:GetMouseLocation()` |
| Есть ли касания / клавиатура / геймпад | `.TouchEnabled`, `.KeyboardEnabled`, `.GamepadEnabled` |
| Тип последнего ввода | `UserInputService.LastInputType`, событие `LastInputTypeChanged` |
| Прокрутка колёсика | `InputChanged` с `Enum.UserInputType.MouseWheel` |

:::warn gameProcessed
Параметр `gameProcessed` = `true`, когда ввод уже обработан игрой (набор текста в чат, нажатие на UI-кнопку). Игнорируйте такие события, иначе персонаж будет «стрелять» при клике по меню.
:::

## ContextActionService — привязка действий + мобильные кнопки

Лучший способ делать «действия» кроссплатформенно: одна привязка работает с клавиатурой, геймпадом и создаёт **кнопку на экране телефона**.

```lua
local ContextActionService = game:GetService("ContextActionService")

local function onSprint(actionName, state, input)
  if state == Enum.UserInputState.Begin then
    humanoid.WalkSpeed = 26
  elseif state == Enum.UserInputState.End then
    humanoid.WalkSpeed = 16
  end
  return Enum.ContextActionResult.Sink          -- «поглотить» ввод; Pass — пропустить дальше
end

ContextActionService:BindAction("Sprint", onSprint, true, Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL2)
ContextActionService:SetTitle("Sprint", "Бег")
ContextActionService:SetPosition("Sprint", UDim2.new(1, -90, 1, -150))

-- отключить:
ContextActionService:UnbindAction("Sprint")
```

`BindAction(имя, функция, createTouchButton, ...входы)`.

## ProximityPrompt — «нажми E рядом»

Самый удобный способ интерактива: автоматически подстраивается под платформу (клавиша E на ПК, кнопка на телефоне, кнопка геймпада).

```lua
-- Script (сервер) внутри части: ProximityPrompt создаётся в Studio
local prompt = script.Parent.ProximityPrompt
prompt.ActionText = "Открыть сундук"
prompt.ObjectText = "Сундук"
prompt.HoldDuration = 0.5                 -- удерживать
prompt.MaxActivationDistance = 8

prompt.Triggered:Connect(function(player)
  giveReward(player)                      -- серверное событие: безопасно
end)
```

`Triggered` срабатывает на **сервере** с игроком — значит наградой можно распоряжаться без `RemoteEvent` (но проверяйте кулдаун).

## Определение платформы

```lua
local function getPlatform()
  if UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
    return "Mobile"
  elseif UserInputService.GamepadEnabled and not UserInputService.KeyboardEnabled then
    return "Console"
  end
  return "PC"
end
```

Подстраивайте **UI** (размеры кнопок, подсказки «нажмите E» / «коснитесь»), но не логику награды — на сервере платформа не должна влиять на правила.

## Камера и управление персонажем

Стандартные скрипты управления есть по умолчанию (`PlayerModule` в `PlayerScripts`). Для кастомных схем:

```lua
local PlayerModule = require(player.PlayerScripts:WaitForChild("PlayerModule"))
local controls = PlayerModule:GetControls()
controls:Disable()     -- отключить управление (на время диалога/кат-сцены)
controls:Enable()
```

Сделать персонажа неподвижным на сервере: `humanoid.WalkSpeed = 0` и `JumpPower = 0` (или `PlatformStand`).

## Мобильный UX управления

- Предусмотрите **крупные кнопки действий** справа внизу и не перекрывайте джойстик.
- Не требуйте «горячих клавиш» для важных функций: у телефона нет клавиатуры.
- Поддерживайте жесты осторожно: `UserInputService.TouchTap`, `TouchPinch`, `TouchSwipe` — конфликтуют с камерой.
- Тестируйте на реальных устройствах: эмулятор не передаёт реальные размеры пальца и задержки.

## Задания

::::task easy Таблица действий (чистый Lua)
Напишите `makeActionMap(bindings)`: принимает `{ [клавиша] = имяДействия }` и возвращает функцию `handle(key)`, которая возвращает имя действия или `nil`, если клавиша не назначена.

:::starter
```lua
local function makeActionMap(bindings)
end
```
:::
:::test
```lua
local h = makeActionMap({E = "interact", LeftShift = "sprint"})
assert(h("E") == "interact")
assert(h("LeftShift") == "sprint")
assert(h("Q") == nil)
```
:::
:::answer
```lua
local function makeActionMap(bindings)
  return function(key)
    return bindings[key]
  end
end
```
:::
::::

::::task mid Двойное нажатие (чистый Lua)
Для рывка (dash) нужно определять двойное нажатие. Напишите `makeDoubleTap(window)`: возвращает `tap(now)` → `true`, если с предыдущего нажатия прошло ≤ `window` секунд (и сбрасывает состояние), иначе `false`.

:::starter
```lua
local function makeDoubleTap(window)
end
```
:::
:::test
```lua
local tap = makeDoubleTap(0.3)
assert(tap(0) == false)
assert(tap(0.2) == true)
assert(tap(0.3) == false, "после срабатывания состояние сброшено")
assert(tap(1.0) == false)
assert(tap(1.25) == true)
```
:::
:::answer
```lua
local function makeDoubleTap(window)
  local last = nil
  return function(now)
    if last and now - last <= window then
      last = nil
      return true
    end
    last = now
    return false
  end
end
```
:::
::::

## Проверьте себя

::::quiz
Где обрабатывается нажатие клавиши?
- [ ] На сервере (`Script`)
- [x] На клиенте (`LocalScript`); результат отправляется серверу
- [ ] В `ModuleScript` в `ServerStorage`
Сервер не получает события клавиатуры/мыши.
::::

::::quiz
Какой инструмент автоматически создаёт мобильную кнопку для действия?
- [ ] `UserInputService.InputBegan`
- [x] `ContextActionService:BindAction(..., true, ...)`
- [ ] `Mouse.Button1Down`
Третий параметр `createTouchButton = true` добавляет кнопку на экран.
::::
