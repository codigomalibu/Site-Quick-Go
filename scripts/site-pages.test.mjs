import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { quoteEmbedUrl, connectQuoteEmbed } from '../dist/quote-embed.js';
import { franchiseContact } from '../dist/franchise-data.js';
import { config } from '../dist/config.js';
import { contactUrl } from '../dist/data.js';

const root = fileURLToPath(new URL('../dist/', import.meta.url));

test('The confirmed WhatsApp receives distinct event and franchise messages', () => {
  assert.equal(config.whatsappNumber, '5567991973749');
  const event = new URL(contactUrl(config.whatsappNumber, 'Meu evento & convidados', config.currentQuoteUrl));
  assert.equal(event.pathname, '/5567991973749');
  assert.equal(event.searchParams.get('text'), 'Meu evento & convidados');
  const franchise = franchiseContact({ name:'Ana & João', city:'Campo Grande / MS', company:'Empresa\nOutra linha', model:'Tech GO' }, config.whatsappNumber);
  const url = new URL(franchise.url);
  assert.equal(url.pathname, '/5567991973749');
  assert.equal(url.searchParams.get('text'), franchise.text);
  assert.ok(franchise.text.includes('FRANQUIAS · QUICK GO'));
  assert.ok(franchise.text.includes('Interesse: Tech GO'));
  assert.ok(!franchise.text.includes('Empresa\nOutra linha'));
  assert.throws(() => franchiseContact({name:'Ana',city:''}, config.whatsappNumber));
});

test('The embed preserves UTM attribution and allows free praça selection', () => {
  const url = new URL(quoteEmbedUrl('?utm_source=ig&utm_campaign=A%26B&utm_medium=social&praca=unknown&fbclid=private&email=someone'));
  assert.equal(url.origin, 'https://quickgoorcamentos.com');
  assert.equal(url.pathname, '/embed/orcamento');
  assert.deepEqual([...url.searchParams.keys()], ['utm_source','utm_campaign','utm_medium']);
  assert.equal(url.searchParams.get('utm_campaign'), 'A&B');
  assert.equal(new URL(quoteEmbedUrl('', 'quickgo_cwb')).searchParams.get('praca'), 'quickgo_cwb');
});

test('Only the actual official iframe can resize or request a scroll', () => {
  let onMessage; let scrolled;
  const source = {};
  const fallback = {};
  const frame = { contentWindow: source, style:{}, scrollIntoView: options => { scrolled=options; } };
  const browser = { location:{search:'?utm_source=ig'}, document:{getElementById:()=>fallback}, matchMedia:()=>({matches:false}), addEventListener:(name,fn)=>{ onMessage=fn; }, removeEventListener:()=>{} };
  connectQuoteEmbed(frame,browser);
  assert.equal(fallback.href, frame.src);
  onMessage({origin:'https://not-quickgo.example',source,data:{quickgoAltura:900,quickgoTopo:true}});
  onMessage({origin:'https://quickgoorcamentos.com',source:{},data:{quickgoAltura:900}});
  assert.equal(frame.style.height, undefined);
  const send = data => onMessage({origin:'https://quickgoorcamentos.com',source,data});
  for (const value of ['bad',Infinity,-2,50000,{},null]) send({quickgoAltura:value});
  assert.equal(frame.style.height, undefined);
  send({quickgoAltura:1080,quickgoTopo:true});
  assert.equal(frame.style.height, '1080px');
  assert.equal(scrolled.behavior, 'smooth');
  send({quickgoAltura:'850'});
  assert.equal(frame.style.height, '850px');
});

test('Every page has working local links, one heading and distinct navigation', async () => {
  for (const file of ['index.html','franquias/index.html','sistemas/index.html']) {
    const html = await readFile(path.join(root,file),'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(ids.length, new Set(ids).size, file);
    assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
    for (const match of html.matchAll(/(?:src|href|poster)="([^"]+)"/g)) {
      const ref = match[1].split('?')[0];
      if (ref.startsWith('#')) { assert.ok(ids.includes(ref.slice(1)), `${file}: ${ref}`);continue; }
      if (!ref.startsWith('/'))continue;
      const [route,hash] = ref.split('#');
      let target = path.join(root,route);
      if ((await stat(target)).isDirectory())target=path.join(target,'index.html');
      assert.ok((await stat(target)).isFile(), `${file}: ${ref}`);
      if (hash) assert.ok((await readFile(target,'utf8')).includes(`id="${hash}"`), `${file}: ${ref}`);
    }
    assert.ok(html.includes('href="/franquias/"'));
    assert.ok(html.includes('href="/sistemas/"'));
  }
  const system = await readFile(path.join(root,'sistemas/index.html'),'utf8');
  assert.ok(!system.includes('<iframe'));
  assert.ok(system.includes('área dos franqueados está em preparação'));
  const home = await readFile(path.join(root,'index.html'),'utf8');
  assert.ok(home.includes('id="quickgo-orcamento"'));
  assert.ok(home.includes('/quote-embed.js?v=quote-25'));
  assert.ok(!home.includes('id="booking-form"'));
  assert.ok(home.includes('id="quote-whatsapp"'));
  const app = await readFile(path.join(root,'app.js'),'utf8');
  assert.ok(!app.includes("$('#booking-form')"));
  assert.ok(!system.includes('Área exclusiva'));
  assert.ok(!system.includes('/machine-scene.js'));
});


test('The complete user-approved menu has 32 correctly categorised drinks', async () => {
  const { drinks, categoryNames } = await import('../dist/data.js');
  assert.deepEqual(Object.values(categoryNames), ['Clássico', 'Premium', 'Ultra', 'Zero Álcool']);
  const catalogue = JSON.parse(await readFile(path.join(root,'../docs/drinks-catalogue.json'),'utf8'));
  assert.equal(catalogue.drinks.length,32);
  assert.equal(Object.keys(drinks).length,32);
  for (const [category,count] of Object.entries({'classico':11,'premium':7,'ultra':4,'zero-alcool':10})) {
    assert.equal(Object.values(drinks).filter(item=>item.category===category).length,count);
  }
  const home = await readFile(path.join(root,'index.html'),'utf8');
  for (const item of catalogue.drinks) {
    assert.equal(drinks[item.id].category,item.category,item.name);
    assert.ok(home.includes(`data-drink="${item.id}" data-category="${item.category}"`));
  }
  assert.equal(drinks.negroni.category,'ultra');
  assert.equal(drinks.capadocia.category,'classico');
  assert.equal(drinks['whisky-sour'].category,'premium');
  assert.equal(drinks['barbie-mule'].category,'zero-alcool');
  assert.ok(!home.includes('data-filter="tropicais"'));
});
