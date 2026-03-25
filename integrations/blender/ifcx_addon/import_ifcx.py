"""
IFCX Import Operator for Blender.

Supports importing .ifcx, .ifcxb, .dxf, and .dgn files into Blender
as meshes, curves, or text objects with layer-based collection grouping
and material color assignment.
"""

from __future__ import annotations

import os
import math

import bpy
from bpy.props import (
    StringProperty,
    EnumProperty,
    BoolProperty,
    FloatProperty,
)
from bpy_extras.io_utils import ImportHelper
from mathutils import Vector, Matrix

from . import ifcx_core


# ============================================================================
# Geometry Helpers
# ============================================================================

def _arc_points(center, radius, start_deg, end_deg, segments=32):
    """Generate points along an arc (angles in degrees)."""
    start_rad = math.radians(start_deg)
    end_rad = math.radians(end_deg)
    if end_rad <= start_rad:
        end_rad += 2 * math.pi
    points = []
    for i in range(segments + 1):
        t = start_rad + (end_rad - start_rad) * i / segments
        x = center[0] + radius * math.cos(t)
        y = center[1] + radius * math.sin(t)
        z = center[2] if len(center) > 2 else 0.0
        points.append((x, y, z))
    return points


def _circle_points(center, radius, segments=64):
    """Generate points for a full circle."""
    return _arc_points(center, radius, 0, 360, segments)


def _ellipse_points(center, major_axis, ratio, start_param=0.0,
                    end_param=2 * math.pi, segments=64):
    """Generate points along an ellipse."""
    # Major axis length and angle
    mx, my = major_axis[0], major_axis[1]
    a = math.sqrt(mx * mx + my * my)
    b = a * ratio
    angle = math.atan2(my, mx)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    cz = center[2] if len(center) > 2 else 0.0

    if end_param <= start_param:
        end_param += 2 * math.pi

    points = []
    for i in range(segments + 1):
        t = start_param + (end_param - start_param) * i / segments
        lx = a * math.cos(t)
        ly = b * math.sin(t)
        x = center[0] + lx * cos_a - ly * sin_a
        y = center[1] + lx * sin_a + ly * cos_a
        points.append((x, y, cz))
    return points


def _bulge_arc_points(p1, p2, bulge, segments=16):
    """Compute arc points between two vertices given a bulge value."""
    if abs(bulge) < 1e-10:
        return []

    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    chord = math.sqrt(dx * dx + dy * dy)
    if chord < 1e-10:
        return []

    sagitta = abs(bulge) * chord / 2.0
    radius = (chord * chord / 4.0 + sagitta * sagitta) / (2.0 * sagitta)

    # Midpoint and perpendicular
    mx = (p1[0] + p2[0]) / 2.0
    my = (p1[1] + p2[1]) / 2.0
    perp_len = math.sqrt(dx * dx + dy * dy)
    nx = -dy / perp_len
    ny = dx / perp_len

    # Center offset from midpoint
    d = radius - sagitta
    if bulge > 0:
        cx = mx + d * nx
        cy = my + d * ny
    else:
        cx = mx - d * nx
        cy = my - d * ny

    # Angles
    a1 = math.atan2(p1[1] - cy, p1[0] - cx)
    a2 = math.atan2(p2[1] - cy, p2[0] - cx)

    if bulge > 0:
        if a2 < a1:
            a2 += 2 * math.pi
    else:
        if a1 < a2:
            a1 += 2 * math.pi

    z = p1[2] if len(p1) > 2 else 0.0
    points = []
    for i in range(1, segments):
        t = a1 + (a2 - a1) * i / segments
        x = cx + radius * math.cos(t)
        y = cy + radius * math.sin(t)
        points.append((x, y, z))
    return points


# ============================================================================
# Material/Color Helpers
# ============================================================================

_material_cache: dict[str, bpy.types.Material] = {}


