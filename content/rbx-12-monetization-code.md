---
title: Монетизация в коде: покупки, пассы, донаты
section: roblox
order: 12
summary: MarketplaceService, Game Pass, Developer Product, ProcessReceipt, подписки, реализация донатов и топ донатеров.
time: 40
level: Продвинутый
---

:::money Как Roblox платит разработчикам
Игрок тратит Robux внутри вашей игры → Roblox удерживает свою комиссию → остаток вы выводите в деньги (DevEx) или тратите на рекламу. Размеры комиссий и курс вывода **меняются** — актуальные цифры смотрите в разделе [[biz-01-payouts]].
:::

## Что можно продавать

| Тип | Покупается | Подходит для | Код |
|---|---|---|---|
| **Game Pass** | один раз, навсегда | VIP, x2 монет, доступ в зону, постоянные бонусы | `UserOwnsGamePassAsync`, `PromptGamePassPurchase` |
| **Developer Product** | много раз | валюта, расходники, «донат на X», буст на 30 минут | `PromptProductPurchase`, `ProcessReceipt` |
| **Subscription** (подписки) | регулярно | VIP-подписка с еженедельными бонусами | `PromptSubscriptionPurchase`, `GetUserSubscriptionStatusAsync` |
| **Paid Access** | вход в игру платный | платные игры/демо | настройка в Creator Hub |
| **Private Servers** | аренда | приватные серверы | настройка цены |
| **Premium Payouts / Creator Rewards** | автоматически | выплаты за время игры подписчиков Premium и т.п. | настройки Creator Hub |
| **Avatar items (UGC)** | на Marketplace | аксессуары, одежда | отдельная программа |
| **Ads** | показы | реклама в игре / рекламные размещения | Creator Hub |

Создаются в **Creator Hub → ваш Experience → Monetization** (Passes / Developer Products). Каждый получает числовой ID.

## Game Pass

```lua
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local VIP_PASS_ID = 123456789          -- ваш ID

local function hasVip(player)
  local ok, owns = pcall(function()
    return MarketplaceService:UserOwnsGamePassAsync(player.UserId, VIP_PASS_ID)
  end)
  return ok and owns
end

Players.PlayerAdded:Connect(function(player)
  if hasVip(player) then
    giveVipPerks(player)
  end
end)

-- покупка прямо в игре (вызов с клиента через Remote → сервер вызывает Prompt)
MarketplaceService:PromptGamePassPurchase(player, VIP_PASS_ID)

-- после покупки в той же сессии:
MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, gamePassId, wasPurchased)
  if wasPurchased and gamePassId == VIP_PASS_ID then
    giveVipPerks(player)
  end
end)
```

Кэшируйте результат владения (на сессию), не вызывайте `UserOwnsGamePassAsync` на каждое действие.

## Developer Product + ProcessReceipt (самое важное)

Единственный надёжный способ выдать товар за Robux — **`ProcessReceipt`**: серверный колбэк, который Roblox вызывает при каждой покупке (и повторяет, пока вы не подтвердите).

```lua
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")

local purchaseStore = DataStoreService:GetDataStore("Purchases_v1")

local PRODUCTS = {
  [1111111] = function(player) CurrencyService.Add(player, "Gems", 100) end,
  [2222222] = function(player) CurrencyService.Add(player, "Gems", 550) end,
  [3333333] = function(player) BoostService.Start(player, "Luck", 30 * 60) end,
}

MarketplaceService.ProcessReceipt = function(receiptInfo)
  -- receiptInfo: PurchaseId, PlayerId, ProductId, CurrencySpent, CurrencyType, PlaceIdWherePurchased
  local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
  if not player then
    return Enum.ProductPurchaseDecision.NotProcessedYet      -- игрок вышел: Roblox повторит при следующем входе
  end

  local handler = PRODUCTS[receiptInfo.ProductId]
  if not handler then
    warn("Неизвестный продукт", receiptInfo.ProductId)
    return Enum.ProductPurchaseDecision.NotProcessedYet
  end

  -- ИДЕМПОТЕНТНОСТЬ: одну покупку нельзя выдать дважды
  local key = tostring(receiptInfo.PlayerId) .. "_" .. tostring(receiptInfo.PurchaseId)
  local alreadyGranted = false

  local ok, err = pcall(function()
    purchaseStore:UpdateAsync(key, function(old)
      if old then
        alreadyGranted = true
        return nil                                 -- не менять
      end
      return { time = os.time(), product = receiptInfo.ProductId }
    end)
  end)
  if not ok then
    warn("Не удалось записать чек:", err)
    return Enum.ProductPurchaseDecision.NotProcessedYet
  end

  if not alreadyGranted then
    local granted, gErr = pcall(handler, player)
    if not granted then
      warn("Ошибка выдачи:", gErr)
      -- откатить запись чека
      pcall(function() purchaseStore:RemoveAsync(key) end)
      return Enum.ProductPurchaseDecision.NotProcessedYet
    end
  end

  return Enum.ProductPurchaseDecision.PurchaseGranted
end
```

