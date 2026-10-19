---
title: Строки и текст
section: lua
order: 4
summary: Кавычки, экранирование, методы string, форматирование, поиск по шаблонам и интерполяция Luau.
time: 25
level: Новичок
---

## Как записывать строки

```lua run
local a = "двойные кавычки"
local b = 'одинарные кавычки'
local c = "Строка с \"кавычками\" и переносом\nвторая строка"
local d = [[Длинная строка
на несколько строк, \n тут не работает]]
print(a, b)
print(c)
print(d)
```

Escape-последовательности: `\n` перенос, `\t` табуляция, `\\` обратная косая, `\"` и `\'` кавычки, `\u{1F600}` символ Unicode, `\065` код символа.

Строки в Lua **неизменяемы**: любая операция возвращает новую строку.

## Склейка, длина, повторение

```lua run
local s = "Привет"
print(s .. ", мир")           -- склейка
print(#s)                      -- 12 (байт!), а не 6 символов
print(("ab"):rep(3))           -- ababab
print(("-"):rep(20))
```

:::warn Кириллица и `#`
Строки хранятся как байты в UTF-8. Буква кириллицы занимает 2 байта, поэтому `#"Привет"` равно 12. Для подсчёта символов используйте `utf8.len(s)`; для перебора — `utf8.codes(s)` или `string.gmatch(s, utf8.charpattern)`. Для английских логинов и ID это неважно.
:::

```lua run
print(utf8.len("Привет"))       -- 6
for _, code in utf8.codes("Яд") do print(code, utf8.char(code)) end
```

## Основные функции string

Вызывать можно двумя способами: `string.upper(s)` или `s:upper()` (синтаксический сахар, предпочтительный).

| Метод | Назначение | Пример |
|---|---|---|
| `s:len()` / `#s` | длина в байтах | |
| `s:upper()` / `s:lower()` | регистр | `"Ab":lower()` → `ab` |
| `s:sub(i, j)` | подстрока (индексы с 1, можно отрицательные) | `("hello"):sub(2, 4)` → `ell` |
| `s:find(pattern, init, plain)` | позиция вхождения | |
| `s:match(pattern)` | вернуть совпадение/захваты | |
| `s:gmatch(pattern)` | итератор по совпадениям | |
| `s:gsub(pattern, repl, n)` | замена | |
| `s:rep(n, sep)` | повтор | |
| `s:reverse()` | развернуть | |
| `s:byte(i)` / `string.char(...)` | коды символов | |
| `s:format(...)` | форматирование | |
| `s:split(sep)` | разделить на массив (**Luau**) | `("a,b"):split(",")` |

```lua run
local text = "Hello, Roblox!"
print(text:sub(1, 5), text:sub(-7, -2))
print(text:find("Roblox"))                -- 8   13
print(text:find(".", 1, true))            -- plain=true: ищем именно точку-символ (не найдено)
print(text:upper(), text:lower())
print(text:gsub("l", "L"))                -- замена + количество замен
```

## Форматирование: string.format

| Спецификатор | Смысл |
|---|---|
| `%d` | целое |
| `%s` | строка (или любое значение через tostring) |
| `%f` / `%.2f` | дробное с N знаками |
| `%5d`, `%-5d`, `%05d` | ширина, выравнивание влево, нули слева |
| `%x` / `%X` | шестнадцатеричное |
| `%%` | знак процента |

```lua run
print(string.format("Игрок %s набрал %d очков (%.1f%%)", "Ян", 120, 87.456))
print(string.format("%05d | %-6s|", 42, "ab"))
```

### Разделители тысяч (частая задача в симуляторах)

```lua run
local function commas(n)
  local s = tostring(math.floor(n))
  local out = s:reverse():gsub("(%d%d%d)", "%1,"):reverse()
  return (out:gsub("^,", ""))
end
print(commas(1234567), commas(999), commas(1000))
```

## Шаблоны (patterns) Lua

Это **не** регулярные выражения, а более простая система.

| Шаблон | Что соответствует |
|---|---|
| `.` | любой символ |
| `%a` / `%d` / `%s` / `%w` | буква / цифра / пробельный / буква или цифра |
| `%l` / `%u` / `%p` | строчная / заглавная / знак пунктуации |
| `%A` `%D` … | отрицание (всё, кроме) |
| `[abc]` `[a-z]` `[^abc]` | набор / диапазон / «кроме» |
| `*` `+` `-` `?` | 0+ жадно / 1+ жадно / 0+ лениво / 0 или 1 |
| `^` `$` | начало / конец строки |
| `( )` | захват |
| `%` перед символом | экранирование, напр. `%.` |

