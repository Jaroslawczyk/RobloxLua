---
title: Tween, анимации, звук и эффекты
section: roblox
order: 8
summary: TweenService, Animator и AnimationTrack, Sound, частицы, освещение и «сочность» игры.
time: 25
level: Средний
---

## TweenService: плавное изменение свойств

```lua
local TweenService = game:GetService("TweenService")

local door = workspace.Door
local info = TweenInfo.new(1.5, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local goal = { Position = door.Position + Vector3.new(0, 10, 0), Transparency = 0.5 }

local tween = TweenService:Create(door, info, goal)
tween:Play()
tween.Completed:Wait()           -- дождаться конца
print("Дверь открыта")
```

| Метод/событие Tween | Назначение |
|---|---|
| `:Play()`, `:Pause()`, `:Cancel()` | управление |
| `Completed(playbackState)` | событие окончания |
| `PlaybackState` | `Begin`, `Playing`, `Completed`, `Cancelled`… |

**EasingStyle**: `Linear`, `Sine`, `Quad`, `Cubic`, `Quart`, `Quint`, `Exponential`, `Circular`, `Back`, `Elastic`, `Bounce`. **EasingDirection**: `In`, `Out`, `InOut`.

Анимируемые свойства: числа, `Vector3`, `CFrame`, `Color3`, `UDim2`, `boolean` (мгновенно), и др. Нельзя анимировать несколько *разных* объектов одним Tween — создавайте по одному на объект.

:::tip Серверные Tween для физических объектов
Tween на сервере реплицируется скачками. Для плавности визуальных эффектов делайте Tween **на клиенте** (сервер лишь отправляет событие «открыть дверь»). Для коллизий и логики — на сервере.
:::

## Анимации персонажа

Анимации создаются в **Animation Editor** (плагин Roblox, Avatar → Animation Editor) или импортируются; публикуются как ассеты с ID `rbxassetid://…`.

```lua
local humanoid = character:WaitForChild("Humanoid")
local animator = humanoid:WaitForChild("Animator")

local animation = Instance.new("Animation")
animation.AnimationId = "rbxassetid://1234567890"

local track = animator:LoadAnimation(animation)    -- Animator:LoadAnimation, а не Humanoid:LoadAnimation
track.Priority = Enum.AnimationPriority.Action
track.Looped = false
track:Play(0.1)                                    -- fadeTime
track:AdjustSpeed(1.5)

track.Stopped:Connect(function() print("анимация закончилась") end)
track.KeyframeReached:Connect(function(name)
  if name == "Hit" then dealDamage() end           -- события в Animation Editor (Animation Events)
end)
```

:::warn Устаревшее
`Humanoid:LoadAnimation` — deprecated. Всегда загружайте через `Animator`. Загружайте анимацию **один раз** и храните `track`, а не загружайте при каждом использовании.
:::

Приоритеты: `Idle < Movement < Action < Action2/3/4 < Core`; более высокий приоритет перекрывает низкий.

## Звуки

```lua
local sound = Instance.new("Sound")
sound.SoundId = "rbxassetid://9120386436"
sound.Volume = 0.6
sound.PlaybackSpeed = 1
sound.Parent = workspace                     -- или SoundService
sound:Play()
sound.Ended:Wait()
sound:Destroy()

-- удобно для коротких эффектов:
local SoundService = game:GetService("SoundService")
SoundService:PlayLocalSound(sound)           -- клиент: звук без пространственной привязки
```

Если `Sound.Parent` — часть в мире, звук **пространственный** (громче вблизи; `RollOffMode`, `RollOffMaxDistance`). Группы: `SoundGroup` + эффекты (`ReverbSoundEffect`, `EqualizerSoundEffect`…) — для громкости музыки/эффектов отдельно.

## Частицы и эффекты

