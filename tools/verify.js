#!/usr/bin/env node
/*
 * Проверка контента: все «ответы» заданий проходят свои тесты, все запускаемые примеры
 * выполняются без ошибок (кроме помеченных `-- expect-error`).
 * Запуск: npm i fengari (один раз, в любую папку) и NODE_PATH=<папка>/node_modules node tools/verify.js
 */
const fs = require('fs');
const path = require('path');
const fg = require('fengari');
const LuaCompat = require('../assets/js/lua-compat.js');
const MD = require('../assets/js/md.js');

const dir = path.join(__dirname, '..', 'content');
const un = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
let bad = 0, checkedTasks = 0, checkedRuns = 0;

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  const { html } = MD.render(src, { pageId: f });
  // задания
  const parts = html.split('<div class="task ').slice(1);
  for (const part of parts) {
    const title = (part.match(/task-title">(.*?)<\/strong>/) || [])[1] || '?';
    const test = (part.match(/<textarea class="task-test" hidden>([\s\S]*?)<\/textarea>/) || [])[1];
    const starter = (part.match(/<textarea class="editor"[^>]*>([\s\S]*?)<\/textarea>/) || [])[1];
    const ansPart = part.split('fold-answer')[1] || '';
    const ans = (ansPart.match(/<textarea class="raw" hidden>([\s\S]*?)<\/textarea>/) || [])[1];
    if (starter === undefined) continue; // задание без редактора (теоретическое)
    if (!ans) { console.log(`✘ ${f} «${title}»: нет блока кода в ответе`); bad++; continue; }
    checkedTasks++;
    if (test !== undefined) {
      let r = LuaCompat.run(fg, un(ans), un(test));
      // ответ может быть «продолжением» стартового кода
      if (!r.ok) r = LuaCompat.run(fg, un(starter) + '\n' + un(ans), un(test));
      if (!r.ok) { console.log(`✘ ${f} «${title}»: ответ не проходит тест: ${r.err}`); bad++; }
      // стартовый код не должен проходить тест сам по себе
      const r0 = LuaCompat.run(fg, un(starter), un(test));
      if (r0.ok && un(starter).trim().length) { console.log(`✘ ${f} «${title}»: стартовый код уже проходит тест`); bad++; }
    } else {
      const r = LuaCompat.run(fg, un(ans));
      if (!r.ok && !/expect-error/.test(ans)) { console.log(`✘ ${f} «${title}»: ответ падает: ${r.err}`); bad++; }
    }
  }
  // запускаемые примеры вне заданий
  for (const m of html.matchAll(/<div class="code-run" data-lang="[^"]*">[\s\S]*?<textarea class="editor"[^>]*>([\s\S]*?)<\/textarea>/g)) {
    const code = un(m[1]);
    checkedRuns++;
    const r = LuaCompat.run(fg, code);
    if (!r.ok && !/expect-error/.test(code)) { console.log(`✘ ${f}: пример падает: ${r.err}\n--- ${code.slice(0, 160).replace(/\n/g, '\n    ')}`); bad++; }
  }
}
console.log(`Заданий проверено: ${checkedTasks}, примеров запущено: ${checkedRuns}, проблем: ${bad}`);
process.exit(bad ? 1 : 0);
