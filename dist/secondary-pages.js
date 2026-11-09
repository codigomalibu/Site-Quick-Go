import { config } from './config.js?v=structure-24';
import { franchiseContact } from './franchise-data.js';
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#mobile-nav');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  nav.hidden = !open;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav && !nav.hidden) { nav.hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Abrir menu'); menu.focus(); }
});
document.querySelectorAll('.mobile-nav a').forEach(link => link.addEventListener('click', () => { nav.hidden = true; menu.setAttribute('aria-expanded', 'false'); }));
document.querySelectorAll('[data-franchise-model]').forEach(link => link.addEventListener('click', () => { const select = document.querySelector('#franchise-model'); if (select) select.value = link.dataset.franchiseModel; }));
document.querySelector('#franchise-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  try {
    const result = franchiseContact(values, config.whatsappNumber);
    const link = document.querySelector('#franchise-whatsapp');
    link.href = result.url;
    document.querySelector('#franchise-summary').textContent = result.text;
    document.querySelector('#franchise-result').hidden = false;
    document.querySelector('#franchise-result').focus({ preventScroll: true });
  } catch (error) { document.querySelector('#franchise-error').textContent = error.message; }
});
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
const privacy = document.querySelector('#privacy-dialog');
document.querySelector('#privacy-open')?.addEventListener('click', () => privacy?.showModal());
privacy?.querySelector('[data-close]')?.addEventListener('click', () => privacy.close());
