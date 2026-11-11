const orbit=document.querySelector('.techgo-orbit');
const nodes=[...orbit.querySelectorAll('.techgo-event-node')];
const links=[...orbit.querySelectorAll('.techgo-link')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let index=0,timer,visible=false,interacting=false;
function select(next){index=next;nodes.forEach((node,i)=>{node.classList.toggle('is-active',i===index);node.setAttribute('aria-pressed',String(i===index));links[i].classList.toggle('is-active',i===index);});}
function schedule(){clearInterval(timer);if(visible&&!interacting&&!document.hidden&&!reduced.matches)timer=setInterval(()=>select((index+1)%nodes.length),2600);}
nodes.forEach((node,i)=>{node.addEventListener('click',()=>{select(i);schedule();});node.addEventListener('focus',()=>{interacting=true;select(i);schedule();});node.addEventListener('blur',()=>{interacting=false;schedule();});});
orbit.addEventListener('pointerenter',()=>{interacting=true;schedule();});
orbit.addEventListener('pointerleave',()=>{interacting=false;schedule();});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.1}).observe(orbit);
document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});select(0);
