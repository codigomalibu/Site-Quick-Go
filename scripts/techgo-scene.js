import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Fixed product composition: Mini GO | Tech GO | Mini GO.
// No rotation loop, drag handlers, orbit controls, or animation clock.
const host = document.getElementById('techgo-viewer');
const status = document.getElementById('techgo-status');
async function start() {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  renderer.domElement.setAttribute('aria-hidden','true');
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(31,1,.05,30);
  const environment=new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const env=pmrem.fromScene(environment,.03);
  scene.environment=env.texture;scene.environmentIntensity=.8;
  environment.dispose();pmrem.dispose();
  const key=new THREE.DirectionalLight(0xffefdd,3.5);key.position.set(-2,3,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0xc6e3e9,1.4);fill.position.set(2,1,3);scene.add(fill);
  const rim=new THREE.DirectionalLight(0x9ad4df,2);rim.position.set(1,2,-3);scene.add(rim);
  const loader=new GLTFLoader();
  const [tech,mini]=await Promise.all([
    loader.loadAsync('/assets/quickgo-techgo.glb?v=trio-40'),
    loader.loadAsync('/assets/quickgo-machine-closed.glb?v=closed-23'),
  ]);
  function finish(model){
    model.traverse(object=>{
      if(!object.isMesh)return;
      const material=object.material;
      if(material.name==='Powder coated black metal') {
        object.material=new THREE.MeshPhysicalMaterial({color:0x080b0c,metalness:.18,roughness:.48,specularIntensity:.16,envMapIntensity:.55});
      }
      if(material.name==='Crystal tumbler') {
        material.transmission=0;material.transparent=true;material.opacity=.19;
        material.depthWrite=false;material.side=THREE.FrontSide;material.envMapIntensity=1.7;
      }
      if(material.name==='Clear melting ice')material.envMapIntensity=1.7;
    });
    return model;
  }
  const techModel=finish(tech.scene);techModel.name='Tech GO central stationary';
  techModel.rotation.set(0,0,0);techModel.position.set(0,0,0);
  const left=finish(mini.scene);left.name='Mini GO left stationary';
  left.scale.setScalar(.52);left.position.set(-.59,-.36,.04);left.rotation.set(0,.12,0);
  const right=left.clone(true);right.name='Mini GO right stationary';
  right.position.set(.59,-.36,.04);right.rotation.set(0,-.12,0);
  scene.add(left,techModel,right);
  function render(){
    const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    camera.position.set(0,.08,Math.max(3.15,1.02/(Math.tan(THREE.MathUtils.degToRad(15.5))*camera.aspect)));
    camera.lookAt(0,-.02,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
  }
  const resize=new ResizeObserver(render);resize.observe(host);render();
  host.dataset.ready='true';host.dataset.machineCount='3';host.dataset.angle='0';host.dataset.rotating='false';
  status.textContent='Tech GO parada ao centro, com uma Mini GO menor à esquerda e outra à direita.';
  window.addEventListener('pagehide',()=>{resize.disconnect();renderer.dispose();env.dispose();},{once:true});
}
start().catch(error=>{host.dataset.failed='true';status.textContent='Não foi possível carregar as máquinas 3D. Recarregue para tentar novamente.';console.error('Quick GO trio:',error);});