def _get_material(color_index: int) -> bpy.types.Material:
    """Get or create a material for the given ACI color index."""
    mat_name = f"ACI_{color_index}"
    if mat_name in _material_cache:
        return _material_cache[mat_name]

    if mat_name in bpy.data.materials:
        mat = bpy.data.materials[mat_name]
    else:
        mat = bpy.data.materials.new(mat_name)
        r, g, b = ifcx_core.aci_to_rgb(color_index)
        mat.diffuse_color = (r, g, b, 1.0)
        mat.use_nodes = True
        # Update principled BSDF if available
        if mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    node.inputs[0].default_value = (r, g, b, 1.0)
                    break

    _material_cache[mat_name] = mat
    return mat


def _assign_color(obj, entity: dict, layer_colors: dict):
    """Assign material color to an object based on entity or layer color."""
    color = entity.get("color")
    if color is None or color == 256:  # BYLAYER
        layer = entity.get("layer", "0")
        color = layer_colors.get(layer, 7)
    if color == 0:  # BYBLOCK - use white/default
        color = 7

    mat = _get_material(color)
    if obj.data is not None:
        if hasattr(obj.data, 'materials'):
            if len(obj.data.materials) == 0:
                obj.data.materials.append(mat)
            else:
                obj.data.materials[0] = mat


# ============================================================================
# Collection (Layer) Helpers
# ============================================================================

def _get_or_create_collection(name: str, parent=None) -> bpy.types.Collection:
    """Get or create a collection, optionally under a parent collection."""
    if name in bpy.data.collections:
        return bpy.data.collections[name]

    col = bpy.data.collections.new(name)
    if parent is None:
        bpy.context.scene.collection.children.link(col)
    else:
        parent.children.link(col)
    return col


# ============================================================================
# Entity Import Functions
# ============================================================================

def _import_line_as_mesh(entity: dict, scale: float) -> bpy.types.Object:
    s = entity.get("start", [0, 0, 0])
    e = entity.get("end", [0, 0, 0])
    verts = [
        (s[0] * scale, s[1] * scale, (s[2] if len(s) > 2 else 0) * scale),
        (e[0] * scale, e[1] * scale, (e[2] if len(e) > 2 else 0) * scale),
    ]
    mesh = bpy.data.meshes.new("Line")
    mesh.from_pydata(verts, [(0, 1)], [])
    mesh.update()
    obj = bpy.data.objects.new("Line", mesh)
    return obj


def _import_line_as_curve(entity: dict, scale: float) -> bpy.types.Object:
    s = entity.get("start", [0, 0, 0])
    e = entity.get("end", [0, 0, 0])
    curve = bpy.data.curves.new("Line", type='CURVE')
    curve.dimensions = '3D'
    spline = curve.splines.new('POLY')
    spline.points.add(1)  # Already has 1 point, need 2 total
    spline.points[0].co = (
        s[0] * scale, s[1] * scale, (s[2] if len(s) > 2 else 0) * scale, 1,
    )
    spline.points[1].co = (
        e[0] * scale, e[1] * scale, (e[2] if len(e) > 2 else 0) * scale, 1,
    )
    obj = bpy.data.objects.new("Line", curve)
    return obj


def _import_circle_as_curve(entity: dict, scale: float) -> bpy.types.Object:
    c = entity.get("center", [0, 0, 0])
    r = entity.get("radius", 1.0)
    pts = _circle_points(c, r)
    curve = bpy.data.curves.new("Circle", type='CURVE')
    curve.dimensions = '3D'
    spline = curve.splines.new('POLY')
    spline.points.add(len(pts) - 1)
    for i, pt in enumerate(pts):
        spline.points[i].co = (pt[0] * scale, pt[1] * scale, pt[2] * scale, 1)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new("Circle", curve)
    return obj


def _import_circle_as_mesh(entity: dict, scale: float) -> bpy.types.Object:
    c = entity.get("center", [0, 0, 0])
    r = entity.get("radius", 1.0)
    pts = _circle_points(c, r)
    verts = [(p[0] * scale, p[1] * scale, p[2] * scale) for p in pts]
    edges = [(i, i + 1) for i in range(len(verts) - 1)]
    edges.append((len(verts) - 1, 0))
    mesh = bpy.data.meshes.new("Circle")
    mesh.from_pydata(verts, edges, [])
    mesh.update()
    obj = bpy.data.objects.new("Circle", mesh)
    return obj