| Объект | Для чего |
|---|---|
| `ParticleEmitter` | дым, искры, золото (`:Emit(n)` — разовый выброс) |
| `Trail` | след за движущейся частью |
| `Beam` | луч между двумя `Attachment` |
| `Fire`, `Smoke`, `Sparkles` | простые готовые эффекты |
| `Highlight` | подсветка/контур объекта |
| `PointLight`, `SpotLight`, `SurfaceLight` | источники света |
| `Explosion` | взрыв (осторожно: может разрушать/убивать, настройте `BlastPressure`, `DestroyJointRadiusPercent`) |
| `Atmosphere`, `Sky`, `Bloom`, `ColorCorrection`, `DepthOfField`, `SunRays` | пост-обработка/атмосфера в `Lighting` |

```lua
local emitter = coin:FindFirstChildOfClass("ParticleEmitter")
if emitter then emitter:Emit(20) end      -- «взрыв» блёсток при подборе монеты
```

## Камера

На клиенте: `workspace.CurrentCamera`. `CameraType = Enum.CameraType.Scriptable` — вы управляете `CFrame` сами (кат-сцены):

```lua
local camera = workspace.CurrentCamera
camera.CameraType = Enum.CameraType.Scriptable
camera.CFrame = CFrame.lookAt(Vector3.new(0, 20, 30), Vector3.new(0, 5, 0))

-- вернуть управление:
camera.CameraType = Enum.CameraType.Custom
```

## «Сочность» (game feel) — дёшево и эффективно

Игрок чувствует качество через мелочи. Минимальный набор для любого действия «получил награду»:

1. **Звук** (короткий, приятный; не слишком громкий).
2. **Частицы/блики** в месте события.
3. **Всплывающий текст** `+100` и анимация числа в HUD.
4. **Tween-«пульс»** иконки (масштаб 1 → 1.2 → 1).
5. **Тряска камеры/вибрация** при ударах (мягко).

## Задания

::::task easy Подобрать Tween
Подберите `TweenInfo`, чтобы кнопка «выпрыгивала» с лёгким отскоком за 0.3 сек. Запишите в `style` строку `Back` или `Bounce` (одна подходит лучше), в `direction` — `Out`.

:::starter
```lua
local style = ""
local direction = ""
```
:::
:::test
```lua
assert(style == "Back" or style == "Bounce")
assert(direction == "Out")
```
:::
:::answer
```lua
local style = "Back"
local direction = "Out"
-- TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
```
`Back/Out` — лёгкий «перелёт» и возврат; `Bounce` — отскоки как у мяча (для кнопок часто слишком навязчиво).
:::
::::

::::task mid Плавное число (чистый Lua)
В HUD число монет не прыгает, а «накручивается». Напишите `countUp(from, to, steps)` — массив из `steps` промежуточных значений, равномерно от `from` (не включая) до `to` (включая), округлённых вниз.

:::starter
```lua
local function countUp(from, to, steps)
end
```
:::
:::test
```lua
local r = countUp(0, 100, 4)
assert(table.concat(r, ",") == "25,50,75,100")
local q = countUp(10, 20, 5)
assert(q[#q] == 20 and #q == 5)
```
:::
:::answer
```lua
local function countUp(from, to, steps)
  local out = {}
  for i = 1, steps do
    out[i] = math.floor(from + (to - from) * i / steps)
  end
  return out
end
```
В игре значения выдаются по кадрам в `RenderStepped`, либо через `NumberValue` + Tween.
:::
::::

## Проверьте себя

::::quiz
Где загружать анимацию правильно?
- [ ] `Humanoid:LoadAnimation(anim)` каждый раз при использовании
- [x] `Animator:LoadAnimation(anim)` один раз и хранить `AnimationTrack`
- [ ] Не нужно загружать
`Humanoid:LoadAnimation` устарел; повторные загрузки — трата ресурсов.
::::

::::quiz
Где лучше выполнять визуальный Tween двери (если важна плавность для игрока)?
- [ ] Только на сервере
- [x] На клиенте по сигналу сервера
- [ ] Не использовать Tween
Серверные tween’ы реплицируются «ступеньками» с задержкой.
::::