:::danger Правила ProcessReceipt
- Только **один** колбэк на игру (последнее присвоение побеждает) — держите всю логику в одном месте.
- Всегда возвращайте решение; не ждайте долго. Если не смогли выдать — `NotProcessedYet`, Roblox повторит.
- Выдавайте товар **идемпотентно**: повторный вызов с тем же `PurchaseId` не должен выдать второй раз. Лучше, если запись чека и выдача хранятся в одном ключе данных игрока (например, внутри ProfileStore: `profile.Data.ReceiptHistory`).
- Не используйте событие `PromptProductPurchaseFinished` для выдачи — оно не гарантирует факт оплаты.
:::

### Запрос покупки

```lua
-- сервер:
MarketplaceService:PromptProductPurchase(player, productId)
-- обычно вызывается из обработчика RemoteEvent (клиент просит «открыть окно покупки»)
```

Получить информацию о продукте (название, цена) — для отображения: `MarketplaceService:GetProductInfo(productId, Enum.InfoType.Product)` (обернуть в `pcall`, кэшировать).

## Донат-система: как сделать

«Донат» в Roblox — это **Developer Product** (несколько вариантов суммы) + красивый UI + таблица топ-донатеров. Правила платформы требуют, чтобы платёж шёл через Robux внутри игры.

:::warn Правила и безопасность
- Платите и принимайте оплату **только** Robux через механизмы Roblox (Passes/Products). Нельзя просить игроков платить вне платформы, обмениваться аккаунтами/куками или «подарками» вне системы.
- Не вводите игроков в заблуждение: не называйте «донатом» то, что фактически даёт игровое преимущество «выигрыш за деньги» без указания (описывайте награду честно).
- Для детской аудитории избегайте давления («только сегодня!», счётчики вины). Игровые правила Roblox и местные законы (в т.ч. по рандомизированным платным предметам — см. [[money-04-ethics-compliance]]) обязательны.
- Фиксируйте суммы **на сервере**; клиент только показывает UI.
:::

### Шаг 1. Создайте продукты

В Creator Hub → Monetization → Developer Products создайте, например: `Donate 10`, `Donate 50`, `Donate 100`, `Donate 500`, `Donate 1000` (цены в Robux). Запишите их ID.

### Шаг 2. Серверный модуль доната

