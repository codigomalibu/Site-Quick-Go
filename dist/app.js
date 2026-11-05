import { icons, animateCatalogueIcon } from './icons.js';
import { config } from './config.js';
import { drinks, categoryNames, validFavorites, buildBrief, contactUrl } from './data.js';
import { startAurora } from './effects.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = $('.hero');
const machineViewer = $('#machine-viewer');
const toastElement = $('#toast');
const favorites = new Set();
let savedSelection = false;
let motionPaused = reduceMotion.matches || Boolean(navigator.connection?.saveData);
let toastTimer;
let previousDialogFocus;
let brief = '';
let drinkStack = null;
let activeDrinkFilter = 'all';

try {
  const saved = localStorage.getItem(config.storageKey);
  if (saved) {
    validFavorites(JSON.parse(saved)).forEach(id => favorites.add(id));
    savedSelection = true;
  }
} catch { /* The experience works when browser storage is unavailable. */ }

function track(action, detail = {}) {
  window.dispatchEvent(new CustomEvent('quickgo:conversion', { detail: { action, ...detail } }));
}

function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 3500);
}

function openDialog(dialog) {
  previousDialogFocus = document.activeElement;
  dialog.showModal();
}

function closeDialog(dialog) {
  dialog.close();
}

$$('dialog').forEach(dialog => {
  $('[data-close]', dialog)?.addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    if (dialog.id === 'film-dialog') {
      $('#film-player').pause();
      $('#film-player').removeAttribute('src');
      $('#film-player').load();
      if (!motionPaused && hero.getBoundingClientRect().bottom > 0) playHero();
    }
    previousDialogFocus?.focus({ preventScroll: true });
  });
});

function syncFavorites() {
  $$('.favorite-count').forEach(el => el.textContent = favorites.size);
  $$('[data-favorite]').forEach(button => {
    const selected = favorites.has(button.dataset.favorite);
    const name = drinks[button.dataset.favorite].name;
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${selected ? 'Remover' : 'Adicionar'} ${name} ${selected ? 'dos' : 'aos'} favoritos`);
    button.textContent = selected ? '♥' : '♡';
  });
  $('#form-favorites').textContent = favorites.size ? `Sua seleção: ${[...favorites].map(id => drinks[id].name).join(', ')}` : '';
  if (savedSelection) {
    try { localStorage.setItem(config.storageKey, JSON.stringify([...favorites])); } catch { /* Selection remains available in memory. */ }
  }
  drinkStack?.favorites([...favorites]);
  renderPlan();
}

function toggleFavorite(id) {
  if (!Object.hasOwn(drinks, id)) return;
  if (favorites.has(id)) {
    favorites.delete(id);
    toast(`${drinks[id].name} removido da sua seleção.`);
  } else {
    favorites.add(id);
    toast(`${drinks[id].name} entrou na sua carta.`);
    track('favorite_drink', { drink: id });
  }
  syncFavorites();
}

$$('[data-favorite]').forEach(button => button.addEventListener('click', () => toggleFavorite(button.dataset.favorite)));

function renderPlan() {
  const target = $('#plan-favorites');
  target.replaceChildren();
  if (!favorites.size) {
    const empty = document.createElement('div');
    empty.className = 'plan-empty';
    const text = document.createElement('p');
    text.textContent = 'Sua carta ainda está em branco. Os melhores encontros começam com uma boa escolha.';
    const link = document.createElement('a');
    link.href = '#drinks';
    link.textContent = 'Explorar os drinks ↗';
    link.addEventListener('click', () => closeDialog($('#plan-dialog')));
    empty.append(text, link);
    target.append(empty);
    return;
  }
  for (const id of favorites) {
    const drink = drinks[id];
    const row = document.createElement('div');
    row.className = 'plan-drink';
    const image = document.createElement('img');
    image.src = `/assets/${drink.image}.webp`; image.alt = drink.name; image.width = 52; image.height = 63;
    const info = document.createElement('div');
    const name = document.createElement('h3'); name.textContent = drink.name;
    const profile = document.createElement('p'); profile.textContent = drink.profile;
    info.append(name, profile);
    const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Remover ${drink.name}`);
    remove.addEventListener('click', () => toggleFavorite(id));
    row.append(image, info, remove); target.append(row);
  }
}

