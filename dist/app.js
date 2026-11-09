import { icons, animateCatalogueIcon } from './icons.js';
import { drinks, categoryNames } from './data.js?v=catalogue-32';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = $('.hero');
const machineViewer = $('#machine-viewer');
const toastElement = $('#toast');
let motionPaused = reduceMotion.matches || Boolean(navigator.connection?.saveData);
let toastTimer;
let previousDialogFocus;
let drinkStack = null;
let activeDrinkFilter = 'all';

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

const drinkDialog = $('#drink-dialog');
drinkDialog.setAttribute('aria-labelledby', 'detail-name');
function showDrinkDetails(id) {
  const drink = drinks[id];
  $('#detail-image').src = `/assets/${drink.image}.webp`;
  $('#detail-image').alt = drink.imageAlt || drink.name;
  drinkDialog.dataset.photo = String(drink.imageAvailable !== false);
  $('#detail-category').textContent = categoryNames[drink.category];
  $('#detail-name').textContent = drink.name;
  $('#detail-copy').textContent = drink.description;
  openDialog(drinkDialog);
}
$$('[data-details]').forEach(button => button.addEventListener('click', () => showDrinkDetails(button.dataset.details)));

const trackElement = $('#drinks-track');
function filterDrinks(filter) {
  if (!['all', ...Object.keys(categoryNames)].includes(filter)) return;
  $$('.filter').forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  activeDrinkFilter = filter;
  if (drinkStack) {
    drinkStack.filter(filter);
    const count = Object.values(drinks).filter(drink => filter === 'all' || drink.category === filter).length;
    $('#drink-results').textContent = `${count} drinks na seleção ${filter === 'all' ? 'Todos os drinks' : categoryNames[filter].toLowerCase()}.`;
    track('filter_drinks', { category: filter });
    return;
  }
  let count = 0;
  $$('.drink-card').forEach(card => {
    card.hidden = filter !== 'all' && card.dataset.category !== filter;
    if (!card.hidden) count++;
  });
  trackElement.scrollTo({ left: 0, behavior: 'instant' });
  $('#drink-results').textContent = `${count} drinks na seleção ${filter === 'all' ? 'Todos os drinks' : categoryNames[filter].toLowerCase()}.`;
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

// The official quote form is embedded in the home quote section.
$$('[data-event]').forEach(link => link.addEventListener('click', () => track('event_interest', { event: link.dataset.event })));
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
$('#year').textContent = new Date().getFullYear();

// SVG geometry retrieved from the icon collection in the supplied catalogue.
const icon = name => `<span class="ui-icon">${icons[name] || icons.sparkles}</span>`;
function mountIcons() {
  document.querySelectorAll('.play-small,.round-play,.live-play').forEach(el => { el.innerHTML = icons.play; el.dataset.animatedIcon = 'play'; });
  document.querySelectorAll('.step-drawing').forEach((el,index) => { const name=['sparkles','zap','heart'][index]; el.innerHTML = icons[name]; el.dataset.animatedIcon = name; });
  document.querySelectorAll('.spark').forEach(el => { el.innerHTML = icon('sparkles'); el.dataset.animatedIcon = 'sparkles'; });
}
mountIcons();

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
    imageSrc: `/assets/${drinks[id].image}.webp`, imageAvailable: drinks[id].imageAvailable, imageAlt: $('img', card).alt, tag: $('.drink-tag', card).textContent };
});
let stackLoading = false;
async function loadDrinkStack() {
  if (stackLoading) return;
  stackLoading = true;
  try {
    const { mountDrinksCarousel } = await import('./drinks-carousel.js?v=catalogue-32');
    drinkStack = mountDrinksCarousel(trackElement, { items: stackItems, onDetails: showDrinkDetails });
    drinkStack.filter(activeDrinkFilter);
    $('#drinks').dataset.stackActive = 'true';
    trackElement.setAttribute('aria-label', 'Carta de drinks Quick GO com navegação por cards');
  } catch { stackLoading = false; /* The original list remains usable when enhancement is unavailable. */ }
}
const stackLoader = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { loadDrinkStack(); stackLoader.disconnect(); } }, { rootMargin: '600px' });
stackLoader.observe(trackElement);

// System access now lives at /sistemas/.

$('#detail-quote').addEventListener('click', () => closeDialog(drinkDialog));
