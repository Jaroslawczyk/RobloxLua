---
title: Интерфейс (GUI) и адаптивность
section: roblox
order: 7
summary: ScreenGui, Frame, TextButton, layout-объекты, Scale против Offset, мобильные экраны и пример магазина.
time: 35
level: Средний
---

## Как устроен GUI

UI-объекты живут в `StarterGui`; при входе игрока их копия попадает в `Player.PlayerGui`. Всё, что показывается на экране, лежит внутри **`ScreenGui`**.

```text
StarterGui
└─ ShopGui (ScreenGui)
   └─ Panel (Frame)
      ├─ UICorner
      ├─ Title (TextLabel)
      ├─ List (ScrollingFrame)
      │  └─ UIListLayout
      └─ Close (TextButton)
```

| Класс | Назначение |
|---|---|
| `ScreenGui` | корень интерфейса на экране; `ResetOnSpawn`, `IgnoreGuiInset`, `ZIndexBehavior` |
| `Frame` | прямоугольный контейнер |
| `TextLabel` / `TextButton` / `TextBox` | текст / кнопка / поле ввода |
| `ImageLabel` / `ImageButton` | картинка / картинка-кнопка |
| `ScrollingFrame` | прокручиваемая область |
| `ViewportFrame` | 3D-превью предмета |
| `CanvasGroup` | группа с общей прозрачностью/эффектами |
| `BillboardGui` / `SurfaceGui` | UI в 3D-мире (над головой / на поверхности) |

Оформление и раскладка — «модификаторы» внутри элемента: `UICorner` (скругление), `UIStroke` (обводка), `UIGradient`, `UIPadding`, `UIListLayout`, `UIGridLayout`, `UIPageLayout`, `UITableLayout`, `UIAspectRatioConstraint`, `UISizeConstraint`, `UITextSizeConstraint`, `UIScale`, `UIFlexItem` (flex-раскладка).

## Scale против Offset — главное правило адаптивности

`UDim2.new(ScaleX, OffsetX, ScaleY, OffsetY)`

- **Scale** — доля от размера родителя (0.5 = 50%). Масштабируется под экран.
- **Offset** — фиксированные пиксели. На телефоне 6" и мониторе 27" выглядят по-разному.

:::tip Практика
- Крупные блоки (панели, колонки) — в **Scale**.
- Небольшие отступы/обводки — в **Offset** (через `UIPadding`).
- Круглые/квадратные элементы — `UIAspectRatioConstraint` (AspectRatio = 1).
- Ограничивайте размеры: `UISizeConstraint` (MinSize/MaxSize), чтобы панель не растягивалась на весь монитор и не «ломалась» на узком экране.
- Текст: `TextScaled = true` + `UITextSizeConstraint` (MinTextSize 14, MaxTextSize 28).
:::

## Мобильные устройства

Большинство аудитории Roblox играет с **телефонов и планшетов** — делайте UI в первую очередь под них.

- **Размер нажатия ≥ 44×44 px** (≈ высота пальца).
- Кнопки не ближе к краям: на смартфонах есть «чёлки» и скруглённые углы — используйте `ScreenGui.ScreenInsets` (`DeviceSafeInsets`) и учитывайте `GuiService:GetGuiInset()`.
- Зона больших пальцев: нижние углы заняты стандартными контролами (джойстик слева, кнопка прыжка справа) — не ставьте туда важные кнопки.
- Проверяйте в Studio: **Test → Device Emulator** (iPhone, Android, планшеты, портрет/ландшафт).
- Не полагайтесь на ховер (мыши нет) — используйте `Activated`.
- Не мелкий текст: на телефоне минимальный комфортный ≈ 14–16 px (в пересчёте).

## Динамическое создание UI кодом

```lua
-- LocalScript в StarterGui/ShopGui
local Players = game:GetService("Players")
local player = Players.LocalPlayer

local gui = script.Parent                     -- ScreenGui
local panel = Instance.new("Frame")
panel.Size = UDim2.fromScale(0.4, 0.6)
panel.AnchorPoint = Vector2.new(0.5, 0.5)     -- центр элемента — точка привязки
panel.Position = UDim2.fromScale(0.5, 0.5)    -- по центру экрана
panel.BackgroundColor3 = Color3.fromRGB(30, 33, 48)

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 12)
corner.Parent = panel

local constraint = Instance.new("UISizeConstraint")
constraint.MinSize = Vector2.new(280, 300)
constraint.MaxSize = Vector2.new(560, 640)
constraint.Parent = panel

panel.Parent = gui
```

`AnchorPoint` — ключ к центрированию: `(0.5, 0.5)` + `Position = {0.5, 0, 0.5, 0}`.

## Раскладки (Layouts)

```lua
local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.Padding = UDim.new(0, 8)
layout.SortOrder = Enum.SortOrder.LayoutOrder     -- порядок по LayoutOrder детей
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.Parent = scrollingFrame

-- авто-размер прокрутки под содержимое:
scrollingFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
scrollingFrame.CanvasSize = UDim2.new()
```

`UIGridLayout` — сетка (инвентарь): `CellSize`, `CellPadding`, `FillDirectionMaxCells`.

## Пример: магазин с кнопками покупки

```lua
-- LocalScript
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local buyEvent = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("BuyItem")

local ITEMS = {                                   -- только для ОТОБРАЖЕНИЯ; цены проверяет сервер
  { id = "Sword", name = "Меч", price = 100 },
  { id = "Bow",   name = "Лук", price = 250 },
}

local list = script.Parent.Panel.List
local template = script.Parent.Panel.ItemTemplate   -- заранее настроенная кнопка (Visible = false)

for i, item in ipairs(ITEMS) do
  local button = template:Clone()
  button.Name = item.id
  button.LayoutOrder = i
  button.Text = `{item.name} — {item.price}`
  button.Visible = true
  button.Activated:Connect(function()
    buyEvent:FireServer(item.id)                   -- отправляем только id
  end)
  button.Parent = list
end
```

