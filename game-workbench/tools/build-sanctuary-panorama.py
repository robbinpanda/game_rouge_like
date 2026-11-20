"""Build the high-detail 3D Sanctuary Overlook + Three-Act Grand Panorama diorama in Blender 5.3.
Faithfully adapts the approved concept art (01_圣所拂晓, 04_开局转场_三域同框, and the tri-act palette:
Act 1 Cream & Pine-Mint Daybreak Line | Act 2 Coral-Rust & Molten-Gold Tidal Dock | Act 3 Pearl-White & Amethyst Prism Glasshouse).
Exports both editable .blend and compact vertex-colored .glb for Three.js offline bundling.
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix, Euler
from pathlib import Path

LIB = Path(__file__).resolve().parents[1] / "library"
OUT_BLEND = LIB / "models" / "回响远征" / "圣所全景" / "晴湾圣所全景.blend"
OUT_GLB = LIB / "exports" / "回响远征" / "圣所全景" / "晴湾圣所全景.glb"
PI = math.pi

def lin(hex_str):
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    conv = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (conv(r), conv(g), conv(b), 1.0)

# Curated Palette matching the Tri-Act Golden Color Scheme
PAL = {
    # Sanctuary foreground (warm cream + coral + brass + teal + lilac blooms)
    "CREAM": "EFE3CE", "CREAM_DARK": "D6C5AC", "STONE": "C9BBA7",
    "CORAL": "E47258", "CORAL_DARK": "B94F3D", "BRASS": "E6BD68", "GOLD": "F5C445",
    "TEAL": "2F7A72", "MINT": "7EE4CE", "INK": "243945",
    "LILAC": "C596E8", "BLOSSOM": "EAB4F5", "SAKURA": "F7A7C7", "BARK": "6A4D53",
    # Act 1: Daybreak Line (Cream + Pine-Mint + Emerald Ginkgo + Lagoon Teal)
    "PINE": "1E544A", "PINE_MID": "2E7668", "MINT_GLASS": "5EB8AF",
    "LEAF": "79B94E", "LEAF_HI": "B8DC5A", "LEAF_DARK": "3D7A47",
    "TRAIN_WHITE": "F7EFE2", "CLIFF": "B8A89A", "CLIFF_SHADE": "7B7E8F",
    # Act 2: Tidal Dock (Coral-Brick + Molten Gold Crane + Cobalt Ship + Iron)
    "BRICK": "CC5E4A", "BRICK_LIGHT": "E38B70", "DOCK_DECK": "DFC9BA",
    "CRANE_GOLD": "F3B93B", "CRANE_DARK": "C98924", "CRANE_RED": "DF6B52",
    "COBALT": "285C99", "NAVY": "1C3961", "CONT_TEAL": "42A19E", "IRON": "3C4E5D",
    # Act 3: Prism Glasshouse (Pearl White + Misty Silver + Ice Glass + Vivid Amethyst)
    "PEARL": "F2EFF7", "PEARL_SHADE": "D5D4E4", "SILVER": "B6C3D4",
    "GLASS_ICE": "99D6F0", "GLASS_VIOLET": "C9A8F5",
    "AMETHYST": "9E52F0", "AMETHYST_HI": "D89EFF", "AMETHYST_DEEP": "5B2B96",
    "WATERFALL": "D8F8FF", "CLOUD": "FCF9FF",
    # Sea & Distant Mountains
    "SEA_DEEP": "247EA6", "SEA_MID": "329FC2", "SEA_FOAM": "E6FBFF",
    "MT_FAR": "799EC4", "MT_MID": "5E85AC", "FIRE": "FFAB4A",
}

class Builder:
    def __init__(self, name, emissive=False):
        self.name = name
        self.emissive = emissive
        self.bm = bmesh.new()
        self.color_layer = self.bm.loops.layers.color.new("Pigment")

    def paint_faces(self, faces, hex_key):
        col = lin(PAL[hex_key])
        for f in faces:
            for loop in f.loops:
                loop[self.color_layer] = col

    def box(self, pos, size, color, rot=(0, 0, 0)):
        # Input coords in Three.js Y-up (x, y, z) -> converted to Blender Z-up (x, -z, y)
        bx, by, bz = pos[0], -pos[2], pos[1]
        sx, sy, sz = size[0], size[2], size[1]
        mat = Matrix.Translation((bx, by, bz)) @ Euler((rot[0], -rot[2], rot[1]), 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((sx, sy, sz, 1))
        ret = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        verts = set(ret["verts"])
        faces = [f for f in self.bm.faces if all(v in verts for v in f.verts)]
        self.paint_faces(faces, color)
        return faces

    def cyl(self, pos, r1, r2, h, segs, color, rot=(0, 0, 0)):
        bx, by, bz = pos[0], -pos[2], pos[1]
        mat = Matrix.Translation((bx, by, bz)) @ Euler((rot[0], -rot[2], rot[1]), 'XYZ').to_matrix().to_4x4()
        ret = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h, matrix=mat)
        verts = set(ret["verts"])
        faces = [f for f in self.bm.faces if all(v in verts for v in f.verts)]
        self.paint_faces(faces, color)
        return faces

    def ico(self, pos, scale, color, subdiv=1, rot=(0, 0, 0)):
        bx, by, bz = pos[0], -pos[2], pos[1]
        mat = Matrix.Translation((bx, by, bz)) @ Euler((rot[0], -rot[2], rot[1]), 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((scale[0], scale[2], scale[1], 1))
        ret = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=1.0, matrix=mat)
        verts = set(ret["verts"])
        faces = [f for f in self.bm.faces if all(v in verts for v in f.verts)]
        self.paint_faces(faces, color)
        return faces

    def beam(self, p1, p2, thick, color):
        a = Vector((p1[0], -p1[2], p1[1]))
        b = Vector((p2[0], -p2[2], p2[1]))
        d = b - a
        length = d.length
        if length < 1e-4:
            return
        mid = (a + b) * 0.5
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        mat = Matrix.Translation(mid) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((thick, thick, length, 1))
        ret = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        verts = set(ret["verts"])
        faces = [f for f in self.bm.faces if all(v in verts for v in f.verts)]
        self.paint_faces(faces, color)

    def arch(self, center, rx, ry, depth, thick, segs, color, rot_y=0):
        # Semi-circular architectural arch in XY (Three.js), rotated around Y
        cx, cy, cz = center
        pts = []
        for i in range(segs + 1):
            a = PI * i / segs
            lx = math.cos(a) * rx
            ly = math.sin(a) * ry
            wx = cx + lx * math.cos(rot_y)
            wz = cz - lx * math.sin(rot_y)
            pts.append((wx, cy + ly, wz))
        for i in range(segs):
            a = Vector((pts[i][0], -pts[i][2], pts[i][1]))
            b = Vector((pts[i+1][0], -pts[i+1][2], pts[i+1][1]))
            d = b - a
            mid = (a + b) * 0.5
            q = Vector((1, 0, 0)).rotation_difference(d.normalized())
            mat = Matrix.Translation(mid) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((d.length * 1.06, depth, thick, 1))
            ret = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
            verts = set(ret["verts"])
            faces = [f for f in self.bm.faces if all(v in verts for v in f.verts)]
            self.paint_faces(faces, color)

    def crystal(self, pos, r, h, color, tilt=(0, 0, 0)):
        # Faceted hexagonal quartz prism + pointed tip
        bx, by, bz = pos[0], -pos[2], pos[1]
        mat = Matrix.Translation((bx, by, bz)) @ Euler((tilt[0], -tilt[2], tilt[1]), 'XYZ').to_matrix().to_4x4()
        ret = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=6, radius1=r, radius2=r*0.72, depth=h*0.65, matrix=mat @ Matrix.Translation((0, 0, h*0.325)))
        verts1 = set(ret["verts"])
        ret2 = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=6, radius1=r*0.72, radius2=0.02, depth=h*0.42, matrix=mat @ Matrix.Translation((0, 0, h*0.86)))
        verts2 = set(ret2["verts"])
        faces = [f for f in self.bm.faces if all(v in verts1 or v in verts2 for v in f.verts)]
        self.paint_faces(faces, color)

    def tree(self, pos, size, leaf_cols, trunk="BARK"):
        x, y, z = pos
        self.cyl((x, y + size * 0.9, z), size * 0.24, size * 0.14, size * 1.85, 6, trunk)
        offsets = [(0, 2.2, 0, 1.35), (-0.75, 1.85, 0.35, 0.95), (0.78, 1.95, -0.25, 1.0), (0.1, 2.55, -0.45, 0.85)]
        for i, (ox, oy, oz, sc) in enumerate(offsets):
            self.ico((x + ox * size, y + oy * size, z + oz * size), (size * sc, size * sc * 0.72, size * sc * 0.92), leaf_cols[i % len(leaf_cols)], 1, (i*0.3, i*0.8, 0))

    def finish(self):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        mesh.update()
        mat = bpy.data.materials.new(self.name + "_Mat")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Roughness"].default_value = 0.82
        vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Pigment"
        mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
        if self.emissive:
            mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = 1.6
        mesh.materials.append(mat)
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj


def build_panorama():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    solid = Builder("Panorama_Solid", emissive=False)
    glow = Builder("Panorama_Glow", emissive=True)

    # =========================================================================
    # 1. FOREGROUND: HADES-STYLE SANCTUARY OVERLOOK (z = 15..33, y = 0)
    #    Inspired by 01_圣所拂晓.png & 04_开局转场_三域同框.png
    # =========================================================================
    # Main curved-front terrace platform & cliff drop
    solid.box((0, -0.65, 25.5), (25, 1.3, 18), "CREAM")
    solid.cyl((0, -0.65, 21.5), 13.5, 13.8, 1.3, 20, "CREAM")
    solid.cyl((0, -1.55, 21.5), 14.1, 14.3, 0.55, 20, "TEAL")
    solid.cyl((0, -10.5, 23.0), 15.2, 13.2, 17.5, 12, "CLIFF")
    # Decorative inlaid brass compass rose on Sanctuary deck (01_圣所拂晓 & 03_镜光归台)
    solid.cyl((0, 0.03, 23.2), 4.9, 4.9, 0.06, 28, "BRASS")
    solid.cyl((0, 0.05, 23.2), 4.45, 4.45, 0.06, 28, "TEAL")
    solid.cyl((0, 0.07, 23.2), 3.45, 3.45, 0.06, 28, "CREAM")
    solid.cyl((0, 0.085, 23.2), 1.35, 1.35, 0.06, 20, "BRASS")
    for k in range(8):
        ang = k * PI / 4
        length = 4.2 if k % 2 == 0 else 2.85
        w = 0.48 if k % 2 == 0 else 0.28
        solid.box((math.sin(ang)*length*0.48, 0.10, 23.2 + math.cos(ang)*length*0.48), (w, 0.06, length), "BRASS" if k % 2 == 0 else "TEAL", (0, ang, 0))
    glow.cyl((0, 0.125, 23.2), 0.72, 0.48, 0.09, 12, "GOLD")

    # Curved cliff-edge stone balustrade with glowing crystal pillars & coral trim
    for i in range(-5, 6):
        ang = i * 0.22
        rx, rz = math.sin(ang) * 12.8, 21.5 - math.cos(ang) * 12.8
        if abs(i) >= 2:
            solid.box((rx, 0.68, rz), (0.95, 1.35, 0.95), "CREAM", (0, -ang, 0))
            solid.box((rx, 1.42, rz), (1.12, 0.18, 1.12), "CREAM_DARK", (0, -ang, 0))
            glow.crystal((rx, 0.52, rz - 0.36), 0.14, 0.52, "MINT")
        if i < 5 and not (i in (-2, -1, 0, 1)):
            ang2 = (i + 1) * 0.22
            p1 = (rx, 0.82, rz)
            p2 = (math.sin(ang2)*12.8, 0.82, 21.5 - math.cos(ang2)*12.8)
            solid.beam(p1, p2, 0.32, "CREAM")
            solid.beam((p1[0], 0.52, p1[2]), (p2[0], 0.52, p2[2]), 0.22, "CORAL")
            solid.beam((p1[0], 1.12, p1[2]), (p2[0], 1.12, p2[2]), 0.26, "TEAL")

    # Grand Expedition Overlook Archway (01_圣所拂晓 signature transit arch!)
    for s in (-1, 1):
        solid.box((s * 5.8, 3.1, 13.8), (1.35, 6.2, 1.45), "CREAM")
        solid.box((s * 5.8, 4.9, 13.8), (1.55, 0.34, 1.65), "CORAL")
        # Warm glowing Sanctuary Braziers flanking the arch
        solid.cyl((s * 4.1, 0.9, 14.5), 0.65, 0.82, 1.5, 8, "CREAM_DARK")
        solid.cyl((s * 4.1, 1.75, 14.5), 0.75, 0.52, 0.35, 8, "INK")
        glow.ico((s * 4.1, 2.25, 14.5), (0.45, 0.68, 0.45), "FIRE", 1)
    solid.arch((0, 5.2, 13.8), 6.1, 3.6, 1.35, 0.95, 14, "CORAL")
    solid.arch((0, 5.2, 13.8), 5.3, 3.0, 0.72, 0.55, 14, "MINT_GLASS")
    solid.cyl((0, 8.85, 13.8), 1.05, 1.05, 0.45, 16, "CREAM", (PI/2, 0, 0))
    solid.cyl((0, 8.85, 13.92), 0.78, 0.78, 0.32, 16, "CORAL", (PI/2, 0, 0))

    # Left Mirror of Echoes Shrine & Right Arsenal Pedestal on Sanctuary deck
    solid.box((-7.4, 2.2, 22.0), (2.9, 4.4, 0.7), "INK", (0, 0.35, 0))
    solid.box((-7.4, 4.55, 22.0), (3.3, 0.35, 0.9), "BRASS", (0, 0.35, 0))
    glow.box((-7.25, 2.2, 22.25), (2.1, 3.4, 0.14), "MINT", (0, 0.35, 0))
    glow.crystal((-7.4, 4.8, 22.0), 0.36, 1.25, "AMETHYST_HI")
    solid.box((7.4, 0.75, 22.0), (3.0, 1.5, 1.6), "INK", (0, -0.35, 0))
    solid.box((7.4, 1.56, 22.0), (3.25, 0.2, 1.85), "BRASS", (0, -0.35, 0))

    # Lush foreground blossom trees framing the Sanctuary (01_圣所拂晓)
    solid.tree((-10.8, 0.0, 17.8), 2.5, ("LILAC", "BLOSSOM", "SAKURA"))
    solid.tree((10.8, 0.0, 18.2), 2.3, ("BLOSSOM", "LILAC", "SAKURA"))
    solid.tree((-12.2, -0.5, 26.5), 2.1, ("LEAF", "LEAF_HI"))
    solid.tree((12.4, -0.5, 26.8), 2.0, ("LEAF", "LEAF_HI"))

    # =========================================================================
    # 2. HARBOR SEA & CLIFF COVES (y = -18)
    # =========================================================================
    solid.box((0, -18.5, -62), (380, 0.8, 280), "SEA_DEEP")
    solid.box((0, -18.0, -35), (190, 0.4, 140), "SEA_MID")
    # Shimmering sun-path glints on bay water
    for i in range(18):
        z = -10 - i * 6.5
        w = 4.5 + (i % 4) * 2.2
        glow.box((math.sin(i * 1.7) * 8.5, -17.7, z), (w, 0.12, 0.55), "SEA_FOAM")

    # =========================================================================
    # 3. ACT I LEFT VISTA: DAYBREAK LINE (晴湾断轨 · 奶油薄荷 × 墨松绿)
    #    Inspired by 01_晴湾断轨_奶油薄荷.png & 04_三域同框.png
    # =========================================================================
    # Rocky coastal headland & stone seawall pier
    solid.box((-44, -12.5, -34), (48, 12.5, 44), "CLIFF")
    solid.box((-34, -9.8, -16), (26, 7.5, 22), "CREAM")
    solid.box((-34, -5.8, -16), (27, 0.7, 23), "PINE")
    for rx, rz, sc in [(-20, -12, 4.2), (-24, -6, 3.4), (-18, -22, 3.8), (-46, -10, 5.2), (-32, -4, 3.1)]:
        solid.ico((rx, -16.5, rz), (sc, sc*0.65, sc*0.85), "CLIFF_SHADE", 1, (0.2, rx, 0))
        glow.cyl((rx, -17.65, rz), sc*1.25, sc*1.15, 0.12, 8, "SEA_FOAM")

    # Iconic Multi-Span Broken Elevated Viaduct (Pine-Mint arches + snapped steel girders!)
    for i in range(5):
        px = -78 + i * 11.5
        solid.box((px, -8.5, -24), (2.4, 14, 3.6), "CREAM")
        solid.box((px, -2.2, -24), (2.8, 0.7, 4.0), "PINE")
        if i < 4:
            solid.arch((px + 5.75, -6.5, -24), 5.1, 4.2, 3.0, 0.85, 8, "PINE_MID")
    # Viaduct deck & broken jagged gap!
    solid.box((-55, -1.2, -24), (46, 1.4, 4.8), "CREAM")
    solid.box((-55, -1.1, -21.5), (46, 0.55, 0.35), "PINE")
    # Snapped exposed rails / broken span hanging over the cliff
    for s_off in (-1.2, 0, 1.2):
        solid.beam((-32, -0.9, -24 + s_off), (-26.5, -1.9, -24 + s_off * 1.1), 0.24, "PINE")
        solid.beam((-23.5, -1.8, -24 + s_off), (-19.5, -0.9, -24 + s_off), 0.24, "PINE")
    # Sleek Streamlined Cream-and-Mint Transit Train parked on the viaduct
    solid.box((-48, 0.85, -24), (22, 2.6, 3.4), "TRAIN_WHITE")
    solid.box((-48, 0.25, -22.2), (22, 0.55, 0.22), "PINE_MID")
    solid.box((-48, 1.35, -22.2), (19, 0.85, 0.18), "INK")
    solid.cyl((-36.5, 0.85, -24), 1.65, 0.55, 3.4, 8, "TRAIN_WHITE", (0, 0, -PI/2))
    # Canopy awning over the station track
    solid.box((-46, 4.6, -24), (24, 0.45, 5.2), "PINE_MID")
    for cx in (-56, -48, -40, -36):
        solid.box((cx, 2.2, -21.8), (0.35, 4.8, 0.35), "PINE")

    # Grand Half-Round Glass Dome Daybreak Station Hall (01_晴湾断轨)
    solid.box((-30, -2.5, -33), (18, 7.5, 11), "CREAM")
    solid.arch((-30, 1.2, -27.5), 8.2, 7.2, 1.4, 1.1, 14, "CREAM")
    solid.arch((-30, 1.2, -27.5), 7.2, 6.2, 0.8, 0.65, 14, "PINE_MID")
    solid.cyl((-30, 1.2, -33), 7.2, 7.2, 10.2, 14, "MINT_GLASS", (PI/2, 0, 0))
    solid.arch((-30, -5.8, -27.2), 3.2, 3.6, 1.4, 0.7, 10, "PINE")
    # Terraced sunlit Mediterranean hillside town + Emerald Ginkgo canopy + Hilltop Ring Ruin
    for i in range(11):
        hx = -76 + (i % 5) * 11 + (i // 5) * 4
        hz = -44 - (i // 5) * 14 - (i % 3) * 4
        hy = -6 + (i // 5) * 6.5
        hh = 5.5 + (i * 3 % 6)
        solid.box((hx, hy + hh*0.5, hz), (6.8, hh, 6.5), "CREAM")
        solid.box((hx, hy + hh + 0.3, hz), (7.3, 0.6, 7.0), "PINE_MID" if i % 2 == 0 else "TEAL")
        solid.tree((hx + 4.5, hy, hz + 3.5), 2.1 + (i % 2)*0.6, ("LEAF", "LEAF_HI", "LEAF_DARK"))
    # Iconic distant hilltop spire & ring monument from 01_晴湾断轨!
    solid.ico((-62, 3, -84), (26, 17, 20), "LEAF_DARK", 2)
    solid.ico((-46, -1, -76), (17, 11, 15), "LEAF", 2)
    solid.box((-66, 22, -88), (4.8, 14, 4.8), "CREAM")
    solid.box((-62, 19, -86), (3.8, 9, 3.8), "CREAM_DARK")
    solid.arch((-52, 14, -86), 11, 11, 1.6, 1.4, 14, "CREAM")

    # =========================================================================
    # 4. ACT II RIGHT VISTA: TIDAL DOCK (鸣潮船坞 · 珊瑚砖红 × 熔金龙门吊 × 深钴蓝货轮)
    #    Inspired by 02_鸣潮船坞_珊瑚钴蓝.png & 04_三域同框.png
    # =========================================================================
    # L-Shaped Deep Drydock & Pier Apron
    solid.box((46, -13.2, -32), (54, 10.5, 48), "DOCK_DECK")
    solid.box((46, -7.8, -8.2), (54, 0.85, 1.4), "BRICK")
    solid.box((19.5, -13.2, -28), (4.5, 11, 44), "CREAM_DARK")
    # Drydock recessed basin + red keel supports
    solid.box((42, -10.5, -24), (16, 4.5, 30), "IRON")
    for kz in (-32, -26, -20, -14):
        solid.box((42, -12.4, kz), (6.5, 2.2, 0.9), "BRICK")
    # Detailed Cobalt-and-Cream Freighter Ship resting inside the drydock!
    solid.box((42, -7.8, -24), (9.2, 6.2, 27), "COBALT")
    solid.box((42, -11.2, -24), (8.6, 1.8, 26), "BRICK")
    solid.box((42, -4.4, -24), (9.5, 0.9, 27.4), "CREAM")
    # Tapered ship prow facing viewer
    solid.cyl((42, -7.8, -9.2), 4.6, 0.4, 6.5, 6, "COBALT", (PI/2, 0, 0))
    # Stepped cream bridge superstructure & funnel
    solid.box((42, -1.6, -30), (7.6, 5.2, 9.5), "CREAM")
    solid.box((42, 1.8, -31), (6.0, 2.8, 6.2), "CREAM_DARK")
    solid.box((42, 2.2, -27.8), (5.2, 1.1, 0.3), "NAVY")
    solid.cyl((42, 4.6, -32), 1.1, 0.85, 3.6, 8, "BRICK")
    solid.cyl((42, 6.5, -32), 0.22, 0.14, 4.5, 6, "IRON")

    # COLOSSAL MOLTEN-GOLD GANTRY CRANE straddling the drydock! (Centerpiece of 02_鸣潮船坞)
    for sx in (31, 53):
        solid.beam((sx, -8, -19), (sx + (2.5 if sx < 42 else -2.5), 11.5, -22), 1.45, "CRANE_GOLD")
        solid.beam((sx, -8, -27), (sx + (2.5 if sx < 42 else -2.5), 11.5, -24), 1.45, "CRANE_GOLD")
        solid.box((sx, -7.4, -23), (2.4, 1.6, 10.5), "CRANE_DARK")
        solid.beam((sx + (1.2 if sx < 42 else -1.2), 2.0, -20.5), (sx + (1.2 if sx < 42 else -1.2), 2.0, -25.5), 0.8, "CRANE_DARK")
    # Main golden overhead girder + operator cabin + hanging hook
    solid.box((42, 12.2, -23), (30, 2.8, 3.6), "CRANE_GOLD")
    solid.box((42, 13.8, -23), (26, 0.7, 2.2), "CRANE_DARK")
    solid.box((51, 8.2, -20.5), (3.4, 3.2, 3.2), "CRANE_GOLD")
    solid.box((51, 8.4, -18.8), (2.6, 1.4, 0.25), "MINT_GLASS")
    solid.beam((42, 11.0, -23), (42, 2.8, -23), 0.26, "IRON")
    solid.box((42, 2.2, -23), (1.8, 1.8, 1.4), "CRANE_GOLD")

    # Brick-Red Gabled Shipyard Hangar behind the dock + Cobalt Cargo Doors
    solid.box((59, -3.5, -38), (22, 9.2, 26), "BRICK")
    solid.box((59, -4.5, -38), (22.6, 4.0, 26.4), "CREAM")
    solid.box((59, 2.8, -38), (24, 3.2, 27), "BRICK_LIGHT", (0, 0, 0.14))
    solid.box((47.8, -4.5, -36), (0.6, 7.2, 8.5), "COBALT")
    # Distant Coral-Red Port Cranes & Outer Freighter along the curved quay
    for gx, gz in [(66, -54), (74, -68)]:
        solid.box((gx, -1, gz), (1.5, 16, 1.5), "CRANE_RED")
        solid.box((gx - 4, 7.2, gz), (14, 1.3, 1.6), "CRANE_RED")
        solid.beam((gx - 8, 6.8, gz), (gx - 8, -1, gz), 0.2, "IRON")
    # Stacked Shipping Containers + Sakura trees softening the dock cliff
    for cx, cz, ccol in [(26, -15, "COBALT"), (26, -11, "BRICK"), (31, -13, "CONT_TEAL"), (25, -24, "BRICK_LIGHT"), (58, -14, "COBALT"), (63, -18, "BRICK")]:
        solid.box((cx, -6.4, cz), (4.2, 2.6, 7.2), ccol)
    solid.tree((28, -7.8, -30), 2.7, ("SAKURA", "BLOSSOM"))
    solid.tree((54, -7.5, -18), 2.2, ("SAKURA", "BLOSSOM"))
    # Breakwater rocks along right quay edge
    for bz in range(-44, -8, 6):
        solid.ico((20, -16.8, bz), (2.4, 1.8, 2.4), "CLIFF_SHADE", 1, (0.3, bz, 0))
        glow.cyl((19.2, -17.65, bz), 3.0, 2.8, 0.1, 6, "SEA_FOAM")

    # =========================================================================
    # 5. ACT III FAR CENTER PEAK: PRISM GLASSHOUSE (紫晶温室 · 珠白雾灰 × 璀璨紫晶)
    #    Inspired by 03_紫晶温室_珠白雾灰.png & 04_三域同框.png
    #    Set further across the sparkling bay (z = -148) so all 3 acts read clearly!
    # =========================================================================
    AZ = -148.0
    # Sculpted terraced cloud-island mountain with twin waterfalls!
    solid.cyl((0, -10.5, AZ), 40, 31, 18, 14, "CLIFF")
    solid.cyl((0, 1.5, AZ), 32, 27, 8, 16, "PEARL_SHADE")
    solid.cyl((0, 6.8, AZ), 28, 26, 3.2, 16, "PEARL")
    # Twin shimmering waterfalls plunging down the front cliff face into the turquoise bay
    for wx in (-9.2, 9.2):
        glow.box((wx, -5.5, AZ + 33.8), (3.4, 24.5, 1.5), "WATERFALL", (-0.34, 0, 0))
        glow.ico((wx, -17.3, AZ + 39.2), (6.2, 2.3, 4.2), "CLOUD", 1)
    # Grand Pearl-White Grand Staircase & Flower Arch approaching the Glasshouse
    for step in range(7):
        solid.box((0, -2.5 + step * 1.65, AZ + 36.5 - step * 2.4), (9.5, 1.7, 3.2), "PEARL")
    solid.arch((0, 8.2, AZ + 19), 5.2, 4.8, 1.5, 0.85, 10, "PEARL")
    solid.arch((0, 8.6, AZ + 19), 5.6, 5.2, 1.8, 0.65, 10, "SAKURA")

    # COLOSSAL PEARL-AND-GLASS CATHEDRAL DOME (Ribbed Gothic-Botanical Conservatory!)
    dome_ret = bmesh.ops.create_uvsphere(solid.bm, u_segments=20, v_segments=10, radius=19.5,
        matrix=Matrix.Translation((0, -AZ, 8.2)) @ Matrix.Diagonal((1.28, 1.0, 0.82, 1)))
    lower_verts = [v for v in dome_ret["verts"] if v.co.z < 8.0]
    if lower_verts:
        bmesh.ops.delete(solid.bm, geom=lower_verts, context='VERTS')
    dome_verts = set(v for v in dome_ret["verts"] if v.is_valid)
    dome_faces = [f for f in solid.bm.faces if all(v in dome_verts for v in f.verts)]
    solid.paint_faces(dome_faces, "GLASS_ICE")
    # Ornate Pearl-White Structural Ribs curving over the dome!
    for r_i in range(10):
        ang = r_i * PI / 10
        solid.arch((0, 8.2, AZ), 25.4, 16.4, 0.85, 1.05, 14, "PEARL", rot_y=ang)
    # Iconic front cathedral glass arch facade
    solid.arch((0, 8.4, AZ + 18.2), 11.8, 12.0, 1.6, 1.4, 14, "PEARL")
    solid.arch((0, 8.4, AZ + 18.2), 10.3, 10.5, 0.95, 0.8, 14, "SILVER")

    # Flanking Arched Colonnade Wings & Side Pavilions
    for s in (-1, 1):
        solid.box((s * 34, 8.8, AZ), (22, 6.8, 8.0), "PEARL")
        solid.box((s * 34, 12.6, AZ), (23, 1.0, 8.6), "SILVER")
        for a_i in range(4):
            solid.arch((s * (25 + a_i * 5.8), 7.8, AZ + 4.4), 2.3, 3.6, 0.9, 0.58, 8, "GLASS_ICE")
        # Side mini-domes
        solid.ico((s * 44, 14.0, AZ), (5.6, 4.6, 5.6), "GLASS_ICE", 2)
        solid.cyl((s * 44, 10.4, AZ), 5.5, 5.5, 6.8, 12, "PEARL")

    # RADIANT AMETHYST CRYSTAL CLUSTERS & CROWN SPIRE (High-saturation jewel focal points!)
    clusters = [
        (-13.5, 8.6, AZ + 18, 2.5, 10.5, (0.15, 0.2, 0.3)),
        (-17.5, 8.2, AZ + 15, 2.0, 8.0, (-0.1, 0.5, 0.45)),
        (13.5, 8.6, AZ + 18, 2.8, 11.8, (0.12, -0.2, -0.28)),
        (18.0, 8.2, AZ + 14, 2.2, 8.8, (0.18, -0.4, -0.45)),
        (-30, 12.2, AZ + 3, 2.4, 9.8, (0.1, 0.1, 0.25)),
        (31, 12.2, AZ + 3, 2.6, 10.5, (0.1, -0.1, -0.25)),
    ]
    for cx, cy, cz, cr, ch, tilt in clusters:
        glow.crystal((cx, cy, cz), cr, ch, "AMETHYST", tilt)
        glow.crystal((cx + cr*0.7, cy, cz + cr*0.5), cr*0.62, ch*0.68, "AMETHYST_HI", (tilt[0]+0.2, tilt[1], tilt[2]-0.25))
    # Central Crown Crystal Spire atop the Dome
    glow.crystal((0, 23.8, AZ), 2.2, 11.5, "AMETHYST_HI")
    solid.cyl((0, 24.0, AZ), 4.0, 3.2, 1.6, 12, "PEARL")

    # =========================================================================
    # 6. CLOUD SEA RING & DISTANT ATMOSPHERIC MOUNTAIN HORIZON
    # =========================================================================
    # Soft cloud banks wrapping the base of the Prism Glasshouse island
    for i in range(20):
        ang = -PI * 0.85 + i * (PI * 1.7 / 19)
        rad = 36 + (i % 3) * 7
        cx = math.sin(ang) * rad
        cz = AZ + 4 + math.cos(ang) * (rad * 0.52)
        cy = -1.5 + (i % 3) * 2.2
        solid.ico((cx, cy, cz), (8.5 + (i%3)*2.2, 3.0, 5.5), "CLOUD", 1, (0, i*0.5, 0))
    # High sunlit sky clouds
    for i in range(16):
        cx = -145 + i * 20
        cy = 48 + (i % 4) * 9
        cz = -168 - (i % 3) * 22
        for k in range(3):
            solid.ico((cx + k * 6.5, cy + (2.4 if k == 1 else 0), cz + k * 2.0), (9.5 + k*1.5, 3.6, 5.2), "CLOUD", 1)
    # Layered broad coastal mountain ridges (soft anime horizon, not pointy pyramids)
    for i in range(14):
        mx = -195 + i * 30
        mz = -196 - (i % 3) * 20
        mh = 24 + ((i * 17) % 24)
        mw = 32 + (i % 3) * 11
        solid.ico((mx, -14 + mh * 0.35, mz), (mw, mh, mw * 0.65), "MT_FAR" if i % 2 == 0 else "MT_MID", 1, (0, i * 0.4, 0))

    obj_solid = solid.finish()
    obj_glow = glow.finish()

    # Save .blend and export compact .glb
    OUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)
    bpy.ops.object.select_all(action='DESELECT')
    obj_solid.select_set(True)
    obj_glow.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )
    print(f"BUILT SANCTUARY PANORAMA: solid={len(obj_solid.data.vertices)}v, glow={len(obj_glow.data.vertices)}v -> {OUT_GLB} ({OUT_GLB.stat().st_size/1024:.1f} KB)", flush=True)

if __name__ == "__main__":
    build_panorama()