$$('[data-open-plan]').forEach(button => button.addEventListener('click', () => openDialog($('#plan-dialog'))));
$('#plan-book').addEventListener('click', () => { closeDialog($('#plan-dialog')); $('#orcamento').scrollIntoView({ behavior: motionPaused ? 'instant' : 'smooth' }); });
$('#save-plan').addEventListener('click', () => {
  try { localStorage.setItem(config.storageKey, JSON.stringify([...favorites])); savedSelection = true; toast('Sua seleção foi salva neste dispositivo.'); }
  catch { toast('O navegador não permitiu salvar. Sua seleção continua disponível nesta visita.'); }
});
$('#clear-plan').addEventListener('click', () => {
  savedSelection = false;
  try { localStorage.removeItem(config.storageKey); } catch { /* No saved data to remove. */ }
  favorites.clear(); syncFavorites(); toast('Seleção removida deste dispositivo.');
});

const drinkDialog = $('#drink-dialog');
drinkDialog.setAttribute('aria-labelledby', 'detail-name');
function showDrinkDetails(id) {
  const drink = drinks[id];
  $('#detail-image').src = `/assets/${drink.image}.webp`;
  $('#detail-image').alt = drink.name;
  $('#detail-category').textContent = categoryNames[drink.category];
  $('#detail-name').textContent = drink.name;
  $('#detail-copy').textContent = drink.description;
  const favorite = $('#detail-favorite');
  const updateLabel = () => favorite.textContent = favorites.has(id) ? 'Remover da minha carta ♥' : 'Adicionar à minha carta ♡';
  updateLabel();
  favorite.onclick = () => { toggleFavorite(id); updateLabel(); };
  openDialog(drinkDialog);
}
$$('[data-details]').forEach(button => button.addEventListener('click', () => showDrinkDetails(button.dataset.details)));

const trackElement = $('#drinks-track');
function filterDrinks(filter) {
  if (!['all', 'classicos', 'tropicais', 'sem-alcool'].includes(filter)) return;
  $$('.filter').forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  activeDrinkFilter = filter;
  if (drinkStack) {
    drinkStack.filter(filter);
    const count = Object.values(drinks).filter(drink => filter === 'all' || drink.category === filter).length;
    $('#drink-results').textContent = `${count} drinks na seleção ${filter === 'all' ? 'Todos os sabores' : categoryNames[filter].toLowerCase()}.`;
    track('filter_drinks', { category: filter });
    return;
  }
  let count = 0;
  $$('.drink-card').forEach(card => {
    card.hidden = filter !== 'all' && card.dataset.category !== filter;
    if (!card.hidden) count++;
  });
  trackElement.scrollTo({ left: 0, behavior: 'instant' });
  $('#drink-results').textContent = `${count} drinks na seleção ${filter === 'all' ? 'Todos os sabores' : categoryNames[filter].toLowerCase()}.`;
  updateCarousel();
  track('filter_drinks', { category: filter });
}

$$('.filter').forEach(button => button.addEventListener('click', () => filterDrinks(button.dataset.filter)));
function updateCarousel() {
  if (drinkStack) {
    $('[data-carousel="prev"]').disabled = false;
    $('[data-carousel="next"]').disabled = false;
    return;
  }
  $('[data-carousel="prev"]').disabled = trackElement.scrollLeft <= 2;
  $('[data-carousel="next"]').disabled = trackElement.scrollLeft + trackElement.clientWidth >= trackElement.scrollWidth - 2;
}
$$('[data-carousel]').forEach(button => button.addEventListener('click', () => {
  if (drinkStack) { drinkStack[button.dataset.carousel](); return; }
  const card = $$('.drink-card').find(el => !el.hidden);
  const width = card ? card.getBoundingClientRect().width + 22 : trackElement.clientWidth;
  trackElement.scrollBy({ left: (button.dataset.carousel === 'next' ? 1 : -1) * width, behavior: motionPaused ? 'instant' : 'smooth' });
}));
trackElement.addEventListener('scroll', updateCarousel, { passive: true });
new ResizeObserver(updateCarousel).observe(trackElement);
$('#open-quiz').addEventListener('click', () => openDialog($('#quiz-dialog')));
$$('[data-taste]').forEach(button => button.addEventListener('click', () => {
  filterDrinks(button.dataset.taste);
  closeDialog($('#quiz-dialog'));
  trackElement.scrollIntoView({ block: 'center', behavior: motionPaused ? 'instant' : 'smooth' });
  trackElement.focus({ preventScroll: true });
  toast('Aqui estão algumas escolhas para o seu perfil.');
}));

