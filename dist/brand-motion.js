// Independent entrance animations and a small, visibility-gated hero light field.
// Native scrolling remains untouched. Content is readable before JavaScript runs.
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set();
function entrance(element, keyframes, options) {
  if (preference.matches || document.hidden || !element.animate) return;
  const animation = element.animate(keyframes, {duration:1050,easing:'cubic-bezier(.16,1,.3,1)',fill:'none',...options});
  animations.add(animation);
  animation.onfinish = animation.oncancel = () => animations.delete(animation);
}
const hero = document.querySelector('.franchise-premium .franchise-hero');
if (hero && !preference.matches) {
  hero.querySelectorAll('h1>span').forEach((line,index) => entrance(line,[{opacity:0,transform:'translateY(45px)'},{opacity:1,transform:'none'}],{duration:1200,delay:120+index*140}));
  const image = hero.querySelector('.franchise-product');
  if (image) entrance(image,[{opacity:.2,transform:'translateX(35px)'},{opacity:1,transform:'none'}],{duration:1500});
}
const targets = document.querySelectorAll('.franchise-network-photo,.expansion-split>figure,.franchise-model,.expansion-network>figure,.expansion-place-grid>article,.expansion-business-grid>article,.expansion-journey-list>li,.story-gallery-photo,.story-step-photo,.story-occasion,.story-film,.story-investment-photo');
const observer = new IntersectionObserver(entries => {
  for(const entry of entries) {
    if(!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    const isCard = entry.target.matches('article,li,.story-film');
    const delay = isCard ? Math.min([...entry.target.parentElement.children].indexOf(entry.target),4)*85 : 0;
    entrance(entry.target,[{opacity:.15,transform:'translateY(38px) scale(.975)',clipPath:'inset(7% 0 0 0)'},{opacity:1,transform:'none',clipPath:'inset(0 0 0 0)'}],{delay});
  }
},{threshold:.12});
targets.forEach(element => observer.observe(element));

const canvas = hero?.querySelector('.franchise-light-field');
let stopField = () => {};
if(canvas && !preference.matches && !navigator.connection?.saveData) {
  const gl = canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power',depth:false});
  if(gl) {
    const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
    const fragment = `precision mediump float;
      uniform vec2 resolution;uniform vec2 pointer;uniform float time;
      void main(){
        vec2 uv=gl_FragCoord.xy/resolution;vec2 p=uv*2.-1.;
        p.x*=resolution.x/resolution.y;
        float t=time*.16;
        float drift=sin(p.x*1.7+t)+cos(p.y*2.1-t*.8);
        float ribbon=pow(max(0.,1.-abs(sin(p.y*1.3+p.x*.45+drift*.3+t)) ),7.);
        float veil=pow(max(0.,1.-abs(sin(p.y*.8-p.x*.4+drift*.26-t*.6))),10.);
        float light=exp(-length(uv-pointer)*3.2)*.28;
        vec3 teal=vec3(.08,.34,.35)*(ribbon*.32+light);
        vec3 amber=vec3(.53,.31,.12)*veil*.22;
        float edge=smoothstep(0.,.25,uv.x)*(1.-smoothstep(.8,1.,uv.y));
        gl_FragColor=vec4((teal+amber)*edge,.85);
      }`;
    function compile(type,source) {const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}return shader;}
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    if(vs && fs) {
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(gl.getProgramParameter(program,gl.LINK_STATUS)) {
        gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        const res=gl.getUniformLocation(program,'resolution'),clock=gl.getUniformLocation(program,'time'),mouse=gl.getUniformLocation(program,'pointer');
        let visible=true,frame=0,last=0,alive=true;let x=.4,y=.6;
        const resize=new ResizeObserver(()=>{canvas.width=Math.min(850,Math.round(hero.clientWidth*.6));canvas.height=Math.max(1,Math.round(canvas.width*hero.clientHeight/hero.clientWidth));gl.viewport(0,0,canvas.width,canvas.height);});resize.observe(hero);
        hero.addEventListener('pointermove',event=>{const rect=hero.getBoundingClientRect();x=(event.clientX-rect.left)/rect.width;y=1-(event.clientY-rect.top)/rect.height;},{passive:true});
        function draw(now) {frame=0;if(!alive || !visible || document.hidden || preference.matches)return;if(now-last>32){gl.uniform2f(res,canvas.width,canvas.height);gl.uniform2f(mouse,x,y);gl.uniform1f(clock,now/1000);gl.drawArrays(gl.TRIANGLES,0,6);last=now;}frame=requestAnimationFrame(draw);}
        const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible && !frame)frame=requestAnimationFrame(draw);},{threshold:0});visibility.observe(hero);
        document.addEventListener('visibilitychange',()=>{if(!document.hidden && visible && !frame)frame=requestAnimationFrame(draw);});
        canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();alive=false;cancelAnimationFrame(frame);});
        stopField=()=>{alive=false;cancelAnimationFrame(frame);resize.disconnect();visibility.disconnect();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
      }
    }
  }
}
preference.addEventListener('change',event=>{if(event.matches){animations.forEach(animation=>animation.cancel());stopField();}});
window.addEventListener('pagehide',()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());stopField();},{once:true});
