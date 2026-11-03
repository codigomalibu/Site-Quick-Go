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

black=mat('Satin graphite housing',[.035,.044,.049,1],.58,.27)
edge=mat('Brushed graphite edges',[.065,.075,.08,1],.7,.3)
glass=mat('Glass black bezel',[.008,.013,.018,1],.4,.12)
steel=mat('Dispensing nozzle',[.42,.46,.48,1],.95,.18)
tray=mat('Drip tray',[.045,.05,.06,1],.7,.32)
light=mat('Blue dispensing light',[.22,.58,.85,1],0,.3,[.08,.32,.65])

# Screen artwork is an interface texture authored for this visualization.
screen=Image.new('RGB',(512,920),'#e8e8df');draw=ImageDraw.Draw(screen)
font=lambda n:ImageFont.truetype(str(OUT/'sans-0.ttf'),n)
draw.text((256,50),'QuickGO',font=font(48),fill='#22343b',anchor='mt')
draw.text((256,112),'ESCOLHA SEU DRINK',font=font(16),fill='#60716d',anchor='mt')
for n,(name,c) in enumerate([('Fitzgerald','#d6a14b'),('Zuma','#3b9ca6'),('Negroni','#a44d3e')]):
    y=180+n*210;draw.rounded_rectangle((28,y,484,y+175),radius=16,fill='#f6f3eb',outline='#cdd2c8',width=2)
    draw.rounded_rectangle((63,y+43,134,y+130),radius=10,fill=c)
    for x in [78,104]:draw.rectangle((x,y+51,x+17,y+70),fill='#e9d8af')
    draw.text((164,y+57),name,font=font(27),fill='#22343b')
    draw.text((164,y+99),'TOQUE PARA ESCOLHER',font=font(12),fill='#64716e')
draw.text((256,866),'DRINKS EM SEGUNDOS',font=font(15),fill='#64716e',anchor='mt')
screenmat=mat('Interactive drink selection screen',[1,1,1,1],0,.4,[.10,.12,.12],texture(screen))
logo=Image.open(OUT/'logo.webp').convert('RGBA')
logomat=mat('Quick GO logotype',[1,1,1,1],0,.5,None,texture(logo))

rounded('Rear enclosure',.52,1.50,.07,.07,[0,0,-.175],black)
rounded('Upper touch-screen enclosure',.52,.94,.38,.065,[0,.28,0],black)
rounded('Left support',.052,.61,.37,.023,[-.234,-.43,0],black)
rounded('Right support',.052,.61,.37,.023,[.234,-.43,0],black)
rounded('Base housing',.52,.085,.40,.033,[0,-.708,0],black)
rounded('Glass bezel',.407,.725,.014,.018,[0,.322,.196],glass)
plane('Drink menu',.372,.665,[0,.322,.204],screenmat)
plane('Quick GO brand',.217,.048,[0,-.108,.193],logomat)
box('Recessed back wall',[.414,.47,.012],[0,-.418,-.131],edge)
box('Serving ceiling',[.414,.018,.32],[0,-.193,.022],edge)
box('Blue light bar',[.18,.012,.026],[0,-.205,.13],light)
box('Nozzle',[.018,.045,.018],[0,-.218,.107],steel)
rounded('Removable drip tray',.38,.027,.30,.035,[0,-.652,.025],tray)
for x in np.linspace(-.155,.155,15):box('Tray groove',[.004,.002,.23],[float(x),-.637,.025],glass)
for x in [-.19,.19]:
    for z in [-.12,.12]:box('Rubber foot',[.045,.018,.045],[x,-.758,z],glass)

gltf={'asset':{'version':'2.0','generator':'Quick GO photo-based product visualization'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':materials,'textures':textures,'images':images,'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors}
j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\x00'*((-len(blob))%4)
glb=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\x00')+blob
(OUT/'quickgo-machine.glb').write_bytes(glb)
print('Created',len(meshes),'meshes;',len(glb),'bytes')
