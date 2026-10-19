/*
 * Слой совместимости «Luau-подобного» кода с Lua 5.3 (Fengari).
 * Используется и в браузере (Web Worker), и в Node (скрипт проверки ответов).
 * Это НЕ Luau и НЕ Roblox: нет Instance, game, Vector3 и т.д. Подробности — в уроке «Как запускать код».
 */
(function (root) {
  'use strict';

  const PRELUDE = String.raw`
local _tostring, _type = tostring, type
local function fmtnum(n)
  if math.type(n) == "float" then
    if n ~= n then return "nan" end
    if n == math.huge then return "inf" end
    if n == -math.huge then return "-inf" end
    if n == math.floor(n) and n > -1e15 and n < 1e15 then return string.format("%d", n) end
    return string.format("%.14g", n)
  end
  return _tostring(n)
end
tostring = function(v)
  if _type(v) == "number" then return fmtnum(v) end
  return _tostring(v)
end
typeof = type
unpack = table.unpack
print = function(...)
  local t = table.pack(...)
  for i = 1, t.n do t[i] = tostring(t[i]) end
  __out(table.concat(t, "\t"))
end
warn = function(...)
  local t = table.pack(...)
  for i = 1, t.n do t[i] = tostring(t[i]) end
  __out("[warn] " .. table.concat(t, " "))
end

math.clamp = function(x, a, b) return math.max(a, math.min(b, x)) end
math.round = function(x) if x >= 0 then return math.floor(x + 0.5) end return -math.floor(-x + 0.5) end
math.sign = function(x) if x > 0 then return 1 elseif x < 0 then return -1 end return 0 end
math.log10 = function(x) return math.log(x, 10) end
math.pow = function(a, b) return a ^ b end

table.find = function(t, v, init)
  for i = init or 1, #t do if t[i] == v then return i end end
  return nil
end
table.clone = function(t)
  local r = {}
  for k, v in pairs(t) do r[k] = v end
  return setmetatable(r, getmetatable(t))
end
table.create = function(n, v)
  local r = {}
  for i = 1, n do r[i] = v end
  return r
end
table.clear = function(t) for k in pairs(t) do t[k] = nil end end

string.split = function(s, sep)
  sep = sep or ","
  local out, i = {}, 1
  if sep == "" then
    for c in s:gmatch(".") do out[#out + 1] = c end
    return out
  end
  while true do
    local a, b = s:find(sep, i, true)
    if not a then out[#out + 1] = s:sub(i) break end
    out[#out + 1] = s:sub(i, a - 1)
    i = b + 1
  end
  return out
end

bit32 = {
  band = function(a, b) return a & b end,
  bor = function(a, b) return a | b end,
  bxor = function(a, b) return a ~ b end,
  bnot = function(a) return ~a & 0xFFFFFFFF end,
  lshift = function(a, n) return (a << n) & 0xFFFFFFFF end,
  rshift = function(a, n) return (a & 0xFFFFFFFF) >> n end,
}

tick = os.time
time = os.clock

-- мини-планировщик: виртуальное время, task.wait ничего не ждёт по-настоящему
local sched = { threads = {}, now = 0, errors = {} }
local function resumeThread(co, ...)
  local ok, a = coroutine.resume(co, ...)
  if not ok then
    sched.errors[#sched.errors + 1] = tostring(a)
    __out("[error] " .. tostring(a))
    return
  end
  if coroutine.status(co) == "suspended" then
    sched.threads[#sched.threads + 1] = { co = co, at = sched.now + (_type(a) == "number" and a or 0) }
  end
end
local function wait(t)
  t = _type(t) == "number" and t or 0.03
  if coroutine.isyieldable() then
    coroutine.yield(t)
    return t
  end
  return t
end
task = {
  wait = wait,
  spawn = function(f, ...)
    local co = _type(f) == "thread" and f or coroutine.create(f)
    resumeThread(co, ...)
    return co
  end,
  defer = function(f, ...)
    local args = table.pack(...)
    local co = coroutine.create(function() return f(table.unpack(args, 1, args.n)) end)
    sched.threads[#sched.threads + 1] = { co = co, at = sched.now }
    return co
  end,
  delay = function(t, f, ...)
    local args = table.pack(...)
    local co = coroutine.create(function() return f(table.unpack(args, 1, args.n)) end)
    sched.threads[#sched.threads + 1] = { co = co, at = sched.now + (t or 0) }
    return co
  end,
  cancel = function(co)
    for i, th in ipairs(sched.threads) do
      if th.co == co then table.remove(sched.threads, i) return end
    end
  end,
}
wait = wait
spawn = task.spawn
delay = task.delay

function __run(src)
  local fn, err = load(src, "=lua")
  if not fn then return false, err end
  sched.errors = {}
  resumeThread(coroutine.create(fn))
  local guard = 0
  while #sched.threads > 0 do
    guard = guard + 1
    if guard > 20000 or sched.now > 3600 then
      __out("[warn] планировщик остановлен (слишком много ожиданий)")
      break
    end
    local best, bi = nil, nil
    for i, th in ipairs(sched.threads) do
      if not best or th.at < best.at then best, bi = th, i end
    end
    table.remove(sched.threads, bi)
    sched.now = best.at
    resumeThread(best.co)
  end
  if #sched.errors > 0 then return false, sched.errors[1] end
  return true
end
`;

  /** Составные присваивания Luau (+=, -=, ...) → обычные (в том числе в одной строке с for/if). */
  const COMPOUND =
    /(?<![\w.\]])([A-Za-z_][\w.\[\]"':]*)\s*(\+|-|\*|\/\/|\/|%|\^|\.\.)=\s*(.+?)(?=\s*(?:;|--|\bend\b|\belse\b|\belseif\b|\buntil\b|$))/g;
  function preprocess(src) {
    return src
      .split('\n')
      .map((line) => line.replace(COMPOUND, '$1 = $1 $2 ($3)'))
      .join('\n');
  }

  /** Запуск кода. fg — модуль fengari (в браузере глобальный `fengari`, в Node require('fengari')). */
  function run(fg, code, tests) {
    const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fg;
    const out = [];
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    lua.lua_pushjsfunction(L, function (L) {
      out.push(to_jsstring(lua.lua_tolstring(L, 1)));
      return 0;
    });
    lua.lua_setglobal(L, to_luastring('__out'));
    if (lauxlib.luaL_dostring(L, to_luastring(PRELUDE)) !== lua.LUA_OK) {
      return { ok: false, err: 'prelude: ' + to_jsstring(lua.lua_tostring(L, -1)), out };
    }
    let src = preprocess(code);
    if (tests) src += '\n' + preprocess(tests);
    lua.lua_getglobal(L, to_luastring('__run'));
    lua.lua_pushstring(L, to_luastring(src));
    const st = lua.lua_pcall(L, 1, 2, 0);
    if (st !== lua.LUA_OK) {
      return { ok: false, err: to_jsstring(lua.lua_tostring(L, -1)), out };
    }
    const ok = lua.lua_toboolean(L, -2);
    const err = ok ? null : to_jsstring(lua.lua_tostring(L, -1) || to_luastring('?'));
    return { ok, err, out };
  }

  const api = { PRELUDE, preprocess, run };
  root.LuaCompat = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