def _import_arc_as_curve(entity: dict, scale: float) -> bpy.types.Object:
    c = entity.get("center", [0, 0, 0])
    r = entity.get("radius", 1.0)
    sa = entity.get("start_angle", 0.0)
    ea = entity.get("end_angle", 360.0)
    pts = _arc_points(c, r, sa, ea)
    curve = bpy.data.curves.new("Arc", type='CURVE')
    curve.dimensions = '3D'
    spline = curve.splines.new('POLY')
    spline.points.add(len(pts) - 1)
    for i, pt in enumerate(pts):
        spline.points[i].co = (pt[0] * scale, pt[1] * scale, pt[2] * scale, 1)
    obj = bpy.data.objects.new("Arc", curve)
    return obj


def _import_arc_as_mesh(entity: dict, scale: float) -> bpy.types.Object:
    c = entity.get("center", [0, 0, 0])
    r = entity.get("radius", 1.0)
    sa = entity.get("start_angle", 0.0)
    ea = entity.get("end_angle", 360.0)
    pts = _arc_points(c, r, sa, ea)
    verts = [(p[0] * scale, p[1] * scale, p[2] * scale) for p in pts]
    edges = [(i, i + 1) for i in range(len(verts) - 1)]
    mesh = bpy.data.meshes.new("Arc")
    mesh.from_pydata(verts, edges, [])
    mesh.update()
    obj = bpy.data.objects.new("Arc", mesh)
    return obj


def _import_ellipse_as_curve(entity: dict, scale: float) -> bpy.types.Object:
    c = entity.get("center", [0, 0, 0])
    ma = entity.get("major_axis", [1, 0, 0])
    ratio = entity.get("ratio", 0.5)
    sp = entity.get("start_param", 0.0)
    ep = entity.get("end_param", 2 * math.pi)
    pts = _ellipse_points(c, ma, ratio, sp, ep)
    curve = bpy.data.curves.new("Ellipse", type='CURVE')
    curve.dimensions = '3D'
    spline = curve.splines.new('POLY')
    spline.points.add(len(pts) - 1)
    for i, pt in enumerate(pts):
        spline.points[i].co = (pt[0] * scale, pt[1] * scale, pt[2] * scale, 1)
    is_full = abs(ep - sp - 2 * math.pi) < 0.01
    if is_full:
        spline.use_cyclic_u = True
    obj = bpy.data.objects.new("Ellipse", curve)
    return obj


def _import_lwpolyline_as_curve(entity: dict, scale: float) -> bpy.types.Object:
    raw_pts = entity.get("points", [])
    closed = entity.get("closed", False)
    bulges = entity.get("bulges", [])

    # Expand bulge arcs into additional curve points
    expanded = []
    for i, pt in enumerate(raw_pts):
        expanded.append(pt)
        if i < len(bulges) and abs(bulges[i]) > 1e-10:
            next_idx = (i + 1) % len(raw_pts) if closed else i + 1
            if next_idx < len(raw_pts):
                arc_pts = _bulge_arc_points(pt, raw_pts[next_idx], bulges[i])
                expanded.extend(arc_pts)

    curve = bpy.data.curves.new("LWPolyline", type='CURVE')
    curve.dimensions = '3D'
    spline = curve.splines.new('POLY')
    spline.points.add(len(expanded) - 1)
    for i, pt in enumerate(expanded):
        z = pt[2] * scale if len(pt) > 2 else 0.0
        spline.points[i].co = (pt[0] * scale, pt[1] * scale, z, 1)
    spline.use_cyclic_u = closed
    obj = bpy.data.objects.new("LWPolyline", curve)
    return obj