## Работа со значениями игрока

Чтобы UI отражал монеты без постоянных запросов — подписывайтесь на изменения:

```lua
local coins = player:WaitForChild("leaderstats"):WaitForChild("Coins")
label.Text = tostring(coins.Value)
coins.Changed:Connect(function(v)
  label.Text = tostring(v)
end)
```

Хорошая практика — отдельные **контроллеры UI** (модули), которые принимают данные и обновляют элементы; логика не смешивается с оформлением.

## Анимации интерфейса

```lua
local TweenService = game:GetService("TweenService")

local function pop(button)
  local info = TweenInfo.new(0.12, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
  local tween = TweenService:Create(button, info, { Size = UDim2.fromScale(0.26, 0.11) })
  tween:Play()
end
```

Маленькие анимации нажатия, плавное открытие панели и звук «клика» резко повышают ощущение качества — и удержание игроков.

## UX-правила интерфейса для игры

1. **Один главный CTA** на экране (кнопка действия выделена цветом).
2. **Обратная связь на каждое действие**: звук, анимация, текст «+100».
3. **Показывайте состояние**: недоступно, загрузка, не хватает денег (серая кнопка + причина).
4. **Не перегружайте**: не больше 5–7 видимых элементов в основном HUD.
5. **Контраст текста**: светлый на тёмном с обводкой (`UIStroke`) — читаемо на любом фоне.
6. **Единый стиль**: одна палитра, один шрифт, один радиус скругления.
7. **Подтверждение** опасных/платных действий (но не для каждой мелочи).
8. **Локализация**: тексты в таблице, не «вшитые» в код (см. `LocalizationService`).

## Задания

::::task easy Центрирование
Какие значения `AnchorPoint` и `Position` нужно задать, чтобы элемент оказался ровно по центру родителя? Запишите в переменные `anchor` и `position` строки вида `"0.5, 0.5"` и `"0.5, 0, 0.5, 0"`.

:::starter
```lua
local anchor = ""
local position = ""
```
:::
:::test
```lua
assert(anchor == "0.5, 0.5", "AnchorPoint = Vector2.new(0.5, 0.5)")
assert(position == "0.5, 0, 0.5, 0", "Position = UDim2.new(0.5, 0, 0.5, 0)")
```
:::
:::answer
```lua
local anchor = "0.5, 0.5"
local position = "0.5, 0, 0.5, 0"
```
Точка привязки в центре элемента + позиция 50%/50% родителя = центр.
:::
::::

::::task mid Форматирование чисел для UI (чистый Lua)
В симуляторах числа быстро растут: напишите `abbreviate(n)`: `999` → `"999"`, `1500` → `"1.5K"`, `2300000` → `"2.3M"`, `4.1e9` → `"4.1B"`, `1.2e12` → `"1.2T"`. Округляйте вниз до одного знака после точки, `.0` отбрасывайте (`2000` → `"2K"`).

:::starter
```lua
local function abbreviate(n)
end
```
:::
:::test
```lua
assert(abbreviate(0) == "0")
assert(abbreviate(999) == "999")
assert(abbreviate(1500) == "1.5K")
assert(abbreviate(2000) == "2K")
assert(abbreviate(2300000) == "2.3M")
assert(abbreviate(4.1e9) == "4.1B")
assert(abbreviate(1.2e12) == "1.2T")
```
:::
:::hint
Список суффиксов `{"", "K", "M", "B", "T"}`. Делите на 1000, пока `n >= 1000`. Округление вниз до десятых: `math.floor(x * 10) / 10`.
:::
:::answer
```lua
local function abbreviate(n)
  local suffixes = {"", "K", "M", "B", "T"}
  local i = 1
  while n >= 1000 and i < #suffixes do
    n = n / 1000
    i += 1
  end
  local rounded = math.floor(n * 10 + 1e-9) / 10
  local text = tostring(rounded)
  return text .. suffixes[i]
end
```
`1e-9` защищает от ошибок двоичной точности (например, `2.3 * 10 = 22.999…`).
:::
::::

::::task mid Размеры панели (чистый Lua)
Напишите `clampPanel(screenW, screenH)`: ширина панели = 40% экрана, но в пределах `[280, 560]`; высота = 60% экрана, в пределах `[300, 640]`. Вернуть `w, h`.

:::starter
```lua
local function clampPanel(screenW, screenH)
end
```
:::
:::test
```lua
local w, h = clampPanel(1920, 1080)
assert(w == 560 and h == 640)
w, h = clampPanel(360, 640)
assert(w == 280 and h == 384)
w, h = clampPanel(1000, 800)
assert(w == 400 and h == 480)
```
:::
:::answer
```lua
local function clampPanel(screenW, screenH)
  local w = math.max(280, math.min(560, screenW * 0.4))
  local h = math.max(300, math.min(640, screenH * 0.6))
  return w, h
end
```
В Studio то же делают `UISizeConstraint` и `Scale`.
:::
::::

## Проверьте себя

::::quiz
Какое событие нужно использовать для кнопок, чтобы работали мышь, касание и геймпад?
- [ ] `MouseButton1Click`
- [x] `Activated`
- [ ] `TouchTap`
`Activated` — универсальный вариант для всех платформ.
::::

::::quiz
Почему для адаптивного UI лучше Scale, чем Offset?
- [ ] Offset запрещён
- [x] Scale масштабируется под размер родителя/экрана, а Offset — фиксированные пиксели и ломается на разных экранах
- [ ] Scale быстрее работает
Комбинируйте Scale с ограничениями размеров.
::::
