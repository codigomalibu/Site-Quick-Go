"""Assemble the user's exploded STL for the web without replacing its case geometry.

Source coordinates: Z up, front toward -X. Only rigid translations and one
uniform scale are applied to the CAD shell, mounting panel, tray and nozzle.
Glass, drink and branded display are presentation accessories, not STL parts.
"""
from pathlib import Path
import copy, hashlib, json, struct, shutil
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'source-assets/qg_3d.stl'
PRESENTATION = ROOT/'source-assets/presentation-components.glb'
OUT = ROOT/'dist/assets/quickgo-machine-cad.glb'
if not SOURCE.exists():
    SOURCE.parent.mkdir(exist_ok=True)
    shutil.copyfile(Path('C:/Users/jorge/Downloads/qg_3d.stl'), SOURCE)

def read_glb(path):
    raw = path.read_bytes()
    size = struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+size]), raw[28+size:]

def write_glb(path, doc, binary):
    doc['buffers'] = [{'byteLength':len(binary)}]
    header = json.dumps(doc,separators=(',',':')).encode()
    header += b' '*((-len(header))%4)
    binary += b'\0'*((-len(binary))%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(header)+len(binary))+struct.pack('<I4s',len(header),b'JSON')+header+struct.pack('<I4s',len(binary),b'BIN\0')+binary)

# Extract only the glass/branding accessories once, leaving the former housing
# out of both this source asset and the production GLB.
if not PRESENTATION.exists():
    original, raw = read_glb(ROOT/'dist/assets/quickgo-machine-complete.glb')
    indices = [14,15] + list(range(71,92))
    doc = copy.deepcopy(original)
    doc['meshes'] = [original['meshes'][i] for i in indices]
    doc['nodes'] = [copy.deepcopy(original['nodes'][i]) for i in indices]
    for i,node in enumerate(doc['nodes']): node['mesh'] = i
    doc['nodes'].append({'name':'Presentation accessories','children':list(range(len(indices)))})
    doc['scenes'] = [{'nodes':[len(indices)]}]
    write_glb(PRESENTATION,doc,raw)

source, source_binary = read_glb(PRESENTATION)
doc = {key:copy.deepcopy(source[key]) for key in ['materials','textures','images','samplers','extensionsUsed']}
doc.update(asset={'version':'2.0','generator':'Quick GO original STL assembly'},scene=0,meshes=[],nodes=[],accessors=[],bufferViews=[])
binary = bytearray()
view_map = {}; accessor_map = {}
def copy_view(index):
    if index in view_map: return view_map[index]
    old = source['bufferViews'][index]
    while len(binary)%4: binary.append(0)
    start = len(binary)
    binary.extend(source_binary[old.get('byteOffset',0):old.get('byteOffset',0)+old['byteLength']])
    view_map[index] = len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':old['byteLength']})
    return view_map[index]
def copy_accessor(index):
    if index in accessor_map: return accessor_map[index]
    accessor = copy.deepcopy(source['accessors'][index])
    accessor['bufferView'] = copy_view(accessor['bufferView'])
    accessor_map[index] = len(doc['accessors']);doc['accessors'].append(accessor)
    return accessor_map[index]
for image in doc['images']: image['bufferView'] = copy_view(image['bufferView'])

def add_array(array, kind, component=5126):
    array=np.asarray(array,dtype=np.float32 if component==5126 else np.uint32)
    while len(binary)%4:binary.append(0)
    offset=len(binary);raw=array.tobytes();binary.extend(raw)
    view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(raw)})
    accessor={'bufferView':view,'componentType':component,'count':len(array),'type':kind}
    if kind=='VEC3':accessor.update(min=array.min(axis=0).tolist(),max=array.max(axis=0).tolist())
    index=len(doc['accessors']);doc['accessors'].append(accessor);return index
def cad_normals(mesh):
    normals=np.zeros_like(mesh.vertices)
    faces=mesh.faces
    triangles=mesh.vertices[faces]
    face_normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
    for corner in range(3):np.add.at(normals,faces[:,corner],face_normals)
    return normals/np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
def add_mesh(name, mesh, material, extras=None):
    attributes={'POSITION':add_array(mesh.vertices,'VEC3'),'NORMAL':add_array(cad_normals(mesh),'VEC3')}
    primitive={'attributes':attributes,'indices':add_array(mesh.faces.reshape(-1),'SCALAR',5125),'material':material}
    index=len(doc['meshes']);doc['meshes'].append({'name':name,'primitives':[primitive]})
    doc['nodes'].append({'name':name,'mesh':index,**({'extras':extras} if extras else {})})