function playHero() {
  if (!machineViewer || motionPaused || document.hidden || $('#film-dialog').open) return;
  window.dispatchEvent(new CustomEvent('quickgo:machine-motion', { detail: { paused: false } }));
}
function setMotion(paused) {
  motionPaused = paused;
  document.body.classList.toggle('motion-paused', paused);
  if (paused) window.dispatchEvent(new CustomEvent('quickgo:machine-motion', { detail: { paused: true } })); else if (hero.getBoundingClientRect().bottom > 0) playHero();
  window.dispatchEvent(new CustomEvent('quickgo:motion', { detail: { paused } }));
}
reduceMotion.addEventListener('change', event => setMotion(event.matches));
new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) playHero(); else window.dispatchEvent(new CustomEvent('quickgo:machine-motion', { detail: { paused: true } }));
}, { threshold: .05 }).observe(hero);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { window.dispatchEvent(new CustomEvent('quickgo:machine-motion', { detail: { paused: true } })); $('#film-player').pause(); }
  else if (hero.getBoundingClientRect().bottom > 0) playHero();
});
setMotion(motionPaused);

$$('[data-film]').forEach(button => button.addEventListener('click', () => {
  const allowed = ['filme', 'evento-musica', 'evento-aniversario'];
  if (!allowed.includes(button.dataset.film)) return;
  window.dispatchEvent(new CustomEvent('quickgo:machine-motion', { detail: { paused: true } }));
  $('#film-title').textContent = button.dataset.filmTitle;
  $('#film-player').src = `/assets/${button.dataset.film}.mp4`;
  openDialog($('#film-dialog'));
  $('#film-player').play().catch(() => { /* Native controls remain available if autoplay is blocked. */ });
  track('play_film', { film: button.dataset.film });
}));
$('#film-dialog').setAttribute('aria-labelledby', 'film-title');

const menuButton = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); mobileNav.hidden = true; }
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open)); mobileNav.hidden = !open;
});
$$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });

const form = $('#booking-form');
form.noValidate = true;
const dateInput = $('#event-date');
const flexibleInput = $('#date-flexible');
const today = new Date();
dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
flexibleInput.addEventListener('change', () => {
  dateInput.disabled = flexibleInput.checked;
  if (flexibleInput.checked) { dateInput.value = ''; dateInput.setCustomValidity(''); }
});
dateInput.addEventListener('input', () => { if (dateInput.value) flexibleInput.checked = false; dateInput.setCustomValidity(''); });

function validateStep(step) {
  const fieldset = $(`[data-step="${step}"]`);
  $('.form-error', fieldset).textContent = '';
  if (step === 1) {
    dateInput.setCustomValidity(!flexibleInput.checked && !dateInput.value ? 'Escolha uma data ou marque “Ainda sem data”.' : '');
  }
  for (const input of $$('input, select, textarea', fieldset)) {
    if (!input.checkValidity()) {
      const message = input.validity.rangeUnderflow ? 'Informe pelo menos 5 convidados.' : input.validity.rangeOverflow ? 'Para mais de 10.000 convidados, consulte a equipe pelo canal de orçamentos.' : input.validationMessage;
      $('.form-error', fieldset).textContent = message;
      input.focus(); input.reportValidity(); return false;
    }
  }
  return true;
}

