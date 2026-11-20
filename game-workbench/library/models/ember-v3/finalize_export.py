from pathlib import Path
import json
HERE=Path(__file__).resolve().parent
exec((HERE/'portable_cel.py').read_text(encoding='utf8'))
target=HERE.parent.parent/'exports'/'EMBER_v3.glb'
finalize_unlit_glb(target)
audit=json.loads((HERE/'model_audit.json').read_text(encoding='utf8'))
audit['glb_bytes']=target.stat().st_size
audit['portable_cel']='Vertex colors with KHR_materials_unlit; baked illustrated bands, not dynamic lighting.'
(HERE/'model_audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
print('UNLIT_GLB_FINALIZED',target.stat().st_size)