def _import_lwpolyline_as_mesh(entity: dict, scale: float) -> bpy.types.Object:
    raw_pts = entity.get("points", [])
    closed = entity.get("closed", False)
    bulges = entity.get("bulges", [])

    expanded = []
    for i, pt in enumerate(raw_pts):
        expanded.append(pt)
        if i < len(bulges) and abs(bulges[i]) > 1e-10:
            next_idx = (i + 1) % len(raw_pts) if closed else i + 1
            if next_idx < len(raw_pts):
                arc_pts = _bulge_arc_points(pt, raw_pts[next_idx], bulges[i])
                expanded.extend(arc_pts)

    verts = []
    for pt in expanded:
        z = pt[2] * scale if len(pt) > 2 else 0.0
        verts.append((pt[0] * scale, pt[1] * scale, z))

    edges = [(i, i + 1) for i in range(len(verts) - 1)]
    if closed and len(verts) > 1:
        edges.append((len(verts) - 1, 0))

    mesh = bpy.data.meshes.new("LWPolyline")
    mesh.from_pydata(verts, edges, [])
    mesh.update()
    obj = bpy.data.objects.new("LWPolyline", mesh)
    return obj


def _import_spline_as_curve(entity: dict, scale: float) -> bpy.types.Object:
    cps = entity.get("control_points", [])
    degree = entity.get("degree", 3)
    knots = entity.get("knots")
    weights = entity.get("weights")

    curve = bpy.data.curves.new("Spline", type='CURVE')
    curve.dimensions = '3D'
    spline = curve.splines.new('NURBS')
    spline.points.add(len(cps) - 1)
    spline.order_u = degree + 1

    for i, cp in enumerate(cps):
        w = weights[i] if weights and i < len(weights) else 1.0
        z = cp[2] * scale if len(cp) > 2 else 0.0
        spline.points[i].co = (cp[0] * scale, cp[1] * scale, z, w)

    spline.use_endpoint_u = True
    obj = bpy.data.objects.new("Spline", curve)
    return obj


def _import_text(entity: dict, scale: float) -> bpy.types.Object:
    text_str = entity.get("text", "")
    pos = entity.get("position", [0, 0, 0])
    height = entity.get("height", 2.5)
    rotation = entity.get("rotation", 0.0)

    font_curve = bpy.data.curves.new("Text", type='FONT')
    font_curve.body = text_str
    font_curve.size = height * scale
    obj = bpy.data.objects.new("Text", font_curve)
    z = pos[2] * scale if len(pos) > 2 else 0.0
    obj.location = (pos[0] * scale, pos[1] * scale, z)
    if rotation != 0.0:
        obj.rotation_euler = (0, 0, math.radians(rotation))
    return obj


def _import_mtext(entity: dict, scale: float) -> bpy.types.Object:
    text_str = entity.get("text", "")
    # Strip DXF formatting codes
    import re
    text_str = re.sub(r'\\[A-Za-z][^;]*;', '', text_str)
    text_str = re.sub(r'\{|\}', '', text_str)
    text_str = text_str.replace('\\P', '\n')

    pos = entity.get("position", [0, 0, 0])
    height = entity.get("height", 2.5)

    font_curve = bpy.data.curves.new("MText", type='FONT')
    font_curve.body = text_str
    font_curve.size = height * scale
    obj = bpy.data.objects.new("MText", font_curve)
    z = pos[2] * scale if len(pos) > 2 else 0.0
    obj.location = (pos[0] * scale, pos[1] * scale, z)
    return obj


def _import_point(entity: dict, scale: float) -> bpy.types.Object:
    pos = entity.get("position", [0, 0, 0])
    z = pos[2] * scale if len(pos) > 2 else 0.0
    # Create as mesh with single vertex
    mesh = bpy.data.meshes.new("Point")
    mesh.from_pydata([(pos[0] * scale, pos[1] * scale, z)], [], [])
    mesh.update()
    obj = bpy.data.objects.new("Point", mesh)
    return obj


def _import_solid_or_3dface(entity: dict, scale: float,
                            name: str = "Solid") -> bpy.types.Object:
    raw_verts = entity.get("vertices", [])
    if not raw_verts:
        return None

    verts = []
    for v in raw_verts:
        z = v[2] * scale if len(v) > 2 else 0.0
        verts.append((v[0] * scale, v[1] * scale, z))

    if len(verts) >= 3:
        if len(verts) == 3:
            faces = [(0, 1, 2)]
        else:
            faces = [(0, 1, 2, 3)]
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        return obj
    return None