function setStep(step) {
  $$('.form-step').forEach(fieldset => { fieldset.hidden = Number(fieldset.dataset.step) !== step; });
  $('#form-step-label').textContent = `0${step} / 02`;
  $('.form-progress > span').style.width = `${step * 50}%`;
  const fieldset = $(`[data-step="${step}"]`);
  $('select, input', fieldset)?.focus({ preventScroll: true });
}
$('.form-next').addEventListener('click', () => { if (validateStep(1)) { setStep(2); track('brief_step_1'); } });
$('.form-back', form).addEventListener('click', () => setStep(1));
$$('[data-event]').forEach(link => link.addEventListener('click', () => { $('#event-type').value = link.dataset.event; }));

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!$('[data-step="1"]').hidden) { if (validateStep(1)) setStep(2); return; }
  if (!validateStep(1)) { setStep(1); return; }
  if (!validateStep(2)) return;
  const values = Object.fromEntries(new FormData(form));
  values.dateFlexible = flexibleInput.checked;
  try { brief = buildBrief(values, [...favorites]); }
  catch (error) { $('.form-error', $('[data-step="2"]')).textContent = error.message; return; }
  $('#booking-summary').textContent = brief;
  const action = $('#contact-action');
  action.href = contactUrl(config.whatsappNumber, brief, config.currentQuoteUrl);
  if (config.whatsappNumber) {
    action.textContent = 'Continuar no WhatsApp ↗';
    $('#contact-note').textContent = 'O WhatsApp será aberto com o resumo. Você escolhe quando enviar. A equipe confirma disponibilidade, valores e reserva.';
  }
  form.hidden = true;
  $('#booking-result').hidden = false;
  $('#booking-result h3').setAttribute('tabindex', '-1');
  $('#booking-result h3').focus({ preventScroll: true });
  track('brief_prepared', { event: values.event });
});
$('#copy-summary').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(brief); toast('Pedido copiado. Agora é só continuar no atendimento.'); track('copy_brief'); }
  catch {
    const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents($('#booking-summary')); selection.removeAllRanges(); selection.addRange(range);
    toast('Selecione e copie o resumo exibido.');
  }
});
$('#contact-action').addEventListener('click', () => track('contact_click', { channel: config.whatsappNumber ? 'whatsapp' : 'current_quote' }));
$('#edit-brief').addEventListener('click', () => { $('#booking-result').hidden = true; form.hidden = false; setStep(2); });
$('#privacy-open').addEventListener('click', () => openDialog($('#privacy-dialog')));
$$('a[href="#orcamento"]').forEach(link => link.addEventListener('click', () => track('quote_cta', { position: link.className || 'content' })));

let scrollScheduled = false;
function onScroll() {
  scrollScheduled = false;
  $('#header').classList.toggle('is-fixed', scrollY > 100);
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  $('.reading-progress').style.width = `${maxScroll > 0 ? scrollY / maxScroll * 100 : 0}%`;
  const booking = $('#orcamento').getBoundingClientRect();
  $('.mobile-booking').classList.toggle('show', scrollY > hero.offsetHeight * .65 && !(booking.top < innerHeight && booking.bottom > 0));
}
addEventListener('scroll', () => { if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll, { passive: true });
onScroll();
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-motion');
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); }
  }), { threshold: .08 });
  $$('.reveal').forEach(element => reveal.observe(element));
}
const sections = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) $$('.desktop-nav a').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
}), { rootMargin: '-20% 0px -50% 0px' });
['experiencia', 'drinks', 'momentos'].forEach(id => sections.observe(document.getElementById(id)));
$('#year').textContent = new Date().getFullYear();
syncFavorites();
startAurora($('#aurora'), { paused: motionPaused });

// SVG geometry retrieved from the icon collection in the supplied catalogue.
const icon = name => `<span class="ui-icon">${icons[name] || icons.sparkles}</span>`;
function mountIcons() {
  document.querySelectorAll('.favorite').forEach(el => { el.innerHTML = icons.heart; el.dataset.animatedIcon = 'heart'; });
  document.querySelectorAll('.play-small,.round-play,.live-play').forEach(el => { el.innerHTML = icons.play; el.dataset.animatedIcon = 'play'; });
  document.querySelectorAll('.step-drawing').forEach((el,index) => { const name=['sparkles','zap','heart'][index]; el.innerHTML = icons[name]; el.dataset.animatedIcon = name; });
  document.querySelectorAll('.spark').forEach(el => { el.innerHTML = icon('sparkles'); el.dataset.animatedIcon = 'sparkles'; });
}
mountIcons();
new MutationObserver(mount => { mount.forEach(record => { if(record.target.matches?.('.favorite') && !record.target.querySelector('svg')) { record.target.innerHTML = icons.heart; animateCatalogueIcon(record.target.querySelector('svg'),'heart'); } }); }).observe(document.querySelector('#drinks-track'), {childList:true,subtree:true});

