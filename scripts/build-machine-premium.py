"""Create a lightweight product visualization from the supplied Quick GO photos.
This is a visual reconstruction, not a manufacturing/CAD model. Rebuilt from the eight supplied views.
"""
import json, math, struct, io, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets'; OUT.mkdir(exist_ok=True)
blob=bytearray(); views=[]; accessors=[]; meshes=[]; nodes=[]; images=[]; textures=[]
materials=[]
def data(array,kind,component=5126):
    array=np.asarray(array,dtype=np.float32 if component==5126 else np.uint32)
    while len(blob)%4:blob.append(0)
    offset=len(blob); raw=array.tobytes();blob.extend(raw)
    vi=len(views);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(raw)})
    obj={'bufferView':vi,'componentType':component,'count':len(array),'type':kind}
    if kind=='VEC3':obj.update(min=array.min(axis=0).tolist(),max=array.max(axis=0).tolist())
    ai=len(accessors);accessors.append(obj);return ai
def mat(name,color,metal=0,rough=.4,emissive=None,texture=None):
    p={'baseColorFactor':list(color),'metallicFactor':metal,'roughnessFactor':rough}
    if texture is not None:p['baseColorTexture']={'index':texture}
    m={'name':name,'pbrMetallicRoughness':p,'doubleSided':False}
    if emissive:m['emissiveFactor']=emissive
    if color[3]<1 or texture is not None:m['alphaMode']='BLEND' if name=='Quick GO logotype' else 'OPAQUE'
    materials.append(m);return len(materials)-1
def texture(im):
    out=io.BytesIO();im.save(out,format='PNG');raw=out.getvalue()
    while len(blob)%4:blob.append(0)
    offset=len(blob);blob.extend(raw);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(raw)})
    images.append({'bufferView':len(views)-1,'mimeType':'image/png'})
    textures.append({'source':len(images)-1,'sampler':0});return len(textures)-1
def mesh(name,verts,faces,material,uv=None,smooth=False):
    verts=np.array(verts,dtype=float);faces=np.array(faces,dtype=int).reshape(-1,3)
    # Separate triangles keep crisp casework and predictable normals.
    points=verts[faces].reshape(-1,3);norm=[]
    for face in verts[faces]:
        normal=np.cross(face[1]-face[0],face[2]-face[0]);normal/=max(np.linalg.norm(normal),1e-9);norm.extend([normal]*3)
    if smooth:
        averaged=np.zeros_like(verts)
        for face in faces:
            normal=np.cross(verts[face[1]]-verts[face[0]],verts[face[2]]-verts[face[0]])
            for vertex in face:averaged[vertex]+=normal
        averaged/=np.maximum(np.linalg.norm(averaged,axis=1,keepdims=True),1e-9)
        norm=averaged[faces].reshape(-1,3)
    attributes={'POSITION':data(points,'VEC3'),'NORMAL':data(norm,'VEC3')}
    if uv is not None:attributes['TEXCOORD_0']=data(np.array(uv)[faces].reshape(-1,2),'VEC2')
    primitive={'attributes':attributes,'indices':data(np.arange(len(points)),'SCALAR',5125),'material':material}
    meshes.append({'name':name,'primitives':[primitive]});nodes.append({'name':name,'mesh':len(meshes)-1})
def box(name,size,center,material):
    x,y,z=[s/2 for s in size];v=np.array([[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]])+center
    mesh(name,v,[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,4,7],[0,7,3],[1,2,6],[1,6,5],[3,7,6],[3,6,2],[0,1,5],[0,5,4]],material)
def rounded(name,w,h,d,r,center,material):
    contour=[]
    for cx,cy,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for a in np.linspace(start,start+90,9):contour.append([cx+r*math.cos(math.radians(a)),cy+r*math.sin(math.radians(a))])
    n=len(contour);v=[[x,y,-d/2] for x,y in contour]+[[x,y,d/2] for x,y in contour]+[[0,0,-d/2],[0,0,d/2]];f=[]
    for i in range(n):
        j=(i+1)%n;f.extend([[2*n,j,i],[2*n+1,n+i,n+j],[i,j,n+j],[i,n+j,n+i]])
    mesh(name,np.array(v)+center,f,material)
