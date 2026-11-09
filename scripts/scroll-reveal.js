import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// DOM adapter of the supplied Scroll Reveal. Preserve existing semantic tags,
// line breaks, emphasis and fonts rather than remounting the static site in React.
gsap.registerPlugin(ScrollTrigger);
const SPAN = .5;
const STAGGER = .05;
const BASE_OPACITY = .1;
const BLUR = 4;
const ROTATION = 3;

function splitWords(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  }
  const pieces = [];
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const word of node.textContent.split(/(\s+)/)) {
      if (!word.trim()) { fragment.append(document.createTextNode(word)); continue; }
      const wrapper = document.createElement('span');
      wrapper.className = 'scroll-reveal-word';
      const piece = document.createElement('span');
      piece.className = 'scroll-reveal-piece';
      piece.textContent = word;
      wrapper.append(piece); fragment.append(wrapper); pieces.push(piece);
    }
    node.replaceWith(fragment);
  }
  return pieces;
}

const targets = [...document.querySelectorAll('main h1,main h2,main h3,main p,.network-footer h2,.network-footer h3,.network-footer p')].filter(element => {
  // Never blur controls, live results, moving cards, a form or external content.
  if (element.closest('dialog,form,[hidden],[aria-live],.drinks-track,.quote-home-form,.franchise-result,details,.story-preview')) return false;
  if (element.matches('.eyebrow,.small-note,.franchise-fineprint,.form-note,.system-notice,.footer-appearance-caption')) return false;
  if (element.querySelector('button,input,select,textarea,a')) return false;
  return !!element.textContent.trim();
});

const media = gsap.matchMedia();
media.add('(prefers-reduced-motion: no-preference)', () => {
  const cleanups = [];
  for (const element of targets) {
    const pieces = splitWords(element);
    if (!pieces.length) continue;
    element.dataset.scrollReveal = 'true';
    const total = SPAN + Math.max(0,pieces.length-1)*STAGGER;
    const state = { p:0 };
    const last = pieces.map(() => -1);
    const render = () => {
      const at = state.p * total;
      for (let index=0;index<pieces.length;index++) {
        const progress = Math.max(0,Math.min(1,(at-index*STAGGER)/SPAN));
        if (progress === last[index]) continue;
        last[index] = progress;
        const piece = pieces[index];
        piece.style.opacity = progress === 1 ? '' : String(BASE_OPACITY+(1-BASE_OPACITY)*progress);
        piece.style.filter = progress === 1 ? '' : `blur(${BLUR*(1-progress)}px)`;
      }
      element.dataset.revealProgress = state.p.toFixed(3);
    };
    const clear = () => {
      gsap.set(element,{clearProps:'transform,transformOrigin'});
      for (const piece of pieces) { piece.style.opacity='';piece.style.filter=''; }
      for (const wrapper of element.querySelectorAll('.scroll-reveal-word')) wrapper.replaceWith(...wrapper.firstElementChild.childNodes);
      element.normalize(); delete element.dataset.scrollReveal; delete element.dataset.revealProgress;
    };
    cleanups.push(clear);
    const rect=element.getBoundingClientRect();
    if (rect.top < innerHeight*.72 && rect.bottom > 0) {
      // Opening text reveals on entry, even without the first scroll gesture.
      render();
      gsap.fromTo(element,{rotate:ROTATION,transformOrigin:'0% 50%'},{rotate:0,duration:.9,ease:'power3.out',clearProps:'transform,transformOrigin'});
      gsap.to(state,{p:1,duration:Math.min(1.4,.8+pieces.length*.018),ease:'none',onUpdate:render});
    } else {
      const trigger = {
        trigger:element,
        start:'clamp(top bottom-=35)',
        end:'clamp(top 64%)',
        scrub:true,
        invalidateOnRefresh:true,
      };
      gsap.fromTo(element,{rotate:ROTATION,transformOrigin:'0% 50%'},{rotate:0,ease:'none',scrollTrigger:trigger});
      gsap.to(state,{p:1,ease:'none',onUpdate:render,scrollTrigger:trigger});
      render();
    }
  }
  let refreshTimer;
  const refresh = () => { clearTimeout(refreshTimer); refreshTimer=setTimeout(()=>ScrollTrigger.refresh(),180); };
  document.fonts?.ready.then(refresh);
  window.addEventListener('load',refresh,{once:true});
  // The quote iframe can change page height after its official resize message.
  const resize = new ResizeObserver(refresh);
  const main=document.querySelector('main');if(main)resize.observe(main);
  refresh();
  return () => {clearTimeout(refreshTimer);resize.disconnect();window.removeEventListener('load',refresh);cleanups.forEach(fn=>fn());};
});
