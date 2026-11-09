import { contactUrl } from './data.js';
export function franchiseContact(values, number) {
  const clean = value => String(value || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 500);
  if (!clean(values.name) || !clean(values.city)) throw new Error('Informe seu nome e sua cidade.');
  const allowed = ['Mini GO', 'Tech GO', 'Quero orientação sobre os modelos'];
  const model = allowed.includes(values.model) ? values.model : allowed[2];
  const text = ['FRANQUIAS · QUICK GO', '', `Nome: ${clean(values.name)}`, `Cidade/UF: ${clean(values.city)}`, `Empresa: ${clean(values.company) || 'A definir'}`, `Interesse: ${model}`, '', 'Quero conhecer a franquia, os equipamentos, o investimento e as condições para operar com a Quick GO.'].join('\n');
  return { text, url: contactUrl(number, text, 'https://www.quickgodrinks.com.br/#contato') };
}