```lua
-- ServerScriptService/DonationService (ModuleScript)
local MarketplaceService = game:GetService("MarketplaceService")
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local DonationService = {}

-- productId → сумма Robux (цена продукта; должна совпадать с Creator Hub)
local DONATION_PRODUCTS = {
  [11111111] = 10,
  [22222222] = 50,
  [33333333] = 100,
  [44444444] = 500,
  [55555555] = 1000,
}

local totalStore = DataStoreService:GetOrderedDataStore("DonationsTotal_v1")
local sessionTotals = {}     -- [UserId] = сумма за этот сервер (для быстрых объявлений)

function DonationService.IsDonationProduct(productId)
  return DONATION_PRODUCTS[productId] ~= nil
end

-- Вызывается из общего ProcessReceipt ПОСЛЕ проверки идемпотентности
function DonationService.Grant(player, productId)
  local amount = DONATION_PRODUCTS[productId]
  if not amount then return false end

  local ok, err = pcall(function()
    totalStore:UpdateAsync(tostring(player.UserId), function(old)
      return (old or 0) + amount
    end)
  end)
  if not ok then
    warn("Donation save failed:", err)
    return false                           -- вернёт NotProcessedYet → Roblox повторит
  end

  sessionTotals[player.UserId] = (sessionTotals[player.UserId] or 0) + amount
  return true
end

function DonationService.GetTop(count)
  local ok, pages = pcall(function()
    return totalStore:GetSortedAsync(false, count)
  end)
  if not ok then return {} end
  local out = {}
  for _, entry in ipairs(pages:GetCurrentPage()) do
    local userId = tonumber(entry.key)
    local nameOk, name = pcall(Players.GetNameFromUserIdAsync, Players, userId)
    table.insert(out, { userId = userId, name = nameOk and name or "???", amount = entry.value })
  end
  return out
end

return DonationService
```

### Шаг 3. Единый ProcessReceipt

В скрипте из предыдущего раздела добавьте ветку: если `DonationService.IsDonationProduct(productId)` → `DonationService.Grant(player, productId)` (вместо обработчика из таблицы `PRODUCTS`). Идемпотентность и `NotProcessedYet` — те же.

### Шаг 4. Клиентский UI

```lua
-- LocalScript
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local askDonate = ReplicatedStorage.Remotes.AskDonate     -- RemoteEvent

for _, button in ipairs(script.Parent.Panel.Buttons:GetChildren()) do
  if button:IsA("TextButton") then
    button.Activated:Connect(function()
      askDonate:FireServer(button:GetAttribute("ProductId"))      -- клиент присылает только ID продукта
    end)
  end
end
```

```lua
-- сервер: обработчик с валидацией
askDonate.OnServerEvent:Connect(function(player, productId)
  if typeof(productId) ~= "number" or not DonationService.IsDonationProduct(productId) then return end
  MarketplaceService:PromptProductPurchase(player, productId)
end)
```

### Шаг 5. Табло «Топ донатеров» и благодарность

- Раз в 2–5 минут вызывайте `DonationService.GetTop(10)` и обновляйте `SurfaceGui` на доске в мире.
- Для «спасибо» всем: после успешной выдачи отправляйте `RemoteEvent` всем клиентам: `"Ann поддержала проект на 100 R$!"` — приятный социальный сигнал (без давления).
- Награда за донат (необязательно): бейдж, цвет ника в чате, украшение/питомец — **косметика**, не нарушающая баланс.

## Gamepass vs Developer Product для «доната»

| Критерий | Game Pass | Developer Product |
|---|---|---|
| Можно купить многократно | нет | да |
| Подходит для «поддержать проект» | один раз | несколько сумм, любое число раз |
| Хранение факта покупки | Roblox (всегда проверяется `UserOwnsGamePassAsync`) | ваш DataStore (вы сами храните результат) |
| Сложность | низкая | выше (ProcessReceipt) |

## Подписки

```lua
local status = MarketplaceService:GetUserSubscriptionStatusAsync(player, SUBSCRIPTION_ID)
if status.IsSubscribed then ... end

MarketplaceService:PromptSubscriptionPurchase(player, SUBSCRIPTION_ID)
```

Бонусы подписки выдавайте при входе и по расписанию (раз в день/неделю), проверяя статус; учитывайте отмену и истечение.

## Аналитика экономики

Фиксируйте источники и расходы валюты (`AnalyticsService:LogEconomyEvent` / собственные логи): сколько выдано бесплатно, сколько куплено, где игроки застревают. Без этого невозможно балансировать игру и понимать, почему не растёт доход.

## Задания

::::task mid Идемпотентная выдача (чистый Lua)
Смоделируйте обработчик покупки. Напишите `makeReceiptProcessor(grant)`: возвращает `process(receipt)`, где `receipt = {PurchaseId, PlayerId, ProductId}`. Если `PurchaseId` уже обработан — вернуть `"PurchaseGranted"` **без** повторного вызова `grant`. Если `grant` бросает ошибку — вернуть `"NotProcessedYet"` и не отмечать покупку как обработанную. Иначе вызвать `grant(receipt)`, отметить и вернуть `"PurchaseGranted"`.

