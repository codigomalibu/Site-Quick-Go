"""Use the supplied assembled Tech GO STL; retain the existing display and drink materials."""
from pathlib import Path
import json,struct,numpy as np,trimesh,hashlib
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'source-assets/qg_techgo.stl'
b=(ROOT/'dist/assets/quickgo-machine-closed.glb').read_bytes();size=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+size]);start=20+size+8;blob=bytearray(b[start:])
# STL uses Z-up and X-forward. Map to the existing Y-up, Z-forward scene.
m=trimesh.load(source);center=m.bounds.mean(axis=0);v=(m.vertices-center)[:,[1,2,0]]*(1.5/m.extents[2]);m=trimesh.Trimesh(vertices=v,faces=m.faces,process=True)
black=next(i for i,x in enumerate(doc['materials']) if x['name']=='Powder coated black metal')
def buffer(values,kind,component=5126):
 values=np.asarray(values,dtype=np.float32 if component==5126 else np.uint32)
 while len(blob)%4:blob.append(0)
 off=len(blob);raw=values.tobytes();blob.extend(raw);vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(raw)})
 a={'bufferView':vi,'componentType':component,'count':len(values),'type':kind}
 if kind=='VEC3':a.update(min=values.min(axis=0).tolist(),max=values.max(axis=0).tolist())
 ai=len(doc['accessors']);doc['accessors'].append(a);return ai
# Keep planar STL surfaces planar: flat source face normals avoid inflated edges.
points=m.vertices[m.faces].reshape(-1,3);normals=np.repeat(m.face_normals,3,axis=0)
primitive={'attributes':{'POSITION':buffer(points,'VEC3'),'NORMAL':buffer(normals,'VEC3')},'indices':buffer(np.arange(len(points)),'SCALAR',5125),'material':black}
idx=len(doc['meshes']);doc['meshes'].append({'name':'Tech GO assembled supplied CAD housing','primitives':[primitive]})
children=[8,9,10]+list(range(35,39))+list(range(40,61))
# Match the CAD's lower tray height. All drink meshes stay rigidly integrated.
for i in range(40,61):
 tr=doc['nodes'][i].get('translation',[0,0,0]);doc['nodes'][i]['translation']=[tr[0],tr[1]+.06,tr[2]]
for i in [8,9]:doc['nodes'][i]['translation']=[0,0,-.009]
doc['nodes'].append({'name':'Tech GO supplied STL closed housing','mesh':idx});children.append(len(doc['nodes'])-1)
doc['nodes'].append({'name':'Tech GO complete integrated machine','children':children});doc['scenes']=[{'nodes':[len(doc['nodes'])-1]}];doc['buffers']=[{'byteLength':len(blob)}];doc['asset']['generator']='Tech GO supplied STL assembled; original geometry with display and integrated drink'
# Prune the former Home housing and its unreferenced geometry from the payload.
active=set(children);active.add(len(doc['nodes'])-1)
node_ids=sorted(active);node_map={old:new for new,old in enumerate(node_ids)}
new_nodes=[doc['nodes'][i] for i in node_ids]
for n in new_nodes:
 if 'children' in n:n['children']=[node_map[i] for i in n['children']]
mesh_ids=sorted({n['mesh'] for n in new_nodes if 'mesh' in n});mesh_map={old:new for new,old in enumerate(mesh_ids)}
for n in new_nodes:
 if 'mesh' in n:n['mesh']=mesh_map[n['mesh']]
doc['nodes']=new_nodes;doc['meshes']=[doc['meshes'][i] for i in mesh_ids];doc['scenes']=[{'nodes':[node_map[len(node_ids) and max(node_ids)]]}]
used=set()
for me in doc['meshes']:
 for pr in me['primitives']:used.update(pr['attributes'].values());used.add(pr['indices'])
aids=sorted(used);amap={old:new for new,old in enumerate(aids)}
for me in doc['meshes']:
 for pr in me['primitives']:
  pr['attributes']={k:amap[v] for k,v in pr['attributes'].items()};pr['indices']=amap[pr['indices']]
doc['accessors']=[doc['accessors'][i] for i in aids]
vids=sorted({a['bufferView'] for a in doc['accessors']}|{im['bufferView'] for im in doc.get('images',[])})
vmap={old:new for new,old in enumerate(vids)};packed=bytearray();views=[]
for i in vids:
 view=dict(doc['bufferViews'][i]);offset=view.get('byteOffset',0)
 while len(packed)%4:packed.append(0)
 view['byteOffset']=len(packed);packed.extend(blob[offset:offset+view['byteLength']]);views.append(view)
for a in doc['accessors']:a['bufferView']=vmap[a['bufferView']]
for im in doc.get('images',[]):im['bufferView']=vmap[im['bufferView']]
doc['bufferViews']=views;blob=packed;doc['buffers']=[{'byteLength':len(blob)}]
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\x00'*((-len(blob))%4);out=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\x00')+blob
(ROOT/'dist/assets/quickgo-techgo.glb').write_bytes(out)
print('Tech GO GLB:',len(out),'bytes;',len(m.faces),'CAD triangles; source SHA256',hashlib.sha256(source.read_bytes()).hexdigest())
