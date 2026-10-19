#!/usr/bin/env node
/*
 * Генерирует content/manifest.json (навигация) и content/search.json (индекс поиска)
 * из front matter файлов content/*.md. Запуск: node tools/build.js
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'content');
const sections = JSON.parse(fs.readFileSync(path.join(dir, 'sections.json'), 'utf8'));
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();

const pages = [];
const search = {};
let problems = 0;

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    console.error(`✘ ${f}: нет front matter`);
    problems++;
    continue;
  }
  const meta = {};
  m[1].split('\n').forEach((l) => {
    const i = l.indexOf(':');
    if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, '');
  });
  const id = f.replace(/\.md$/, '');
  if (!meta.title || !meta.section) {
    console.error(`✘ ${f}: нужны title и section`);
    problems++;
    continue;
  }
  if (!sections.find((s) => s.id === meta.section)) {
    console.error(`✘ ${f}: неизвестная секция ${meta.section}`);
    problems++;
    continue;
  }
  pages.push({
    id,
    file: f,
    section: meta.section,
    order: Number(meta.order || 0),
    title: meta.title,
    summary: meta.summary || '',
    time: meta.time ? Number(meta.time) : 0,
    level: meta.level || '',
  });
  search[id] = m[2]
    .replace(/^:{3,}.*$/gm, ' ')
    .replace(/\{\{.*?\}\}/g, ' ')
    .replace(/[#*>|`\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .slice(0, 9000);
}

// проверка вики-ссылок
const ids = new Set(pages.map((p) => p.id));
for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const mm of raw.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)) {
    if (!ids.has(mm[1])) {
      console.error(`✘ ${f}: битая ссылка [[${mm[1]}]]`);
      problems++;
    }
  }
}

fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ sections, pages }, null, 1));
fs.writeFileSync(path.join(dir, 'search.json'), JSON.stringify(search));
console.log(`✔ страниц: ${pages.length}, проблем: ${problems}`);
process.exit(problems ? 1 : 0);
