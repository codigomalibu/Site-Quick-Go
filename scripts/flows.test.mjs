import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { drinks, validFavorites, buildBrief, contactUrl, formatDate } from '../dist/data.js';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const example = { name: 'Ana', event: 'Casamento / mini wedding', date: '2027-03-13', guests: '80', city: 'Nova Lima', duration: '4 a 5 horas', menu: 'Com e sem álcool', message: 'Um jantar ao ar livre.' };

test('Briefing preserves real event details, selected drinks and Brazilian dates', () => {
  const brief = buildBrief(example, ['negroni', 'tropical']);
  for (const expected of ['Nome: Ana', '13/03/2027', 'Convidados: 80', 'Nova Lima', 'Negroni, Tropical', 'Um jantar ao ar livre.']) assert.ok(brief.includes(expected));
  assert.ok(!brief.includes('reserva confirmada'));
});
test('Flexible date and incomplete selections never invent a date or price', () => {
  const brief = buildBrief({ ...example, date: '', dateFlexible: true }, []);
  assert.ok(brief.includes('Data: A definir'));
  assert.ok(!brief.includes('R$'));
  assert.ok(!brief.includes('Drinks que gostei'));
});
test('Guest bounds and missing identification block an invalid briefing', () => {
  for (const guests of ['0', '-1', '4', '3.5', '10001', 'abc']) assert.throws(() => buildBrief({ ...example, guests }));
  assert.throws(() => buildBrief({ ...example, name: '  ' }));
});
test('Saved selections cannot inject unknown drinks or duplicate entries', () => {
  assert.deepEqual(validFavorites(['negroni', '__proto__', '<script>', 'negroni', null, 'tropical']), ['negroni', 'tropical']);
  assert.deepEqual(validFavorites({ name: 'negroni' }), []);
  assert.equal(formatDate('invalid'), 'A definir');
});
test('Contact stays on the current official channel until a valid WhatsApp exists', () => {
  const fallback = 'https://quickgoorcamentos.com/';
  for (const number of [null, '', 'not-a-phone', '123']) assert.equal(contactUrl(number, 'Ana & João', fallback), fallback);
  const url = new URL(contactUrl('5531999999999', 'Ana & João\n80 pessoas', fallback));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.searchParams.get('text'), 'Ana & João\n80 pessoas');
});
test('Every local HTML asset, module import, CSS asset and anchor resolves', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  for (const match of html.matchAll(/(?:src|href|poster)="([^"]+)"/g)) {
    const url = match[1];
    if (url.startsWith('#')) assert.ok(ids.includes(url.slice(1)), `Missing anchor ${url}`);
    if (url.startsWith('/')) assert.ok((await stat(path.join(root, url))).isFile(), `Missing asset ${url}`);
  }
  for (const file of ['styles.css', 'app.js', 'effects.js']) {
    const content = await readFile(path.join(root, file), 'utf8');
    const refs = file.endsWith('.css') ? [...content.matchAll(/url\(['"]?(\/[^'")]+)['"]?\)/g)].map(m => m[1]) : [...content.matchAll(/from ['"]\.\/([^'"]+)['"]/g)].map(m => m[1]);
    for (const ref of refs) assert.ok((await stat(path.join(root, ref))).isFile(), `Missing dependency ${ref}`);
  }
  for (const drink of Object.values(drinks)) assert.ok((await stat(path.join(root, 'assets', `${drink.image}.webp`))).isFile());
});
test('Preview metadata is truthful, structured data parses and media has dimensions', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('lang="pt-BR"'));
  assert.ok(html.includes('content="noindex,follow"'));
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.ok(graph['@graph'].some(entity => entity['@type'] === 'Organization'));
  assert.ok(!JSON.stringify(graph).includes('AggregateRating'));
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    assert.ok(/\balt=/.test(match[0]), 'Image without alt');
    assert.ok(/\bwidth=/.test(match[0]) && /\bheight=/.test(match[0]), 'Image without reserved dimensions');
  }
});

test('The actual HTTP server serves the page, video ranges, HEAD and real 404 responses', async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], { env: { ...process.env, PORT: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview did not start')), 5000);
      child.on('error', reject);
      child.stdout.on('data', chunk => {
        const match = chunk.toString().match(/Local: (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    const page = await fetch(origin);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes('A festa é sua.'));
    const head = await fetch(`${origin}/app.js`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.ok(head.headers.get('content-type').includes('javascript'));
    const range = await fetch(`${origin}/assets/hero.mp4`, { headers: { Range: 'bytes=0-1023' } });
    assert.equal(range.status, 206);
    assert.equal((await range.arrayBuffer()).byteLength, 1024);
    assert.ok(range.headers.get('content-range').startsWith('bytes 0-1023/'));
    assert.equal((await fetch(`${origin}/not-found`)).status, 404);
    assert.equal((await fetch(`${origin}/?value=ok`, { method: 'POST' })).status, 405);
  } finally { child.kill(); }
});
