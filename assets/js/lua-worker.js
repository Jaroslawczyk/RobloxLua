/* Web Worker: исполняет Lua в изоляции; основной поток может убить его по таймауту. */
self.window = self; // fengari-web ожидает window
importScripts('../vendor/fengari-web.js', 'lua-compat.js');

self.onmessage = function (e) {
  const { id, code, tests } = e.data;
  try {
    const res = LuaCompat.run(self.fengari, code, tests);
    self.postMessage({ id, ok: res.ok, err: res.err, out: res.out });
  } catch (err) {
    self.postMessage({ id, ok: false, err: String(err && err.message ? err.message : err), out: [] });
  }
};
