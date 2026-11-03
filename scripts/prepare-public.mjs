import { readFile, writeFile } from 'node:fs/promises';

const [flag, value, ...rest] = process.argv.slice(2);
if (flag !== '--origin' || !value || rest.length) throw new Error('Use: node scripts/prepare-public.mjs --origin https://your-domain.example');
const target = new URL(value);
if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.pathname !== '/') throw new Error('Use a plain HTTPS origin.');
const origin = target.origin;
const root = new URL('../dist/', import.meta.url);
let html = await readFile(new URL('index.html', root), 'utf8');
const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
const previous = new URL(canonical).origin;
html = html.replaceAll(previous, origin).replace('content="noindex,follow"', 'content="index,follow"');
await writeFile(new URL('index.html', root), html);
await writeFile(new URL('robots.txt', root), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(new URL('sitemap.xml', root), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>\n`);
console.log(`Prepared local files for ${origin}. No DNS or deployment changes were made.`);
