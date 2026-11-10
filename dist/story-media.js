// Native muted previews start on entry and stop offscreen. No overlay controls.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const previews = [...document.querySelectorAll('.story-video')];
const states = new Map();
function sync(video) {
  const state = states.get(video);
  const shouldPlay = state.visible && !state.hovering && !state.focused && !state.paused && !document.hidden && !document.querySelector('dialog[open]') && !reduced.matches && !navigator.connection?.saveData;
  if (!shouldPlay) { video.pause(); return; }
  const source = video.querySelector('source');
  if (source && !source.getAttribute('src')) { source.src = source.dataset.src; video.load(); }
  video.muted = true;
  video.play().catch(() => { /* Keep the poster if the browser blocks automatic playback. */ });
}
const observer = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
  states.get(target).visible = isIntersecting;
  sync(target);
}), {threshold: .15});
for (const video of previews) {
  states.set(video, {visible:false,hovering:false,focused:false,paused:false});
  video.muted = true;
  video.defaultMuted = true;
  video.addEventListener('pointerenter', event => {if(event.pointerType==='mouse'){states.get(video).hovering=true;sync(video);}});
  video.addEventListener('pointerleave', () => {states.get(video).hovering=false;sync(video);});
  video.addEventListener('focus', () => {states.get(video).focused=true;sync(video);});
  video.addEventListener('blur', () => {states.get(video).focused=false;sync(video);});
  video.addEventListener('keydown', event => {if(event.key===' '){event.preventDefault();states.get(video).paused=!states.get(video).paused;states.get(video).focused=false;sync(video);}});
  video.addEventListener('click', () => {states.get(video).paused=!states.get(video).paused;states.get(video).focused=false;sync(video);});
  observer.observe(video);
}
function syncAll() { previews.forEach(sync); }
document.addEventListener('visibilitychange', syncAll);
reduced.addEventListener('change', syncAll);
for (const dialog of document.querySelectorAll('dialog')) new MutationObserver(syncAll).observe(dialog, {attributes:true,attributeFilter:['open']});
