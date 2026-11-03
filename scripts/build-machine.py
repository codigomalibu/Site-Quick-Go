"""Create a lightweight product visualization from the supplied Quick GO photos.
This is a visual reconstruction, not a manufacturing/CAD model.
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
def mesh(name,verts,faces,material,uv=None):
    verts=np.array(verts,dtype=float);faces=np.array(faces,dtype=int).reshape(-1,3)
    # Separate triangles keep crisp casework and predictable normals.
    points=verts[faces].reshape(-1,3);norm=[]
    for face in verts[faces]:
        normal=np.cross(face[1]-face[0],face[2]-face[0]);normal/=max(np.linalg.norm(normal),1e-9);norm.extend([normal]*3)
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

black=mat('Satin graphite housing',[.008,.011,.012,1],.08,.42)
edge=mat('Brushed graphite edges',[.012,.016,.018,1],.22,.38)
materials[black]['extensions']={'KHR_materials_specular':{'specularFactor':.12}}
materials[edge]['extensions']={'KHR_materials_specular':{'specularFactor':.2}}
glass=mat('Glass black bezel',[.008,.013,.018,1],.4,.12)
steel=mat('Dispensing nozzle',[.42,.46,.48,1],.95,.18)
tray=mat('Drip tray',[.045,.05,.06,1],.7,.32)
light=mat('Blue dispensing light',[.22,.58,.85,1],0,.3,[.08,.32,.65])

# Screen artwork is an interface texture authored for this visualization.
# The supplied reference uses a pale idle screen, with only the centered logo.
logo=Image.open(OUT/'logo.webp').convert('RGBA')
screen=Image.new('RGB',(600,1000),'#dae6eb')
darklogo=Image.new('RGBA',logo.size,(12,17,19,0));darklogo.putalpha(logo.getchannel('A'))
darklogo.thumbnail((440,150));screen.paste(darklogo,((600-darklogo.width)//2,(1000-darklogo.height)//2),darklogo)
screenmat=mat('Pale branded idle screen',[1,1,1,1],0,.3,[.25,.28,.3],texture(screen))
materials[screenmat]['extensions']={'KHR_materials_unlit':{}}
logo=Image.open(OUT/'logo.webp').convert('RGBA')
logomat=mat('Quick GO logotype',[1,1,1,1],0,.5,None,texture(logo))

def contour(w,h,r,cy=0):
    result=[]
    for cx,y,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for a in np.linspace(start,start+90,25):result.append([cx+r*math.cos(math.radians(a)),cy+y+r*math.sin(math.radians(a))])
    return result

def ring_surface(name,first,second,z1,z2,material,reverse=False):
    n=len(first);v=[[x,y,z1] for x,y in first]+[[x,y,z2] for x,y in second];f=[]
    for i in range(n):
        j=(i+1)%n;f.extend([[i,j,n+j],[i,n+j,n+i]])
    if reverse:f=[list(reversed(t)) for t in f]
    mesh(name,v,f,material)

# A continuous frame with a true through-opening: there is no rear wall,
# hidden plane or full-height rear enclosure behind the serving bay.
outer=contour(.66,1.50,.095);face=contour(.648,1.488,.092)
opening=contour(.49,.605,.068,-.365)
inner=contour(.47,.585,.060,-.365)
ring_surface('Front frame around open dispenser',face,opening,.201,.201,black)
ring_surface('Rear frame around open dispenser',face,opening,-.201,-.201,black,True)
ring_surface('Rounded outer enclosure',outer,outer,-.185,.185,black)
ring_surface('Front edge bevel',outer,face,.185,.201,edge)
ring_surface('Rear edge bevel',face,outer,-.201,-.185,edge)
ring_surface('Open serving tunnel',inner,inner,.181,-.181,black)
ring_surface('Serving opening front bevel',opening,inner,.201,.181,edge)
ring_surface('Serving opening rear bevel',inner,opening,-.181,-.201,edge,True)
rounded('Glass bezel',.362,.605,.012,.006,[0,.352,.205],glass)
plane('Drink menu',.342,.579,[0,.352,.212],screenmat)
plane('Quick GO brand',.222,.046,[0,-.005,.203],logomat)
rounded('Base plinth',.625,.018,.35,.025,[0,-.757,0],glass)
for x in [-.24,.24]:
    for z in [-.12,.12]:box('Rubber foot',[.045,.013,.045],[x,-.773,z],glass)

def lathe(name,profile,center,material,segments=96):
    v=[]
    for radius,y in profile:
        for a in np.linspace(0,2*math.pi,segments,endpoint=False):v.append([center[0]+radius*math.cos(a),center[1]+y,center[2]+radius*math.sin(a)])
    f=[]
    for row in range(len(profile)-1):
        for i in range(segments):
            j=(i+1)%segments;a=row*segments+i;b=row*segments+j;c=(row+1)*segments+j;d=(row+1)*segments+i
            f.extend([[a,b,c],[a,c,d]])
    mesh(name,v,[list(reversed(t)) for t in f],material)

ceramic=mat('White dispensing head',[.88,.87,.82,1],.25,.2)
warm=mat('Warm nozzle light',[1,.68,.38,1],0,.3,[1,.35,.08])
lathe('Nozzle mounting ring',[(0,0),(.115,0),(.115,.007),(0,.007)],[0,-.073,.025],steel)
lathe('Round white dispenser',[(0,-.045),(.06,-.045),(.063,-.039),(.063,0),(0,0)],[0,-.078,.025],ceramic)
lathe('Warm dispensing light',[(.065,0),(.073,0),(.073,.002),(.065,.002)],[0,-.083,.025],warm)
lathe('Dispensing tip',[(0,0),(.017,0),(.012,-.015),(0,-.015)],[0,-.123,.025],ceramic)

# The tumbler and pouring drink are separate meshes inside the open tunnel.
# Transparency keeps the background visible through the glass during rotation.
clear=mat('Clear faceted tumbler',[.82,.94,1,.14],.1,.08)
materials[clear]['alphaMode']='BLEND'
materials[clear]['doubleSided']=True
orange=mat('Coral orange cocktail',[.7,.055,.006,1],0,.32)
foam=mat('Cocktail foam',[.95,.26,.12,1],0,.8)
rim=mat('Glass rim reflections',[.7,.83,.86,.32],.2,.12);materials[rim]['alphaMode']='BLEND'
lathe('Faceted tumbler',[(0,0),(.111,0),(.119,.012),(.136,.305),(.132,.31),(.127,.305),(.111,.025),(0,.025)],[0,-.655,.025],clear,48)
lathe('Tumbler rim',[(.128,0),(.136,0),(.136,.003),(.128,.003)],[0,-.348,.025],rim)
lathe('Orange drink',[(0,0),(.11,0),(.12,.209),(0,.209)],[0,-.627,.025],orange)
lathe('Foam surface',[(0,0),(.121,0),(.121,.01),(0,.01)],[0,-.418,.025],foam)
lathe('Pouring stream',[(0,0),(.006,0),(.009,.04),(.006,.12),(.007,.22),(.01,.28),(0,.28)],[0,-.418,.025],orange,24)
for n in range(20):
    a=2*math.pi*n/20
    lathe('Glass vertical cut',[(0,0),(.002,0),(.002,.285),(0,.285)],[.118*math.cos(a),-.645,.025+.118*math.sin(a)],rim,8)

gltf={'asset':{'version':'2.0','generator':'Quick GO reference-based product visualization'},'extensionsUsed':['KHR_materials_specular','KHR_materials_unlit'],'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':materials,'textures':textures,'images':images,'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors}
j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\x00'*((-len(blob))%4)
glb=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\x00')+blob
(OUT/'quickgo-machine.glb').write_bytes(glb)
print('Created',len(meshes),'meshes;',len(glb),'bytes')