```lua run
local line = "player=Ann; score=250; level=7"
for key, value in line:gmatch("(%w+)=(%w+)") do
  print(key, "->", value)
end

local year, month, day = ("2026-10-19"):match("(%d+)-(%d+)-(%d+)")
print(day, month, year)

print(("  trim me  "):match("^%s*(.-)%s*$") .. "|")
```

:::note Для кириллицы шаблоны `%a` не работают
Классы `%a`, `%w`, `%l` рассчитаны на ASCII. Для русских слов используйте `utf8.charpattern` или проверяйте диапазоны вручную.
:::

## Интерполяция строк (Luau)

В Studio можно писать строки в **обратных кавычках** и вставлять выражения в `{}`:

```lua
local name, score = "Аня", 150
print(`Игрок {name} набрал {score * 2} очков`)
-- вместо:
print("Игрок " .. name .. " набрал " .. (score * 2) .. " очков")
```

Это читабельнее и быстрее, но работает только в Luau (в этом запускателе — нет).

## Задания

::::task easy Заглавная буква
Напишите `capitalize(s)` — делает первую букву заглавной (для английских слов): `capitalize("lua")` → `"Lua"`.

:::starter
```lua
local function capitalize(s)
end
```
:::
:::test
```lua
assert(capitalize("lua") == "Lua")
assert(capitalize("a") == "A")
assert(capitalize("") == "")
assert(capitalize("roblox studio") == "Roblox studio")
```
:::
:::hint
`s:sub(1, 1):upper()` — первая буква, `s:sub(2)` — всё остальное.
:::
:::answer
```lua
local function capitalize(s)
  return s:sub(1, 1):upper() .. s:sub(2)
end
```
:::
::::

::::task mid Подсчёт слов
Напишите `countWords(s)`, возвращающую число слов (слова разделены любыми пробелами).

:::starter
```lua
local function countWords(s)
end
```
:::
:::test
```lua
assert(countWords("hello world") == 2)
assert(countWords("  a  b   c ") == 3)
assert(countWords("") == 0)
```
:::
:::hint
`for _ in s:gmatch("%S+") do ... end` — перебор «непробельных» кусков.
:::
:::answer
```lua
local function countWords(s)
  local n = 0
  for _ in s:gmatch("%S+") do
    n += 1
  end
  return n
end
```
:::
::::

::::task mid Палиндром
Напишите `isPalindrome(s)`: `true`, если строка читается одинаково в обе стороны (регистр и пробелы игнорируются, для латиницы).

:::starter
```lua
local function isPalindrome(s)
end
```
:::
:::test
```lua
assert(isPalindrome("Level") == true)
assert(isPalindrome("A man a plan a canal Panama") == true)
assert(isPalindrome("Roblox") == false)
```
:::
:::answer
```lua
local function isPalindrome(s)
  local clean = s:lower():gsub("%s+", "")
  return clean == clean:reverse()
end
```
`gsub` возвращает 2 значения; при присваивании в одну переменную второе отбрасывается.
:::
::::

::::task hard Парсер команд чата
Напишите `parseCommand(msg)`: если сообщение начинается с `/`, вернуть имя команды (в нижнем регистре) и массив аргументов; иначе вернуть `nil`. Пример: `parseCommand("/Give Ann 100")` → `"give", {"Ann", "100"}`.

:::starter
```lua
local function parseCommand(msg)
end
```
:::
:::test
```lua
local cmd, args = parseCommand("/Give Ann 100")
assert(cmd == "give")
assert(#args == 2 and args[1] == "Ann" and args[2] == "100")
assert(parseCommand("hello") == nil)
local c2, a2 = parseCommand("/ping")
assert(c2 == "ping" and #a2 == 0)
```
:::
:::answer
```lua
local function parseCommand(msg)
  if msg:sub(1, 1) ~= "/" then
    return nil
  end
  local parts = {}
  for word in msg:sub(2):gmatch("%S+") do
    table.insert(parts, word)
  end
  local cmd = table.remove(parts, 1)
  if not cmd then
    return nil
  end
  return cmd:lower(), parts
end
```
:::
::::

## Проверьте себя

::::quiz
Что вернёт `("hello"):sub(2, 4)`?
- [ ] `hel`
- [x] `ell`
- [ ] `ello`
Индексы начинаются с 1 и включают обе границы: символы 2, 3, 4.
::::

::::quiz
Почему `#"Привет"` равно 12, а не 6?
- [ ] В слове 12 букв
- [x] `#` считает байты, а кириллица в UTF-8 занимает по 2 байта
- [ ] Это баг
Используйте `utf8.len` для числа символов.
::::

::::quiz
Какой синтаксис интерполяции доступен в Luau?
- [ ] `"Привет, ${name}"`
- [x] `` `Привет, {name}` ``
- [ ] `"Привет, #{name}"`
Строки в обратных кавычках с `{выражение}` — особенность Luau.
::::
