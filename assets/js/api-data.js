/* Курируемая шпаргалка по API Roblox и Luau: "Группа|Имя|Тип|Описание". Полный справочник — create.roblox.com/docs/reference/engine */
(function () {
  const RAW = `
Luau: глобальные|print(...)|Функция|Вывести значения в Output
Luau: глобальные|warn(...)|Функция|Жёлтое предупреждение в Output
Luau: глобальные|error(msg, level)|Функция|Бросить ошибку; level 2 — указать на вызывающий код
Luau: глобальные|assert(v, msg)|Функция|Ошибка, если v ложно; иначе вернуть v
Luau: глобальные|pcall(f, ...)|Функция|Защищённый вызов: true, результат | false, ошибка
Luau: глобальные|xpcall(f, handler, ...)|Функция|pcall с обработчиком ошибки (для traceback)
Luau: глобальные|type(v) / typeof(v)|Функция|Имя типа; typeof знает типы Roblox (Vector3, Instance…)
Luau: глобальные|tostring(v) / tonumber(s, base)|Функция|Преобразование значений
Luau: глобальные|pairs(t) / ipairs(t) / next(t)|Функция|Итерация по таблице
Luau: глобальные|select(n, ...)|Функция|Выбор аргументов; select("#", ...) — число аргументов
Luau: глобальные|setmetatable(t, mt) / getmetatable(t)|Функция|Метатаблицы (ООП)
Luau: глобальные|rawget / rawset / rawequal / rawlen|Функция|Доступ в обход метаметодов
Luau: глобальные|require(module)|Функция|Подключить ModuleScript (результат кэшируется)
Luau: глобальные|game|Глобал|Корень DataModel
Luau: глобальные|workspace|Глобал|Сервис Workspace
Luau: глобальные|script|Глобал|Текущий скрипт; script.Parent — родитель
Luau: глобальные|shared / _G|Глобал|Общие таблицы (не рекомендуется использовать)
Luau: глобальные|wait / spawn / delay|Функция|УСТАРЕЛИ — используйте task.*
string|string.format(fmt, ...)|Функция|Форматирование: %d %s %.2f %5d %x
string|string.sub(s, i, j)|Функция|Подстрока (индексы с 1, отрицательные — с конца)
string|string.find(s, pat, init, plain)|Функция|Найти шаблон; возвращает start, end, captures
string|string.match(s, pat)|Функция|Первое совпадение / захваты
string|string.gmatch(s, pat)|Функция|Итератор по совпадениям
string|string.gsub(s, pat, repl, n)|Функция|Замена; возвращает строку и число замен
string|string.split(s, sep)|Функция|Luau: разбить на массив
string|string.rep(s, n, sep)|Функция|Повторить строку
string|string.lower / string.upper|Функция|Регистр
string|string.len(s) / #s|Функция|Длина в БАЙТАХ
string|string.byte / string.char|Функция|Коды символов
string|string.reverse(s)|Функция|Развернуть
string|utf8.len(s) / utf8.char / utf8.codes|Функция|Работа с Unicode-символами
table|table.insert(t, [pos,] v)|Функция|Вставить элемент
table|table.remove(t, [pos])|Функция|Удалить и вернуть элемент
table|table.sort(t, cmp)|Функция|Сортировка на месте (не стабильная)
table|table.concat(t, sep)|Функция|Склеить в строку
table|table.unpack(t, i, j)|Функция|Элементы как значения
table|table.pack(...)|Функция|Упаковать аргументы (поле n)
table|table.find(t, v, init)|Функция|Luau: индекс значения или nil
table|table.clone(t)|Функция|Luau: поверхностная копия
table|table.clear(t)|Функция|Luau: очистить таблицу
table|table.freeze(t) / table.isfrozen(t)|Функция|Luau: сделать таблицу неизменяемой
table|table.create(n, v)|Функция|Luau: создать массив заданного размера
table|table.move(a, f, e, t, dst)|Функция|Скопировать диапазон
math|math.floor / ceil / round|Функция|Округление (round — Luau)
math|math.abs / sign|Функция|Модуль, знак
math|math.min / max / clamp|Функция|Границы (clamp — Luau)
math|math.sqrt / pow / exp / log|Функция|Корень, степень, экспонента, логарифм
math|math.sin / cos / tan / rad / deg|Функция|Тригонометрия, радианы↔градусы
math|math.random(m, n) / randomseed|Функция|Случайные числа; для серьёзного — Random.new()
math|math.noise(x, y, z)|Функция|Шум Перлина (ландшафт)
math|math.huge / math.pi|Константа|Бесконечность / число пи
math|math.lerp(a, b, t)|Функция|Линейная интерполяция
os / bit32 / buffer|os.time() / os.clock() / os.date()|Функция|Время (Unix) / процессорное время / дата
os / bit32 / buffer|bit32.band / bor / bxor / lshift / rshift|Функция|Битовые операции
os / bit32 / buffer|buffer.create / readu8 / writeu32 …|Функция|Двоичный буфер фиксированного размера
task / coroutine|task.spawn(f, ...)|Функция|Запустить функцию сразу в новом потоке
task / coroutine|task.defer(f, ...)|Функция|Запустить в конце текущего цикла
task / coroutine|task.delay(t, f, ...)|Функция|Запустить через t секунд
task / coroutine|task.wait(t)|Функция|Пауза потока (≈ кадр по умолчанию)
task / coroutine|task.cancel(thread)|Функция|Отменить поток
task / coroutine|coroutine.create / resume / yield / wrap / status|Функция|Корутины
Instance|Instance.new(className)|Функция|Создать объект (Parent задавайте последним)
Instance|Name / ClassName / Parent|Свойство|Имя, класс, родитель
Instance|:Clone()|Метод|Копия с потомками
Instance|:Destroy()|Метод|Удалить объект и отключить его события
Instance|:ClearAllChildren()|Метод|Удалить всех потомков
Instance|:FindFirstChild(name, recursive)|Метод|Найти ребёнка или nil
Instance|:FindFirstChildOfClass(class)|Метод|Найти по точному классу
Instance|:FindFirstChildWhichIsA(class)|Метод|Найти по классу с наследованием
Instance|:FindFirstAncestor(name) / OfClass|Метод|Найти предка
Instance|:WaitForChild(name, timeout)|Метод|Ждать появления ребёнка
Instance|:GetChildren() / :GetDescendants()|Метод|Дети / все потомки
Instance|:IsA(className)|Метод|Проверка класса с учётом наследования
Instance|:IsDescendantOf(instance)|Метод|Является ли потомком
Instance|:SetAttribute(name, value) / :GetAttribute(name)|Метод|Пользовательские атрибуты
Instance|:GetAttributeChangedSignal(name)|Метод|Событие изменения атрибута
Instance|ChildAdded / ChildRemoved|Событие|Добавлен/удалён ребёнок
Instance|DescendantAdded / DescendantRemoving|Событие|Добавлен/удаляется потомок
Instance|Changed / GetPropertyChangedSignal(prop)|Событие|Изменение свойства
Instance|AncestryChanged / Destroying|Событие|Смена предка / объект удаляется
BasePart|Position / Orientation / CFrame|Свойство|Положение и поворот
BasePart|Size / Color / Material / Transparency|Свойство|Размер и внешний вид
BasePart|Anchored / CanCollide / CanTouch / CanQuery|Свойство|Физика и запросы
BasePart|Massless / CustomPhysicalProperties|Свойство|Масса, плотность/трение
BasePart|AssemblyLinearVelocity / AssemblyAngularVelocity|Свойство|Скорость сборки
BasePart|CollisionGroup|Свойство|Группа коллизий (имя)
BasePart|:ApplyImpulse(Vector3)|Метод|Мгновенный толчок
BasePart|:SetNetworkOwner(player) / :GetNetworkOwner()|Метод|Владелец физики (nil = сервер)
BasePart|Touched / TouchEnded|Событие|Касание начато / закончено
Model|:PivotTo(cframe) / :GetPivot()|Метод|Переместить / получить центр модели
Model|:GetExtentsSize() / :GetBoundingBox()|Метод|Габариты
Model|:ScaleTo(n) / :GetScale()|Метод|Масштаб модели
Model|PrimaryPart|Свойство|Опорная часть модели
Workspace|:Raycast(origin, dir, params)|Метод|Луч → RaycastResult или nil
Workspace|:GetPartBoundsInBox(cf, size, params)|Метод|Части в объёме
Workspace|:GetPartBoundsInRadius(pos, r, params)|Метод|Части в радиусе
Workspace|:GetPartsInPart(part, params)|Метод|Части, пересекающие часть
Workspace|CurrentCamera|Свойство|Камера клиента
Workspace|StreamingEnabled / Gravity|Свойство|Стриминг мира / гравитация
Workspace|:GetServerTimeNow()|Метод|Серверное время (синхронизировано)
RaycastParams|FilterType / FilterDescendantsInstances|Свойство|Exclude/Include и список объектов
RaycastParams|IgnoreWater / CollisionGroup|Свойство|Игнор воды / группа коллизий
RaycastResult|Instance / Position / Normal / Material / Distance|Свойство|Результат попадания луча
Players|PlayerAdded / PlayerRemoving|Событие|Игрок зашёл / выходит (сохраняйте здесь)
Players|:GetPlayers()|Метод|Список игроков
Players|:GetPlayerFromCharacter(model)|Метод|Игрок по персонажу
Players|:GetPlayerByUserId(id)|Метод|Игрок по UserId
Players|:GetNameFromUserIdAsync(id) / :GetUserIdFromNameAsync(name)|Метод|Имя ↔ UserId (yield, pcall)
Players|LocalPlayer|Свойство|Игрок клиента (только LocalScript)
Players|CharacterAutoLoads / RespawnTime|Свойство|Автозагрузка персонажа / время респавна
Player|UserId / Name / DisplayName|Свойство|Идентификатор и имена
Player|Character / CharacterAdded / CharacterRemoving|Свойство/Событие|Персонаж и события
Player|PlayerGui / Backpack / PlayerScripts|Свойство|Контейнеры игрока
Player|Team / TeamColor|Свойство|Команда
Player|MembershipType|Свойство|Enum.MembershipType (Premium)
Player|AccountAge|Свойство|Возраст аккаунта в днях
Player|:LoadCharacter() / :Kick(msg)|Метод|Создать персонажа / выкинуть
Player|:IsInGroup(id) / :GetRankInGroup(id)|Метод|Группы (yield, pcall)
Humanoid|Health / MaxHealth|Свойство|Здоровье
Humanoid|WalkSpeed / JumpPower / JumpHeight / UseJumpPower|Свойство|Скорость и прыжок
Humanoid|:TakeDamage(n)|Метод|Урон с учётом ForceField
Humanoid|:MoveTo(pos) / MoveToFinished|Метод/Событие|Идти в точку
Humanoid|:ChangeState(Enum.HumanoidStateType)|Метод|Сменить состояние
Humanoid|Died / HealthChanged / StateChanged / Running|Событие|События персонажа
Humanoid|:ApplyDescription(HumanoidDescription)|Метод|Применить внешность
Animator|:LoadAnimation(animation)|Метод|Загрузить анимацию → AnimationTrack
AnimationTrack|:Play(fade) / :Stop(fade) / :AdjustSpeed(n)|Метод|Управление анимацией
AnimationTrack|Priority / Looped / Length|Свойство|Приоритет, цикл, длительность
AnimationTrack|KeyframeReached / Stopped / Ended|Событие|События анимации
RunService|Heartbeat / PreSimulation / PostSimulation|Событие|После/перед физикой (каждый кадр)
RunService|RenderStepped / PreRender|Событие|Перед отрисовкой (только клиент)
RunService|:IsServer() / :IsClient() / :IsStudio()|Метод|Определить контекст
TweenService|:Create(instance, tweenInfo, goal)|Метод|Создать Tween
TweenService|:GetValue(alpha, style, direction)|Метод|Значение функции плавности
Tween|:Play() / :Pause() / :Cancel()|Метод|Управление Tween
Tween|Completed|Событие|Tween завершён
TweenInfo|TweenInfo.new(time, style, dir, repeat, reverses, delay)|Конструктор|Параметры анимации
CollectionService|:AddTag(obj, tag) / :RemoveTag / :HasTag|Метод|Теги
CollectionService|:GetTagged(tag)|Метод|Все объекты с тегом
CollectionService|:GetInstanceAddedSignal(tag)|Метод|Событие: объект получил тег
Debris|:AddItem(instance, lifetime)|Метод|Удалить объект через N секунд
ReplicatedStorage|(контейнер)|Сервис|Видят и сервер, и клиент: модули, ремоуты, ассеты
ServerStorage|(контейнер)|Сервис|Только сервер: ассеты и модули
ServerScriptService|(контейнер)|Сервис|Только сервер: скрипты
StarterGui|(контейнер)|Сервис|UI копируется игроку в PlayerGui
StarterPlayer|StarterPlayerScripts / StarterCharacterScripts|Контейнер|Клиентские скрипты игрока / персонажа
ReplicatedFirst|(контейнер)|Сервис|Загружается первым (экран загрузки)
RemoteEvent|:FireServer(...) / OnServerEvent(player, ...)|Метод/Событие|Клиент → сервер
RemoteEvent|:FireClient(player, ...) / :FireAllClients(...)|Метод|Сервер → клиент(ы)
RemoteEvent|OnClientEvent(...)|Событие|Клиент принимает от сервера
RemoteFunction|:InvokeServer(...) / OnServerInvoke|Метод/Колбэк|Запрос клиента с ответом
RemoteFunction|:InvokeClient(...)|Метод|ОПАСНО: клиент может не ответить
UnreliableRemoteEvent|(как RemoteEvent)|Класс|Без гарантии доставки/порядка (эффекты)
BindableEvent|:Fire(...) / Event|Метод/Событие|События внутри одной стороны (сервер или клиент)
BindableFunction|:Invoke(...) / OnInvoke|Метод|Вызов с ответом внутри одной стороны
UserInputService|InputBegan / InputEnded / InputChanged|Событие|Ввод (параметр gameProcessed!)
UserInputService|:IsKeyDown(key) / :GetMouseLocation()|Метод|Состояние клавиш и мыши
UserInputService|TouchEnabled / KeyboardEnabled / GamepadEnabled|Свойство|Доступные устройства ввода
ContextActionService|:BindAction(name, fn, touchBtn, ...inputs)|Метод|Привязать действие (+ мобильная кнопка)
ContextActionService|:UnbindAction(name)|Метод|Снять привязку
ProximityPrompt|Triggered(player) / HoldDuration|Событие/Свойство|«Нажми E» взаимодействие (событие на сервере)
ClickDetector|MouseClick(player)|Событие|Клик по части
ScreenGui|ResetOnSpawn / IgnoreGuiInset / ZIndexBehavior|Свойство|Настройки экрана UI
GuiObject|Size / Position / AnchorPoint|Свойство|Размер, позиция, точка привязки (UDim2/Vector2)
GuiObject|Visible / BackgroundColor3 / BackgroundTransparency|Свойство|Видимость и фон
TextButton|Activated|Событие|Нажатие (мышь, касание, геймпад)
TextLabel|Text / TextScaled / TextColor3 / Font|Свойство|Текст и его оформление
ScrollingFrame|CanvasSize / AutomaticCanvasSize|Свойство|Область прокрутки
UIListLayout|FillDirection / Padding / SortOrder|Свойство|Раскладка в список
UIGridLayout|CellSize / CellPadding|Свойство|Сетка
UICorner / UIStroke / UIPadding / UIGradient|(модификаторы)|Класс|Скругление, обводка, отступы, градиент
UIAspectRatioConstraint|AspectRatio|Свойство|Фиксированное соотношение сторон
UISizeConstraint|MinSize / MaxSize|Свойство|Границы размера
DataStoreService|:GetDataStore(name)|Метод|Получить хранилище
DataStoreService|:GetOrderedDataStore(name)|Метод|Упорядоченное хранилище (лидерборды)
DataStore|:GetAsync(key)|Метод|Прочитать значение (pcall!)
DataStore|:SetAsync(key, value)|Метод|Записать (перезаписывает)
DataStore|:UpdateAsync(key, fn)|Метод|Атомарное изменение значения
DataStore|:IncrementAsync(key, delta)|Метод|Прибавить к числу
DataStore|:RemoveAsync(key)|Метод|Удалить ключ
OrderedDataStore|:GetSortedAsync(ascending, pageSize)|Метод|Страницы по порядку значений
MemoryStoreService|:GetSortedMap(name) / :GetQueue(name)|Метод|Быстрая временная общая память
MessagingService|:PublishAsync(topic, msg) / :SubscribeAsync(topic, fn)|Метод|Сообщения между серверами
MarketplaceService|:UserOwnsGamePassAsync(userId, passId)|Метод|Владеет ли игрок геймпассом
MarketplaceService|:PromptGamePassPurchase(player, passId)|Метод|Показать окно покупки пасса
MarketplaceService|:PromptProductPurchase(player, productId)|Метод|Показать окно покупки продукта
MarketplaceService|ProcessReceipt = function(receiptInfo)|Колбэк|Выдать товар за Developer Product (один на игру!)
MarketplaceService|:GetProductInfo(id, infoType)|Метод|Название/цена продукта (pcall, кэш)
MarketplaceService|:PromptSubscriptionPurchase(player, id)|Метод|Покупка подписки
MarketplaceService|:GetUserSubscriptionStatusAsync(player, id)|Метод|Статус подписки
BadgeService|:AwardBadge(userId, badgeId) / :UserHasBadgeAsync|Метод|Выдать / проверить бейдж
TeleportService|:TeleportAsync(placeId, players, options)|Метод|Телепорт между плейсами/серверами
HttpService|:JSONEncode(t) / :JSONDecode(s)|Метод|JSON ↔ таблица
HttpService|:GenerateGUID(false)|Метод|Уникальный идентификатор
HttpService|:RequestAsync({Url, Method, Headers, Body})|Метод|HTTP-запрос (нужно включить HttpEnabled)
TextService|:FilterStringAsync(text, userId)|Метод|Фильтрация пользовательского текста (обязательно)
PathfindingService|:CreatePath(params) → :ComputeAsync(a, b)|Метод|Поиск пути для NPC
PhysicsService|:RegisterCollisionGroup / :CollisionGroupSetCollidable|Метод|Группы коллизий
SoundService|:PlayLocalSound(sound)|Метод|Проиграть звук локально (клиент)
Lighting|ClockTime / Brightness / Ambient / Atmosphere|Свойство|Освещение и время суток
Random|Random.new(seed) :NextInteger(a, b) / :NextNumber()|Класс|Генератор случайных чисел с seed
Vector3|Vector3.new(x, y, z) .Magnitude .Unit :Dot :Cross :Lerp|Тип|3D-вектор; константы zero, one, xAxis…
Vector2|Vector2.new(x, y)|Тип|2D-вектор (экран, UI)
CFrame|CFrame.new / lookAt / Angles / fromOrientation|Тип|Положение + поворот; умножение объединяет
CFrame|.Position / .LookVector / :Inverse() / :Lerp()|Тип|Свойства и методы CFrame
Color3|Color3.fromRGB / fromHSV / new / fromHex|Тип|Цвет (компоненты R, G, B в 0..1)
UDim2|UDim2.new(sx, ox, sy, oy) / fromScale / fromOffset|Тип|Размер/позиция UI: Scale + Offset
Enum|Enum.Material / EasingStyle / KeyCode / UserInputType|Тип|Перечисления свойств и констант
DateTime|DateTime.now() .UnixTimestamp :FormatLocalTime()|Тип|Дата и время
NumberSequence|NumberSequence.new(...)|Тип|Кривая значений (частицы)
ParticleEmitter|:Emit(n) / Rate / Lifetime / Speed|Класс|Частицы
Sound|SoundId / Volume / :Play() / Ended|Класс|Звук (rbxassetid://…)
Highlight|FillColor / OutlineColor|Класс|Контур/подсветка объекта
HumanoidDescription|(внешность аватара)|Класс|Описание аватара для ApplyDescription
`;
  window.API_DATA = RAW.trim()
    .split('\n')
    .map((l) => l.split('|'))
    .filter((p) => p.length >= 4)
    .map((p) => [p[0].trim(), p[1].trim(), p[2].trim(), p.slice(3).join('|').trim()]);
})();
