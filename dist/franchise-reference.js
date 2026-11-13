const opening=document.querySelector('.franchise-reference-opening');
const header=document.querySelector('body>.header');
if(opening&&header){
  function update(){
    const passed=opening.getBoundingClientRect().bottom<=0;
    header.hidden=false;
    document.body.classList.toggle('reference-opening-passed',passed);
  }
  new IntersectionObserver(update,{threshold:[0,1]}).observe(opening);
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update,{passive:true});
  update();
}
