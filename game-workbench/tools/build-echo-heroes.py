"""Build 4 distinct, portrait-faithful rigged 3D hero models in Blender 5.3:
- 霜序 (frost)   : Cream/mint flared coat, dark teal bob with cyan streak, crystallized cyan left arm
- 岚影 (shade)   : Lavender cropped jacket, cream left shoulder pauldron, glowing violet arm veins, cream pants
- 玄岩 (bastion) : Muscular broad teal coveralls, layered cream-stone/gold chest+shoulder+gauntlet armor, coral sash
- 裂爪 (reaper)  : Agile sea-teal beast hunter, bone-crest head & carapace, lime dorsal fins, purple waist sash

All 4 share the exact named humanoid bone hierarchy expected by aberrant-frontier-v4
(upper_arm.L/R, forearm.L/R, hand.L/R, thigh.L/R, shin.L/R) so all 6 interchangeable weapons
attach cleanly to both hand grips with zero drift.
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix, Euler
from pathlib import Path

LIB = Path(__file__).resolve().parents[1] / "library"
OUT_MODELS = LIB / "models" / "回响远征" / "异变者"
OUT_EXPORTS = LIB / "exports" / "回响远征" / "异变者"
PI = math.pi


def lin(hex_str):
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    conv = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (conv(r), conv(g), conv(b), 1.0)


class HeroBuilder:
    def __init__(self, name, pal, bone_defs):
        self.name = name
        self.pal = pal
        self.bone_defs = bone_defs  # dict: bone_name -> (head_zup, tail_zup, parent_name)
        self.bm = bmesh.new()
        self.color_layer = self.bm.loops.layers.color.new("Pigment")
        self.deform_layer = self.bm.verts.layers.deform.new()
        self.bone_index = {b: i for i, b in enumerate(bone_defs.keys())}

    def _finish_geom(self, verts, color_key, bone_name):
        verts = [v for v in verts if v.is_valid]
        vset = set(verts)
        b_idx = self.bone_index[bone_name]
        for v in verts:
            v[self.deform_layer][b_idx] = 1.0
        col = lin(self.pal[color_key])
        for f in self.bm.faces:
            if all(v in vset for v in f.verts):
                # Subtle faceted top-sun / bottom-cool shading baked into vertex colors!
                nz = f.normal.z
                shade = 1.0 + nz * 0.10
                c = (min(1.0, col[0] * shade), min(1.0, col[1] * shade), min(1.0, col[2] * shade), 1.0)
                for loop in f.loops:
                    loop[self.color_layer] = c

    def _to_zup(self, pos):
        # Input in Three.js Y-up (x, y, z) where +Z is FRONT (+face) and +Y is UP.
        # Blender glTF export_yup=True maps Blender (x, y, z) -> glTF (x, z, -y).
        # Therefore Three.js (x, y, z) == Blender (x, -z, y)!
        return Vector((pos[0], -pos[2], pos[1]))

    def _rot_zup(self, rot):
        return Euler((rot[0], -rot[2], rot[1]), 'XYZ').to_matrix().to_4x4()

    def box(self, pos, size, color, bone, rot=(0, 0, 0), bevel=0.0):
        p = self._to_zup(pos)
        sx, sy, sz = size[0], size[2], size[1]
        mat = Matrix.Translation(p) @ self._rot_zup(rot) @ Matrix.Diagonal((sx, sy, sz, 1))
        ret = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        verts = ret["verts"]
        if bevel > 0:
            vset = set(verts)
            edges = [e for e in self.bm.edges if e.verts[0] in vset and e.verts[1] in vset]
            bev = bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=1, affect='EDGES', clamp_overlap=True)
            verts = list(set(verts) | set(bev["verts"]))
        self._finish_geom(verts, color, bone)

    def limb(self, p1, p2, r1, r2, segs, color, bone, scale_xz=(1.0, 1.0)):
        a = self._to_zup(p1)
        b = self._to_zup(p2)
        d = b - a
        h = d.length
        if h < 1e-4:
            return
        mid = (a + b) * 0.5
        q = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        mat = Matrix.Translation(mid) @ q @ Matrix.Diagonal((scale_xz[0], scale_xz[1], 1.0, 1.0))
        ret = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h, matrix=mat)
        self._finish_geom(ret["verts"], color, bone)

    def ico(self, pos, scale, color, bone, subdiv=1, rot=(0, 0, 0)):
        p = self._to_zup(pos)
        mat = Matrix.Translation(p) @ self._rot_zup(rot) @ Matrix.Diagonal((scale[0], scale[2], scale[1], 1))
        ret = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=1.0, matrix=mat)
        self._finish_geom(ret["verts"], color, bone)

    def wedge(self, pts_xy, z_back, z_front, color, bone, pos=(0, 0, 0), rot=(0, 0, 0)):
        """Extruded clean faceted polygon in Three.js Y-up local coords."""
        p = self._to_zup(pos)
        xf = Matrix.Translation(p) @ self._rot_zup(rot)
        v_back = [self.bm.verts.new(xf @ self._to_zup((x, y, z_back))) for x, y in pts_xy]
        v_front = [self.bm.verts.new(xf @ self._to_zup((x, y, z_front))) for x, y in pts_xy]
        n = len(pts_xy)
        try:
            self.bm.faces.new(list(reversed(v_back)))
            self.bm.faces.new(v_front)
        except ValueError:
            pass
        for i in range(n):
            j = (i + 1) % n
            try:
                self.bm.faces.new([v_back[i], v_back[j], v_front[j], v_front[i]])
            except ValueError:
                pass
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self._finish_geom(v_back + v_front, color, bone)

    def export(self, filename_stem):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        # Create Armature
        arm_data = bpy.data.armatures.new(self.name + "_Arm")
        arm_obj = bpy.data.objects.new(self.name + "_Rig", arm_data)
        bpy.context.collection.objects.link(arm_obj)
        bpy.context.view_layer.objects.active = arm_obj
        bpy.ops.object.mode_set(mode='EDIT')
        edit_bones = {}
        for bname, (head, tail, parent) in self.bone_defs.items():
            eb = arm_data.edit_bones.new(bname)
            eb.head = self._to_zup(head)
            eb.tail = self._to_zup(tail)
            if parent and parent in edit_bones:
                eb.parent = edit_bones[parent]
            edit_bones[bname] = eb
        bpy.ops.object.mode_set(mode='OBJECT')

        # Create Mesh
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        mesh_data = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh_data)
        self.bm.free()

        mat = bpy.data.materials.new(self.name + "_Mat")
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        vcol = nt.nodes.new("ShaderNodeVertexColor")
        vcol.layer_name = "Pigment"
        nt.links.new(vcol.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.72
        mesh_data.materials.append(mat)

        mesh_obj = bpy.data.objects.new(self.name, mesh_data)
        bpy.context.collection.objects.link(mesh_obj)
        for bname in self.bone_defs.keys():
            mesh_obj.vertex_groups.new(name=bname)
        mesh_obj.parent = arm_obj
        mod = mesh_obj.modifiers.new("Armature", 'ARMATURE')
        mod.object = arm_obj

        # Export .blend and .glb
        OUT_MODELS.mkdir(parents=True, exist_ok=True)
        OUT_EXPORTS.mkdir(parents=True, exist_ok=True)
        blend_path = OUT_MODELS / f"{filename_stem}.blend"
        glb_path = OUT_EXPORTS / f"{filename_stem}.glb"
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=True)
        bpy.ops.object.select_all(action='DESELECT')
        arm_obj.select_set(True)
        mesh_obj.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=str(glb_path),
            export_format="GLB",
            use_selection=True,
            export_yup=True,
            export_apply=True,
            export_skins=True,
            export_animations=False,
        )
        print(f"BUILT HERO {filename_stem}: {len(mesh_data.vertices)}v -> {glb_path.name} ({glb_path.stat().st_size/1024:.1f} KB)", flush=True)


def make_humanoid_bones(shoulder_x=0.22, hip_x=0.11, shoulder_y=1.42, hip_y=0.92, arm_len=0.29, fore_len=0.27):
    # Exact bone names expected by createHeroRig():
    # upper_arm.L/R, forearm.L/R, hand.L/R, thigh.L/R, shin.L/R
    # Left side = +X in character local space (+Z is forward, +Y is up).
    # Wait: let's verify Ember_Tripo.glb's left/right X convention!
    # In Ember_Tripo.glb (facing +Z): upper_arm.L is at +X or -X?
    # Let's check: arms = ['upper_arm.L', 'upper_arm.R'], grips[1] = hand.R holds primary weapon!
    # When facing +Z (looking from behind at -Z toward +Z): character's RIGHT hand is at -X, LEFT hand is at +X!
    return {
        "root":        ((0, 0.0, 0),                   (0, 0.90, 0),                   None),
        "spine":       ((0, hip_y, 0),                 (0, shoulder_y + 0.08, 0),      "root"),
        "head":        ((0, shoulder_y + 0.08, 0),     (0, shoulder_y + 0.36, 0),      "spine"),
        "upper_arm.L": ((+shoulder_x, shoulder_y, 0),  (+shoulder_x + 0.04, shoulder_y - arm_len, 0), "spine"),
        "forearm.L":   ((+shoulder_x + 0.04, shoulder_y - arm_len, 0), (+shoulder_x + 0.06, shoulder_y - arm_len - fore_len, 0.02), "upper_arm.L"),
        "hand.L":      ((+shoulder_x + 0.06, shoulder_y - arm_len - fore_len, 0.02), (+shoulder_x + 0.06, shoulder_y - arm_len - fore_len - 0.11, 0.04), "forearm.L"),
        "upper_arm.R": ((-shoulder_x, shoulder_y, 0),  (-shoulder_x - 0.04, shoulder_y - arm_len, 0), "spine"),
        "forearm.R":   ((-shoulder_x - 0.04, shoulder_y - arm_len, 0), (-shoulder_x - 0.06, shoulder_y - arm_len - fore_len, 0.02), "upper_arm.R"),
        "hand.R":      ((-shoulder_x - 0.06, shoulder_y - arm_len - fore_len, 0.02), (-shoulder_x - 0.06, shoulder_y - arm_len - fore_len - 0.11, 0.04), "forearm.R"),
        "thigh.L":     ((+hip_x, hip_y, 0),            (+hip_x, hip_y * 0.50, 0.01),   "root"),
        "shin.L":      ((+hip_x, hip_y * 0.50, 0.01),  (+hip_x, 0.06, 0.0),            "thigh.L"),
        "thigh.R":     ((-hip_x, hip_y, 0),            (-hip_x, hip_y * 0.50, 0.01),   "root"),
        "shin.R":      ((-hip_x, hip_y * 0.50, 0.01),  (-hip_x, 0.06, 0.0),            "thigh.R"),
    }


def add_stylized_head(b, y_neck, skin, hair, hair_hi, eye_col, brow_col, face_scale=(0.115, 0.145, 0.12), beard=False):
    # Neck
    b.limb((0, y_neck - 0.03, 0), (0, y_neck + 0.09, 0.01), 0.055, 0.050, 8, skin, "head")
    # Faceted anime head (clean jaw taper!)
    cy = y_neck + 0.19
    b.ico((0, cy, 0.01), face_scale, skin, "head", subdiv=2)
    # Tapered chin
    b.ico((0, cy - face_scale[1] * 0.62, 0.045), (face_scale[0] * 0.52, face_scale[1] * 0.36, face_scale[2] * 0.62), skin, "head", subdiv=1)
    # Eyes & brows facing +Z
    ez = 0.01 + face_scale[2] * 0.88
    for s in (-1, 1):
        b.box((s * face_scale[0] * 0.42, cy + 0.015, ez), (0.036, 0.022, 0.016), eye_col, "head")
        b.box((s * face_scale[0] * 0.44, cy + 0.044, ez), (0.044, 0.013, 0.016), brow_col, "head", (0, 0, -s * 0.12))
    # Subtle nose bridge
    b.box((0, cy - 0.012, ez + 0.01), (0.016, 0.032, 0.02), skin, "head")
    if beard:
        b.box((0, cy - face_scale[1] * 0.72, ez - 0.01), (0.056, 0.028, 0.028), hair, "head")
    # Hair cap (back & crown)
    b.ico((0, cy + 0.035, -0.025), (face_scale[0] * 1.15, face_scale[1] * 1.06, face_scale[2] * 1.12), hair, "head", subdiv=2)
    return cy


def build_frost():
    """霜序 — Faithful to frost.webp: cream cropped jacket + mint lining, dark navy suit,
    crystallized cyan left arm, flared open side coat, dark teal bob with bright mint bang."""
    pal = {
        "SKIN": "EBC3A8", "HAIR": "2E4A4D", "HAIR_MINT": "69E5D2",
        "CREAM": "EDE2D3", "CREAM_SHADE": "D5C7B6", "MINT": "4EC8B8", "MINT_HI": "88F7E6",
        "SUIT": "323D4E", "SUIT_DARK": "222A38", "ORANGE": "E57A4E",
        "EYE": "1B2A30", "BOOT_DARK": "2F3A47",
    }
    bones = make_humanoid_bones(shoulder_x=0.195, hip_x=0.095, shoulder_y=1.40, hip_y=0.92, arm_len=0.28, fore_len=0.26)
    b = HeroBuilder("Frost", pal, bones)

    # Head + Signature asymmetrical teal bob hair with mint front streak!
    cy = add_stylized_head(b, 1.48, "SKIN", "HAIR", "HAIR_MINT", "EYE", "HAIR", (0.105, 0.135, 0.112))
    # Side bob locks framing cheeks
    for s in (-1, 1):
        b.wedge([(0, 0.06), (s * 0.065, 0.04), (s * 0.085, -0.14), (s * 0.02, -0.17)], -0.06, 0.05, "HAIR", "head", (s * 0.09, cy + 0.02, 0.0))
    # Iconic mint-cyan front lock framing right temple (-X) cleanly without covering her eye
    b.wedge([(-0.02, 0.08), (0.035, 0.06), (0.055, -0.10), (0.005, -0.12)], -0.02, 0.035, "HAIR_MINT", "head", (-0.095, cy + 0.035, 0.055), (0, 0.18, 0.14))
    # Clean back bob silhouette
    b.box((0, cy - 0.05, -0.09), (0.21, 0.16, 0.08), "HAIR", "head", (-0.18, 0, 0), bevel=0.02)

    # Torso: dark navy fitted bodysuit + high-collared cream cropped jacket with mint lining
    b.limb((0, 0.90, 0), (0, 1.15, 0), 0.115, 0.102, 10, "SUIT", "spine", (1.15, 0.80))
    b.limb((0, 1.13, 0), (0, 1.44, 0), 0.102, 0.145, 10, "SUIT", "spine", (1.22, 0.82))
    # Cropped cream jacket back & open front panels
    b.box((0, 1.30, -0.085), (0.31, 0.28, 0.08), "CREAM", "spine", (0.06, 0, 0), bevel=0.018)
    for s in (-1, 1):
        b.box((s * 0.125, 1.29, 0.04), (0.115, 0.27, 0.14), "CREAM", "spine", (0, -s * 0.15, 0), bevel=0.014)
        # Flared stand-up collar with bright mint inside!
        b.box((s * 0.095, 1.47, -0.01), (0.05, 0.11, 0.15), "CREAM", "spine", (0, 0, s * 0.26), bevel=0.008)
        b.box((s * 0.082, 1.47, 0.00), (0.025, 0.10, 0.13), "MINT", "spine", (0, 0, s * 0.26))
    b.box((0, 1.48, -0.09), (0.20, 0.11, 0.04), "CREAM", "spine", (-0.25, 0, 0))
    b.box((0, 1.48, -0.07), (0.18, 0.095, 0.022), "MINT", "spine", (-0.25, 0, 0))
    # Cream angled utility belt + side pouch with orange stripe
    b.limb((0, 0.96, 0), (0, 1.03, 0), 0.132, 0.128, 12, "CREAM", "spine", (1.15, 0.85))
    b.box((0.06, 0.96, 0.115), (0.095, 0.105, 0.06), "CREAM_SHADE", "spine", (0, 0.2, -0.1), bevel=0.01)
    b.box((0.015, 0.96, 0.12), (0.022, 0.095, 0.064), "ORANGE", "spine", (0, 0.2, -0.1))

    # Seamless open flared coat-skirt wrapping continuously around sides & back (cream outer + mint inner!)
    n_arc = 12
    top_out, bot_out, top_in, bot_in = [], [], [], []
    for i in range(n_arc):
        ang = -PI * 0.72 + i * (PI * 1.44 / (n_arc - 1))
        sx, sz = math.sin(ang), -math.cos(ang)
        top_out.append(b.bm.verts.new(b._to_zup((sx * 0.145, 0.96, sz * 0.12))))
        bot_out.append(b.bm.verts.new(b._to_zup((sx * 0.30,  0.46, sz * 0.25))))
        top_in.append( b.bm.verts.new(b._to_zup((sx * 0.130, 0.96, sz * 0.105))))
        bot_in.append( b.bm.verts.new(b._to_zup((sx * 0.282, 0.46, sz * 0.232))))
    for i in range(n_arc - 1):
        b.bm.faces.new([top_out[i], top_out[i + 1], bot_out[i + 1], bot_out[i]])
        b.bm.faces.new([top_in[i + 1], top_in[i], bot_in[i], bot_in[i + 1]])
        b.bm.faces.new([bot_out[i], bot_out[i + 1], bot_in[i + 1], bot_in[i]])
    b.bm.faces.new([top_out[0], bot_out[0], bot_in[0], top_in[0]])
    b.bm.faces.new([top_out[-1], top_in[-1], bot_in[-1], bot_out[-1]])
    b._finish_geom(top_out + bot_out, "CREAM", "spine")
    b._finish_geom(top_in + bot_in, "MINT", "spine")

    # Right Arm (-X): short cream flared sleeve + bare skin forearm + dark glove
    b.limb((-0.195, 1.40, 0), (-0.225, 1.24, 0), 0.072, 0.086, 8, "CREAM", "upper_arm.R")
    b.limb((-0.215, 1.25, 0), (-0.235, 1.12, 0), 0.044, 0.040, 8, "SKIN", "upper_arm.R")
    b.limb((-0.235, 1.12, 0), (-0.255, 0.86, 0.02), 0.040, 0.032, 8, "SKIN", "forearm.R")
    b.ico((-0.255, 0.81, 0.03), (0.038, 0.052, 0.042), "SKIN", "hand.R", subdiv=1)

    # Left Arm (+X): Iconic FACETED TRANSLUCENT-FEELING CYAN CRYSTAL ARM!
    b.limb((0.195, 1.40, 0), (0.225, 1.24, 0), 0.072, 0.086, 8, "CREAM", "upper_arm.L")
    b.limb((0.215, 1.25, 0), (0.235, 1.12, 0), 0.048, 0.044, 6, "MINT", "upper_arm.L")
    b.limb((0.235, 1.12, 0), (0.255, 0.86, 0.02), 0.046, 0.036, 6, "MINT_HI", "forearm.L")
    b.ico((0.255, 0.81, 0.03), (0.042, 0.056, 0.046), "MINT_HI", "hand.L", subdiv=1)

    # Legs & Signature Cream/Mint-Toe Boots
    for s, leg, shin in [(1, "thigh.L", "shin.L"), (-1, "thigh.R", "shin.R")]:
        hx = s * 0.095
        b.limb((hx, 0.92, 0), (hx, 0.46, 0.01), 0.072, 0.052, 8, "SUIT", leg)
        b.limb((hx, 0.46, 0.01), (hx, 0.16, 0.0), 0.052, 0.038, 8, "SUIT", shin)
        # Cream cuff boot with mint toe cap & dark heel
        b.limb((hx, 0.24, 0.0), (hx, 0.08, 0.01), 0.058, 0.052, 8, "CREAM", shin)
        b.box((hx, 0.05, 0.045), (0.088, 0.085, 0.165), "CREAM", shin, bevel=0.012)
        b.box((hx, 0.035, 0.125), (0.082, 0.052, 0.045), "MINT", shin)
        b.box((hx, 0.022, 0.03), (0.090, 0.032, 0.16), "BOOT_DARK", shin)

    b.export("霜序")


def build_shade():
    """岚影 — Faithful to shade.webp: swept dark hair, lavender angular cropped jacket,
    oversized faceted cream left shoulder pauldron, glowing violet arm markings, cream pants & purple boots."""
    pal = {
        "SKIN": "D8A382", "HAIR": "2A2632", "LAV": "A882DC", "LAV_HI": "D4A8FF",
        "DARK": "373242", "CREAM": "EAE0D5", "CREAM_SHADE": "CFC2B6",
        "PURPLE_DARK": "4D3D66", "EYE": "1B1724",
    }
    bones = make_humanoid_bones(shoulder_x=0.20, hip_x=0.10, shoulder_y=1.42, hip_y=0.93, arm_len=0.28, fore_len=0.27)
    b = HeroBuilder("Shade", pal, bones)

    # Head + Swept asymmetrical dark spiky hair
    cy = add_stylized_head(b, 1.50, "SKIN", "HAIR", "LAV_HI", "EYE", "HAIR", (0.105, 0.135, 0.112))
    # Swept dramatic side-swept hair crest leaning right (-X)
    b.wedge([(-0.04, 0.04), (0.11, 0.08), (0.15, -0.02), (0.02, -0.08)], -0.06, 0.07, "HAIR", "head", (-0.07, cy + 0.11, 0.02), (0, 0, 0.25))
    b.wedge([(0, 0.04), (0.08, 0.02), (0.11, -0.06), (0.02, -0.05)], -0.05, 0.05, "HAIR", "head", (0.08, cy + 0.06, -0.02), (0, 0, -0.3))

    # Torso: dark charcoal top + sharp angular lavender cropped jacket
    b.limb((0, 0.91, 0), (0, 1.18, 0), 0.115, 0.106, 10, "DARK", "spine", (1.15, 0.80))
    b.limb((0, 1.16, 0), (0, 1.46, 0), 0.106, 0.150, 10, "DARK", "spine", (1.22, 0.82))
    # Cropped lavender jacket back & lapels
    b.box((0, 1.32, -0.08), (0.31, 0.28, 0.075), "LAV", "spine", bevel=0.015)
    for s in (-1, 1):
        b.box((s * 0.125, 1.31, 0.045), (0.105, 0.28, 0.13), "LAV", "spine", (0, -s * 0.12, 0), bevel=0.012)
        b.box((s * 0.10, 1.48, 0.0), (0.05, 0.12, 0.14), "LAV", "spine", (0, 0, s * 0.28))
    # Iconic OVERSIZED FACETED CREAM LEFT SHOULDER PAULDRON (+X)!
    b.ico((0.23, 1.46, 0.0), (0.16, 0.10, 0.14), "CREAM", "spine", subdiv=1, rot=(0, 0, -0.22))
    b.ico((0.29, 1.41, 0.01), (0.11, 0.07, 0.11), "CREAM_SHADE", "upper_arm.L", subdiv=1, rot=(0, 0, -0.35))
    # Belt + lavender hip buckle + asymmetric purple hip tab
    b.limb((0, 0.93, 0), (0, 0.99, 0), 0.128, 0.126, 10, "DARK", "spine", (1.18, 0.86))
    b.box((0, 0.96, 0.11), (0.065, 0.055, 0.03), "LAV_HI", "spine")
    b.box((0.125, 0.88, 0.05), (0.07, 0.13, 0.09), "LAV", "spine", (0, 0.3, 0.2))

    # Floating glowing violet crescent aura behind left shoulder!
    for i in range(4):
        ang = -0.7 + i * 0.45
        b.box((0.30 + math.cos(ang) * 0.14, 1.48 + math.sin(ang) * 0.18, -0.14), (0.03, 0.11, 0.02), "LAV_HI", "spine", (0, 0.2, ang))

    # Arms: Bare athletic arms, left arm (+X) has glowing violet lightning bands, purple fingerless gloves
    for s, ua, fa, hd in [(1, "upper_arm.L", "forearm.L", "hand.L"), (-1, "upper_arm.R", "forearm.R", "hand.R")]:
        b.limb((s * 0.20, 1.42, 0), (s * 0.24, 1.14, 0), 0.048, 0.042, 8, "SKIN", ua)
        b.limb((s * 0.24, 1.14, 0), (s * 0.26, 0.87, 0.02), 0.042, 0.034, 8, "SKIN", fa)
        if s == 1:
            # Violet lightning vein bands on left arm
            b.limb((0.22, 1.32, 0), (0.238, 1.24, 0), 0.051, 0.049, 6, "LAV_HI", ua)
            b.limb((0.245, 1.10, 0.005), (0.254, 1.01, 0.012), 0.045, 0.042, 6, "LAV_HI", fa)
        # Purple cuff + dark glove
        b.limb((s * 0.258, 0.90, 0.018), (s * 0.26, 0.84, 0.022), 0.044, 0.040, 8, "LAV", fa)
        b.ico((s * 0.26, 0.81, 0.03), (0.040, 0.052, 0.042), "PURPLE_DARK", hd, subdiv=1)

    # Cream Faceted Tactical Pants + Dark Kneepads + Purple Strapped Boots
    for s, leg, shin in [(1, "thigh.L", "shin.L"), (-1, "thigh.R", "shin.R")]:
        hx = s * 0.10
        b.limb((hx, 0.93, 0), (hx, 0.47, 0.01), 0.078, 0.056, 6, "CREAM", leg)
        b.ico((hx, 0.48, 0.055), (0.048, 0.068, 0.038), "DARK", leg, subdiv=1)
        b.limb((hx, 0.47, 0.01), (hx, 0.18, 0.0), 0.054, 0.040, 6, "CREAM_SHADE", shin)
        b.limb((hx, 0.24, 0.0), (hx, 0.08, 0.01), 0.058, 0.054, 8, "PURPLE_DARK", shin)
        b.limb((hx, 0.18, 0.0), (hx, 0.12, 0.01), 0.064, 0.062, 8, "LAV", shin)
        b.box((hx, 0.05, 0.045), (0.090, 0.085, 0.17), "PURPLE_DARK", shin, bevel=0.012)
        b.box((hx, 0.032, 0.125), (0.084, 0.048, 0.042), "LAV", shin)

    b.export("岚影")


def build_bastion():
    """玄岩 — Faithful to bastion.webp: Broad muscular powerhouse, dark short hair + goatee,
    deep teal coveralls, huge layered cream-stone/gold chest+left shoulder+gauntlet armor, coral waist sash."""
    pal = {
        "SKIN": "D99A6C", "HAIR": "2A282B", "TEAL": "437876", "TEAL_DARK": "2D5556",
        "ROCK": "E8D8C3", "ROCK_SHADE": "CBB79E", "GOLD": "EBB042",
        "CORAL": "E67552", "IRON": "4A4E57", "EYE": "1F1B1A",
    }
    bones = make_humanoid_bones(shoulder_x=0.285, hip_x=0.135, shoulder_y=1.48, hip_y=0.94, arm_len=0.31, fore_len=0.29)
    b = HeroBuilder("Bastion", pal, bones)

    # Strong square-jawed head + buzz spiky hair + goatee
    cy = add_stylized_head(b, 1.56, "SKIN", "HAIR", "HAIR", "EYE", "HAIR", (0.122, 0.145, 0.125), beard=True)
    # Short spiky hair tufts
    for dx in (-0.06, 0, 0.06):
        b.box((dx, cy + 0.135, 0.02), (0.045, 0.055, 0.07), "HAIR", "head", (0.2, 0, dx * 2))

    # Massive Broad Muscular Teal Torso
    b.limb((0, 0.92, 0), (0, 1.20, 0), 0.175, 0.165, 10, "TEAL", "spine", (1.28, 0.85))
    b.limb((0, 1.18, 0), (0, 1.54, 0), 0.165, 0.235, 10, "TEAL", "spine", (1.30, 0.86))
    # Collared work jumpsuit neck
    b.limb((0, 1.50, -0.02), (0, 1.59, -0.02), 0.13, 0.15, 8, "TEAL_DARK", "spine")

    # Iconic DIAGONAL CREAM-STONE + GOLD ARMOR PLATES across chest & left shoulder (+X)!
    for cx, cy_p, cz, sx, sy, sz, col, rz in [
        (-0.10, 1.38, 0.16, 0.17, 0.13, 0.10, "ROCK", 0.35),
        ( 0.04, 1.43, 0.17, 0.16, 0.15, 0.11, "GOLD", 0.30),
        ( 0.17, 1.46, 0.15, 0.19, 0.15, 0.13, "ROCK", 0.25),
        ( 0.14, 1.33, 0.15, 0.16, 0.12, 0.11, "ROCK_SHADE", 0.28),
        # Massive layered stone pauldron on left shoulder (+X) & upper back
        ( 0.31, 1.54, 0.01, 0.24, 0.18, 0.22, "ROCK", -0.25),
        ( 0.36, 1.44, 0.00, 0.20, 0.14, 0.19, "ROCK_SHADE", -0.35),
        ( 0.18, 1.42, -0.17, 0.24, 0.20, 0.11, "ROCK", -0.18),
        ( 0.00, 1.36, -0.18, 0.20, 0.18, 0.10, "GOLD", 0.0),
    ]:
        b.box((cx, cy_p, cz), (sx, sy, sz), col, "spine", (0, 0, rz), bevel=0.02)

    # Heavy utility belt + Coral-Orange Front Hanging Sash!
    b.limb((0, 0.94, 0), (0, 1.03, 0), 0.195, 0.190, 10, "IRON", "spine", (1.25, 0.88))
    b.box((-0.07, 0.98, 0.17), (0.085, 0.085, 0.05), "CORAL", "spine")
    b.box((0.06, 0.98, 0.17), (0.085, 0.085, 0.05), "ROCK_SHADE", "spine")
    # Coral sash hanging asymmetrically down front thigh
    b.box((0.07, 0.72, 0.16), (0.115, 0.44, 0.035), "CORAL", "spine", (-0.12, 0, 0.18))

    # Right Arm (-X): Rolled teal sleeve + massive bare muscular forearm + iron bracer
    b.limb((-0.285, 1.48, 0), (-0.31, 1.30, 0), 0.105, 0.112, 8, "TEAL", "upper_arm.R")
    b.limb((-0.305, 1.32, 0), (-0.325, 1.17, 0), 0.082, 0.075, 8, "SKIN", "upper_arm.R")
    b.limb((-0.325, 1.17, 0), (-0.345, 0.88, 0.02), 0.080, 0.062, 8, "SKIN", "forearm.R")
    b.limb((-0.340, 0.96, 0.015), (-0.345, 0.88, 0.02), 0.074, 0.070, 8, "IRON", "forearm.R")
    b.ico((-0.345, 0.82, 0.03), (0.065, 0.075, 0.068), "SKIN", "hand.R", subdiv=1)

    # Left Arm (+X): Teal sleeve + MASSIVE ROCK & GOLD SHIELD GAUNTLET!
    b.limb((0.285, 1.48, 0), (0.325, 1.17, 0), 0.105, 0.088, 8, "TEAL", "upper_arm.L")
    b.limb((0.325, 1.17, 0), (0.345, 0.88, 0.02), 0.095, 0.082, 8, "ROCK", "forearm.L")
    b.box((0.39, 1.01, 0.04), (0.12, 0.30, 0.21), "ROCK", "forearm.L", (0, 0, -0.15), bevel=0.022)
    b.box((0.43, 1.01, 0.06), (0.05, 0.24, 0.12), "GOLD", "forearm.L", (0, 0, -0.15))
    b.ico((0.345, 0.82, 0.03), (0.072, 0.080, 0.074), "IRON", "hand.L", subdiv=1)

    # Heavy Baggy Teal Coverall Legs + Rock Right Kneepad + Armored Work Boots
    for s, leg, shin in [(1, "thigh.L", "shin.L"), (-1, "thigh.R", "shin.R")]:
        hx = s * 0.135
        b.limb((hx, 0.94, 0), (hx, 0.47, 0.01), 0.118, 0.096, 8, "TEAL", leg)
        b.limb((hx, 0.47, 0.01), (hx, 0.18, 0.0), 0.096, 0.074, 8, "TEAL_DARK", shin)
        if s == -1:
            b.box((hx, 0.50, 0.095), (0.11, 0.15, 0.07), "ROCK", leg, bevel=0.018)
        b.limb((hx, 0.25, 0.0), (hx, 0.08, 0.01), 0.092, 0.088, 8, "IRON", shin)
        b.box((hx, 0.065, 0.055), (0.135, 0.11, 0.215), "ROCK", shin, bevel=0.018)
        b.box((hx, 0.028, 0.05), (0.142, 0.042, 0.22), "IRON", shin)

    b.export("玄岩")


def build_reaper():
    """裂爪 — Faithful to reaper.webp: Agile sea-teal beast hunter, bone-armor crested head & carapace,
    glowing yellow eyes, bright lime dorsal spines, purple torn waist sash + gold canister, clawed feet."""
    pal = {
        "SKIN": "528075", "SKIN_DARK": "375B54", "BONE": "ECE0CE", "BONE_SHADE": "CFC0A8",
        "LIME": "B4E34E", "PURPLE": "9466B5", "GOLD": "F0B446", "CLAW": "3D3C45", "EYE": "D8F03A",
    }
    bones = make_humanoid_bones(shoulder_x=0.23, hip_x=0.12, shoulder_y=1.36, hip_y=0.88, arm_len=0.30, fore_len=0.29)
    b = HeroBuilder("Reaper", pal, bones)

    # Reptilian Bone-Crested Head jutting forward (+Z) with glowing lime eyes!
    b.limb((0, 1.38, 0.02), (0, 1.49, 0.10), 0.085, 0.068, 8, "SKIN", "head")
    b.ico((0, 1.54, 0.16), (0.115, 0.095, 0.165), "BONE", "head", subdiv=1)
    # Tapered jaw snout
    b.ico((0, 1.50, 0.27), (0.068, 0.052, 0.095), "BONE_SHADE", "head", subdiv=1)
    # Sharp swept cranial bone horns
    for s in (-1, 1):
        b.limb((s * 0.075, 1.57, 0.11), (s * 0.11, 1.66, -0.05), 0.045, 0.012, 5, "BONE", "head")
        b.box((s * 0.075, 1.53, 0.24), (0.042, 0.022, 0.032), "EYE", "head", (0, s * 0.35, -s * 0.18))

    # Hunched Agile Scaled Torso + Bone Shoulder/Chest Carapace + Lime Dorsal Spines!
    b.limb((0, 0.86, 0), (0, 1.14, 0.02), 0.118, 0.110, 8, "SKIN", "spine", (1.15, 0.85))
    b.limb((0, 1.12, 0.02), (0, 1.42, 0.06), 0.110, 0.168, 8, "SKIN", "spine", (1.28, 0.90))
    # Chest bone plates
    b.box((0, 1.24, 0.14), (0.18, 0.22, 0.07), "BONE", "spine", (0.12, 0, 0), bevel=0.018)
    # Sweeping shoulder/upper-back bone carapace
    b.ico((0, 1.42, -0.02), (0.24, 0.13, 0.20), "BONE", "spine", subdiv=1)
    for s in (-1, 1):
        b.ico((s * 0.23, 1.39, 0.01), (0.14, 0.085, 0.13), "BONE", "spine", subdiv=1, rot=(0, 0, -s * 0.35))
    # Iconic 3 BRIGHT LIME-GREEN DORSAL FINS along upper back!
    for i, (yy, zz, sz) in enumerate([(1.54, -0.04, 0.13), (1.42, -0.15, 0.14), (1.27, -0.20, 0.12)]):
        b.wedge([(-0.02, 0), (0.02, 0), (0.0, sz), (-0.01, sz * 0.6)], -0.09, 0.02, "LIME", "spine", (0, yy, zz), (-0.45, 0, 0))

    # Purple Torn Waist Sash + Hanging Cream/Gold Canister
    b.limb((0, 0.84, 0), (0, 0.95, 0.01), 0.138, 0.132, 8, "PURPLE", "spine", (1.20, 0.92))
    b.box((0.02, 0.67, 0.12), (0.09, 0.28, 0.025), "PURPLE", "spine", (-0.15, 0, -0.12))
    b.box((-0.12, 0.72, 0.08), (0.08, 0.22, 0.025), "PURPLE", "spine", (0, 0.3, 0.25))
    b.limb((-0.07, 0.82, 0.15), (-0.05, 0.66, 0.16), 0.042, 0.042, 8, "BONE", "spine")
    b.limb((-0.055, 0.71, 0.158), (-0.05, 0.66, 0.16), 0.044, 0.044, 8, "GOLD", "spine")

    # Arms with Bone Forearm Guards & Claws
    for s, ua, fa, hd in [(1, "upper_arm.L", "forearm.L", "hand.L"), (-1, "upper_arm.R", "forearm.R", "hand.R")]:
        b.limb((s * 0.23, 1.36, 0.02), (s * 0.27, 1.06, 0.0), 0.056, 0.048, 8, "SKIN", ua)
        b.limb((s * 0.27, 1.06, 0.0), (s * 0.29, 0.77, 0.03), 0.052, 0.042, 8, "SKIN", fa)
        # Sculpted bone bracer along outer forearm
        b.box((s * 0.31, 0.93, 0.02), (0.055, 0.24, 0.075), "BONE", fa, (0, 0, -s * 0.1), bevel=0.012)
        b.ico((s * 0.29, 0.71, 0.04), (0.048, 0.062, 0.052), "SKIN", hd, subdiv=1)
        for c_off in (-0.025, 0, 0.025):
            b.limb((s * 0.29 + c_off, 0.68, 0.06), (s * 0.29 + c_off, 0.60, 0.09), 0.016, 0.004, 4, "CLAW", hd)

    # Agile Predator Legs with Bone Knee/Shin Plates & Three-Toed Clawed Feet
    for s, leg, shin in [(1, "thigh.L", "shin.L"), (-1, "thigh.R", "shin.R")]:
        hx = s * 0.12
        b.limb((hx, 0.88, 0), (hx, 0.44, 0.03), 0.086, 0.060, 8, "SKIN", leg)
        b.box((hx, 0.47, 0.08), (0.065, 0.11, 0.05), "BONE", leg, bevel=0.01)
        b.limb((hx, 0.44, 0.03), (hx, 0.08, -0.02), 0.056, 0.042, 8, "SKIN_DARK", shin)
        b.box((hx, 0.26, 0.04), (0.05, 0.22, 0.04), "BONE", shin, bevel=0.01)
        # Clawed beast foot
        b.box((hx, 0.055, 0.035), (0.095, 0.07, 0.14), "BONE", shin, bevel=0.012)
        for t_off in (-0.03, 0.03):
            b.limb((hx + t_off, 0.04, 0.09), (hx + t_off, 0.015, 0.16), 0.024, 0.008, 4, "CLAW", shin)

    b.export("裂爪")


if __name__ == "__main__":
    build_frost()
    build_shade()
    build_bastion()
    build_reaper()