def _import_hatch(entity: dict, scale: float) -> bpy.types.Object:
    """Import hatch as a mesh with filled faces."""
    paths = entity.get("boundary_paths", [])
    if not paths:
        return None

    # Just create edges from boundary paths for now
    all_verts = []
    all_edges = []
    for path in paths:
        if isinstance(path, list):
            start_idx = len(all_verts)
            for pt in path:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    z = pt[2] * scale if len(pt) > 2 else 0.0
                    all_verts.append((pt[0] * scale, pt[1] * scale, z))
            for i in range(start_idx, len(all_verts) - 1):
                all_edges.append((i, i + 1))
            if len(all_verts) > start_idx + 2:
                all_edges.append((len(all_verts) - 1, start_idx))

    if all_verts:
        mesh = bpy.data.meshes.new("Hatch")
        mesh.from_pydata(all_verts, all_edges, [])
        mesh.update()
        obj = bpy.data.objects.new("Hatch", mesh)
        return obj
    return None


def _import_mesh_entity(entity: dict, scale: float) -> bpy.types.Object:
    raw_verts = entity.get("vertices", [])
    raw_faces = entity.get("faces", [])

    verts = []
    for v in raw_verts:
        z = v[2] * scale if len(v) > 2 else 0.0
        verts.append((v[0] * scale, v[1] * scale, z))

    faces = [tuple(f) for f in raw_faces]

    mesh = bpy.data.meshes.new("Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Mesh", mesh)
    return obj


def _import_insert(entity: dict, scale: float,
                   block_collections: dict) -> bpy.types.Object:
    """Import a block INSERT as a collection instance."""
    block_name = entity.get("block", "")
    pos = entity.get("position", [0, 0, 0])
    iscale = entity.get("scale", [1, 1, 1])
    rotation = entity.get("rotation", 0.0)

    col = block_collections.get(block_name)
    if col is None:
        # Create an empty as placeholder
        obj = bpy.data.objects.new(f"Insert_{block_name}", None)
        obj.empty_display_type = 'PLAIN_AXES'
    else:
        obj = bpy.data.objects.new(f"Insert_{block_name}", None)
        obj.instance_type = 'COLLECTION'
        obj.instance_collection = col

    z = pos[2] * scale if len(pos) > 2 else 0.0
    obj.location = (pos[0] * scale, pos[1] * scale, z)
    obj.scale = (
        iscale[0] if len(iscale) > 0 else 1.0,
        iscale[1] if len(iscale) > 1 else 1.0,
        iscale[2] if len(iscale) > 2 else 1.0,
    )
    if rotation != 0.0:
        obj.rotation_euler = (0, 0, math.radians(rotation))

    return obj


# ============================================================================
# Main Import Operator
# ============================================================================