model=trimesh.load_mesh(SOURCE)
model.update_faces(model.nondegenerate_faces());model.remove_unreferenced_vertices()
parts=sorted(model.split(only_watertight=False),key=lambda p:p.area,reverse=True)
assert len(parts[0].faces)==7846, 'Unexpected shell topology: inspect source before assembly'
SCALE=1.5/450
CENTER=np.array([3.050003,-59.059998,368.399994])
rotation=np.array([[0,1,0],[0,0,1],[-1,0,0]])
def cad(part, shift=(0,0,0)):
    mesh=part.copy()
    mesh.vertices=((mesh.vertices+np.array(shift)-CENTER)@rotation.T)*SCALE
    return mesh
black=next(i for i,m in enumerate(doc['materials']) if m['name']=='Powder coated black metal')
steel=next(i for i,m in enumerate(doc['materials']) if m['name']=='Brushed stainless dispensing assembly')
provenance={'source':'qg_3d.stl','sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'scale':SCALE,'sourceBounds':parts[0].bounds.tolist(),'sourceTriangles':len(parts[0].faces),'uniformScaleOnly':True}
add_mesh('Original STL Quick GO housing',cad(parts[0]),black,provenance)
# The exploded flat upper panel closes the rear machinery bay only. The lower
# cup compartment remains an actual opening through the complete case.
add_mesh('Original STL rear equipment panel',cad(parts[1],(249.5,0,0)),black)
add_mesh('Original STL serving tray',cad(parts[4],(0,0,117)),steel)
add_mesh('Original STL dispenser body',cad(parts[7],(0,0,-340)),steel)
add_mesh('Original STL dispensing outlet',cad(parts[40],(0,0,-287)),steel)

# Transfer presentation accessories; no previous housing/nozzle meshes survive.
for oldnode in source['nodes']:
    if 'mesh' not in oldnode:continue
    mesh=copy.deepcopy(source['meshes'][oldnode['mesh']]);name=mesh['name']
    for primitive in mesh['primitives']:
        for key,value in primitive['attributes'].items():primitive['attributes'][key]=copy_accessor(value)
        primitive['indices']=copy_accessor(primitive['indices'])
    node=copy.deepcopy(oldnode);node['mesh']=len(doc['meshes'])
    if name=='Front touchscreen':
        # Fit the display to the measured upper opening, not the old silhouette.
        node['scale']=[1.0,1.045,1]
        node['translation']=[0,.034,-.0005]
    if name=='Quick GO Drinks badge':node['translation']=[0,.0815,-.0005]
    if name not in ['Front touchscreen','Quick GO Drinks badge','Flowing coral stream']:
        node['translation']=list(np.array(node.get('translation',[0,0,0]))+np.array([0,.014,0]))
    if name=='Flowing coral stream':
        accessor=doc['accessors'][mesh['primitives'][0]['attributes']['POSITION']]
        view=doc['bufferViews'][accessor['bufferView']]
        pos=np.frombuffer(binary,dtype='<f4',count=accessor['count']*3,offset=view['byteOffset']+accessor.get('byteOffset',0)).reshape(-1,3).copy()
        pos[:,1]=-.399+(pos[:,1]+.413)*(.339/.276)
        mesh['primitives'][0]['attributes']['POSITION']=add_array(pos,'VEC3')
    doc['meshes'].append(mesh);doc['nodes'].append(node)

root=len(doc['nodes']);doc['nodes'].append({'name':'Quick GO complete dispensing machine','children':list(range(root)),'extras':{'source':'qg_3d.stl','assembly':'Exploded mechanical source assembled for product display'}})
doc['scenes']=[{'nodes':[root]}]
write_glb(OUT,doc,binary)
(ROOT/'docs/machine-cad.json').write_text(json.dumps({**provenance,'sourceFileBytes':SOURCE.stat().st_size,'sourceFileTriangles':503734,'outputBytes':OUT.stat().st_size,'outputMeshes':len(doc['meshes']),'presentationAccessories':['Branded display','Glass','Coral drink','Ice','Foam','Animated stream'],'notes':'STL is exploded and has no materials. Original shell is preserved at uniform scale. Detached internal pumps/electronics are omitted from the closed product presentation.'},indent=2)+'\n',encoding='utf-8')
print('Original CAD assembled:',len(doc['meshes']),'meshes;',OUT.stat().st_size,'bytes')