:::starter
```lua
local function makeReceiptProcessor(grant)
end
```
:::
:::test
```lua
local given = 0
local fail = false
local process = makeReceiptProcessor(function(r)
  if fail then error("boom", 0) end
  given += 1
end)
assert(process({PurchaseId = "a", PlayerId = 1, ProductId = 10}) == "PurchaseGranted" and given == 1)
assert(process({PurchaseId = "a", PlayerId = 1, ProductId = 10}) == "PurchaseGranted" and given == 1, "дубль не должен выдавать")
fail = true
assert(process({PurchaseId = "b", PlayerId = 1, ProductId = 10}) == "NotProcessedYet" and given == 1)
fail = false
assert(process({PurchaseId = "b", PlayerId = 1, ProductId = 10}) == "PurchaseGranted" and given == 2)
```
:::
:::answer
```lua
local function makeReceiptProcessor(grant)
  local processed = {}
  return function(receipt)
    if processed[receipt.PurchaseId] then
      return "PurchaseGranted"
    end
    local ok = pcall(grant, receipt)
    if not ok then
      return "NotProcessedYet"
    end
    processed[receipt.PurchaseId] = true
    return "PurchaseGranted"
  end
end
```
В настоящей игре «processed» хранится в DataStore (или в профиле игрока), чтобы пережить перезапуск сервера.
:::
::::

::::task mid Топ донатеров (чистый Lua)
Напишите `topDonors(donations, n)`: `donations` — массив `{name, amount}` (имена могут повторяться — суммируйте). Вернуть массив строк `"Имя: сумма"` для `n` лучших по убыванию суммы; при равных суммах — по имени по возрастанию.

:::starter
```lua
local function topDonors(donations, n)
end
```
:::
:::test
```lua
local d = {
  {name = "Ann", amount = 10}, {name = "Bob", amount = 50},
  {name = "Ann", amount = 100}, {name = "Cid", amount = 50},
}
local r = topDonors(d, 3)
assert(r[1] == "Ann: 110" and r[2] == "Bob: 50" and r[3] == "Cid: 50")
assert(#topDonors(d, 1) == 1)
assert(#topDonors({}, 5) == 0)
```
:::
:::answer
```lua
local function topDonors(donations, n)
  local totals, names = {}, {}
  for _, d in ipairs(donations) do
    if totals[d.name] == nil then
      table.insert(names, d.name)
      totals[d.name] = 0
    end
    totals[d.name] += d.amount
  end
  table.sort(names, function(a, b)
    if totals[a] ~= totals[b] then
      return totals[a] > totals[b]
    end
    return a < b
  end)
  local out = {}
  for i = 1, math.min(n, #names) do
    out[i] = names[i] .. ": " .. totals[names[i]]
  end
  return out
end
```
:::
::::

## Проверьте себя

::::quiz
Где надёжно выдавать товар за Developer Product?
- [ ] В `PromptProductPurchaseFinished`
- [x] В `MarketplaceService.ProcessReceipt` (серверный колбэк) с проверкой идемпотентности
- [ ] На клиенте после нажатия кнопки
Только `ProcessReceipt` гарантирует, что покупка действительно совершена, и повторяется, пока вы не вернёте `PurchaseGranted`.
::::

::::quiz
Что вернуть из `ProcessReceipt`, если игрок вышел до выдачи?
- [ ] `PurchaseGranted`
- [x] `NotProcessedYet`
- [ ] `nil`
Roblox повторит вызов при следующем заходе игрока — покупка не потеряется.
::::

::::quiz
Что клиент должен отправить серверу при нажатии «Задонатить 100»?
- [ ] Сумму и свой баланс
- [x] Только идентификатор продукта; всё остальное определяет сервер
- [ ] Ничего: кнопка сама списывает Robux
Идентификатор проверяется по серверной таблице разрешённых продуктов.
::::