if (matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.drink-card').forEach(card => {
    card.addEventListener('pointermove',event => {
      if(motionPaused)return;
      const r=card.getBoundingClientRect();card.style.setProperty('--card-ry',`${((event.clientX-r.left)/r.width-.5)*12}deg`);card.style.setProperty('--card-rx',`${(.5-(event.clientY-r.top)/r.height)*10}deg`);
    },{passive:true});
    card.addEventListener('pointerleave',()=>{card.style.setProperty('--card-ry','0deg');card.style.setProperty('--card-rx','0deg');});
  });
}

const iconObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  const el=entry.target;
  if(entry.isIntersecting) animateCatalogueIcon(el.querySelector('svg'),el.dataset.animatedIcon,{loop:el.dataset.animatedIcon!=='heart'});
  else el.querySelector('svg')?.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
}),{threshold:.25});
document.querySelectorAll('[data-animated-icon]').forEach(el=>{
  iconObserver.observe(el);
  const trigger=el.closest('button,a,.step') || el;
  for(const event of ['pointerenter','focusin','click']) trigger.addEventListener(event,()=>animateCatalogueIcon(el.querySelector('svg'),el.dataset.animatedIcon));
});
window.addEventListener('quickgo:motion',event=>document.querySelectorAll('[data-animated-icon]').forEach(el=>{
  if(event.detail.paused) el.querySelector('svg')?.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
  else { const r=el.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)animateCatalogueIcon(el.querySelector('svg'),el.dataset.animatedIcon,{loop:el.dataset.animatedIcon!=='heart'}); }
}));


// Mount the supplied Specials Linear Carousel only as its section approaches the viewport.
const stackItems = $$('.drink-card', trackElement).map(card => {
  const id = card.dataset.drink;
  return { id, title: drinks[id].name, description: drinks[id].profile, category: drinks[id].category,
    imageSrc: `/assets/${drinks[id].image}.webp`, imageAlt: $('img', card).alt, tag: $('.drink-tag', card).textContent };
});
let stackLoading = false;
async function loadDrinkStack() {
  if (stackLoading) return;
  stackLoading = true;
  try {
    const { mountDrinksCarousel } = await import('./drinks-carousel.js?v=dwell-19');
    drinkStack = mountDrinksCarousel(trackElement, { items: stackItems, selected: [...favorites], onFavorite: toggleFavorite, onDetails: showDrinkDetails });
    drinkStack.filter(activeDrinkFilter);
    $('#drinks').dataset.stackActive = 'true';
    trackElement.setAttribute('aria-label', 'Carta de drinks Quick GO com navegação por cards');
  } catch { stackLoading = false; /* The original list remains usable when enhancement is unavailable. */ }
}
const stackLoader = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { loadDrinkStack(); stackLoader.disconnect(); } }, { rootMargin: '600px' });
stackLoader.observe(trackElement);

// System URLs are supplied and validated by Quick GO before being made public.
const systemList = $('#systems-list');
for (const system of config.systems || []) {
  if (!system || typeof system.label !== 'string' || typeof system.url !== 'string') continue;
  let url;
  try { url = new URL(system.url); } catch { continue; }
  if (url.protocol !== 'https:' || url.username || url.password) continue;
  const link = document.createElement('a'); link.className = 'system-link'; link.href = url.href;
  const title = document.createElement('strong'); title.textContent = system.label;
  const description = document.createElement('small'); description.textContent = system.description || 'Continuar para o sistema';
  const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
  link.append(title, description, arrow); systemList.append(link);
}
const hasSystems = systemList.children.length > 0;
$('#systems-empty').hidden = hasSystems;
$('#systems-description').textContent = hasSystems ? 'Escolha a plataforma para continuar no seu acesso.' : 'Uma central para os acessos da rede Quick GO.';
$$('[data-open-systems]').forEach(button => button.addEventListener('click', () => {
  closeMenu();
  if (button.closest('#mobile-nav')) $('.header [data-open-systems]').focus({ preventScroll: true });
  openDialog($('#systems-dialog'));
}));

$('#systems-quote').addEventListener('click', () => closeDialog($('#systems-dialog')));