def plane(name,w,h,center,material):
    x,y=w/2,h/2;v=np.array([[-x,-y,0],[x,-y,0],[x,y,0],[-x,y,0]])+center
    mesh(name,v,[[0,1,2],[0,2,3]],material,[[0,1],[1,1],[1,0],[0,0]])

# Dimensions use a consistent scale inferred from the new reference views.
black=mat('Powder coated black metal',[.004,.005,.006,1],.18,.4)
trim=mat('Machined graphite bevel',[.009,.011,.013,1],.45,.28)
bezel=mat('Black glass bezel',[.004,.007,.008,1],.15,.18)
steel=mat('Brushed stainless dispensing assembly',[.53,.55,.54,1],.88,.25)
white=mat('Ceramic dispensing head',[.88,.87,.82,1],.12,.21)
warm=mat('Warm recessed light',[1,.7,.38,1],.05,.25,[.8,.25,.04])

def contour(w,h,r,cy=0):
    result=[]
    for cx,y,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for a in np.linspace(start,start+90,25):result.append([cx+r*math.cos(math.radians(a)),cy+y+r*math.sin(math.radians(a))])
    return np.array(result)

def connect(name,profiles,material,reverse=False,smooth=False):
    v=[];f=[];n=len(profiles[0][0])
    for points,z in profiles:v.extend([[x,y,z] for x,y in points])
    for row in range(len(profiles)-1):
        for i in range(n):
            a=row*n+i;b=row*n+(i+1)%n;c=b+n;d=a+n
            f.extend([[a,b,c],[a,c,d]])
    if reverse:f=[list(reversed(t)) for t in f]
    mesh(name,v,f,material,smooth=smooth)

outer=contour(.635,1.5,.093);face=contour(.605,1.47,.08)
hole=contour(.466,.603,.066,-.374);tunnel=contour(.448,.585,.06,-.374)
# Rounded metallic shell; the serving opening runs continuously front to back.
connect('Rounded powder coated housing',[(outer,-.225),(outer,.225)],black,smooth=True)
for sign,label in [(1,'front'),(-1,'rear')]:
    profiles=[]
    for a in np.linspace(0,math.pi/2,8):
        t=1-math.cos(a);profiles.append((outer*(1-t)+face*t,sign*(.225+.015*math.sin(a))))
    connect('Rolled '+label+' shell edge',profiles,black,reverse=sign<0,smooth=True)
    connect('Solid '+label+' face with through opening',[(face,sign*.24),(hole,sign*.24)],black,reverse=sign<0)
    lip=[]
    for a in np.linspace(0,math.pi/2,7):
        t=math.sin(a);lip.append((hole*(1-t)+tunnel*t,sign*(.24-.014*(1-math.cos(a)))))
    connect('Rounded '+label+' opening lip',lip,trim,reverse=sign<0,smooth=True)
connect('Open serving compartment tunnel',[(tunnel,.226),(tunnel,-.226)],black,smooth=True)
rounded('Low inset base',.61,.025,.44,.06,[0,-.761,0],bezel)
for x in [-.23,.23]:
    for z in [-.14,.14]:rounded('Recessed rubber foot',.06,.012,.05,.006,[x,-.778,z],bezel)

