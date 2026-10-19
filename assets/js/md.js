/*
 * Мини-Markdown для справочника (без зависимостей).
 * Поддержка: заголовки, списки (вложенные, чек-листы), таблицы, цитаты, код с подсветкой,
 * контейнеры ::: (tip/warn/note/danger/details/task/quiz/stage/...), вики-ссылки [[id|текст]],
 * компоненты {{name}}.
 */
(function (root) {
  'use strict';

  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const slug = (s) =>
    String(s)
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'section';

  /* ---------------------------------------------------------------- подсветка */
  const LUA_KW = new Set(
    'and break continue do else elseif end export false for function if in local nil not or repeat return then true type typeof until while goto'.split(
      ' '
    )
  );
  const LUA_BUILTIN = new Set(
    ('print warn error assert pcall xpcall select tostring tonumber type typeof ipairs pairs next unpack require setmetatable getmetatable rawget rawset rawequal rawlen ' +
      'string table math os coroutine utf8 bit32 buffer debug task game workspace script shared _G _VERSION').split(' ')
  );
  const LUA_RBX = new Set(
    ('Instance Vector2 Vector3 CFrame Color3 BrickColor UDim UDim2 Enum TweenInfo Ray Region3 Rect NumberRange NumberSequence ColorSequence Random DateTime Font RaycastParams OverlapParams ' +
      'Players ReplicatedStorage ServerStorage ServerScriptService Workspace Lighting RunService UserInputService TweenService DataStoreService MarketplaceService ' +
      'CollectionService HttpService SoundService StarterGui StarterPack StarterPlayer TeleportService ContextActionService PathfindingService PhysicsService ProximityPromptService').split(
        ' '
      )
  );

  function highlightLua(code) {
    let out = '';
    let i = 0;
    const n = code.length;
    const span = (cls, txt) => `<span class="tk-${cls}">${esc(txt)}</span>`;
    let prevSig = ''; // последний значимый токен (для function Name / :method)
    while (i < n) {
      const c = code[i];
      // комментарии
      if (c === '-' && code[i + 1] === '-') {
        const lm = code.slice(i + 2).match(/^\[(=*)\[/);
        if (lm) {
          const close = ']' + lm[1] + ']';
          let j = code.indexOf(close, i + 2 + lm[0].length);
          j = j < 0 ? n : j + close.length;
          out += span('cm', code.slice(i, j));
          i = j;
        } else {
          let j = code.indexOf('\n', i);
          if (j < 0) j = n;
          out += span('cm', code.slice(i, j));
          i = j;
        }
        continue;
      }
      // строки
      if (c === '"' || c === "'" || c === '`') {
        let j = i + 1;
        while (j < n && code[j] !== c && code[j] !== '\n') {
          if (code[j] === '\\') j++;
          j++;
        }
        j = Math.min(j + 1, n);
        const s = code.slice(i, j);
        if (c === '`') out += span('str', s);
        else out += span('str', s);
        i = j;
        prevSig = 'str';
        continue;
      }
      if (c === '[') {
        const lm = code.slice(i).match(/^\[(=*)\[/);
        if (lm) {
          const close = ']' + lm[1] + ']';
          let j = code.indexOf(close, i + lm[0].length);
          j = j < 0 ? n : j + close.length;
          out += span('str', code.slice(i, j));
          i = j;
          continue;
        }
      }
      // числа
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) {
        const m = code.slice(i).match(/^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|[0-9][0-9_]*\.?[0-9_]*([eE][+-]?[0-9]+)?|\.[0-9]+([eE][+-]?[0-9]+)?)/);
        out += span('num', m[0]);
        i += m[0].length;
        prevSig = 'num';
        continue;
      }
      // идентификаторы
      if (/[A-Za-z_]/.test(c)) {
        const m = code.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
        const after = code.slice(i + m.length).match(/^\s*(\(|["'{])/);
        let cls = null;
        if (LUA_KW.has(m) && prevSig !== '.' && prevSig !== ':') cls = 'kw';
        else if (prevSig === 'function') cls = 'fn';
        else if (prevSig === '.' || prevSig === ':') cls = after ? 'fn' : 'prop';
        else if (LUA_RBX.has(m)) cls = 'rbx';
        else if (LUA_BUILTIN.has(m)) cls = 'bi';
        else if (after && m !== 'if' && m !== 'while') cls = 'call';
        out += cls ? span(cls, m) : esc(m);
        i += m.length;
        prevSig = m === 'function' ? 'function' : 'id';
        continue;
      }
      if (c === '.' || c === ':') {
        // «..» оператор, «::label::» и аннотации типов не считаем доступом
        if (c === '.' && code[i + 1] === '.') {
          out += span('op', code[i + 2] === '.' ? '...' : '..');
          i += code[i + 2] === '.' ? 3 : 2;
          prevSig = 'op';
          continue;
        }
        if (c === ':' && code[i + 1] === ':') {
          out += span('op', '::');
          i += 2;
          prevSig = 'op';
          continue;
        }
        out += span('op', c);
        i++;
        prevSig = c;
        continue;
      }
      if (/[+\-*/%^#=<>~&|]/.test(c)) {
        out += span('op', c);
        i++;
        prevSig = 'op';
        continue;
      }
      out += esc(c);
      if (!/\s/.test(c)) prevSig = c;
      i++;
    }
    return out;
  }

  function highlightGeneric(code, lang) {
    // json / bash / yaml / toml / text: комментарии, строки, числа
    const lines = code.split('\n').map((ln) => {
      let e = esc(ln);
      if (lang === 'bash' || lang === 'sh' || lang === 'yaml' || lang === 'yml' || lang === 'toml') {
        e = e.replace(/(^|\s)(#.*)$/, '$1<span class="tk-cm">$2</span>');
      }
      e = e.replace(/(&quot;[^&]*?&quot;|'[^']*?')/g, '<span class="tk-str">$1</span>');
      return e;
    });
    return lines.join('\n');
  }

  function highlight(code, lang) {
    lang = (lang || '').toLowerCase();
    if (lang === 'lua' || lang === 'luau') return highlightLua(code);
    if (lang === 'text' || lang === '' || lang === 'txt') return esc(code);
    return highlightGeneric(code, lang);
  }

  /* ---------------------------------------------------------------- инлайн */
  function inline(s, ctx) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    s = esc(s);
    // вики-ссылки
    s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, t) => {
      const title = t || (ctx && ctx.titleOf ? ctx.titleOf(id) : id) || id;
      return `<a class="wl" href="#/${id}">${title}</a>`;
    });
    // ссылки
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      u = u.replace(/&amp;/g, '&');
      if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) {
        return `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`;
      }
      if (u.startsWith('#')) return `<a href="${esc(u)}">${t}</a>`;
      return t;
    });
    s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(>«"])\*([^*\s][^*]*?)\*(?=[\s).,;:!?<»"]|$)/g, '$1<em>$2</em>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, k) => `<code>${esc(codes[+k])}</code>`);
    return s;
  }

  /* ---------------------------------------------------------------- блоки */
  const CALLOUTS = {
    tip: ['💡', 'Совет'],
    note: ['📌', 'Важно знать'],
    warn: ['⚠️', 'Осторожно'],
    danger: ['⛔', 'Опасно'],
    ai: ['🤖', 'Для ИИ-работы'],
    money: ['💰', 'Деньги'],
  };

  function parseContainerEnd(lines, start, colons) {
    const closer = ':'.repeat(colons);
    let inFence = false;
    for (let j = start; j < lines.length; j++) {
      const t = lines[j];
      if (/^\s*```/.test(t)) inFence = !inFence;
      if (!inFence && t.trim() === closer) return j;
    }
    return lines.length;
  }

  function render(src, ctx) {
    ctx = ctx || {};
    const toc = [];
    const usedIds = {};
    const uid = (base) => {
      let id = slug(base);
      if (usedIds[id]) id += '-' + ++usedIds[id];
      else usedIds[id] = 1;
      return id;
    };
    let blockCounter = 0;

    function blocks(lines) {
      let html = '';
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (/^\s*$/.test(line)) {
          i++;
          continue;
        }
        // контейнер
        let m = line.match(/^(:{3,})\s*([a-z]+)\s*(.*)$/);
        if (m) {
          const colons = m[1].length;
          const end = parseContainerEnd(lines, i + 1, colons);
          const inner = lines.slice(i + 1, end);
          html += container(m[2], m[3].trim(), inner);
          i = end + 1;
          continue;
        }
        // код
        m = line.match(/^```\s*([\w+-]*)\s*(.*)$/);
        if (m) {
          const lang = m[1];
          const opts = m[2] || '';
          let j = i + 1;
          const buf = [];
          while (j < lines.length && !/^```\s*$/.test(lines[j])) buf.push(lines[j++]);
          html += codeBlock(buf.join('\n'), lang, opts);
          i = j + 1;
          continue;
        }
        // заголовок
        m = line.match(/^(#{1,4})\s+(.*)$/);
        if (m) {
          const lvl = m[1].length;
          const text = m[2].trim();
          const id = uid(text);
          if (lvl === 2 || lvl === 3) toc.push({ id, text: text.replace(/`/g, ''), level: lvl });
          html += `<h${lvl} id="${id}">${inline(text, ctx)}<a class="anchor" href="#/${ctx.pageId || ''}" data-anchor="${id}" aria-label="Ссылка на раздел">#</a></h${lvl}>`;
          i++;
          continue;
        }
        if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
          html += '<hr>';
          i++;
          continue;
        }
        // компонент
        m = line.match(/^\{\{([a-z0-9-]+)(?:\s+(.*))?\}\}\s*$/);
        if (m) {
          html += `<div class="component" data-component="${m[1]}" data-args="${esc(m[2] || '')}"></div>`;
          i++;
          continue;
        }
        // таблица
        if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
          let j = i + 2;
          const rows = [];
          while (j < lines.length && /^\s*\|/.test(lines[j])) rows.push(lines[j++]);
          html += table(line, lines[i + 1], rows);
          i = j;
          continue;
        }
        // цитата
        if (/^>\s?/.test(line)) {
          let j = i;
          const buf = [];
          while (j < lines.length && /^>\s?/.test(lines[j])) buf.push(lines[j++].replace(/^>\s?/, ''));
          html += `<blockquote>${blocks(buf)}</blockquote>`;
          i = j;
          continue;
        }
        // список
        if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
          const buf = [];
          let j = i;
          while (
            j < lines.length &&
            (/^\s*([-*]|\d+\.)\s+/.test(lines[j]) || (/^\s+\S/.test(lines[j]) && buf.length))
          ) {
            buf.push(lines[j++]);
          }
          html += list(buf);
          i = j;
          continue;
        }
        // параграф
        const buf = [line];
        let j = i + 1;
        while (
          j < lines.length &&
          !/^\s*$/.test(lines[j]) &&
          !/^(:{3,}|```|#{1,4}\s|>\s?|\s*([-*]|\d+\.)\s+|\s*\||\{\{)/.test(lines[j]) &&
          !/^(-{3,}|\*{3,})\s*$/.test(lines[j])
        ) {
          buf.push(lines[j++]);
        }
        html += `<p>${inline(buf.join(' '), ctx)}</p>`;
        i = j;
      }
      return html;
    }

    function table(head, sep, rows) {
      const cells = (r) =>
        r
          .trim()
          .replace(/^\||\|$/g, '')
          .split(/(?<!\\)\|/)
          .map((c) => c.trim().replace(/\\\|/g, '|'));
      const al = cells(sep).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''));
      const h = cells(head);
      let t = '<div class="table-wrap"><table><thead><tr>';
      h.forEach((c, k) => (t += `<th${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(c, ctx)}</th>`));
      t += '</tr></thead><tbody>';
      rows.forEach((r) => {
        t += '<tr>';
        cells(r).forEach((c, k) => (t += `<td${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(c, ctx)}</td>`));
        t += '</tr>';
      });
      return t + '</tbody></table></div>';
    }

    function list(buf) {
      // строим дерево по отступам
      const items = [];
      buf.forEach((ln) => {
        const m = ln.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (m) items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3], kids: [] });
        else if (items.length) items[items.length - 1].text += ' ' + ln.trim();
      });
      let pos = 0;
      function build(minIndent) {
        const first = items[pos];
        const tag = first.ordered ? 'ol' : 'ul';
        const isTask = /^\[( |x)\]\s/.test(first.text);
        let h = `<${tag}${isTask ? ' class="tasklist"' : ''}>`;
        const base = first.indent;
        while (pos < items.length && items[pos].indent >= base && items[pos].indent >= minIndent) {
          if (items[pos].indent > base) break;
          const it = items[pos++];
          let body = it.text;
          let chk = '';
          const tm = body.match(/^\[( |x)\]\s(.*)$/);
          if (tm) {
            const key = `${ctx.pageId || 'p'}:${blockCounter++}`;
            chk = `<input type="checkbox" class="tl-check" data-key="${key}"${tm[1] === 'x' ? ' checked' : ''} aria-label="Отметить пункт">`;
            body = tm[2];
          }
          h += `<li>${chk}<span>${inline(body, ctx)}</span>`;
          if (pos < items.length && items[pos].indent > base) h += build(items[pos].indent);
          h += '</li>';
        }
        return h + `</${tag}>`;
      }
      let h = '';
      while (pos < items.length) h += build(0);
      return h;
    }

    function codeBlock(code, lang, opts) {
      const runnable = /\brun\b/.test(opts);
      const title = (opts.match(/title="([^"]+)"/) || [])[1] || '';
      const label = lang || 'text';
      if (runnable) {
        return `<div class="code-run" data-lang="${esc(label)}"><div class="code-head"><span class="code-lang">${esc(
          title || 'Lua — запускается в браузере'
        )}</span></div><textarea class="editor" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${Math.min(
          Math.max(code.split('\n').length, 3),
          22
        )}" data-orig="${esc(code)}" aria-label="Редактор кода">${esc(code)}</textarea><div class="code-actions"><button class="btn btn-primary run-btn" type="button">▶ Запустить</button><button class="btn reset-btn" type="button">Сбросить</button><button class="btn copy-btn" type="button">Копировать</button></div><div class="run-out" hidden></div></div>`;
      }
      return `<div class="code"><div class="code-head"><span class="code-lang">${esc(title || label)}</span><button class="copy-btn btn-ghost" type="button" aria-label="Копировать код">Копировать</button></div><pre><code>${highlight(
        code,
        lang
      )}</code></pre><textarea class="raw" hidden>${esc(code)}</textarea></div>`;
    }

    function container(kind, arg, inner) {
      if (CALLOUTS[kind]) {
        const [ico, def] = CALLOUTS[kind];
        return `<aside class="callout callout-${kind}"><div class="callout-title"><span aria-hidden="true">${ico}</span> ${esc(
          arg || def
        )}</div><div class="callout-body">${blocks(inner)}</div></aside>`;
      }
      if (kind === 'details') {
        return `<details class="fold"><summary>${inline(arg || 'Подробнее', ctx)}</summary><div class="fold-body">${blocks(inner)}</div></details>`;
      }
      if (kind === 'quiz') return quiz(inner);
      if (kind === 'task') return task(arg, inner);
      if (kind === 'stage') return stage(arg, inner);
      if (kind === 'cards') return `<div class="cards">${blocks(inner)}</div>`;
      if (kind === 'card') return `<div class="card-i"><h4>${inline(arg, ctx)}</h4>${blocks(inner)}</div>`;
      if (kind === 'cols') return `<div class="cols">${blocks(inner)}</div>`;
      if (kind === 'col') return `<div class="col-i"><h4>${inline(arg, ctx)}</h4>${blocks(inner)}</div>`;
      return blocks(inner);
    }

    function stage(arg, inner) {
      // :::stage 1 | Название | срок
      const parts = arg.split('|').map((x) => x.trim());
      const num = parts[0];
      const title = parts[1] || '';
      const time = parts[2] || '';
      return `<section class="stage"><div class="stage-num" aria-hidden="true">${esc(num)}</div><div class="stage-body"><h3 class="stage-title">${inline(
        title,
        ctx
      )}</h3>${time ? `<div class="stage-time">⏱ ${esc(time)}</div>` : ''}${blocks(inner)}</div></section>`;
    }

    function quiz(inner) {
      const q = [];
      const opts = [];
      const expl = [];
      let seenOpt = false;
      inner.forEach((ln) => {
        const m = ln.match(/^\s*-\s*\[( |x)\]\s+(.*)$/);
        if (m) {
          seenOpt = true;
          opts.push({ ok: m[1] === 'x', text: m[2] });
        } else if (seenOpt) expl.push(ln);
        else q.push(ln);
      });
      const id = `${ctx.pageId || 'p'}:q${blockCounter++}`;
      let h = `<div class="quiz" data-quiz="${id}"><div class="quiz-q">${inline(q.join(' ').trim(), ctx)}</div><div class="quiz-opts" role="group">`;
      opts.forEach((o, k) => {
        h += `<button type="button" class="quiz-opt" data-ok="${o.ok ? 1 : 0}">${inline(o.text, ctx)}</button>`;
      });
      h += `</div><div class="quiz-expl" hidden>${blocks(expl.map((l) => l.replace(/^>\s?/, '')))}</div></div>`;
      return h;
    }

    function task(arg, inner) {
      // :::task easy Название   (easy|mid|hard)
      const m = arg.match(/^(easy|mid|hard)\s+(.*)$/);
      const level = m ? m[1] : 'easy';
      const title = m ? m[2] : arg;
      // разбор вложенных секций 3-двоеточия: hint / answer / starter / test
      const sections = { body: [] };
      let i = 0;
      while (i < inner.length) {
        const mm = inner[i].match(/^(:{3})\s*(hint|answer|starter|test)\s*$/);
        if (mm) {
          const end = parseContainerEnd(inner, i + 1, 3);
          sections[mm[2]] = inner.slice(i + 1, end);
          i = end + 1;
        } else {
          sections.body.push(inner[i++]);
        }
      }
      const raw = (arr) => {
        if (!arr) return '';
        const txt = arr.join('\n');
        const m2 = txt.match(/```[^\n]*\n([\s\S]*?)\n```/);
        return m2 ? m2[1] : txt.trim();
      };
      const levelName = { easy: 'Легко', mid: 'Средне', hard: 'Сложно' }[level];
      const id = `${ctx.pageId || 'p'}:t${blockCounter++}`;
      let h = `<div class="task task-${level}" data-task="${id}"><div class="task-head"><span class="badge badge-${level}">${levelName}</span><strong class="task-title">${inline(
        title,
        ctx
      )}</strong><label class="task-done"><input type="checkbox" class="task-check"> решено</label></div><div class="task-body">${blocks(sections.body)}`;
      if (sections.starter) {
        h += `<div class="code-run task-editor" data-lang="lua"><div class="code-head"><span class="code-lang">Ваше решение</span></div><textarea class="editor" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${Math.min(
          Math.max(raw(sections.starter).split('\n').length + 1, 5),
          22
        )}" data-orig="${esc(raw(sections.starter))}" aria-label="Редактор решения">${esc(raw(sections.starter))}</textarea><div class="code-actions"><button class="btn btn-primary run-btn" type="button">▶ Запустить</button>${
          sections.test ? '<button class="btn btn-ok check-btn" type="button">✔ Проверить</button>' : ''
        }<button class="btn reset-btn" type="button">Сбросить</button></div>${
          sections.test ? `<textarea class="task-test" hidden>${esc(raw(sections.test))}</textarea>` : ''
        }<div class="run-out" hidden></div></div>`;
      }
      if (sections.hint) h += `<details class="fold"><summary>💭 Подсказка</summary><div class="fold-body">${blocks(sections.hint)}</div></details>`;
      if (sections.answer) h += `<details class="fold fold-answer"><summary>✅ Показать ответ и разбор</summary><div class="fold-body">${blocks(sections.answer)}</div></details>`;
      return h + '</div></div>';
    }

    const html = blocks(src.replace(/\r\n/g, '\n').split('\n'));
    return { html, toc };
  }

  root.MD = { render, highlight, esc, slug, inline };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MD;
})(typeof self !== 'undefined' ? self : globalThis);
