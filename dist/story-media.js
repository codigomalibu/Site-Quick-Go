// Lazy previews play only while visible; every preview has an explicit pause control.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const previews = [...document.querySelectorAll('.story-video')];
const states = new Map();
function sync(video) {
  const state = states.get(video);
  const shouldPlay = state.visible && !document.hidden && !document.querySelector('dialog[open]') && (state.manual === true || (state.manual !== false && !reduced.matches && !navigator.connection?.saveData));
  const button = video.parentElement.querySelector('.story-motion');
  if (!shouldPlay) { video.pause(); return; }
  const source = video.querySelector('source');
  if (!source.src) { source.src = source.dataset.src; video.load(); }
  video.muted = true;
  video.play().catch(() => { button.setAttribute('aria-label', 'Reproduzir prévia'); });
}
const observer = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
  states.get(target).visible = isIntersecting;
  sync(target);
}), {threshold: .15});
for (const video of previews) {
  states.set(video, {visible:false,manual:null});
  const button = video.parentElement.querySelector('.story-motion');
  button.addEventListener('click', () => { states.get(video).manual = video.paused; sync(video); });
  for (const event of ['play','pause']) video.addEventListener(event, () => {
    button.setAttribute('aria-label', video.paused ? 'Reproduzir prévia' : 'Pausar prévia');
    button.setAttribute('aria-pressed', String(!video.paused));
    button.firstElementChild.textContent = video.paused ? '▶' : 'Ⅱ';
  });
  video.addEventListener('error', () => { video.parentElement.dataset.error = 'true'; button.hidden = true; });
  observer.observe(video);
}
function syncAll() { previews.forEach(sync); }
document.addEventListener('visibilitychange', syncAll);
reduced.addEventListener('change', syncAll);
for (const dialog of document.querySelectorAll('dialog')) new MutationObserver(syncAll).observe(dialog, {attributes:true,attributeFilter:['open']});
