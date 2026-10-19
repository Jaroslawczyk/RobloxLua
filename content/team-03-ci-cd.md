---
title: CI/CD: автопроверки и публикация через Open Cloud
section: team
order: 3
summary: GitHub Actions для проверок, окружения Dev/Prod, публикация плейса по API, версионирование, откат и мониторинг.
time: 30
level: Продвинутый
---

## Зачем автоматизация

Ручной релиз = забытые шаги, «работало у меня», публикация не той ветки. CI/CD (Continuous Integration/Delivery) делает процесс **повторяемым**: каждый PR проверяется автоматически, а релиз выполняется одной кнопкой/тегом.

## Окружения

| Окружение | Для чего | Кто видит |
|---|---|---|
| **Local** | Studio + Rojo | вы |
| **Dev (Staging)** | закрытый Experience (отдельный Universe) для проверки сборок | команда + тестеры |
| **Production** | публичная игра | игроки |

Одинаковые скрипты, разные `PlaceId`/`UniverseId` и разные **DataStore** (имена с суффиксом: `PlayerData_dev` / `PlayerData`).

```lua
local IS_PROD = game.GameId == 1234567890      -- ID продакшн-Universe
local DATASTORE_NAME = IS_PROD and "PlayerData_v1" or "PlayerData_dev_v1"
```

## Этап 1: проверки на каждый PR

Файл `.github/workflows/check.yml` (шаблон):

```yaml
name: Check
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Установите Rokit (инструменты из rokit.toml: rojo, stylua, selene, wally) — по README Rokit.
      - run: stylua --check src
      - run: selene src
      - run: rojo build -o build/game.rbxl default.project.json
      - uses: actions/upload-artifact@v4
        with:
          name: game-rbxl
          path: build/game.rbxl
```

В настройках репозитория: **Settings → Branches → Branch protection rule (main)**: Require a pull request before merging; Require status checks to pass (check); Require 1 approval.

## Этап 2: публикация через Open Cloud

1. **Creator Hub → Credentials → Create API Key**: назначьте *Universe Places* → `universe-places:write`, добавьте нужный Experience, ограничьте по IP при возможности.
2. Сохраните ключ в **GitHub → Settings → Secrets and variables → Actions** как `ROBLOX_API_KEY`. Также `UNIVERSE_ID`, `PLACE_ID` (для Dev и Prod — в разных Environments).
3. Шаг публикации (идея; вместо curl многие используют `rbxcloud`, `mantle` и др.):

```yaml
  publish-dev:
    if: github.ref == 'refs/heads/main'
    needs: check
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: game-rbxl
      - name: Publish to Dev
        env:
          API_KEY: ${{ secrets.ROBLOX_API_KEY }}
          UNIVERSE_ID: ${{ vars.UNIVERSE_ID }}
          PLACE_ID: ${{ vars.PLACE_ID }}
        run: |
          curl --fail -X POST \
            "https://apis.roblox.com/universes/v1/universes/$UNIVERSE_ID/places/$PLACE_ID/versions?versionType=Published" \
            -H "x-api-key: $API_KEY" \
            -H "Content-Type: application/octet-stream" \
            --data-binary @game.rbxl
```

