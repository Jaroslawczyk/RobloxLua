/* Справочник Lua / Roblox — клиентское SPA без сборки. Хэш-роутинг: #/page-id */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = MD.esc;

  /* ------------------------------------------------------------ хранилище */
  const KEY = 'rl.v1';
  let mem = { done: {}, checks: {}, tasks: {}, quiz: {}, calc: {}, theme: '', last: '' };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) mem = Object.assign(mem, JSON.parse(raw));
  } catch (e) {
    /* приватный режим: работаем в памяти */
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(mem));
    } catch (e) {
      /* ignore */
    }
  };
  window.Store = { mem, save };

  /* ------------------------------------------------------------ состояние */
  let manifest = null;
  const pageById = {};
  const mdCache = new Map();
  let navToken = 0;

  const elMain = $('#main');
  const elContent = $('#content');
  const elToc = $('#toc');
  const sidebar = $('#sidebar');
  const scrim = $('#scrim');

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }
  window.toast = toast;

  /* ------------------------------------------------------------ тема */
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const b = $('#themeBtn');
    b.textContent = dark ? '☀️' : '🌙';
    b.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = dark ? '#0d111e' : '#f5f6fb';
  }
  applyTheme(mem.theme);
  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme')
      ? document.documentElement.getAttribute('data-theme') === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    mem.theme = dark ? 'light' : 'dark';
    save();
    applyTheme(mem.theme);
  });

  /* ------------------------------------------------------------ загрузка */
  async function loadManifest() {
    const r = await fetch('content/manifest.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('manifest ' + r.status);
    manifest = await r.json();
    manifest.pages.forEach((p) => (pageById[p.id] = p));
  }

  async function loadMd(p) {
    if (mdCache.has(p.id)) return mdCache.get(p.id);
    const r = await fetch('content/' + p.file);
    if (!r.ok) throw new Error('page ' + r.status);
    let t = await r.text();
    t = t.replace(/^---\n[\s\S]*?\n---\n/, '');
    mdCache.set(p.id, t);
    return t;
  }

  const titleOf = (id) => (pageById[id] ? pageById[id].title : id);
  const lessonSections = () => manifest.sections.filter((s) => s.track);
  const pagesOf = (sid) => manifest.pages.filter((p) => p.section === sid).sort((a, b) => a.order - b.order);

  /* ------------------------------------------------------------ навигация */
  function buildNav() {
    let h = '';
    manifest.sections.forEach((s) => {
      const pages = pagesOf(s.id);
      if (!pages.length) return;
      h += `<details class="nav-group" data-sec="${s.id}"><summary><span aria-hidden="true">${s.icon}</span> ${esc(s.title)}</summary>`;
      pages.forEach((p, i) => {
        h += `<a class="nav-link" href="#/${p.id}" data-id="${p.id}">${s.track ? `<span class="no">${i + 1}</span>` : ''}<span>${esc(
          p.title
        )}</span><span class="tick" aria-hidden="true"></span></a>`;
      });
      h += '</details>';
    });
    $('#navList').innerHTML = h;
  }

  function markNav(id) {
    $$('.nav-link').forEach((a) => {
      const on = a.dataset.id === id;
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
      const tick = $('.tick', a);
      if (tick) tick.textContent = mem.done[a.dataset.id] ? '✓' : '';
    });
    const p = pageById[id];
    if (p) {
      const g = $(`.nav-group[data-sec="${p.section}"]`);
      if (g) g.open = true;
      const cur = $('.nav-link[aria-current=page]');
      if (cur && sidebar.classList.contains('open')) cur.scrollIntoView({ block: 'center' });
    }
  }

  function updateProgress() {
    const pages = manifest.pages.filter((p) => lessonSections().some((s) => s.id === p.section));
    const done = pages.filter((p) => mem.done[p.id]).length;
    const pct = pages.length ? Math.round((done / pages.length) * 100) : 0;
    $('#progBar').style.width = pct + '%';
    $('#progTxt').textContent = `${done}/${pages.length} · ${pct}%`;
    $$('.nav-link').forEach((a) => {
      const tick = $('.tick', a);
      if (tick) tick.textContent = mem.done[a.dataset.id] ? '✓' : '';
    });
  }

  function openMenu(open) {
    sidebar.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  }
  $('#menuBtn').addEventListener('click', () => openMenu(!sidebar.classList.contains('open')));
  $('#closeMenu').addEventListener('click', () => openMenu(false));
  scrim.addEventListener('click', () => openMenu(false));
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a.nav-link')) openMenu(false);
  });

  /* ------------------------------------------------------------ рендер страниц */
  function renderHome() {
    const total = manifest.pages.filter((p) => lessonSections().some((s) => s.id === p.section));
    let cards = '';
    manifest.sections.forEach((s) => {
      const ps = pagesOf(s.id);
      if (!ps.length) return;
      const done = ps.filter((p) => mem.done[p.id]).length;
      cards += `<a class="sec-card" href="#/${ps[0].id}"><div class="ico" aria-hidden="true">${s.icon}</div><h3>${esc(s.title)}</h3><p>${esc(
        s.desc
      )}</p><div class="cnt">${ps.length} ${plural(ps.length, 'страница', 'страницы', 'страниц')}${s.track ? ` · пройдено ${done}` : ''}</div></a>`;
    });
    const last = mem.last && pageById[mem.last] ? pageById[mem.last] : null;
    elContent.innerHTML = `
      <section class="hero">
        <h1>Lua и Roblox: от первой строки до заработка</h1>
        <p>Справочник на русском: язык Lua/Luau, программирование в Roblox Studio, работа с ИИ без лишних затрат, командная разработка, монетизация и налоги в Польше. Теория, примеры, задачи с проверкой в браузере и калькуляторы.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/roadmap" style="display:inline-flex;align-items:center;text-decoration:none">🗺 Дорожная карта</a>
          <a class="btn" href="#/${last ? last.id : 'lua-01-start'}" style="display:inline-flex;align-items:center;text-decoration:none">${last ? '▶ Продолжить: ' + esc(last.title) : '▶ Начать с Lua'}</a>
        </div>
      </section>
      <h2 style="margin-top:8px">Разделы</h2>
      <div class="sec-grid">${cards}</div>
      <div class="panel"><strong>Как пользоваться.</strong> Идите по <a href="#/roadmap">дорожной карте</a>. В каждом уроке: теория → примеры, которые можно запускать и править → задания с проверкой → тест. Прогресс сохраняется в вашем браузере (${total.length} страниц в треках обучения).</div>
      <p class="notice">Неофициальный справочник. Roblox и Luau — торговые марки их владельцев; сайт с ними не связан. Факты о Roblox, налогах и ценах меняются — у каждого такого раздела есть ссылки на официальные источники. Не является налоговой или юридической консультацией.</p>`;
    elToc.innerHTML = '';
    document.title = 'Lua и Roblox — справочник и дорожная карта';
    setCrumb('home');
  }

  function plural(n, a, b, c) {
    const m = n % 10,
      k = n % 100;
    if (m === 1 && k !== 11) return a;
    if (m >= 2 && m <= 4 && (k < 10 || k >= 20)) return b;
    return c;
  }

  function setCrumb(id) {
    $$('.tab').forEach((t) => {
      if (t.dataset.go === id) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
  }

  function renderProgressPage() {
    let h = '<h1 class="page-title">Мой прогресс</h1><p class="lead">Данные хранятся только в этом браузере (localStorage).</p>';
    lessonSections().forEach((s) => {
      const ps = pagesOf(s.id);
      if (!ps.length) return;
      const done = ps.filter((p) => mem.done[p.id]).length;
      h += `<div class="panel"><strong>${s.icon} ${esc(s.title)}</strong> — ${done}/${ps.length}<div class="bar" style="margin:8px 0"><i style="width:${Math.round(
        (done / ps.length) * 100
      )}%"></i></div>`;
      ps.forEach((p) => {
        const tasks = Object.keys(mem.tasks).filter((k) => k.startsWith(p.id + ':') && mem.tasks[k]).length;
        h += `<div><a href="#/${p.id}">${mem.done[p.id] ? '✅' : '⬜'} ${esc(p.title)}</a>${tasks ? ` <span class="chip">задач решено: ${tasks}</span>` : ''}</div>`;
      });
      h += '</div>';
    });
    h += '<button class="btn" id="resetProg" type="button">Сбросить весь прогресс</button>';
    elContent.innerHTML = h;
    elToc.innerHTML = '';
    $('#resetProg').addEventListener('click', () => {
      if (confirm('Удалить весь сохранённый прогресс?')) {
        mem.done = {};
        mem.checks = {};
        mem.tasks = {};
        mem.quiz = {};
        save();
        updateProgress();
        renderProgressPage();
      }
    });
    document.title = 'Мой прогресс — Lua и Roblox';
  }

  async function renderPage(id, anchor) {
    const token = ++navToken;
    const p = pageById[id];
    const sec = manifest.sections.find((s) => s.id === p.section);
    elContent.innerHTML = '<p class="lead">Загрузка…</p>';
    let src;
    try {
      src = await loadMd(p);
    } catch (e) {
      elContent.innerHTML = '<div class="callout callout-danger"><div class="callout-title">Не удалось загрузить страницу</div><p>Проверьте соединение и обновите страницу. Если вы открыли index.html как файл (file://), запустите локальный сервер: <code>python3 -m http.server</code>.</p></div>';
      return;
    }
    if (token !== navToken) return;
    const { html, toc } = MD.render(src, { pageId: id, titleOf });
    const pages = pagesOf(p.section);
    const idx = pages.findIndex((x) => x.id === id);
    const prev = pages[idx - 1];
    const next = pages[idx + 1];
    const isTrack = sec && sec.track;
    elContent.innerHTML = `
      <div class="crumbs"><a href="#/">Главная</a> / ${sec ? esc(sec.icon + ' ' + sec.title) : ''}</div>
      <h1 class="page-title">${esc(p.title)}</h1>
      <div class="page-meta">${p.time ? `<span class="chip">⏱ ${p.time} мин</span>` : ''}${p.level ? `<span class="chip">🎯 ${esc(p.level)}</span>` : ''}${
        isTrack ? `<span class="chip">№ ${idx + 1} из ${pages.length}</span>` : ''
      }</div>
      ${p.summary ? `<p class="lead">${esc(p.summary)}</p>` : ''}
      <div class="content">${html}</div>
      ${
        isTrack
          ? `<div class="done-row"><button class="btn ${mem.done[id] ? '' : 'btn-primary'}" id="doneBtn" type="button">${
              mem.done[id] ? '✓ Пройдено (нажмите, чтобы снять)' : 'Отметить как пройденное'
            }</button></div>`
          : ''
      }
      <nav class="pager" aria-label="Соседние страницы">${
        prev ? `<a class="prev" href="#/${prev.id}"><small>← Назад</small>${esc(prev.title)}</a>` : '<span></span>'
      }${next ? `<a class="next" href="#/${next.id}"><small>Дальше →</small>${esc(next.title)}</a>` : '<span></span>'}</nav>`;
    document.title = `${p.title} — Lua и Roblox`;
    mem.last = id;
    save();

    elToc.innerHTML = toc.length
      ? '<h5>На странице</h5>' + toc.map((t) => `<a href="#/${id}" class="l${t.level}" data-to="${t.id}">${esc(t.text)}</a>`).join('')
      : '';

    enhance(elContent, id);
    const db = $('#doneBtn');
    if (db)
      db.addEventListener('click', () => {
        mem.done[id] = !mem.done[id];
        save();
        updateProgress();
        db.className = 'btn ' + (mem.done[id] ? '' : 'btn-primary');
        db.textContent = mem.done[id] ? '✓ Пройдено (нажмите, чтобы снять)' : 'Отметить как пройденное';
        if (mem.done[id]) toast('Отлично! Страница отмечена.');
      });
    if (anchor) {
      const t = document.getElementById(anchor);
      if (t) t.scrollIntoView();
    }
    observeToc();
  }

  let tocObs = null;
  function observeToc() {
    if (tocObs) tocObs.disconnect();
    const links = $$('#toc a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    tocObs = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.toggle('on', l.dataset.to === e.target.id));
          }
        });
      },
      { rootMargin: '-70px 0px -70% 0px' }
    );
    links.forEach((l) => {
      const t = document.getElementById(l.dataset.to);
      if (t) tocObs.observe(t);
    });
  }

  elToc.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-to]');
    if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.dataset.to);
    if (t) t.scrollIntoView();
  });

  /* ------------------------------------------------------------ Lua runner */
  let worker = null;
  let pending = null;
  let reqId = 0;
  function getWorker() {
    if (worker) return worker;
    worker = new Worker('assets/js/lua-worker.js');
    worker.onmessage = (e) => {
      if (pending && pending.id === e.data.id) {
        clearTimeout(pending.timer);
        const p = pending;
        pending = null;
        p.resolve(e.data);
      }
    };
    worker.onerror = (e) => {
      if (pending) {
        clearTimeout(pending.timer);
        const p = pending;
        pending = null;
        p.resolve({ ok: false, err: 'Ошибка запуска движка Lua: ' + (e.message || 'неизвестно'), out: [] });
      }
      worker = null;
    };
    return worker;
  }
  function runLua(code, tests) {
    return new Promise((resolve) => {
      let w;
      try {
        w = getWorker();
      } catch (e) {
        resolve({ ok: false, err: 'Браузер не смог запустить Web Worker (откройте сайт по http/https, а не file://).', out: [] });
        return;
      }
      const id = ++reqId;
      const timer = setTimeout(() => {
        if (worker) worker.terminate();
        worker = null;
        pending = null;
        resolve({ ok: false, err: 'Время выполнения вышло (4 с). Возможно, бесконечный цикл.', out: [], timeout: true });
      }, 4000);
      pending = { id, timer, resolve };
      w.postMessage({ id, code, tests });
    });
  }

  function showResult(box, res, mode) {
    const lines = res.out.filter((l) => !(res.err && l === '[error] ' + res.err));
    let h = '';
    if (lines.length) h += `<div>${esc(lines.join('\n'))}</div>`;
    else if (res.ok && mode !== 'check') h += '<div class="dim">(программа ничего не вывела)</div>';
    if (!res.ok) {
      h += `<div class="err">${mode === 'check' && !res.timeout ? '✘ Проверка не пройдена: ' : '⚠ Ошибка: '}${esc(res.err || '')}</div>`;
    } else if (mode === 'check') {
      h += '<div class="okmsg">✔ Все проверки пройдены — задача решена!</div>';
    }
    box.innerHTML = h;
    box.hidden = false;
  }

  /* ------------------------------------------------------------ усиление контента */
  function enhance(root, pageId) {
    // копирование
    $$('.code .copy-btn', root).forEach((b) =>
      b.addEventListener('click', () => copyText($('textarea.raw', b.closest('.code')).value, b))
    );
    $$('.code-run', root).forEach((box) => {
      const ed = $('.editor', box);
      const out = $('.run-out', box);
      const run = $('.run-btn', box);
      const chk = $('.check-btn', box);
      const reset = $('.reset-btn', box);
      const copy = $('.copy-btn', box);
      const test = $('.task-test', box);
      const withBusy = async (btn, fn) => {
        btn.disabled = true;
        try {
          await fn();
        } finally {
          btn.disabled = false;
        }
      };
      if (run)
        run.addEventListener('click', () =>
          withBusy(run, async () => showResult(out, await runLua(ed.value), 'run'))
        );
      if (chk)
        chk.addEventListener('click', () =>
          withBusy(chk, async () => {
            const res = await runLua(ed.value, test ? test.value : '');
            showResult(out, res, 'check');
            const task = chk.closest('.task');
            if (res.ok && task) setTask(task, true);
          })
        );
      if (reset)
        reset.addEventListener('click', () => {
          ed.value = ed.dataset.orig;
          out.hidden = true;
        });
      if (copy) copy.addEventListener('click', () => copyText(ed.value, copy));
      ed.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          (chk || run).click();
        }
      });
    });

    // чек-листы
    $$('.tl-check', root).forEach((c) => {
      if (mem.checks[c.dataset.key] !== undefined) c.checked = !!mem.checks[c.dataset.key];
      c.addEventListener('change', () => {
        mem.checks[c.dataset.key] = c.checked;
        save();
      });
    });

    // задачи
    $$('.task', root).forEach((t) => {
      const cb = $('.task-check', t);
      if (mem.tasks[t.dataset.task]) {
        t.classList.add('done');
        cb.checked = true;
      }
      cb.addEventListener('change', () => setTask(t, cb.checked));
    });

    // тесты
    $$('.quiz', root).forEach((q) => {
      const id = q.dataset.quiz;
      const opts = $$('.quiz-opt', q);
      const expl = $('.quiz-expl', q);
      const reveal = () => {
        opts.forEach((o) => {
          o.disabled = true;
          if (o.dataset.ok === '1') o.classList.add('right');
        });
        expl.hidden = false;
      };
      if (mem.quiz[id]) reveal();
      opts.forEach((o) =>
        o.addEventListener('click', () => {
          if (o.dataset.ok === '1') {
            mem.quiz[id] = 1;
            save();
            reveal();
          } else {
            o.classList.add('wrong');
            o.disabled = true;
            toast('Не совсем. Попробуйте ещё раз.');
          }
        })
      );
    });

    // якоря заголовков
    $$('a.anchor', root).forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const url = location.href.split('#')[0] + '#/' + pageId + '~' + a.dataset.anchor;
        copyText(url, null, 'Ссылка на раздел скопирована');
        document.getElementById(a.dataset.anchor).scrollIntoView();
      })
    );

    // компоненты
    $$('.component', root).forEach((el) => {
      const fn = window.Components && window.Components[el.dataset.component];
      if (fn) fn(el, el.dataset.args, { Store, toast, esc, runLua });
      else el.innerHTML = '<div class="callout callout-warn"><div class="callout-title">Компонент недоступен</div></div>';
    });
  }

  function setTask(t, v) {
    t.classList.toggle('done', v);
    $('.task-check', t).checked = v;
    mem.tasks[t.dataset.task] = v;
    save();
  }

  async function copyText(txt, btn, msg) {
    try {
      await navigator.clipboard.writeText(txt);
      if (btn) {
        const o = btn.textContent;
        btn.textContent = 'Скопировано ✓';
        setTimeout(() => (btn.textContent = o), 1400);
      }
      toast(msg || 'Скопировано');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast(msg || 'Скопировано');
      } catch (_) {
        toast('Не удалось скопировать');
      }
      ta.remove();
    }
  }

  /* ------------------------------------------------------------ поиск */
  const modal = $('#searchModal');
  const sInput = $('#searchInput');
  const sRes = $('#searchResults');
  let sActive = -1;
  let searchIdx = null;
  async function ensureSearchIndex() {
    if (searchIdx) return;
    try {
      const r = await fetch('content/search.json');
      searchIdx = await r.json();
    } catch (e) {
      searchIdx = {};
    }
    if (modal.classList.contains('show')) renderResults(sInput.value);
  }
  function openSearch() {
    ensureSearchIndex();
    modal.classList.add('show');
    sInput.value = '';
    renderResults('');
    setTimeout(() => sInput.focus(), 30);
    document.body.style.overflow = 'hidden';
  }
  function closeSearch() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
  function renderResults(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      sRes.innerHTML = '<div class="empty">Начните вводить: «pcall», «DataStore», «налог», «RemoteEvent», «калькулятор»…</div>';
      sActive = -1;
      return;
    }
    const tokens = q.split(/\s+/);
    const scored = [];
    manifest.pages.forEach((p) => {
      const title = p.title.toLowerCase();
      const sum = (p.summary || '').toLowerCase();
      const text = (searchIdx && searchIdx[p.id]) || '';
      let score = 0;
      let ok = true;
      for (const t of tokens) {
        let s = 0;
        if (title.includes(t)) s += 12;
        if (sum.includes(t)) s += 4;
        const tc = text.split(t).length - 1;
        if (tc) s += Math.min(tc, 8);
        if (!s) ok = false;
        score += s;
      }
      if (ok) scored.push({ p, score });
    });
    scored.sort((a, b) => b.score - a.score);
    if (!scored.length) {
      sRes.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте другое слово.</div>';
      sActive = -1;
      return;
    }
    sRes.innerHTML = scored
      .slice(0, 20)
      .map(({ p }, i) => {
        const text = (searchIdx && searchIdx[p.id]) || '';
        const pos = text.indexOf(tokens[0]);
        let snip = '';
        if (pos >= 0) {
          const s = Math.max(0, pos - 40);
          snip = (s > 0 ? '…' : '') + text.slice(s, pos + 100) + '…';
          snip = esc(snip).replace(new RegExp('(' + tokens[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        } else snip = esc(p.summary || '');
        const sec = manifest.sections.find((s) => s.id === p.section);
        return `<a class="result${i === 0 ? ' active' : ''}" href="#/${p.id}"><b>${esc(p.title)}</b><span>${sec ? esc(sec.icon + ' ' + sec.title) + ' · ' : ''}${snip}</span></a>`;
      })
      .join('');
    sActive = 0;
  }
  sInput.addEventListener('input', () => renderResults(sInput.value));
  sInput.addEventListener('keydown', (e) => {
    const items = $$('.result', sRes);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      sActive = (sActive + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('active', i === sActive));
      items[sActive].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && items[sActive]) {
      e.preventDefault();
      location.hash = items[sActive].getAttribute('href');
      closeSearch();
    }
  });
  sRes.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeSearch();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSearch();
  });
  $('#searchBtn').addEventListener('click', openSearch);
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === 'Escape') {
      closeSearch();
      openMenu(false);
    } else if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag))) {
      e.preventDefault();
      openSearch();
    }
  });

  /* ------------------------------------------------------------ роутер */
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const [id, anchor] = h.split('~');
    return { id: id || '', anchor };
  }

  async function route() {
    if (!manifest) return;
    const { id, anchor } = parseHash();
    openMenu(false);
    if (!id) {
      renderHome();
      markNav('');
      window.scrollTo(0, 0);
      return;
    }
    if (id === 'progress') {
      renderProgressPage();
      markNav('');
      setCrumb('progress');
      window.scrollTo(0, 0);
      return;
    }
    const p = pageById[id];
    if (!p) {
      elContent.innerHTML = `<h1 class="page-title">Страница не найдена</h1><p>Такой страницы нет: <code>${esc(id)}</code>. <a href="#/">На главную</a>.</p>`;
      elToc.innerHTML = '';
      return;
    }
    markNav(id);
    setCrumb(p.section === 'lua' ? 'lua' : p.section === 'roblox' ? 'roblox' : id === 'roadmap' ? 'roadmap' : '');
    if (!anchor) window.scrollTo(0, 0);
    await renderPage(id, anchor);
  }
  window.addEventListener('hashchange', route);

  /* ------------------------------------------------------------ нижняя панель */
  $$('.tab[data-go]').forEach((t) =>
    t.addEventListener('click', (e) => {
      const go = t.dataset.go;
      if (go === 'menu') {
        openMenu(true);
      } else if (go === 'lua' || go === 'roblox') {
        const ps = pagesOf(go);
        if (ps[0]) location.hash = '#/' + ps[0].id;
      } else if (go === 'home') {
        location.hash = '#/';
      } else {
        location.hash = '#/' + go;
      }
      e.preventDefault();
    })
  );

  /* ------------------------------------------------------------ старт */
  (async function init() {
    try {
      await loadManifest();
    } catch (e) {
      elContent.innerHTML =
        '<div class="callout callout-danger"><div class="callout-title">Не удалось загрузить содержимое</div><p>Файл <code>content/manifest.json</code> не найден. Запустите <code>node tools/build.js</code> и откройте сайт через http-сервер.</p></div>';
      return;
    }
    buildNav();
    updateProgress();
    await route();
  })();
})();
