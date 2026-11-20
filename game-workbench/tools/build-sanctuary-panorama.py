"""Build the high-detail architectural 3D Sanctuary Overlook + Three-Act Grand Panorama diorama in Blender 5.3.
Features:
- Baked stylized sun/shadow tonal vertex shading on every face
- Ornate Sanctuary Overlook Terrace (gothic balustrades, carved Mirror of Echoes, Arsenal table, layered blossom trees)
- Act 1 Left (Daybreak Line): Stratified coastal cliffs, open-truss viaduct + sheared rebar break, 3-car windowed train,
  ribbed vaulted station + clocktower, 18 Mediterranean villas with pitched roofs & windows, hilltop ring monument
- Act 2 Right (Tidal Dock): Stepped drydock, detailed freighter ship (bridge windows, hatches, radar, funnels, lifeboats),
  open-lattice molten-gold gantry crane with X-bracing & hoisted container, sawtooth brick shipyard hangar & slewing cranes
- Act 3 Far Center (Prism Glasshouse): Craggy multi-buttress cliff island (zero flowerpot cone!), twin split waterfalls,
  10-flight marble staircase, 12-rib cathedral glasshouse dome with lantern cupola & rose portico, colonnade wings & crystal clusters
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

SUN_DIR = Vector((0.55, -0.35, 0.75)).normalized()  # Blender Z-up sun vector


def lin(hex_str):
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    conv = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (conv(r), conv(g), conv(b))


PAL = {
    # Sanctuary foreground
    "CREAM": "F0E5D2", "CREAM_DARK": "D4C2A8", "STONE": "C4B5A0", "STONE_DARK": "988A7C",
    "CORAL": "E47157", "CORAL_DARK": "B54C3B", "BRASS": "E8BE66", "GOLD": "F7C848",
    "TEAL": "2E7870", "MINT": "7EE4CE", "INK": "233743", "WIN_DARK": "1D3442", "WIN_WARM": "FFE4A8",
    "LILAC": "C596E8", "BLOSSOM": "EEB8F7", "SAKURA": "F8B0CE", "BLOSSOM_HI": "FFF0FA", "BARK": "6A4D53",
    # Act 1: Daybreak Line (Cream + Pine-Mint + Emerald Ginkgo)
    "PINE": "1D5248", "PINE_MID": "2E7869", "MINT_GLASS": "5DBAB0", "ROOF_TEAL": "3D8E84",
    "LEAF": "74B84A", "LEAF_HI": "B4DC58", "LEAF_DARK": "397544",
    "TRAIN_WHITE": "F8F1E4", "CLIFF": "B3A294", "CLIFF_MID": "8F837C", "CLIFF_SHADE": "6A6E7E",
    # Act 2: Tidal Dock (Coral-Brick + Molten Gold + Cobalt)
    "BRICK": "CC5D49", "BRICK_DARK": "9D4235", "BRICK_LIGHT": "E38B70", "DOCK_DECK": "DFCBB9", "DOCK_DARK": "BFA898",
    "CRANE_GOLD": "F3BA3B", "CRANE_DARK": "C58622", "CRANE_RED": "DF6950",
    "COBALT": "285C99", "COBALT_HI": "3D78BA", "NAVY": "1A365C", "CONT_TEAL": "3F9E9A", "IRON": "3A4C5B",
    # Act 3: Prism Glasshouse (Pearl White + Misty Silver + Ice Glass + Vivid Amethyst)
    "PEARL": "F4F1F9", "PEARL_SHADE": "D5D5E6", "SILVER": "B1BFD1",
    "GLASS_ICE": "99D8F2", "GLASS_DEEP": "6FB6DE", "GLASS_VIOLET": "C9A8F5",
    "AMETHYST": "9E52F0", "AMETHYST_HI": "DE9EFF", "AMETHYST_DEEP": "5B2B96",
    "WATERFALL": "D8F8FF", "WATERFALL_MID": "9EEAFF", "CLOUD": "FCF9FF", "CLOUD_SHADE": "E1E9F5",
    # Sea & Mountains
    "SEA_DEEP": "2279A2", "SEA_MID": "329FC2", "SEA_SHALLOW": "4AC0CF", "SEA_FOAM": "ECFDFF",
    "MT_FAR": "8AAAD0", "MT_MID": "688FB5", "MT_NEAR": "527A9E", "FIRE": "FFAD4A", "FIRE_HI": "FFF099",
}


class Builder:
    def __init__(self, name, emissive=False):
        self.name = name
        self.emissive = emissive
        self.bm = bmesh.new()
        self.color_layer = self.bm.loops.layers.color.new("Pigment")

    def paint_faces(self, faces, hex_key):
        r, g, b = lin(PAL[hex_key])
        for f in faces:
            if self.emissive:
                col = (r, g, b, 1.0)
            else:
                n = f.normal
                # Stylized directional sun lift + cool shadow underside baked directly into vertex color!
                sun_dot = n.dot(SUN_DIR)
                if sun_dot >= 0:
                    warm = 1.0 + sun_dot * 0.14
                    col = (min(1.0, r * warm * 1.02), min(1.0, g * warm), min(1.0, b * warm * 0.97), 1.0)
                else:
                    cool = 1.0 + sun_dot * 0.22
                    col = (max(0.0, r * cool * 0.94), max(0.0, g * cool * 0.97), min(1.0, b * (cool + 0.04)), 1.0)
            for loop in f.loops:
                loop[self.color_layer] = col

    def _from_verts(self, verts, color):
        vset = set(v for v in verts if v.is_valid)
        faces = [f for f in self.bm.faces if all(v in vset for v in f.verts)]
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        self.paint_faces(faces, color)
        return faces

    def box(self, pos, size, color, rot=(0, 0, 0)):
        bx, by, bz = pos[0], -pos[2], pos[1]
        sx, sy, sz = size[0], size[2], size[1]
        mat = Matrix.Translation((bx, by, bz)) @ Euler((rot[0], -rot[2], rot[1]), 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((sx, sy, sz, 1))
        ret = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        return self._from_verts(ret["verts"], color)

    def cyl(self, pos, r1, r2, h, segs, color, rot=(0, 0, 0)):
        bx, by, bz = pos[0], -pos[2], pos[1]
        mat = Matrix.Translation((bx, by, bz)) @ Euler((rot[0], -rot[2], rot[1]), 'XYZ').to_matrix().to_4x4()
        ret = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h, matrix=mat)
        return self._from_verts(ret["verts"], color)

    def ico(self, pos, scale, color, subdiv=2, rot=(0, 0, 0)):
        bx, by, bz = pos[0], -pos[2], pos[1]
        sx, sy, sz = scale[0], scale[2], scale[1]
        mat = Matrix.Translation((bx, by, bz)) @ Euler((rot[0], -rot[2], rot[1]), 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((sx, sy, sz, 1))
        ret = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=1.0, matrix=mat)
        return self._from_verts(ret["verts"], color)

    def beam(self, p1, p2, thick, color):
        a = Vector((p1[0], -p1[2], p1[1]))
        b = Vector((p2[0], -p2[2], p2[1]))
        d = b - a
        L = d.length
        if L < 1e-4:
            return []
        mid = (a + b) * 0.5
        q = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        mat = Matrix.Translation(mid) @ q @ Matrix.Diagonal((thick, thick, L, 1))
        ret = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        return self._from_verts(ret["verts"], color)

    def arch(self, center, rx, ry, depth, thick, segs, color, rot_y=0):
        cx, cy, cz = center
        pts = []
        for i in range(segs + 1):
            a = PI * i / segs
            lx = math.cos(a) * rx
            ly = math.sin(a) * ry
            wx = cx + lx * math.cos(rot_y)
            wz = cz + lx * math.sin(rot_y)
            pts.append((wx, cy + ly, wz))
        for i in range(segs):
            p1, p2 = pts[i], pts[i + 1]
            a = Vector((p1[0], -p1[2], p1[1]))
            b = Vector((p2[0], -p2[2], p2[1]))
            d = b - a
            mid = (a + b) * 0.5
            q = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
            mat = Matrix.Translation(mid) @ q @ Matrix.Diagonal((depth, thick, d.length * 1.12, 1))
            ret = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
            self._from_verts(ret["verts"], color)

    def crystal(self, base_pos, radius, height, color, tilt=(0, 0, 0)):
        bx, by, bz = base_pos[0], -base_pos[2], base_pos[1]
        rot_m = Euler((tilt[0], -tilt[2], tilt[1]), 'XYZ').to_matrix().to_4x4()
        m1 = Matrix.Translation((bx, by, bz)) @ rot_m @ Matrix.Translation((0, 0, height * 0.35))
        r1 = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=6, radius1=radius * 0.72, radius2=radius, depth=height * 0.7, matrix=m1)
        m2 = Matrix.Translation((bx, by, bz)) @ rot_m @ Matrix.Translation((0, 0, height * 0.85))
        r2 = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=6, radius1=radius, radius2=0.02, depth=height * 0.32, matrix=m2)
        self._from_verts(r1["verts"] + r2["verts"], color)

    def tree(self, pos, scale, leaf_colors, trunk_color="BARK", lush=True):
        """Multi-branch organic anime tree with soft subdiv=2 blossom/foliage clusters!"""
        x, y, z = pos
        s = scale
        # Tapered curved trunk + root flare
        self.cyl((x, y + s * 0.45, z), s * 0.32, s * 0.20, s * 0.9, 8, trunk_color)
        self.cyl((x + s * 0.08, y + s * 1.35, z - s * 0.05), s * 0.20, s * 0.12, s * 1.1, 7, trunk_color, (0.08, 0, -0.10))
        # Branches
        self.beam((x, y + s * 1.25, z), (x + s * 0.95, y + s * 2.1, z + s * 0.35), s * 0.18, trunk_color)
        self.beam((x, y + s * 1.35, z), (x - s * 0.85, y + s * 2.25, z - s * 0.3), s * 0.16, trunk_color)
        self.beam((x, y + s * 1.55, z), (x + s * 0.15, y + s * 2.55, z - s * 0.4), s * 0.15, trunk_color)
        # Layered organic foliage puffs (subdiv=2 for lush rounded anime canopy!)
        puffs = [
            (0.0, 2.75, 0.0, 1.35, 0.78, 1.25, 0),
            (0.95, 2.30, 0.35, 1.05, 0.65, 0.95, 1),
            (-0.92, 2.40, -0.25, 1.08, 0.68, 1.02, 0),
            (0.25, 2.95, -0.45, 0.95, 0.58, 0.90, 2),
            (-0.35, 2.20, 0.65, 0.88, 0.55, 0.85, 1),
            (0.55, 2.65, 0.55, 0.80, 0.52, 0.78, 2),
        ]
        if lush:
            puffs += [
                (-0.75, 2.80, 0.35, 0.78, 0.52, 0.78, 1),
                (1.15, 1.95, -0.25, 0.76, 0.48, 0.75, 0),
            ]
        for dx, dy, dz, rx, ry, rz, ci in puffs:
            col = leaf_colors[ci % len(leaf_colors)]
            self.ico((x + dx * s, y + dy * s, z + dz * s), (rx * s, ry * s, rz * s), col, subdiv=2)

    def house(self, pos, w, h, d, wall_col, roof_col, win_col="WIN_DARK", rot_y=0):
        """Detailed Mediterranean villa with pitched gable roof, eaves overhang & windows!"""
        x, y, z = pos
        self.box((x, y + h * 0.5, z), (w, h, d), wall_col, (0, rot_y, 0))
        # Stone plinth & roof cornice
        self.box((x, y + 0.35, z), (w + 0.35, 0.7, d + 0.35), "CREAM_DARK", (0, rot_y, 0))
        self.box((x, y + h + 0.25, z), (w + 0.6, 0.42, d + 0.6), roof_col, (0, rot_y, 0))
        # Pitched hip/gable cap
        self.cyl((x, y + h + 1.15, z), max(w, d) * 0.68, 0.3, 1.6, 4, roof_col, (0, rot_y + PI / 4, 0))
        # Front windows (facing +Z roughly)
        cos_y, sin_y = math.cos(rot_y), math.sin(rot_y)
        rows = max(1, int(h // 2.8))
        for ry in range(rows):
            wy = y + 1.8 + ry * 2.5
            if wy > y + h - 0.8:
                break
            for wx_off in (-w * 0.25, w * 0.25):
                wz_off = d * 0.5 + 0.08
                wx = x + wx_off * cos_y + wz_off * sin_y
                wz = z - wx_off * sin_y + wz_off * cos_y
                self.box((wx, wy, wz), (w * 0.22, 1.1, 0.16), win_col, (0, rot_y, 0))

    def cloud_bank(self, pos, w, h, d, color="CLOUD"):
        """Soft multi-puff volumetric anime cloud cluster (never spiky!)."""
        x, y, z = pos
        self.ico((x, y, z), (w * 0.55, h * 0.55, d * 0.55), color, subdiv=2)
        self.ico((x - w * 0.38, y - h * 0.12, z + d * 0.1), (w * 0.42, h * 0.42, d * 0.45), color, subdiv=2)
        self.ico((x + w * 0.38, y - h * 0.10, z - d * 0.08), (w * 0.44, h * 0.44, d * 0.45), color, subdiv=2)
        self.ico((x + w * 0.10, y + h * 0.22, z), (w * 0.35, h * 0.38, d * 0.38), color, subdiv=2)

    def finish(self):
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
        if self.emissive:
            nt.links.new(vcol.outputs["Color"], bsdf.inputs["Base Color"])
            nt.links.new(vcol.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = 1.4
        else:
            nt.links.new(vcol.outputs["Color"], bsdf.inputs["Base Color"])
            bsdf.inputs["Roughness"].default_value = 0.78
        mesh_data.materials.append(mat)
        obj = bpy.data.objects.new(self.name, mesh_data)
        bpy.context.collection.objects.link(obj)
        return obj


def build_panorama():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    solid = Builder("Panorama_Solid", emissive=False)
    glow = Builder("Panorama_Glow", emissive=True)

    # =========================================================================
    # 1. FOREGROUND: ORNATE HADES-STYLE SANCTUARY OVERLOOK (z = 13..34, y = 0)
    # =========================================================================
    solid.box((0, -0.65, 25.5), (25, 1.3, 18), "CREAM")
    solid.cyl((0, -0.65, 21.5), 13.6, 13.9, 1.3, 28, "CREAM")
    solid.cyl((0, -1.55, 21.5), 14.3, 14.5, 0.55, 28, "TEAL")
    solid.cyl((0, -2.1, 21.5), 14.6, 14.1, 0.45, 28, "CREAM_DARK")
    # Craggy supporting cliff beneath the Sanctuary Overlook
    for cx, cy, cz, rx, ry, rz in [
        (0, -10.5, 23.0, 14.5, 9.5, 13.5),
        (-9, -11.5, 19.0, 7.5, 8.5, 7.5),
        (9, -11.5, 19.0, 7.5, 8.5, 7.5),
        (0, -13.0, 13.5, 9.0, 7.2, 6.5),
    ]:
        solid.ico((cx, cy, cz), (rx, ry, rz), "CLIFF" if cx == 0 else "CLIFF_MID", subdiv=2)

    # Ornate Stepped Brass & Teal Eight-Point Compass Rose + Radial Paving Grooves
    solid.cyl((0, 0.022, 23.2), 7.6, 7.6, 0.04, 32, "CREAM_DARK")
    solid.cyl((0, 0.032, 23.2), 7.2, 7.2, 0.04, 32, "CREAM")
    solid.cyl((0, 0.042, 23.2), 5.0, 5.0, 0.05, 32, "BRASS")
    solid.cyl((0, 0.056, 23.2), 4.5, 4.5, 0.05, 32, "TEAL")
    solid.cyl((0, 0.072, 23.2), 3.4, 3.4, 0.05, 32, "CREAM")
    solid.cyl((0, 0.088, 23.2), 1.4, 1.4, 0.05, 24, "BRASS")
    for k in range(8):
        ang = k * PI / 4
        length = 4.3 if k % 2 == 0 else 2.9
        w = 0.46 if k % 2 == 0 else 0.26
        solid.box((math.sin(ang) * length * 0.48, 0.10, 23.2 + math.cos(ang) * length * 0.48), (w, 0.05, length), "BRASS" if k % 2 == 0 else "TEAL", (0, ang, 0))
        # Subtle outer radial tile grooves
        solid.box((math.sin(ang) * 6.2, 0.045, 23.2 + math.cos(ang) * 6.2), (0.09, 0.02, 2.2), "CREAM_DARK", (0, ang, 0))
    glow.cyl((0, 0.125, 23.2), 0.72, 0.48, 0.08, 12, "GOLD")

    # Gothic-Arched Cliff-Edge Stone Balustrade with glowing crystal finials
    for i in range(-5, 6):
        ang = i * 0.22
        rx, rz = math.sin(ang) * 12.8, 21.5 - math.cos(ang) * 12.8
        if abs(i) >= 2:
            solid.box((rx, 0.18, rz), (1.18, 0.36, 1.18), "CREAM_DARK", (0, -ang, 0))
            solid.box((rx, 0.75, rz), (0.92, 1.12, 0.92), "CREAM", (0, -ang, 0))
            solid.box((rx, 1.42, rz), (1.15, 0.20, 1.15), "CREAM_DARK", (0, -ang, 0))
            glow.crystal((rx, 1.54, rz), 0.16, 0.42, "MINT")
        if i < 5 and not (i in (-2, -1, 0, 1)):
            ang2 = (i + 1) * 0.22
            p1 = (rx, 0.85, rz)
            p2 = (math.sin(ang2) * 12.8, 0.85, 21.5 - math.cos(ang2) * 12.8)
            solid.beam((p1[0], 0.24, p1[2]), (p2[0], 0.24, p2[2]), 0.36, "CREAM_DARK")
            solid.beam((p1[0], 1.18, p1[2]), (p2[0], 1.18, p2[2]), 0.30, "TEAL")
            solid.beam((p1[0], 0.56, p1[2]), (p2[0], 0.56, p2[2]), 0.18, "CORAL")
            # Vertical gothic balusters between posts
            for t in (0.25, 0.5, 0.75):
                bx = p1[0] + (p2[0] - p1[0]) * t
                bz = p1[2] + (p2[2] - p1[2]) * t
                solid.cyl((bx, 0.72, bz), 0.11, 0.14, 0.88, 6, "CREAM")

    # Ornate Grand Expedition Departure Archway (z = 13.8) + Sculpted Tripod Braziers
    for s in (-1, 1):
        # Stepped plinth + fluted column + capital
        solid.box((s * 5.8, 0.45, 13.8), (1.85, 0.9, 1.95), "CREAM_DARK")
        solid.box((s * 5.8, 3.1, 13.8), (1.35, 5.4, 1.45), "CREAM")
        solid.box((s * 5.8, 3.1, 14.55), (0.65, 4.8, 0.14), "TEAL")
        solid.box((s * 5.8, 5.05, 13.8), (1.68, 0.36, 1.78), "CORAL")
        solid.box((s * 5.8, 5.45, 13.8), (1.82, 0.25, 1.92), "BRASS")
        # Sculpted Bronze Tripod Brazier with multi-tongue glowing fire
        solid.cyl((s * 4.1, 0.25, 14.6), 0.88, 0.78, 0.5, 8, "CREAM_DARK")
        solid.cyl((s * 4.1, 0.95, 14.6), 0.55, 0.74, 1.1, 8, "STONE")
        solid.cyl((s * 4.1, 1.65, 14.6), 0.88, 0.58, 0.42, 10, "INK")
        solid.cyl((s * 4.1, 1.88, 14.6), 0.94, 0.90, 0.12, 10, "BRASS")
        glow.crystal((s * 4.1, 1.92, 14.6), 0.36, 0.95, "FIRE")
        glow.crystal((s * 4.1 + 0.16, 1.92, 14.65), 0.22, 0.65, "FIRE_HI", (0.12, 0, -0.18))
        glow.crystal((s * 4.1 - 0.15, 1.92, 14.55), 0.20, 0.60, "FIRE_HI", (-0.1, 0, 0.18))
    solid.arch((0, 5.3, 13.8), 6.2, 3.7, 1.45, 0.95, 18, "CORAL")
    solid.arch((0, 5.3, 13.8), 5.35, 3.05, 0.78, 0.55, 18, "MINT_GLASS")
    solid.arch((0, 5.3, 13.8), 6.75, 4.15, 0.55, 0.32, 18, "BRASS")
    solid.cyl((0, 9.15, 13.8), 1.15, 1.15, 0.50, 16, "CREAM", (PI / 2, 0, 0))
    solid.cyl((0, 9.15, 13.95), 0.82, 0.82, 0.35, 16, "CORAL", (PI / 2, 0, 0))
    glow.cyl((0, 9.15, 14.08), 0.42, 0.42, 0.22, 12, "GOLD", (PI / 2, 0, 0))

    # Ornate Mirror of Echoes Shrine (-7.4, 22.0) — stepped gothic frame + fluted columns!
    m_rot = (0, 0.35, 0)
    solid.box((-7.4, 0.25, 22.0), (3.8, 0.5, 1.5), "CREAM_DARK", m_rot)
    solid.box((-7.4, 2.35, 22.0), (3.1, 4.2, 0.72), "INK", m_rot)
    solid.box((-7.4, 4.60, 22.0), (3.5, 0.38, 0.96), "BRASS", m_rot)
    solid.box((-7.4, 4.98, 22.0), (2.7, 0.42, 0.82), "TEAL", m_rot)
    for ox in (-1.38, 1.38):
        px = -7.4 + ox * math.cos(0.35)
        pz = 22.0 - ox * math.sin(0.35)
        solid.cyl((px, 2.35, pz), 0.26, 0.24, 4.2, 8, "CREAM")
        solid.cyl((px, 4.55, pz), 0.34, 0.32, 0.24, 8, "BRASS")
    glow.box((-7.26, 2.35, 22.24), (2.15, 3.45, 0.14), "MINT", m_rot)
    glow.box((-7.22, 2.35, 22.29), (1.75, 2.95, 0.10), "WATERFALL", m_rot)

    # Ornate Arsenal Pedestal (+7.4, 22.0) — stepped carved stone & brass table!
    a_rot = (0, -0.35, 0)
    solid.box((7.4, 0.22, 22.0), (3.6, 0.44, 2.1), "CREAM_DARK", a_rot)
    solid.box((7.4, 0.88, 22.0), (3.0, 1.05, 1.65), "INK", a_rot)
    solid.box((7.4, 0.88, 22.0), (3.12, 0.24, 1.75), "TEAL", a_rot)
    solid.box((7.4, 1.52, 22.0), (3.35, 0.22, 1.92), "BRASS", a_rot)
    solid.box((7.4, 1.66, 22.0), (2.85, 0.10, 1.52), "CREAM", a_rot)

    # Lush Multi-Cluster Blossom Trees framing the Sanctuary!
    solid.tree((-11.2, -0.2, 18.0), 2.35, ("LILAC", "BLOSSOM", "BLOSSOM_HI"))
    solid.tree((11.2, -0.2, 18.4), 2.25, ("BLOSSOM", "SAKURA", "BLOSSOM_HI"))
    solid.tree((-12.4, -0.4, 27.2), 2.05, ("LEAF", "LEAF_HI", "LEAF_DARK"))
    solid.tree((12.6, -0.4, 27.4), 1.95, ("LEAF", "LEAF_HI", "LEAF_DARK"))

    # =========================================================================
    # 2. SPARKLING MULTI-TONE HARBOR SEA & SUN-PATH GLINTS (y = -18)
    # =========================================================================
    solid.box((0, -18.6, -75), (440, 0.8, 340), "SEA_DEEP")
    solid.box((0, -18.1, -48), (220, 0.4, 185), "SEA_MID")
    solid.box((0, -17.88, -28), (110, 0.25, 95), "SEA_SHALLOW")
    for i in range(24):
        z = -8 - i * 5.6
        w = 3.6 + (i % 4) * 2.1
        glow.box((math.sin(i * 1.6) * 11.0, -17.68, z), (w, 0.10, 0.42), "SEA_FOAM")

    # =========================================================================
    # 3. ACT I LEFT VISTA: DAYBREAK LINE (晴湾断轨 · 奶油薄荷 × 墨松绿)
    # =========================================================================
    # Stratified rocky headland & terraced seawall (organic craggy cliff cluster!)
    for cx, cy, cz, rx, ry, rz, col in [
        (-48, -12.5, -38, 32, 9.5, 28, "CLIFF"),
        (-34, -13.0, -20, 18, 8.2, 16, "CLIFF_MID"),
        (-62, -10.5, -56, 26, 12.5, 22, "CLIFF"),
        (-42, -6.5, -48, 22, 4.5, 18, "LEAF_DARK"),
        (-58, -3.5, -62, 24, 6.5, 20, "LEAF"),
    ]:
        solid.ico((cx, cy, cz), (rx, ry, rz), col, subdiv=2)
    # Crisp stone seawall pier & parapet
    solid.box((-35, -9.8, -17), (26, 7.6, 22), "CREAM")
    solid.box((-35, -5.8, -17), (27.2, 0.65, 23.2), "PINE")
    for bx in (-44, -38, -32, -26):
        solid.box((bx, -5.2, -6.0), (0.65, 0.9, 0.65), "CREAM_DARK")
    # Coastal sea stacks & foam
    for rx, rz, sc in [(-20, -12, 3.8), (-24, -5, 3.0), (-17, -23, 3.5), (-48, -9, 4.6), (-29, -4, 2.8)]:
        solid.ico((rx, -16.5, rz), (sc, sc * 0.7, sc * 0.85), "CLIFF_SHADE", subdiv=2, rot=(0.2, rx, 0))
        glow.cyl((rx, -17.62, rz), sc * 1.28, sc * 1.15, 0.10, 10, "SEA_FOAM")

    # OPEN-TRUSS ARCHED ELEVATED VIADUCT + CATENARY POLES + SHEARED BREAK!
    for i in range(6):
        px = -86 + i * 11.2
        solid.box((px, -8.5, -24), (2.2, 14, 3.4), "CREAM")
        solid.box((px, -2.1, -24), (2.8, 0.75, 4.1), "PINE")
        if i < 5:
            solid.arch((px + 5.6, -6.8, -24), 5.0, 4.4, 2.8, 0.82, 10, "PINE_MID")
            # Open diagonal steel truss bracing under deck!
            solid.beam((px + 1.1, -4.5, -22.2), (px + 5.6, -1.6, -22.2), 0.24, "PINE")
            solid.beam((px + 5.6, -1.6, -22.2), (px + 10.1, -4.5, -22.2), 0.24, "PINE")
    # Viaduct concrete deck + pine guardrails + overhead catenary masts
    solid.box((-58, -1.2, -24), (54, 1.35, 4.9), "CREAM")
    solid.box((-58, -0.45, -21.5), (54, 0.45, 0.30), "PINE")
    solid.box((-58, -0.45, -26.5), (54, 0.45, 0.30), "PINE")
    for mx in (-78, -66, -54, -42, -32):
        solid.box((mx, 3.2, -26.2), (0.32, 7.6, 0.32), "PINE")
        solid.box((mx, 6.4, -24.2), (0.28, 0.28, 4.2), "PINE_MID")
    # Dramatic jagged sheared break & twisted steel rebar jutting into open air!
    for s_off in (-1.5, -0.7, 0.1, 0.9, 1.6):
        solid.beam((-31.2, -0.9, -24 + s_off), (-25.2, -2.2 - abs(s_off) * 0.4, -24 + s_off * 1.1), 0.20, "PINE")
        solid.beam((-22.8, -1.9, -24 + s_off), (-18.6, -0.9, -24 + s_off), 0.20, "PINE")

    # Detailed 3-Car Streamlined Commuter Train (with individual windows, bogies, pantograph!)
    for car_i, cx in enumerate([-72, -55, -39]):
        solid.box((cx, 0.95, -24), (14.5, 2.55, 3.35), "TRAIN_WHITE")
        solid.box((cx, 0.22, -22.25), (14.6, 0.52, 0.18), "PINE_MID")
        solid.box((cx, 2.38, -24), (11.5, 0.38, 2.2), "CREAM_DARK")  # Roof AC unit
        # Individual dark passenger windows!
        for w_i in range(5):
            solid.box((cx - 5.2 + w_i * 2.6, 1.25, -22.25), (1.75, 0.85, 0.14), "WIN_DARK")
        if car_i == 1:
            # Scissor pantograph on middle car
            solid.beam((cx - 1.2, 2.55, -24), (cx, 4.2, -24), 0.14, "IRON")
            solid.beam((cx + 1.2, 2.55, -24), (cx, 4.2, -24), 0.14, "IRON")
            solid.box((cx, 4.3, -24), (0.3, 0.12, 2.1), "PINE")
    # Aerodynamic bullet nose cone + wrap windshield
    solid.cyl((-30.4, 0.92, -24), 1.68, 0.45, 3.8, 10, "TRAIN_WHITE", (0, 0, -PI / 2))
    solid.box((-30.8, 1.45, -22.8), (2.2, 0.78, 1.3), "WIN_DARK", (0, 0.25, 0))
    glow.box((-28.7, 0.65, -23.1), (0.25, 0.35, 0.55), "WIN_WARM")

    # Ornate Ribbed Vaulted Daybreak Station Terminal + Clock Tower!
    solid.box((-30, -2.5, -34), (20, 7.6, 12.5), "CREAM")
    solid.cyl((-30, 1.4, -34), 7.6, 7.6, 11.4, 18, "MINT_GLASS", (PI / 2, 0, 0))
    for rz in (-28.3, -31.0, -34.0, -37.0, -39.5):
        solid.arch((-30, 1.4, rz), 8.2, 7.8, 0.85, 0.78, 16, "CREAM")
        solid.arch((-30, 1.4, rz), 7.4, 7.0, 0.55, 0.45, 16, "PINE_MID")
    # Station entrance portico arches
    for ax in (-35, -30, -25):
        solid.arch((ax, -5.6, -27.5), 2.0, 2.8, 1.2, 0.55, 10, "PINE")
    # Iconic Station Clock Tower!
    solid.box((-43, 3.5, -35), (5.2, 16.5, 5.2), "CREAM")
    solid.box((-43, 12.0, -35), (5.8, 0.75, 5.8), "PINE")
    solid.cyl((-43, 14.8, -35), 4.1, 0.25, 5.2, 4, "ROOF_TEAL", (0, PI / 4, 0))
    solid.cyl((-43, 9.2, -32.3), 1.45, 1.45, 0.24, 16, "CREAM_DARK", (PI / 2, 0, 0))
    glow.cyl((-43, 9.2, -32.18), 1.15, 1.15, 0.14, 16, "WIN_WARM", (PI / 2, 0, 0))

    # 16 Staggered Mediterranean Hillside Villas with pitched roofs, windows & lush ginkgo trees!
    for i in range(16):
        col_i = i % 5
        row_i = i // 5
        hx = -82 + col_i * 11.5 + row_i * 4.5
        hz = -44 - row_i * 13.5 - (col_i % 2) * 4.5
        hy = -6.5 + row_i * 5.8
        hh = 5.2 + (i * 5 % 6)
        roof_c = "PINE_MID" if i % 3 == 0 else ("ROOF_TEAL" if i % 3 == 1 else "PINE")
        solid.house((hx, hy, hz), 6.2 + (i % 3) * 0.8, hh, 5.8 + (i % 2) * 0.8, "CREAM" if i % 2 == 0 else "CREAM_DARK", roof_c, "WIN_WARM" if i % 4 == 0 else "WIN_DARK", (i % 3 - 1) * 0.14)
        if i % 2 == 0:
            solid.tree((hx + 4.4, hy, hz + 3.2), 1.9 + (i % 2) * 0.5, ("LEAF", "LEAF_HI", "LEAF_DARK"), lush=False)
    # Sculpted Distant Hilltop Green Ridge + Ring Monument & Coastal Spire!
    solid.ico((-64, 3.0, -86), (28, 17, 22), "LEAF_DARK", subdiv=2)
    solid.ico((-46, -0.5, -78), (19, 12, 16), "LEAF", subdiv=2)
    solid.box((-66, 22, -88), (4.6, 15, 4.6), "CREAM")
    solid.box((-66, 30, -88), (5.2, 0.8, 5.2), "PINE")
    solid.cyl((-66, 33, -88), 2.8, 0.3, 5.2, 6, "ROOF_TEAL")
    solid.arch((-52, 14, -86), 11.5, 11.5, 1.5, 1.35, 18, "CREAM")
    solid.arch((-52, 14, -86), 10.2, 10.2, 0.7, 0.55, 18, "PINE_MID")

    # =========================================================================
    # 4. ACT II RIGHT VISTA: TIDAL DOCK (鸣潮船坞 · 砖红 × 熔金龙门吊 × 深钴蓝)
    # =========================================================================
    # Terraced Quay Apron + Stepped Seawall Buttresses + Mooring Bollards
    solid.box((46, -13.2, -32), (56, 10.5, 50), "DOCK_DECK")
    solid.box((46, -7.8, -7.2), (56, 0.85, 1.4), "BRICK")
    solid.box((18.5, -13.2, -28), (4.5, 11.0, 46), "DOCK_DARK")
    for bz in range(-48, -8, 6):
        solid.box((16.5, -13.0, bz), (1.8, 10.6, 1.6), "IRON")
        solid.cyl((19.0, -7.4, bz), 0.42, 0.52, 0.9, 8, "BRICK")
    # Recessed Stepped Drydock Basin + Red Keel Blocks + Access Steps
    solid.box((42, -10.5, -24), (17.5, 4.8, 32), "IRON")
    for sx in (33.5, 50.5):
        solid.box((sx, -9.2, -24), (1.4, 2.2, 31), "DOCK_DARK")
    for kz in (-34, -29, -24, -19, -14):
        solid.box((42, -12.4, kz), (7.2, 2.2, 0.95), "BRICK")

    # HIGH-DETAIL OCEAN CARGO FREIGHTER SHIP inside Drydock!
    solid.box((42, -7.6, -24), (9.4, 6.2, 27), "COBALT")
    solid.box((42, -11.2, -24), (8.8, 1.9, 26.2), "BRICK")
    solid.box((42, -4.2, -24), (9.8, 0.95, 27.6), "CREAM")
    # Flared tapered bow facing viewer (+Z) + anchor hawse
    solid.cyl((42, -7.6, -8.8), 4.7, 0.35, 7.2, 8, "COBALT", (PI / 2, 0, 0))
    solid.cyl((42, -11.0, -9.2), 4.2, 0.3, 6.2, 8, "BRICK", (PI / 2, 0, 0))
    # Deck cargo hatches + deck containers!
    for hz in (-14, -19, -24):
        solid.box((42, -3.3, hz), (6.6, 0.85, 3.8), "COBALT_HI")
    solid.box((40.2, -2.0, -16.5), (2.6, 1.9, 5.2), "BRICK_LIGHT")
    solid.box((43.6, -2.0, -16.5), (2.6, 1.9, 5.2), "CONT_TEAL")
    # 4-Tier Stepped Bridge Superstructure + Dark Wrap Bridge Windows + Radar Mast + Twin Funnels + Lifeboats!
    solid.box((42, -1.8, -31.5), (8.2, 4.4, 9.2), "CREAM")
    solid.box((42, 1.3, -32.0), (7.0, 2.6, 7.2), "CREAM")
    solid.box((42, 3.3, -32.4), (5.8, 2.0, 5.2), "CREAM_DARK")
    solid.box((42, 3.5, -29.6), (8.6, 1.2, 1.4), "CREAM")  # Bridge wings!
    solid.box((42, 3.6, -28.8), (7.8, 0.72, 0.25), "WIN_DARK")  # Wrap bridge windows!
    solid.box((42, 1.5, -28.3), (5.4, 0.65, 0.22), "WIN_DARK")
    for lx in (37.6, 46.4):
        solid.ico((lx, -2.2, -31.0), (0.8, 0.7, 2.1), "CRANE_RED", subdiv=1)  # Orange lifeboats!
    # Twin Brick Funnels with black smoke caps & tall radar mast
    for fx in (40.6, 43.4):
        solid.cyl((fx, 5.8, -33.2), 0.95, 0.78, 3.6, 10, "BRICK")
        solid.cyl((fx, 7.8, -33.2), 0.80, 0.75, 0.65, 10, "INK")
    solid.cyl((42, 7.2, -30.5), 0.25, 0.12, 6.2, 6, "IRON")
    solid.box((42, 9.2, -30.5), (3.4, 0.22, 0.22), "CREAM")

    # OPEN-LATTICE TRUSS MOLTEN-GOLD GANTRY CRANE (true X-braced A-frame steelwork!)
    for sx in (30.5, 53.5):
        inward = 2.6 if sx < 42 else -2.6
        # 4 main slanted steel leg chords
        solid.beam((sx, -8.0, -18.5), (sx + inward, 12.2, -21.5), 1.15, "CRANE_GOLD")
        solid.beam((sx, -8.0, -27.5), (sx + inward, 12.2, -24.5), 1.15, "CRANE_GOLD")
        # Bogie rail carriages at base
        solid.box((sx, -7.4, -23.0), (2.6, 1.6, 11.2), "CRANE_DARK")
        # Diagonal X-bracing bays up the open A-frame!
        for k in range(4):
            t0, t1 = k / 4.0, (k + 1) / 4.0
            y0, y1 = -7.0 + t0 * 18.2, -7.0 + t1 * 18.2
            x0, x1 = sx + inward * t0, sx + inward * t1
            zf0, zf1 = -18.6 - t0 * 2.8, -18.6 - t1 * 2.8
            zb0, zb1 = -27.4 + t0 * 2.8, -27.4 + t1 * 2.8
            solid.beam((x0, y0, zf0), (x1, y1, zb1), 0.34, "CRANE_DARK")
            solid.beam((x0, y0, zb0), (x1, y1, zf1), 0.34, "CRANE_DARK")
            solid.beam((x0, y0, zf0), (x0, y0, zb0), 0.38, "CRANE_GOLD")
    # Twin overhead molten-gold box girders + upper service catwalk + trolley cab + hoisted container!
    solid.box((42, 12.6, -21.5), (32, 2.4, 1.3), "CRANE_GOLD")
    solid.box((42, 12.6, -24.5), (32, 2.4, 1.3), "CRANE_GOLD")
    solid.box((42, 14.1, -23.0), (28, 0.45, 4.4), "CRANE_DARK")
    for tx in range(29, 56, 3):
        solid.beam((tx, 11.6, -21.5), (tx + 2.5, 13.6, -21.5), 0.25, "CRANE_DARK")
    # Glass Operator Cab + Trolley + Twin Cables + Spreader Lifting a Container!
    solid.box((48.5, 9.6, -20.2), (3.4, 3.0, 2.8), "CRANE_GOLD")
    solid.box((48.5, 9.7, -18.7), (2.6, 1.4, 0.24), "MINT_GLASS")
    solid.box((42, 11.0, -23.0), (4.6, 1.2, 3.8), "IRON")
    for cx_off in (-1.4, 1.4):
        solid.beam((42 + cx_off, 10.6, -23.0), (42 + cx_off, 4.2, -23.0), 0.16, "IRON")
    solid.box((42, 4.0, -23.0), (4.2, 0.65, 2.8), "CRANE_GOLD")
    solid.box((42, 2.4, -23.0), (4.2, 2.4, 2.6), "COBALT_HI")

    # DETAILED BRICK-RED SHIPYARD HANGAR (sawtooth roof, exterior steel ribs, clerestory windows!)
    solid.box((61, -3.2, -38), (22, 9.4, 28), "BRICK")
    solid.box((61, -4.8, -38), (22.6, 3.6, 28.4), "DOCK_DECK")
    # Sawtooth industrial roof bays + clerestory glass strip
    for rz in (-47, -41, -35, -29):
        solid.box((61, 2.8, rz), (23.2, 2.6, 5.4), "BRICK_LIGHT", (0.28, 0, 0))
        solid.box((61, 3.0, rz + 2.5), (21.5, 1.1, 0.22), "WIN_WARM")
    # External steel buttress columns & giant recessed cobalt hangar doors
    for bz in (-49, -43, -37, -31, -25):
        solid.box((49.6, -3.0, bz), (0.8, 9.8, 0.8), "IRON")
    solid.box((49.7, -4.4, -36), (0.65, 7.6, 10.5), "COBALT")
    solid.box((49.5, -4.4, -36), (0.75, 7.6, 0.4), "IRON")
    # Twin Industrial Silos with brick stripes
    for sz in (-52, -59):
        solid.cyl((53, -3.5, sz), 3.4, 3.4, 9.5, 14, "CREAM")
        solid.cyl((53, 0.4, sz), 3.55, 3.55, 1.2, 14, "BRICK")
        solid.ico((53, 1.4, sz), (3.4, 1.6, 3.4), "DOCK_DARK", subdiv=2)
    # 3 Sleek Red Dockside Slewing Cranes with angled lattice booms!
    for gx, gz in [(64, -56), (72, -70), (26, -54)]:
        solid.cyl((gx, -5.5, gz), 2.2, 1.6, 5.5, 8, "CRANE_RED")
        solid.box((gx, -1.5, gz), (3.4, 2.8, 3.6), "CRANE_RED")
        solid.beam((gx, -0.5, gz), (gx - 10, 9.5, gz + 3), 0.55, "CRANE_RED")
        solid.beam((gx, 1.2, gz), (gx - 10, 9.5, gz + 3), 0.30, "IRON")
        solid.beam((gx - 10, 9.5, gz + 3), (gx - 10, 1.0, gz + 3), 0.16, "IRON")
    # Corrugated Shipping Container Stacks + Sakura Trees + Breakwater
    for cx, cz, cy_o, ccol in [
        (25, -15, 0, "COBALT"), (25, -15, 2.7, "BRICK_LIGHT"),
        (25, -10.5, 0, "BRICK"), (30, -12.8, 0, "CONT_TEAL"),
        (24, -24, 0, "BRICK_LIGHT"), (58, -14, 0, "COBALT"), (63, -18, 0, "BRICK")
    ]:
        solid.box((cx, -6.5 + cy_o, cz), (4.2, 2.55, 7.2), ccol)
    solid.tree((28, -7.8, -31), 2.6, ("SAKURA", "BLOSSOM", "BLOSSOM_HI"))
    solid.tree((55, -7.5, -19), 2.1, ("SAKURA", "BLOSSOM", "BLOSSOM_HI"))
    for bz in range(-44, -8, 5):
        solid.ico((18.5, -16.8, bz), (2.3, 1.8, 2.3), "CLIFF_SHADE", subdiv=2, rot=(0.3, bz, 0))
        glow.cyl((17.8, -17.62, bz), 3.1, 2.8, 0.10, 8, "SEA_FOAM")

    # =========================================================================
    # 5. ACT III FAR CENTER PEAK: PRISM GLASSHOUSE (紫晶温室 · 珠白雾灰 × 璀璨紫晶)
    #    Sculpted Craggy Multi-Tier Island (ZERO smooth flowerpot cone!)
    # =========================================================================
    AZ = -148.0
    # 12 Staggered craggy rock buttresses forming a dramatic floating cliff island!
    for i in range(10):
        ang = i * (2 * PI / 10)
        rad = 26.5 + (i % 3) * 4.5
        rx = math.sin(ang) * rad
        rz = AZ + math.cos(ang) * (rad * 0.85)
        h_r = 14.0 + (i % 3) * 4.5
        solid.ico((rx, -9.5 + (i % 2) * 2.5, rz), (14.5 + (i % 2) * 3.5, h_r, 13.5), "CLIFF" if i % 2 == 0 else "CLIFF_MID", subdiv=2, rot=(0.15, ang, 0))
    solid.ico((0, -8.0, AZ), (30, 16, 26), "CLIFF", subdiv=2)
    # Stepped Carved Pearl-White Marble Terraces & Retaining Arcades
    solid.cyl((0, 3.8, AZ), 32.5, 29.5, 6.2, 20, "PEARL_SHADE")
    solid.cyl((0, 7.6, AZ), 29.0, 27.8, 2.4, 24, "PEARL")
    solid.cyl((0, 9.0, AZ), 26.5, 26.5, 0.7, 24, "SILVER")
    # Decorative perimeter cliff-wall arches around the upper pearl terrace
    for i in range(-4, 5):
        ang = i * 0.24
        ax = math.sin(ang) * 29.5
        az = AZ + math.cos(ang) * 29.5
        solid.arch((ax, 1.2, az), 2.8, 3.6, 1.2, 0.65, 8, "PEARL", rot_y=-ang)

    # Multi-Strand Cascading Waterfalls plunging over cliff ledges into billowing foam pools!
    for wx in (-9.6, 9.6):
        glow.box((wx, -4.8, AZ + 33.8), (3.6, 24.0, 1.3), "WATERFALL", (-0.34, 0, 0))
        glow.box((wx + (1.2 if wx > 0 else -1.2), -7.5, AZ + 35.6), (1.4, 17.5, 0.9), "WATERFALL_MID", (-0.30, 0, 0))
        glow.cloud_bank((wx, -17.0, AZ + 40.5), 11.0, 3.8, 7.5, "CLOUD")

    # Sweeping 10-Flight Grand Marble Staircase + Flanking Balustrade Pillars + Twin Triumphal Arches!
    for step in range(10):
        sy = -3.5 + step * 1.22
        sz = AZ + 38.5 - step * 1.95
        solid.box((0, sy, sz), (10.2, 1.35, 2.4), "PEARL")
        if step % 2 == 0:
            for s in (-1, 1):
                solid.cyl((s * 5.6, sy + 1.1, sz), 0.45, 0.40, 1.6, 8, "PEARL")
                glow.crystal((s * 5.6, sy + 2.0, sz), 0.24, 0.62, "AMETHYST_HI")
    solid.arch((0, 9.0, AZ + 21.5), 5.6, 5.4, 1.5, 0.88, 14, "PEARL")
    solid.arch((0, 9.4, AZ + 21.5), 6.2, 5.9, 1.8, 0.65, 14, "SAKURA")

    # CATHEDRAL-GRADE 12-RIBBED PEARL & ICE-GLASS DOME + LANTERN CUPOLA!
    dome_ret = bmesh.ops.create_uvsphere(solid.bm, u_segments=24, v_segments=12, radius=19.2,
        matrix=Matrix.Translation((0, -AZ, 9.0)) @ Matrix.Diagonal((1.26, 1.0, 0.84, 1)))
    lower_verts = [v for v in dome_ret["verts"] if v.co.z < 8.8]
    if lower_verts:
        bmesh.ops.delete(solid.bm, geom=lower_verts, context='VERTS')
    solid._from_verts(dome_ret["verts"], "GLASS_ICE")
    # 12 Ornate Pearl-White Structural Ribs + Horizontal Ring Purlins
    for r_i in range(12):
        ang = r_i * PI / 12
        solid.arch((0, 9.0, AZ), 24.8, 16.6, 0.82, 0.98, 16, "PEARL", rot_y=ang)
    for hy, hrad in [(14.5, 22.8), (19.5, 17.5), (23.2, 10.6)]:
        for s_i in range(16):
            a0, a1 = s_i * 2 * PI / 16, (s_i + 1) * 2 * PI / 16
            solid.beam((math.cos(a0) * hrad, hy, AZ + math.sin(a0) * hrad * 0.8),
                       (math.cos(a1) * hrad, hy, AZ + math.sin(a1) * hrad * 0.8), 0.55, "SILVER")
    # Ornate Front Gothic Cathedral Portal with Rose-Window Tracery!
    solid.arch((0, 9.2, AZ + 18.6), 11.8, 12.4, 1.8, 1.45, 16, "PEARL")
    solid.arch((0, 9.2, AZ + 18.8), 10.2, 10.8, 1.1, 0.82, 16, "SILVER")
    glow.cyl((0, 16.5, AZ + 19.2), 3.2, 3.2, 0.35, 16, "GLASS_VIOLET", (PI / 2, 0, 0))
    for k in range(8):
        ang = k * PI / 4
        solid.beam((0, 16.5, AZ + 19.35), (math.cos(ang) * 3.2, 16.5 + math.sin(ang) * 3.2, AZ + 19.35), 0.25, "PEARL")
    # Upper Cathedral Lantern Cupola + Blazing Amethyst Crown Spire!
    solid.cyl((0, 25.8, AZ), 4.8, 4.4, 2.8, 12, "PEARL")
    solid.cyl((0, 26.2, AZ), 4.0, 4.0, 2.2, 12, "GLASS_ICE")
    for k in range(6):
        ang = k * PI / 3
        solid.box((math.cos(ang) * 4.4, 26.2, AZ + math.sin(ang) * 4.4), (0.55, 2.8, 0.55), "PEARL")
    solid.cyl((0, 27.6, AZ), 5.2, 3.2, 1.4, 12, "SILVER")
    glow.crystal((0, 27.8, AZ), 2.3, 12.2, "AMETHYST_HI")

    # Symmetrical Arched Conservatory Wings + Buttress Pinnacles + Octagonal Side Domes
    for s in (-1, 1):
        solid.box((s * 35, 9.6, AZ), (24, 7.2, 8.6), "PEARL")
        solid.box((s * 35, 13.6, AZ), (25.2, 1.1, 9.4), "SILVER")
        for a_i in range(5):
            ax = s * (24.5 + a_i * 4.9)
            solid.arch((ax, 8.2, AZ + 4.5), 1.9, 3.5, 0.95, 0.55, 10, "GLASS_ICE")
            solid.box((ax + s * 2.45, 11.2, AZ + 4.8), (0.75, 6.4, 0.9), "PEARL")
            solid.cyl((ax + s * 2.45, 15.1, AZ + 4.8), 0.52, 0.06, 1.8, 6, "PEARL")  # Gothic pinnacle!
        # Octagonal ribbed side pavilion dome
        solid.cyl((s * 47, 11.2, AZ), 6.2, 6.2, 7.6, 8, "PEARL")
        solid.ico((s * 47, 15.2, AZ), (6.0, 4.8, 6.0), "GLASS_ICE", subdiv=2)
        for r_i in range(4):
            solid.arch((s * 47, 15.0, AZ), 6.2, 5.1, 0.45, 0.45, 10, "PEARL", rot_y=r_i * PI / 4)
        glow.crystal((s * 47, 19.6, AZ), 0.95, 4.2, "AMETHYST")

    # Multi-Shard Faceted Amethyst Crystal Clusters bursting from the marble gardens!
    clusters = [
        (-14.5, 9.2, AZ + 18, 2.5, 10.8, (0.14, 0.2, 0.28)),
        ( 14.5, 9.2, AZ + 18, 2.8, 12.2, (0.12, -0.2, -0.26)),
        (-28.0, 13.0, AZ + 4, 2.4, 10.0, (0.10, 0.1, 0.22)),
        ( 28.5, 13.0, AZ + 4, 2.6, 10.8, (0.10, -0.1, -0.22)),
    ]
    for cx, cy, cz, cr, ch, tilt in clusters:
        glow.crystal((cx, cy, cz), cr, ch, "AMETHYST", tilt)
        glow.crystal((cx + cr * 0.72, cy, cz + cr * 0.45), cr * 0.62, ch * 0.70, "AMETHYST_HI", (tilt[0] + 0.18, tilt[1], tilt[2] - 0.26))
        glow.crystal((cx - cr * 0.65, cy, cz + cr * 0.35), cr * 0.52, ch * 0.56, "AMETHYST_DEEP", (tilt[0] - 0.15, tilt[1], tilt[2] + 0.30))

    # =========================================================================
    # 6. DREAMY LAYERED CLOUD SEA & DOUBLE-LAYER MOUNTAIN HORIZON
    # =========================================================================
    for i in range(14):
        ang = -PI * 0.85 + i * (PI * 1.7 / 13)
        rad = 38 + (i % 3) * 8
        cx = math.sin(ang) * rad
        cz = AZ + 6 + math.cos(ang) * (rad * 0.55)
        cy = -1.2 + (i % 3) * 2.4
        solid.cloud_bank((cx, cy, cz), 15.0 + (i % 3) * 3.5, 4.8, 9.5, "CLOUD" if i % 2 == 0 else "CLOUD_SHADE")
    for i in range(12):
        cx = -155 + i * 28
        cy = 48 + (i % 3) * 10
        cz = -175 - (i % 3) * 22
        solid.cloud_bank((cx, cy, cz), 22.0 + (i % 3) * 5.0, 6.8, 11.0, "CLOUD")
    # Two layered broad coastal mountain ranges (soft horizon depth!)
    for i in range(14):
        mx = -205 + i * 32
        mz = -198 - (i % 3) * 18
        mh = 26 + ((i * 17) % 24)
        mw = 36 + (i % 3) * 10
        solid.ico((mx, -12 + mh * 0.35, mz), (mw, mh, mw * 0.62), "MT_MID" if i % 2 == 0 else "MT_NEAR", subdiv=2, rot=(0, i * 0.35, 0))
    for i in range(12):
        mx = -220 + i * 40
        mz = -235 - (i % 2) * 18
        mh = 38 + ((i * 23) % 28)
        mw = 48 + (i % 3) * 12
        solid.ico((mx, -10 + mh * 0.35, mz), (mw, mh, mw * 0.65), "MT_FAR", subdiv=2, rot=(0, i * 0.5, 0))

    obj_solid = solid.finish()
    obj_glow = glow.finish()

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
    print(f"BUILT DETAILED PANORAMA V2: solid={len(obj_solid.data.vertices)}v, glow={len(obj_glow.data.vertices)}v -> {OUT_GLB.name} ({OUT_GLB.stat().st_size/1024:.1f} KB)", flush=True)


if __name__ == "__main__":
    build_panorama()
