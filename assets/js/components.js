/* Интерактивные компоненты страниц: {{success-calc}}, {{income-calc}}, {{api-table}} */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const nf = (n, d = 0) =>
    (isFinite(n) ? n : 0).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d });
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const logit = (p) => Math.log(p / (1 - p));
  const sigm = (z) => 1 / (1 + Math.exp(-z));

  function persist(key, ctx) {
    const mem = ctx.Store.mem;
    mem.calc = mem.calc || {};
    return {
      get: (k, d) => (mem.calc[key] && mem.calc[key][k] !== undefined ? mem.calc[key][k] : d),
      set: (k, v) => {
        mem.calc[key] = mem.calc[key] || {};
        mem.calc[key][k] = v;
        ctx.Store.save();
      },
    };
  }

  /* ============================================================ шансы на успех */
  const GENRES = [
    { id: 'sim', name: 'Симулятор / собирательство', shift: 0.15 },
    { id: 'tycoon', name: 'Тайкун', shift: -0.05 },
    { id: 'td', name: 'Tower Defense', shift: 0.1 },
    { id: 'anime', name: 'Аниме-файтинг / герои с гача-механикой', shift: 0.05 },
    { id: 'trend', name: 'Трендовый «вирусный» формат (brainrot, grow-like и т.п.)', shift: 0.35 },
    { id: 'obby', name: 'Оби / паркур', shift: -0.2 },
    { id: 'horror', name: 'Кооперативный хоррор', shift: 0.2 },
    { id: 'rpg', name: 'RPG / приключение', shift: -0.1 },
    { id: 'rp', name: 'Ролёвка / социальная игра', shift: 0 },
    { id: 'race', name: 'Гонки / вождение', shift: -0.1 },
    { id: 'shoot', name: 'Шутер / PvP', shift: -0.15 },
    { id: 'orig', name: 'Оригинальная идея вне жанров', shift: -0.1 },
  ];

  // w — вклад в log-odds на единицу отклонения от center
  const FACTORS = [
    { id: 'loop', label: 'Качество основного цикла (интересно ли играть 10+ минут)', min: 0, max: 5, step: 1, def: 3, center: 2.5, w: 0.55, unit: '/5', tip: 'Покажите игру 5 незнакомым людям; считайте, сколько играют без просьб.' },
    { id: 'polish', label: 'Полировка: UI, звук, эффекты, «сочность»', min: 0, max: 5, step: 1, def: 3, center: 2.5, w: 0.3, unit: '/5', tip: 'Анимации кнопок, звуки наград, понятный интерфейс на телефоне.' },
    { id: 'code', label: 'Надёжность кода и сохранений (нет потери данных, нет эксплойтов)', min: 0, max: 5, step: 1, def: 3, center: 2.5, w: 0.25, unit: '/5', tip: 'Проверка на сервере, безопасные DataStore, защита Remote.' },
    { id: 'mon', label: 'Продуманность монетизации (честные, понятные предложения)', min: 0, max: 5, step: 1, def: 3, center: 2.5, w: 0.2, unit: '/5', tip: 'Покупки должны усиливать игру, а не ломать её.' },
    { id: 'tests', label: 'Итерации плейтестов с настоящими игроками', min: 0, max: 3, step: 1, def: 1, center: 1.5, w: 0.35, labels: ['0', '1–3', '4–10', '10+'], tip: 'Смотрите на ретеншн D1/D7, а не на «мне нравится».' },
    { id: 'updates', label: 'Обновления в месяц после запуска', min: 0, max: 3, step: 1, def: 1, center: 1.5, w: 0.45, labels: ['0', '1', '2–3', '4+'], tip: 'Live-ops: события, новые зоны, ивенты.' },
    { id: 'hours', label: 'Суммарные часы разработки до запуска', min: 50, max: 4000, step: 50, def: 600, center: null, kind: 'log', base: 400, w: 0.3, unit: ' ч', tip: 'Больше времени ≠ лучше, если нет плейтестов.' },
    { id: 'aud', label: 'Своя аудитория (подписчики / Discord / TikTok / YouTube)', min: 0, max: 100000, step: 100, def: 200, center: null, kind: 'log10', base: 2.0, w: 0.28, unit: '', tip: 'Первые 100–1000 игроков часто приходят из личной аудитории.' },
    { id: 'ads', label: 'Бюджет на рекламу в месяц, USD', min: 0, max: 3000, step: 10, def: 50, center: null, kind: 'log10', base: 1.5, w: 0.2, unit: ' $', tip: 'Реклама работает, только если ретеншн уже приемлемый.' },
  ];
  const TOGGLES = [
    { id: 'mobile', label: 'Игра удобна на телефоне (большая часть аудитории Roblox — мобильная)', w: 0.35 },
    { id: 'social', label: 'Есть социальные/кооперативные крючки (друзья, гильдии, обмены)', w: 0.3 },
    { id: 'codes', label: 'Есть промокоды/события/ежедневные награды', w: 0.2 },
  ];

  function successCalc(el, args, ctx) {
    const P = persist('success', ctx);
    const vals = {};
    FACTORS.forEach((f) => (vals[f.id] = P.get(f.id, f.def)));
    TOGGLES.forEach((t) => (vals[t.id] = P.get(t.id, t.id === 'mobile')));
    let genre = P.get('genre', 'sim');
    let base = [P.get('b1', 3), P.get('b2', 0.3), P.get('b3', 0.03)];

    el.innerHTML = `
      <div class="panel">
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1"><label for="sc-genre">Жанр / формат</label>
            <select id="sc-genre">${GENRES.map((g) => `<option value="${g.id}">${g.name}</option>`).join('')}</select>
          </div>
          ${FACTORS.map(
            (f) => `<div class="field"><label for="sc-${f.id}">${f.label}<span class="range-val" id="sc-v-${f.id}"></span></label>
              <input type="range" id="sc-${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${vals[f.id]}">
              <div class="hint">${f.tip}</div></div>`
          ).join('')}
        </div>
        <div class="field" style="margin-top:12px">${TOGGLES.map(
          (t) => `<label style="display:flex;gap:10px;align-items:flex-start;font-weight:500;min-height:44px;cursor:pointer"><input type="checkbox" id="sc-${t.id}" style="width:22px;height:22px;margin-top:2px;accent-color:var(--accent)" ${vals[t.id] ? 'checked' : ''}> <span>${t.label}</span></label>`
        ).join('')}</div>
        <details class="fold" style="margin-top:12px"><summary>⚙ Базовые вероятности (допущения модели)</summary><div class="fold-body">
          <p class="hint">Это <b>не статистика Roblox</b>, а грубые допущения для «обычной» новой игры без раскрутки. Измените под своё мнение — модель пересчитает всё.</p>
          <div class="form-grid">
            <div class="field"><label for="sc-b1">P(пик ≥ 100 CCU), %</label><input id="sc-b1" type="number" step="0.1" min="0.01" max="50" value="${base[0]}"></div>
            <div class="field"><label for="sc-b2">P(пик ≥ 1 000 CCU), %</label><input id="sc-b2" type="number" step="0.01" min="0.001" max="30" value="${base[1]}"></div>
            <div class="field"><label for="sc-b3">P(пик ≥ 10 000 CCU), %</label><input id="sc-b3" type="number" step="0.001" min="0.0001" max="10" value="${base[2]}"></div>
          </div></div></details>
        <div class="result-box" id="sc-out" aria-live="polite"></div>
      </div>`;

    $('#sc-genre', el).value = genre;

    function fvalue(f, v) {
      if (f.kind === 'log') return Math.log(Math.max(v, 1) / f.base);
      if (f.kind === 'log10') return Math.log10(v + 1) - f.base;
      return v - f.center;
    }
    function z(vs, g) {
      // возвращает [z1,z2,z3]
      const K = [1, 0.8, 0.6]; // чем выше уровень, тем больше роль удачи и тренда, и тем слабее влияние ваших действий
      let s = GENRES.find((x) => x.id === g).shift;
      FACTORS.forEach((f) => (s += clamp(f.w * fvalue(f, vs[f.id]), -1.3, 1.3)));
      TOGGLES.forEach((t) => (s += vs[t.id] ? t.w : 0));
      return K.map((k, i) => logit(base[i] / 100) + s * k);
    }
    const pct = (p) => (p < 0.001 ? '<0,1%' : nf(p * 100, p < 0.01 ? 2 : p < 0.1 ? 1 : 0) + '%');

    function update() {
      FACTORS.forEach((f) => {
        const v = +$('#sc-' + f.id, el).value;
        vals[f.id] = v;
        $('#sc-v-' + f.id, el).textContent = f.labels ? f.labels[v] : nf(v) + (f.unit || '');
        P.set(f.id, v);
      });
      TOGGLES.forEach((t) => {
        vals[t.id] = $('#sc-' + t.id, el).checked;
        P.set(t.id, vals[t.id]);
      });
      genre = $('#sc-genre', el).value;
      P.set('genre', genre);
      base = [+$('#sc-b1', el).value || 3, +$('#sc-b2', el).value || 0.3, +$('#sc-b3', el).value || 0.03];
      base.forEach((b, i) => P.set('b' + (i + 1), b));
      const zs = z(vals, genre);
      const ps = zs.map(sigm);
      const tiers = ['≥ 100 CCU (приятный хобби-доход)', '≥ 1 000 CCU (серьёзный доход)', '≥ 10 000 CCU (хит)'];

      // чувствительность: что даст улучшение каждого фактора
      const gains = [];
      FACTORS.forEach((f) => {
        if (f.labels || f.max <= 5) {
          if (vals[f.id] >= f.max) return;
          const t = { ...vals, [f.id]: vals[f.id] + 1 };
          gains.push({ f, d: sigm(z(t, genre)[0]) - ps[0], how: '+1 пункт' });
        } else {
          const nv = Math.min(f.max, Math.max(vals[f.id] * 2, f.step));
          if (nv === vals[f.id]) return;
          const t = { ...vals, [f.id]: nv };
          gains.push({ f, d: sigm(z(t, genre)[0]) - ps[0], how: '×2 (' + nf(nv) + (f.unit || '') + ')' });
        }
      });
      TOGGLES.forEach((t) => {
        if (vals[t.id]) return;
        const tt = { ...vals, [t.id]: true };
        gains.push({ f: { label: t.label, tip: '' }, d: sigm(z(tt, genre)[0]) - ps[0], how: 'добавить' });
      });
      gains.sort((a, b) => b.d - a.d);
      const top = gains.slice(0, 3);

      $('#sc-out', el).innerHTML = `
        ${ps
          .map(
            (p, i) => `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><strong>${tiers[i]}</strong><span class="big-num" style="font-size:1.5rem">${pct(p)}</span></div>
            <div class="bar" role="progressbar" aria-valuenow="${(p * 100).toFixed(2)}" aria-valuemin="0" aria-valuemax="100" aria-label="${tiers[i]}"><i style="width:${clamp(Math.sqrt(p) * 100, 1, 100)}%"></i></div></div>`
          )
          .join('')}
        <p class="hint">Шкала полос — корень из вероятности (чтобы маленькие числа были видны). Это <b>оценка по эвристической модели</b>, а не прогноз: чем выше уровень, тем сильнее решает удача, момент и алгоритм рекомендаций — поэтому ваши действия меняют верхние уровни слабее.</p>
        <h4 style="margin:14px 0 6px">Что даст больше всего (для шанса ≥100 CCU)</h4>
        ${
          top.length
            ? '<ol style="margin:0;padding-left:1.3em">' +
              top
                .map((g) => `<li><b>${g.f.label.split('(')[0].trim()}</b> — ${g.how}: <b>+${nf(g.d * 100, 1)} п.п.</b>${g.f.tip ? '<br><span class="hint">' + g.f.tip + '</span>' : ''}</li>`)
                .join('') +
              '</ol>'
            : '<p>Все факторы уже на максимуме — дальше только удача и время.</p>'
        }
        <p class="hint" style="margin-top:12px">Ожидаемое число «хитов» на 10 таких попыток (≥1 000 CCU): <b>${nf(ps[1] * 10, 2)}</b>. Если одна попытка стоит вам ~3 месяца — планируйте минимум 3–5 попыток, а не одну «главную».</p>`;
    }
    $$('input,select', el).forEach((i) => i.addEventListener('input', update));
    update();
  }

  /* ============================================================ доход и налоги PL */
  const DEFAULT_PL = {
    minWage: 4806, // минимальная зарплата 2026 (брутто)
    zusBase: 5652, // база «большого ZUS» 2026
    zusPref: 1441.8, // преференциальная база 2026
    h1: 498.35, // здоровье, ryczałt, доход ≤ 60k/год
    h2: 830.58, // 60–300k
    h3: 1495.04, // > 300k
  };
  const ZUS_RATES = { emer: 0.1952, rent: 0.08, wyp: 0.0167, fp: 0.0245 };

  function incomeCalc(el, args, ctx) {
    const P = persist('income', ctx);
    const g = (k, d) => P.get(k, d);
    const num = (id) => +$('#ic-' + id, el).value || 0;
    const pl = { ...DEFAULT_PL, ...(P.get('pl', {})) };

    el.innerHTML = `
      <div class="panel">
        <h3 style="margin-top:0">1. Игра <span class="hint" style="font-weight:400">(значения — пример, не прогноз)</span></h3>
        <div class="form-grid">
          <div class="field"><label for="ic-ccu">Средний CCU (одновременно онлайн)</label><input id="ic-ccu" type="number" min="0" step="1" value="${g('ccu', 100)}"></div>
          <div class="field"><label for="ic-sess">Средняя длительность сессии, мин</label><input id="ic-sess" type="number" min="1" step="1" value="${g('sess', 25)}"><div class="hint">DAU ≈ CCU × 1440 / сессия (упрощение)</div></div>
          <div class="field"><label for="ic-conv">Доля платящих среди DAU, %</label><input id="ic-conv" type="number" min="0" step="0.1" value="${g('conv', 2)}"><div class="hint">Часто 1–5% в донат-играх</div></div>
          <div class="field"><label for="ic-arppu">Средний чек платящего за день, Robux</label><input id="ic-arppu" type="number" min="0" step="10" value="${g('arppu', 150)}"></div>
          <div class="field"><label for="ic-cr">Creator Rewards / Premium-выплаты, % к выручке</label><input id="ic-cr" type="number" min="0" step="1" value="${g('cr', 0)}"><div class="hint">Зависит от вовлечённости; возьмите 0, если не уверены</div></div>
          <div class="field"><label for="ic-share">Платформа оставляет, %</label><input id="ic-share" type="number" min="0" max="100" step="1" value="${g('share', 30)}"><div class="hint">Для passes/products сейчас 30% (проверьте в Creator Hub)</div></div>
        </div>
        <h3>2. Вывод Robux (DevEx) → деньги</h3>
        <div class="form-grid">
          <div class="field"><label for="ic-rate">Курс DevEx, USD за 1 Robux</label><input id="ic-rate" type="number" min="0" step="0.0001" value="${g('rate', 0.0038)}"><div class="hint">Стандарт $0.0038; $0.0035 — старый; US 18+ — выше. Сверьте на странице DevEx.</div></div>
          <div class="field"><label for="ic-usrate">Доля Robux по повышенному курсу (US 18+), %</label><input id="ic-usrate" type="number" min="0" max="100" step="5" value="${g('usrate', 0)}"><div class="hint">Для большинства игр — 0 (не гарантируется)</div></div>
          <div class="field"><label for="ic-rate2">Повышенный курс, USD/Robux</label><input id="ic-rate2" type="number" min="0" step="0.0001" value="${g('rate2', 0.0054)}"></div>
          <div class="field"><label for="ic-usd">Курс 1 USD = … PLN</label><input id="ic-usd" type="number" min="0" step="0.01" value="${g('usd', 3.7)}"><div class="hint">Для налога берут курс NBP предыдущего рабочего дня</div></div>
          <div class="field"><label for="ic-fee">Комиссии вывода/конвертации, %</label><input id="ic-fee" type="number" min="0" step="0.5" value="${g('fee', 1)}"></div>
          <div class="field"><label for="ic-wh">Удержание налога в США, %</label><input id="ic-wh" type="number" min="0" max="30" step="1" value="${g('wh', 0)}"><div class="hint">При корректной форме W-8BEN обычно 0; без неё может быть до 30%</div></div>
        </div>
        <h3>3. Команда и расходы</h3>
        <div class="form-grid">
          <div class="field"><label for="ic-mine">Моя доля выручки, %</label><input id="ic-mine" type="number" min="0" max="100" step="5" value="${g('mine', 50)}"><div class="hint">Для команды из двух — например 50/50</div></div>
          <div class="field"><label for="ic-cost">Мои расходы в месяц, USD</label><input id="ic-cost" type="number" min="0" step="5" value="${g('cost', 40)}"><div class="hint">ИИ-подписки/токены, реклама, софт, ассеты</div></div>
          <div class="field"><label for="ic-hours">Мои часы работы в месяц</label><input id="ic-hours" type="number" min="0" step="5" value="${g('hours', 80)}"></div>
        </div>
        <h3>4. Налоги в Польше</h3>
        <div class="form-grid">
          <div class="field"><label for="ic-zus">Режим ZUS</label>
            <select id="ic-zus"><option value="start">Ulga na start (первые 6 мес.: без соц. взносов)</option><option value="pref">Преференциальный ZUS (24 мес.)</option><option value="full">Большой ZUS</option><option value="none">Нет JDG / не считать ZUS</option></select></div>
          <div class="field"><label for="ic-ipq">IP Box: доля «квалифицированного» дохода, %</label><input id="ic-ipq" type="number" min="0" max="100" step="5" value="${g('ipq', 100)}"><div class="hint">Нужны условия IP Box (учёт, R&amp;D, права на ПО) — только с бухгалтером</div></div>
        </div>
        <details class="fold" style="margin-top:12px"><summary>⚙ Параметры 2026 (проверьте актуальные значения!)</summary><div class="fold-body">
          <div class="form-grid">
            <div class="field"><label for="ic-pl-minWage">Минимальная зарплата, PLN</label><input id="ic-pl-minWage" type="number" step="1" value="${pl.minWage}"></div>
            <div class="field"><label for="ic-pl-zusBase">База большого ZUS, PLN</label><input id="ic-pl-zusBase" type="number" step="0.01" value="${pl.zusBase}"></div>
            <div class="field"><label for="ic-pl-zusPref">База преф. ZUS, PLN</label><input id="ic-pl-zusPref" type="number" step="0.01" value="${pl.zusPref}"></div>
            <div class="field"><label for="ic-pl-h1">Здоровье ryczałt ≤60 тыс./год, PLN/мес.</label><input id="ic-pl-h1" type="number" step="0.01" value="${pl.h1}"></div>
            <div class="field"><label for="ic-pl-h2">Здоровье ryczałt 60–300 тыс., PLN/мес.</label><input id="ic-pl-h2" type="number" step="0.01" value="${pl.h2}"></div>
            <div class="field"><label for="ic-pl-h3">Здоровье ryczałt &gt;300 тыс., PLN/мес.</label><input id="ic-pl-h3" type="number" step="0.01" value="${pl.h3}"></div>
          </div>
          <p class="hint">Источники: ZUS (zus.pl), Ministerstwo Finansów/podatki.gov.pl, обзоры за 2026. Значения могут измениться — обновляйте.</p>
        </div></details>
        <div class="result-box" id="ic-out" aria-live="polite"></div>
      </div>`;
    $('#ic-zus', el).value = g('zus', 'start');

    function zusSocial(mode) {
      const sum = (base, fp) => base * (ZUS_RATES.emer + ZUS_RATES.rent + ZUS_RATES.wyp + (fp ? ZUS_RATES.fp : 0));
      if (mode === 'full') return sum(pl.zusBase, true);
      if (mode === 'pref') return sum(pl.zusPref, false);
      return 0;
    }

    function calc() {
      ['ccu', 'sess', 'conv', 'arppu', 'cr', 'share', 'rate', 'usrate', 'rate2', 'usd', 'fee', 'wh', 'mine', 'cost', 'hours', 'ipq'].forEach((k) => P.set(k, num(k)));
      P.set('zus', $('#ic-zus', el).value);
      ['minWage', 'zusBase', 'zusPref', 'h1', 'h2', 'h3'].forEach((k) => (pl[k] = +$('#ic-pl-' + k, el).value || 0));
      P.set('pl', pl);

      const dau = num('sess') > 0 ? (num('ccu') * 1440) / num('sess') : 0;
      const payers = (dau * num('conv')) / 100;
      const robuxDay = payers * num('arppu') * (1 + num('cr') / 100);
      const devRobuxMonth = robuxDay * 30 * (1 - num('share') / 100);
      const mix = num('usrate') / 100;
      const usd0 = devRobuxMonth * ((1 - mix) * num('rate') + mix * num('rate2'));
      const usdNet = usd0 * (1 - num('fee') / 100) * (1 - num('wh') / 100);
      const pln = usdNet * num('usd');
      const mine = (pln * num('mine')) / 100;
      const cost = num('cost') * num('usd');
      const zmode = $('#ic-zus', el).value;
      const social = zusSocial(zmode);
      const hasJdg = zmode !== 'none';

      const annual = mine * 12;
      const healthRyczalt = !hasJdg ? 0 : annual <= 60000 ? pl.h1 : annual <= 300000 ? pl.h2 : pl.h3;

      const rows = [];
      if (hasJdg) {
        // ryczałt 12% / 8.5%
        [12, 8.5].forEach((r) => {
          const base = Math.max(0, mine - social - healthRyczalt * 0.5);
          const tax = (base * r) / 100;
          rows.push({ name: `Ryczałt ${r}%${r === 8.5 ? ' (не для программирования!)' : ''}`, tax, health: healthRyczalt, social, net: mine - cost - social - healthRyczalt - tax, note: 'без вычета расходов' });
        });
        // liniowy 19%
        {
          const inc = Math.max(0, mine - cost - social);
          const health = Math.max(inc * 0.049, pl.minWage * 0.049);
          rows.push({ name: 'Podatek liniowy 19%', tax: inc * 0.19, health, social, net: mine - cost - social - health - inc * 0.19, note: 'расходы вычитаются' });
        }
        // skala
        {
          const incM = Math.max(0, mine - cost - social);
          const incY = incM * 12;
          const taxY = Math.max(0, 0.12 * Math.min(incY, 120000) + 0.32 * Math.max(0, incY - 120000) - 3600);
          const health = Math.max(incM * 0.09, pl.minWage * 0.09);
          rows.push({ name: 'Skala 12% / 32%', tax: taxY / 12, health, social, net: mine - cost - social - health - taxY / 12, note: 'kwota wolna 30 000' });
        }
        // IP Box
        {
          const inc = Math.max(0, mine - cost - social);
          const q = (+$('#ic-ipq', el).value || 0) / 100;
          const tax = inc * q * 0.05 + inc * (1 - q) * 0.19;
          const health = Math.max(inc * 0.049, pl.minWage * 0.049);
          rows.push({ name: 'IP Box 5% (+19% с остатка)', tax, health, social, net: mine - cost - social - health - tax, note: 'только при выполнении условий' });
        }
      }
      const best = rows.length ? rows.reduce((a, b) => (b.net > a.net ? b : a)) : null;
      const hrs = num('hours');

      $('#ic-out', el).innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">
          <div><div class="hint">DAU (оценка)</div><div class="big-num" style="font-size:1.6rem">${nf(dau)}</div></div>
          <div><div class="hint">Платящих в день</div><div class="big-num" style="font-size:1.6rem">${nf(payers, 1)}</div></div>
          <div><div class="hint">Robux в месяц (вам после комиссии)</div><div class="big-num" style="font-size:1.6rem">${nf(devRobuxMonth)}</div></div>
        </div>
        <div class="kv">
          <div>Выплата команде, USD/мес.</div><div>$${nf(usdNet)}</div>
          <div>В PLN (вся команда)</div><div>${nf(pln)} zł</div>
          <div>Моя доля до налогов</div><div>${nf(mine)} zł</div>
          <div>Мои расходы</div><div>−${nf(cost)} zł</div>
          <div>Моя доля Earned Robux в месяц</div><div>${nf(devRobuxMonth * (num('mine') / 100))} R$</div>
        </div>
        ${
          rows.length
            ? `<h4 style="margin:16px 0 6px">Сравнение режимов (на руки в месяц, PLN)</h4>
        <div class="table-wrap"><table><thead><tr><th>Режим</th><th>PIT</th><th>Здоровье</th><th>ZUS соц.</th><th>На руки</th></tr></thead><tbody>${rows
          .map(
            (r) => `<tr${r === best ? ' style="background:var(--ok-soft)"' : ''}><td>${r.name}<br><span class="hint">${r.note}</span></td><td>${nf(r.tax)}</td><td>${nf(r.health)}</td><td>${nf(r.social)}</td><td><b>${nf(r.net)}</b>${r === best ? ' ★' : ''}</td></tr>`
          )
          .join('')}</tbody></table></div>
        <p class="hint">★ — наибольший результат по этой упрощённой модели. ${best && hrs ? `Ваша ставка при «${best.name}»: ≈ <b>${nf(best.net / hrs, 1)} zł/час</b>.` : ''}</p>`
            : '<p class="hint">Режим «Нет JDG» не считает налоги — но регулярный доход от разработки игр нельзя оставлять без оформления. См. страницу про налоги.</p>'
        }
        <p class="hint">⚠ Модель упрощённая: не учитывает VAT-регистрацию, ограничения IP Box, вычет взносов за прошлые периоды, расходы в ryczałt, прогрессию внутри года, взносы по умолчанию дополнительного страхования (chorobowe). Это <b>не налоговая консультация</b> — проверьте у księgowa.</p>`;
    }
    $$('input,select', el).forEach((i) => i.addEventListener('input', calc));
    calc();
  }

  /* ============================================================ API-таблица */
  function apiTable(el, args, ctx) {
    const data = window.API_DATA || [];
    const cats = Array.from(new Set(data.map((r) => r[0])));
    const kinds = Array.from(new Set(data.map((r) => r[2])));
    el.innerHTML = `
      <div class="api-filter">
        <input id="api-q" type="search" placeholder="Поиск: Humanoid, Touched, FireServer…" aria-label="Поиск по API">
        <select id="api-cat" aria-label="Категория"><option value="">Все категории</option>${cats.map((c) => `<option>${c}</option>`).join('')}</select>
        <select id="api-kind" aria-label="Тип"><option value="">Все типы</option>${kinds.map((c) => `<option>${c}</option>`).join('')}</select>
      </div>
      <div class="hint" id="api-count"></div>
      <div class="table-wrap api-table"><table><thead><tr><th>Класс / группа</th><th>Имя</th><th>Тип</th><th>Описание</th></tr></thead><tbody id="api-body"></tbody></table></div>
      <p class="hint">Это курируемая шпаргалка самых нужных членов API. Полный справочник: <a href="https://create.roblox.com/docs/reference/engine" target="_blank" rel="noopener noreferrer">Engine API Reference</a>.</p>`;
    const body = $('#api-body', el);
    const esc = ctx.esc;
    function draw() {
      const q = $('#api-q', el).value.trim().toLowerCase();
      const c = $('#api-cat', el).value;
      const k = $('#api-kind', el).value;
      const rows = data.filter(
        (r) => (!c || r[0] === c) && (!k || r[2] === k) && (!q || (r[0] + ' ' + r[1] + ' ' + r[3]).toLowerCase().includes(q))
      );
      $('#api-count', el).textContent = `Найдено: ${rows.length} из ${data.length}`;
      body.innerHTML = rows
        .slice(0, 400)
        .map((r) => `<tr><td>${esc(r[0])}</td><td><code>${esc(r[1])}</code></td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`)
        .join('');
    }
    $$('input,select', el).forEach((i) => i.addEventListener('input', draw));
    draw();
  }

  window.Components = { 'success-calc': successCalc, 'income-calc': incomeCalc, 'api-table': apiTable };
})();