logo=Image.open(OUT/'logo.webp').convert('RGBA')
screen=Image.new('RGB',(600,1040),'#e1eced')
dark=Image.new('RGBA',logo.size,(10,15,16,0));dark.putalpha(logo.getchannel('A'));dark.thumbnail((430,145))
screen.paste(dark,((600-dark.width)//2,(1040-dark.height)//2),dark)
screenmat=mat('Luminous branded display',[1,1,1,1],0,.28,texture=texture(screen))
materials[screenmat]['extensions']={'KHR_materials_unlit':{}}
logomat=mat('Metallic Quick GO logotype',[1,1,1,1],.15,.32,texture=texture(logo));materials[logomat]['alphaMode']='BLEND'
rounded('Recessed touchscreen frame',.356,.591,.008,.007,[0,.35,.242],bezel)
plane('Front touchscreen',.34,.574,[0,.35,.247],screenmat)
plane('Quick GO Drinks badge',.223,.047,[0,-.009,.241],logomat)

def lathe(name,profile,center,material,segments=128,flutes=0):
    v=[];f=[]
    for radius,y in profile:
        for i in range(segments):
            a=2*math.pi*i/segments;r=radius
            if flutes and .025<y<.3:r+=.0011*math.cos(a*flutes)
            v.append([center[0]+r*math.cos(a),center[1]+y,center[2]+r*math.sin(a)])
    for row in range(len(profile)-1):
        for i in range(segments):
            a=row*segments+i;b=row*segments+(i+1)%segments;c=b+segments;d=a+segments
            f.extend([[a,c,b],[a,d,c]])
    mesh(name,v,f,material,smooth=True)

def transform_last(rotation,center):
    # Transform a just-created mesh, retaining its material and topology.
    m=meshes.pop();node=nodes.pop();p=m['primitives'][0];a=accessors[p['attributes']['POSITION']];v=views[a['bufferView']]
    points=np.frombuffer(blob,dtype=np.float32,count=a['count']*3,offset=v['byteOffset']).reshape(-1,3).copy()
    points=points@rotation.T+np.array(center)
    n=accessors[p['attributes']['NORMAL']];nv=views[n['bufferView']]
    normals=np.frombuffer(blob,dtype=np.float32,count=n['count']*3,offset=nv['byteOffset']).reshape(-1,3).copy()@rotation.T
    blob[v['byteOffset']:v['byteOffset']+v['byteLength']]=points.astype(np.float32).tobytes()
    blob[nv['byteOffset']:nv['byteOffset']+nv['byteLength']]=normals.astype(np.float32).tobytes()
    a.update(min=points.min(axis=0).tolist(),max=points.max(axis=0).tolist());meshes.append(m);nodes.append(node)

def screw(name,center,rotation=np.eye(3)):
    lathe(name,[(0,0),(.007,0),(.008,.002),(.007,.004),(0,.004)],[0,0,0],trim,32)
    transform_last(rotation,center)
    # Dark cross slot is geometrically inset in the screw head.
    for size in [[.007,.001,.0014],[.0014,.001,.007]]:
        box(name+' cross recess',size,[0,.0041,0],bezel);transform_last(rotation,center)

back_rotation=np.array([[1,0,0],[0,0,1],[0,-1,0]])
for x in [-.245,.245]:
    for y in [.667,.08,-.689]:screw('Rear panel fastener',[x,y,-.242],back_rotation)
# Service doors and vents are on the upper part of the side panels only.
for sign in [-1,1]:
    rotation=np.array([[0,0,sign],[0,1,0],[-sign,0,0]])
    rounded('Inset side service door',.282,.66,.003,.022,[0,0,0],trim);transform_last(rotation,[sign*.318,.22,-.006])
    rounded('Matte side access panel',.273,.65,.003,.019,[0,0,0],black);transform_last(rotation,[sign*.320,.22,-.006])
    for z in [-.109,.109]:
        for y in [-.075,.515]:
            rot=np.array([[0,sign,0],[1,0,0],[0,0,-sign]])
            screw('Service door fastener',[sign*.323,y,z],rot)
    if sign<0:
        for y in np.linspace(-.047,.025,4):
            rounded('Inset side cooling vent',.092,.006,.002,.003,[0,0,0],bezel);transform_last(rotation,[sign*.323,float(y),-.012])

lathe('Dispenser mount',[(0,0),(.087,0),(.087,.009),(0,.009)],[0,-.086,.025],steel)
lathe('White ceramic dispenser',[(0,-.034),(.053,-.034),(.057,-.029),(.057,0),(0,0)],[0,-.091,.025],white)
lathe('Warm under canopy light',[(.058,0),(.067,0),(.067,.002),(.058,.002)],[0,-.091,.025],warm)
lathe('Dispensing outlet',[(0,0),(.013,0),(.009,-.012),(0,-.012)],[0,-.125,.025],white)
lathe('Recessed serving tray',[(0,0),(.139,0),(.142,.002),(.139,.004),(0,.004)],[0,-.662,.025],bezel)

crystal=mat('Crystal tumbler',[.97,.99,1,1],0,.065)
materials[crystal]['extensions']={'KHR_materials_transmission':{'transmissionFactor':.98},'KHR_materials_ior':{'ior':1.46},'KHR_materials_volume':{'thicknessFactor':.004,'attenuationDistance':1,'attenuationColor':[.97,.99,1]}}
# One continuous open shell, not overlapping solid glass cylinders.
lathe('Fluted crystal tumbler',[(0,0),(.098,0),(.11,.003),(.117,.01),(.119,.021),(.121,.05),(.126,.18),(.134,.31),(.134,.316),(.132,.319),(.129,.318),(.128,.313),(.122,.18),(.112,.038),(.107,.025),(0,.025)],[0,-.654,.025],crystal,192,24)
glass_edge=mat('Rolled crystal highlights',[.92,.98,1,.44],.05,.035)
materials[glass_edge]['alphaMode']='BLEND'
lathe('Rolled glass mouth',[(.13,0),(.133,.001),(.135,.003),(.133,.005),(.13,.004),(.128,.002),(.13,0)],[0,-.339,.025],glass_edge)
lathe('Heavy glass foot edge',[(.108,0),(.118,.002),(.119,.004),(.116,.007),(.11,.008),(.108,0)],[0,-.651,.025],glass_edge)
liquid=mat('Coral cocktail',[.65,.045,.007,1],0,.24)
materials[liquid]['extensions']={'KHR_materials_ior':{'ior':1.33}}
lathe('Coral drink volume',[(0,0),(.103,0),(.111,.007),(.115,.10),(.122,.208),(.122,.214),(.118,.215),(0,.211)],[0,-.627,.025],liquid)
foam=mat('Delicate peach foam',[1,.58,.33,1],0,.65)
lathe('Thin foam meniscus',[(.112,0),(.122,0),(.123,.002),(.119,.006),(.114,.004),(.112,0)],[0,-.415,.025],foam)
ice=mat('Clear melting ice',[.91,.97,1,1],0,.12)
materials[ice]['extensions']={'KHR_materials_transmission':{'transmissionFactor':.88},'KHR_materials_ior':{'ior':1.31},'KHR_materials_volume':{'thicknessFactor':.025,'attenuationDistance':.4,'attenuationColor':[.93,.99,1]}}

def ice_stone(name,center,size,angles):
    half=size/2;bevel=.009;v=[];f=[];steps=7
    ax,ay,az=angles
    rx=np.array([[1,0,0],[0,math.cos(ax),-math.sin(ax)],[0,math.sin(ax),math.cos(ax)]])
    ry=np.array([[math.cos(ay),0,math.sin(ay)],[0,1,0],[-math.sin(ay),0,math.cos(ay)]])
    rz=np.array([[math.cos(az),-math.sin(az),0],[math.sin(az),math.cos(az),0],[0,0,1]])
    rotation=rz@ry@rx
    for axis in range(3):
        for sign in [-1,1]:
            start=len(v);other=[i for i in range(3) if i!=axis]
            for row in range(steps+1):
                for col in range(steps+1):
                    p=np.zeros(3);p[axis]=sign*half;p[other[0]]=-half+size*col/steps;p[other[1]]=-half+size*row/steps
                    core=np.clip(p,-half+bevel,half-bevel);delta=p-core
                    point=core+bevel*delta/np.linalg.norm(delta)
                    v.append(rotation@point+center)
            for row in range(steps):
                for col in range(steps):
                    a=start+row*(steps+1)+col;b=a+1;c=b+steps+1;d=a+steps+1
                    triangles=[[a,b,c],[a,c,d]]
                    if np.dot(np.cross(np.array(v[b])-v[a],np.array(v[c])-v[a]),rotation[:,axis]*sign)<0:triangles=[list(reversed(t)) for t in triangles]
                    f.extend(triangles)
    mesh(name,v,f,ice,smooth=True)

ice_stone('Ice left',[-.053,-.399,.07],.073,[.22,.4,-.22])
ice_stone('Ice right',[.052,-.397,.065],.076,[-.3,-.35,.25])
ice_stone('Ice rear',[.003,-.395,-.032],.075,[.22,.6,.18])

rng=np.random.default_rng(33)
def droplets(name,items,material):
    v=[];f=[]
    for x,y,z,r in items:
        start=len(v)
        for row in range(5):
            phi=math.pi*row/4
            for col in range(8):
                a=2*math.pi*col/8;v.append([x+r*math.sin(phi)*math.cos(a),y+r*math.cos(phi),z+r*math.sin(phi)*math.sin(a)])
        for row in range(4):
            for col in range(8):
                a=start+row*8+col;b=start+row*8+(col+1)%8;c=b+8;d=a+8;f.extend([[a,c,b],[a,d,c]])
    mesh(name,v,f,material,smooth=True)

bubbles=[]
for n in range(120):
    a=rng.uniform(0,2*math.pi);r=rng.uniform(.07,.121)
    bubbles.append((r*math.cos(a),-.413+rng.uniform(-.001,.002),.025+r*math.sin(a),rng.uniform(.0006,.002)))
droplets('Fine surface bubbles',bubbles,foam)
condensation=[]
for n in range(55):
    a=rng.uniform(0,2*math.pi);y=rng.uniform(.03,.29);r=.12+.014*y/.31
    condensation.append((r*math.cos(a),-.654+y,.025+r*math.sin(a),rng.uniform(.0007,.002)))
droplets('Glass condensation',condensation,crystal)
tiny_bubble=mat('Suspended cocktail microbubbles',[1,.38,.12,.4],0,.24)
materials[tiny_bubble]['alphaMode']='BLEND'
body_bubbles=[]
for n in range(160):
    a=rng.uniform(0,2*math.pi);y=rng.uniform(.05,.22);r=.11+.012*y/.22
    body_bubbles.append((r*math.cos(a),-.654+y,.025+r*math.sin(a),rng.uniform(.00045,.001)))
droplets('Suspended fine bubbles',body_bubbles,tiny_bubble)
# Real geometry, animated in Three.js with a traveling surface deformation.
profile=[]
for y in np.linspace(-.413,-.137,60):
    r=.0044+.001*(y+.413)/.276+.0006*math.sin(y*70)
    profile.append((r,float(y)))
lathe('Flowing coral stream',profile,[0,0,.025],liquid,24)
for i in range(9):
    droplets('Splash droplet '+str(i),[(0,0,0,.0015+(i%3)*.0004)],liquid)
    nodes[-1]['translation']=[.01*math.cos(i*2.4),-.405,.025+.01*math.sin(i*2.4)]

gltf={'asset':{'version':'2.0','generator':'Quick GO eight-view reconstruction, 2026-11-03'},'extensionsUsed':['KHR_materials_unlit','KHR_materials_transmission','KHR_materials_ior','KHR_materials_volume'],'scene':0,'scenes':[{'nodes':[len(nodes)]}],'nodes':nodes+[{'name':'Quick GO complete dispensing machine','children':list(range(len(nodes)))}],'meshes':meshes,'materials':materials,'textures':textures,'images':images,'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors}
j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\x00'*((-len(blob))%4)
glb=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\x00')+blob
(OUT/'quickgo-machine-complete.glb').write_bytes(glb)
print('Complete machine:',len(meshes),'meshes;',len(glb),'bytes')