class IMPORT_OT_ifcx(bpy.types.Operator, ImportHelper):
    """Import IFCX, IFCXB, DXF, or DGN file"""
    bl_idname = "import_scene.ifcx"
    bl_label = "Import IFCX"
    bl_options = {'REGISTER', 'UNDO', 'PRESET'}

    filter_glob: StringProperty(
        default="*.ifcx;*.ifcxb;*.dxf;*.dgn",
        options={'HIDDEN'},
    )

    filename_ext = ".ifcx"

    import_as: EnumProperty(
        name="Import As",
        description="How to represent geometric entities",
        items=[
            ('MESH', "Mesh", "Import entities as mesh edges and vertices"),
            ('CURVE', "Curve", "Import entities as curve objects"),
            ('GREASE_PENCIL', "Grease Pencil",
             "Import entities as grease pencil strokes"),
        ],
        default='CURVE',
    )

    create_collection_per_layer: BoolProperty(
        name="Collection Per Layer",
        description="Create a separate collection for each layer",
        default=True,
    )

    scale: FloatProperty(
        name="Scale",
        description=(
            "Scale factor (default 0.001 converts mm to meters)"
        ),
        default=0.001,
        min=0.00001,
        max=1000.0,
        precision=6,
    )

    def execute(self, context):
        global _material_cache
        _material_cache = {}

        filepath = self.filepath
        ext = os.path.splitext(filepath)[1].lower()

        # Parse the file into an IfcxDocument
        try:
            if ext == ".ifcx":
                doc = ifcx_core.IfcxDocument.load_ifcx(filepath)
            elif ext == ".ifcxb":
                doc = ifcx_core.IfcxDocument.load_ifcxb(filepath)
            elif ext == ".dxf":
                doc = ifcx_core.parse_dxf(filepath)
            elif ext == ".dgn":
                doc = ifcx_core.parse_dgn(filepath)
            else:
                self.report({'ERROR'}, f"Unsupported file format: {ext}")
                return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to read file: {e}")
            return {'CANCELLED'}

        scale = self.scale

        # Build layer color lookup
        layer_colors = {}
        for lname, lprops in doc.get_layers().items():
            layer_colors[lname] = lprops.get("color", 7)

        # Create root collection
        file_basename = os.path.splitext(os.path.basename(filepath))[0]
        root_col = _get_or_create_collection(file_basename)

        # Create block collections (for INSERT references)
        block_collections = {}
        for bname, bdata in doc.blocks.items():
            bcol = _get_or_create_collection(f"Block_{bname}", root_col)
            # Hide block source collections
            bcol.hide_viewport = True
            block_collections[bname] = bcol

            for entity in bdata.get("entities", []):
                obj = self._create_object(entity, scale, block_collections)
                if obj is not None:
                    bcol.objects.link(obj)
                    _assign_color(obj, entity, layer_colors)

        # Layer collections cache
        layer_collections = {}

        # Import entities
        entity_count = 0
        for entity in doc.entities:
            obj = self._create_object(entity, scale, block_collections)
            if obj is None:
                continue

            entity_count += 1

            # Assign color
            _assign_color(obj, entity, layer_colors)

            # Place into collection
            layer_name = entity.get("layer", "0")
            if self.create_collection_per_layer:
                if layer_name not in layer_collections:
                    layer_collections[layer_name] = _get_or_create_collection(
                        f"Layer_{layer_name}", root_col
                    )
                target_col = layer_collections[layer_name]
            else:
                target_col = root_col

            target_col.objects.link(obj)

        self.report(
            {'INFO'},
            f"Imported {entity_count} entities from {os.path.basename(filepath)}",
        )
        return {'FINISHED'}

    def _create_object(self, entity: dict, scale: float,
                       block_collections: dict):
        """Create a Blender object from an IFCX entity dict."""
        etype = entity.get("type", "")
        use_mesh = self.import_as == 'MESH'

        if etype == "LINE":
            if use_mesh:
                return _import_line_as_mesh(entity, scale)
            return _import_line_as_curve(entity, scale)

        elif etype == "CIRCLE":
            if use_mesh:
                return _import_circle_as_mesh(entity, scale)
            return _import_circle_as_curve(entity, scale)

        elif etype == "ARC":
            if use_mesh:
                return _import_arc_as_mesh(entity, scale)
            return _import_arc_as_curve(entity, scale)

        elif etype == "ELLIPSE":
            return _import_ellipse_as_curve(entity, scale)

        elif etype == "LWPOLYLINE":
            if use_mesh:
                return _import_lwpolyline_as_mesh(entity, scale)
            return _import_lwpolyline_as_curve(entity, scale)

        elif etype == "SPLINE":
            return _import_spline_as_curve(entity, scale)

        elif etype == "TEXT":
            return _import_text(entity, scale)

        elif etype == "MTEXT":
            return _import_mtext(entity, scale)

        elif etype == "POINT":
            return _import_point(entity, scale)

        elif etype in ("SOLID", "TRACE"):
            return _import_solid_or_3dface(entity, scale, "Solid")

        elif etype == "3DFACE":
            return _import_solid_or_3dface(entity, scale, "3DFace")

        elif etype == "HATCH":
            return _import_hatch(entity, scale)

        elif etype == "INSERT":
            return _import_insert(entity, scale, block_collections)

        elif etype == "MESH":
            return _import_mesh_entity(entity, scale)

        return None

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "import_as")
        layout.prop(self, "create_collection_per_layer")
        layout.prop(self, "scale")
