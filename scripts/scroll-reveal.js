// One observer, one short entrance per text block. Content is never hidden
// while waiting for an observer, and scrolling never drives animation frames.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set();
const targets = [...document.querySelectorAll('main h2,main h3,main p,.network-footer h2,.network-footer h3,.network-footer p')].filter(element => {
  if (element.closest('dialog,form,[hidden],[aria-live],.drinks-track,.quote-home-form,.franchise-result,details,.story-preview')) return false;
  if (element.matches('.eyebrow,.small-note,.franchise-fineprint,.form-note,.system-notice,.footer-appearance-caption')) return false;
  if (element.querySelector('button,input,select,textarea,a')) return false;
  return !!element.textContent.trim();
});

if (!motion.matches && 'IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
  const observer = new IntersectionObserver(entries => {
    for (const {target,isIntersecting} of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (motion.matches || document.hidden) continue;
      const animation = target.animate([
        { opacity:.35, transform:'translateY(12px)' },
        { opacity:1, transform:'translateY(0)' },
      ], { duration:600, easing:'cubic-bezier(.22,1,.36,1)', fill:'none' });
      running.add(animation);
      animation.onfinish = animation.oncancel = () => running.delete(animation);
    }
  }, {threshold:0,rootMargin:'0px 0px -20px 0px'});
  for (const target of targets) {
    const rect=target.getBoundingClientRect();
    // The opening viewport and content already passed remain fully visible.
    if (rect.top >= innerHeight-20) observer.observe(target);
  }
  const stop = () => { for (const animation of [...running]) animation.cancel();running.clear(); };
  motion.addEventListener('change',event => {if(event.matches)stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',()=>{observer.disconnect();stop();},{once:true});
}