(`versionType=Saved` — сохранить без публикации, `Published` — опубликовать. Проверяйте актуальный формат запроса в документации Open Cloud: [Place Publishing API](https://create.roblox.com/docs/cloud).)

4. **Production**: отдельный job с `environment: production` и **ручным подтверждением** (Required reviewers в Environment) — релиз только после «Approve».

:::warn Секреты
Ключ API — как пароль. Никогда не печатайте его в логи, не коммитьте, не передавайте ИИ. Дайте ключу **минимальные права** и срок действия; при утечке — немедленно отозвать (Revoke) в Creator Hub.
:::

## Ограничения публикации «кодом»

- Публикуется **весь плейс** (`.rbxl`) целиком — значит карта должна быть в сборке (см. схему 2 из предыдущей страницы) или вы публикуете только код-пакет для специальных случаев. Для большинства малых команд проще: **карта в Studio, публикация руками релиз-менеджером**, а CI — только проверки. Переходите на полную автоматизацию, когда боль от ручного процесса станет заметной.
- Крупные `.rbxl` и Git: используйте **Git LFS**.

## Версионирование и релизы

- **SemVer-подобно:** `MAJOR.MINOR.PATCH` (например, 1.4.2): MAJOR — большие изменения, MINOR — новые функции, PATCH — фиксы.
- Релиз = **Git tag** (`v1.4.2`) + GitHub Release с заметками (что нового, что исправлено) — их можно скопировать в анонс для игроков.
- Храните версию в игре: `ReplicatedStorage.Shared.Version` → показывайте в меню (удобно для баг-репортов).
- **Откат:** в Creator Hub есть история версий плейса (Version History) — можно вернуть прошлую; в Git — `git revert` + новая публикация.

## Релиз-чек-лист (RELEASE.md)

```markdown
- [ ] main зелёный (CI)
- [ ] Протестировано в Dev (Local Server, 2 игрока, телефон)
- [ ] Миграции данных обратно-совместимы
- [ ] Флаги опасных функций выключены по умолчанию
- [ ] Заметки к релизу готовы (RU/EN)
- [ ] Предупреждение игрокам о перезапуске (если нужно)
- [ ] Бэкап .rbxl и тег в Git
- [ ] Публикация (Dev → Prod с подтверждением)
- [ ] Мониторинг 30–60 мин: ошибки, FPS, DataStore, платежи
- [ ] Метрики через 24–72 ч (retention, доход, жалобы)
```

## Мониторинг после релиза

- **Creator Hub → Analytics/Performance**: краши, ошибки, FPS по платформам.
- **Логи ошибок:** `ScriptContext.Error` и `LogService.MessageOut` → отправка в свой сервер (HttpService) или в Discord-вебхук (ограничьте частоту!).
- **Алерты экономики:** резкий скачок валюты/дюп → автоматическая блокировка/уведомление.
- **Обратная связь:** кнопка «Сообщить о баге» в игре + канал в Discord.

```lua
-- Простой отправщик ошибок (сервер); ограничение частоты обязательно
local ScriptContext = game:GetService("ScriptContext")
local lastSent, sentCount = 0, 0

ScriptContext.Error:Connect(function(message, stack, script)
  local now = os.clock()
  if now - lastSent > 60 then sentCount = 0; lastSent = now end
  sentCount += 1
  if sentCount > 5 then return end
  -- HttpService:PostAsync(...) на ваш приёмник (в pcall)
end)
```

## Задания

::::task mid Проверка семвера (чистый Lua)
Напишите `parseVersion(s)`: разбирает `"1.4.2"` в `{major=1, minor=4, patch=2}`; для некорректной строки вернуть `nil`. И `isNewer(a, b)` — `true`, если версия `a` новее `b` (строки).

:::starter
```lua
local function parseVersion(s)
end

local function isNewer(a, b)
end
```
:::
:::test
```lua
local v = parseVersion("1.4.2")
assert(v.major == 1 and v.minor == 4 and v.patch == 2)
assert(parseVersion("1.4") == nil and parseVersion("a.b.c") == nil)
assert(isNewer("1.4.2", "1.4.1") == true)
assert(isNewer("1.10.0", "1.9.9") == true)
assert(isNewer("2.0.0", "10.0.0") == false)
assert(isNewer("1.0.0", "1.0.0") == false)
```
:::
:::answer
```lua
local function parseVersion(s)
  local a, b, c = tostring(s):match("^(%d+)%.(%d+)%.(%d+)$")
  if not a then
    return nil
  end
  return {major = tonumber(a), minor = tonumber(b), patch = tonumber(c)}
end

local function isNewer(a, b)
  local x, y = parseVersion(a), parseVersion(b)
  if not x or not y then
    return false
  end
  if x.major ~= y.major then return x.major > y.major end
  if x.minor ~= y.minor then return x.minor > y.minor end
  return x.patch > y.patch
end
```
Сравнивать версии как строки нельзя: `"1.10.0" < "1.9.9"` лексикографически.
:::
::::

## Проверьте себя

::::quiz
Где хранить Open Cloud API-ключ в CI?
- [ ] В файле `.env`, закоммиченном в репозиторий
- [x] В GitHub Secrets (и/или Environment secrets) с минимальными правами
- [ ] В описании PR
Секреты не должны попадать в репозиторий.
::::

::::quiz
Зачем отдельное Dev-окружение?
- [ ] Для красоты
- [x] Проверять сборки на безопасной копии с отдельными данными, не рискуя продакшн-игрой и сохранениями игроков
- [ ] Чтобы публиковать быстрее
Тестирование на проде опасно для реальных игроков.
::::
