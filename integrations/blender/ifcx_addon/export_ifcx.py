"""
IFCX Export Operator for Blender.

Exports Blender scene objects to IFCX, IFCXB, or DXF format.
Converts meshes, curves, text, empties, and collection instances
into corresponding IFCX entities.
"""

from __future__ import annotations

import os
import math
import datetime

import bpy
from bpy.props import (
    StringProperty,
    EnumProperty,
    BoolProperty,
    FloatProperty,
)
from bpy_extras.io_utils import ExportHelper

from . import ifcx_core


# ============================================================================
# Conversion Helpers
# ============================================================================

def _get_evaluated_mesh(obj, depsgraph, apply_modifiers: bool):
    """Get evaluated mesh data from an object."""
    if apply_modifiers:
        eval_obj = obj.evaluated_get(depsgraph)
        try:
            mesh = eval_obj.to_mesh()
        except RuntimeError:
            return None
    else:
        try:
            mesh = obj.to_mesh()
        except RuntimeError:
            return None
    return mesh


def _mesh_to_entities(obj, mesh, scale: float, layer: str,
                      doc: ifcx_core.IfcxDocument):
    """Convert a Blender mesh to IFCX entities (lines and faces)."""
    world_matrix = obj.matrix_world

    # Get transformed vertices
    verts = []
    for v in mesh.vertices:
        co = world_matrix @ v.co
        verts.append([co.x * scale, co.y * scale, co.z * scale])

    # Export faces as 3DFACE entities
    for poly in mesh.polygons:
        face_verts = [verts[vi] for vi in poly.vertices]
        if len(face_verts) == 3:
            doc.add_3dface(face_verts, layer)
        elif len(face_verts) == 4:
            doc.add_3dface(face_verts, layer)
        elif len(face_verts) > 4:
            # Triangulate larger polygons
            v0 = face_verts[0]
            for i in range(1, len(face_verts) - 1):
                doc.add_3dface([v0, face_verts[i], face_verts[i + 1]], layer)

    # Export loose edges as LINE entities
    edge_in_face = set()
    for poly in mesh.polygons:
        loop_indices = list(poly.vertices)
        for i in range(len(loop_indices)):
            e = tuple(sorted((loop_indices[i],
                               loop_indices[(i + 1) % len(loop_indices)])))
            edge_in_face.add(e)

    for edge in mesh.edges:
        key = tuple(sorted(edge.vertices))
        if key not in edge_in_face:
            doc.add_line(verts[key[0]], verts[key[1]], layer)


def _curve_to_entities(obj, scale: float, layer: str,
                       doc: ifcx_core.IfcxDocument):
    """Convert a Blender curve object to IFCX entities."""
    world_matrix = obj.matrix_world
    curve_data = obj.data

    for spline in curve_data.splines:
        if spline.type == 'POLY':
            points = []
            for pt in spline.points:
                co = world_matrix @ pt.co.to_3d()
                points.append([co.x * scale, co.y * scale, co.z * scale])
            if len(points) >= 2:
                closed = spline.use_cyclic_u
                doc.add_lwpolyline(points, closed, layer)

        elif spline.type == 'NURBS':
            control_points = []
            weights = []
            for pt in spline.points:
                co = world_matrix @ pt.co.to_3d()
                control_points.append(
                    [co.x * scale, co.y * scale, co.z * scale]
                )
                weights.append(pt.co.w)

            degree = spline.order_u - 1
            # Generate uniform knot vector
            n = len(control_points)
            k = degree + 1
            num_knots = n + k
            knots = []
            for i in range(num_knots):
                if i < k:
                    knots.append(0.0)
                elif i >= num_knots - k:
                    knots.append(1.0)
                else:
                    knots.append((i - k + 1) / (num_knots - 2 * k + 1))

            doc.add_spline(control_points, degree, knots, weights, layer)

        elif spline.type == 'BEZIER':
            # Convert bezier to polyline approximation
            resolution = spline.resolution_u or 12
            points = []
            bezier_points = spline.bezier_points
            for i in range(len(bezier_points) - 1):
                bp0 = bezier_points[i]
                bp1 = bezier_points[i + 1]
                p0 = world_matrix @ bp0.co
                h0 = world_matrix @ bp0.handle_right
                h1 = world_matrix @ bp1.handle_left
                p1 = world_matrix @ bp1.co

                for j in range(resolution):
                    t = j / resolution
                    t2 = t * t
                    t3 = t2 * t
                    mt = 1 - t
                    mt2 = mt * mt
                    mt3 = mt2 * mt

                    x = mt3 * p0.x + 3 * mt2 * t * h0.x + 3 * mt * t2 * h1.x + t3 * p1.x
                    y = mt3 * p0.y + 3 * mt2 * t * h0.y + 3 * mt * t2 * h1.y + t3 * p1.y
                    z = mt3 * p0.z + 3 * mt2 * t * h0.z + 3 * mt * t2 * h1.z + t3 * p1.z
                    points.append([x * scale, y * scale, z * scale])

            # Add final point
            if bezier_points:
                last = world_matrix @ bezier_points[-1].co
                points.append([last.x * scale, last.y * scale, last.z * scale])

            if len(points) >= 2:
                closed = spline.use_cyclic_u
                doc.add_lwpolyline(points, closed, layer)


def _font_to_entity(obj, scale: float, layer: str,
                    doc: ifcx_core.IfcxDocument):
    """Convert a Blender text (font) object to IFCX TEXT entity."""
    font_data = obj.data
    text = font_data.body
    pos = obj.matrix_world.translation
    size = font_data.size * scale
    rotation = math.degrees(obj.rotation_euler.z)

    doc.add_text(
        text,
        [pos.x * scale, pos.y * scale, pos.z * scale],
        size,
        rotation,
        layer,
    )


def _empty_to_entity(obj, scale: float, layer: str,
                     doc: ifcx_core.IfcxDocument):
    """Convert a Blender empty to IFCX POINT or INSERT entity."""
    if obj.instance_type == 'COLLECTION' and obj.instance_collection:
        # This is a collection instance -> INSERT
        col_name = obj.instance_collection.name
        # Remove "Block_" prefix if present
        block_name = col_name
        if block_name.startswith("Block_"):
            block_name = block_name[6:]
        pos = obj.matrix_world.translation
        sx, sy, sz = obj.scale
        rotation = math.degrees(obj.rotation_euler.z)
        doc.add_insert(
            block_name,
            [pos.x * scale, pos.y * scale, pos.z * scale],
            [sx, sy, sz],
            rotation,
            layer,
        )
    else:
        # Regular empty -> POINT
        pos = obj.matrix_world.translation
        doc.add_point(
            [pos.x * scale, pos.y * scale, pos.z * scale],
            layer,
        )


def _grease_pencil_to_entities(obj, scale: float, layer: str,
                               doc: ifcx_core.IfcxDocument):
    """Convert Blender Grease Pencil strokes to IFCX LINE/LWPOLYLINE."""
    world_matrix = obj.matrix_world

    # Handle both legacy GP and new GP objects
    gp_data = obj.data
    if not hasattr(gp_data, 'layers'):
        return

    for gp_layer in gp_data.layers:
        if gp_layer.active_frame is None:
            continue
        for stroke in gp_layer.active_frame.strokes:
            points = []
            for pt in stroke.points:
                co = world_matrix @ pt.co
                points.append([co.x * scale, co.y * scale, co.z * scale])

            if len(points) == 2:
                doc.add_line(points[0], points[1], layer)
            elif len(points) > 2:
                closed = stroke.use_cyclic
                doc.add_lwpolyline(points, closed, layer)


# ============================================================================
# Main Export Operator
# ============================================================================

class EXPORT_OT_ifcx(bpy.types.Operator, ExportHelper):
    """Export scene to IFCX, IFCXB, or DXF format"""
    bl_idname = "export_scene.ifcx"
    bl_label = "Export IFCX"
    bl_options = {'REGISTER', 'PRESET'}

    filename_ext = ".ifcx"

    filter_glob: StringProperty(
        default="*.ifcx;*.ifcxb;*.dxf",
        options={'HIDDEN'},
    )

    export_format: EnumProperty(
        name="Format",
        description="Output file format",
        items=[
            ('IFCX', "IFCX (JSON)", "Export as IFCX JSON text format"),
            ('IFCXB', "IFCXB (Binary)", "Export as IFCXB binary format"),
            ('DXF', "DXF", "Export as AutoCAD DXF format"),
        ],
        default='IFCX',
    )

    selected_only: BoolProperty(
        name="Selected Only",
        description="Export only selected objects",
        default=False,
    )

    apply_modifiers: BoolProperty(
        name="Apply Modifiers",
        description="Apply modifiers before export",
        default=True,
    )

    export_scale: FloatProperty(
        name="Scale",
        description=(
            "Scale factor (default 1000 converts meters to mm)"
        ),
        default=1000.0,
        min=0.001,
        max=1000000.0,
        precision=3,
    )

    def execute(self, context):
        filepath = self.filepath
        fmt = self.export_format

        # Adjust file extension based on format
        base, _ = os.path.splitext(filepath)
        if fmt == 'IFCX':
            filepath = base + ".ifcx"
        elif fmt == 'IFCXB':
            filepath = base + ".ifcxb"
        elif fmt == 'DXF':
            filepath = base + ".dxf"

        doc = ifcx_core.IfcxDocument()
        doc.header["description"] = f"Exported from Blender {bpy.app.version_string}"
        doc.header["author"] = ""
        doc.header["application"] = f"Blender {bpy.app.version_string} IFCX Addon"

        scale = self.export_scale
        depsgraph = context.evaluated_depsgraph_get()

        # Collect objects
        if self.selected_only:
            objects = context.selected_objects
        else:
            objects = context.scene.objects

        # Build layer names from collections
        obj_layers = {}
        for obj in objects:
            # Use the first user collection name as the layer
            layer = "0"
            for col in obj.users_collection:
                col_name = col.name
                if col_name.startswith("Layer_"):
                    layer = col_name[6:]
                    break
                elif col_name != "Scene Collection":
                    layer = col_name
                    break
            obj_layers[obj.name] = layer

        # Add layers to document
        collected_layers = set(obj_layers.values())
        for lname in collected_layers:
            if lname != "0":
                doc.add_layer(lname)

        # Export block collections
        for col in bpy.data.collections:
            if col.name.startswith("Block_"):
                block_name = col.name[6:]
                block_entities = []
                temp_doc = ifcx_core.IfcxDocument()
                for obj in col.objects:
                    self._export_object(obj, scale, "0", temp_doc, depsgraph)
                doc.add_block(block_name, temp_doc.entities)

        # Export objects
        entity_count = 0
        for obj in objects:
            layer = obj_layers.get(obj.name, "0")
            before = len(doc.entities)
            self._export_object(obj, scale, layer, doc, depsgraph)
            entity_count += len(doc.entities) - before

        # Write output
        try:
            if fmt == 'IFCX':
                doc.save_ifcx(filepath)
            elif fmt == 'IFCXB':
                doc.save_ifcxb(filepath)
            elif fmt == 'DXF':
                writer = ifcx_core.DxfWriter()
                writer.write(filepath, doc)
        except Exception as e:
            self.report({'ERROR'}, f"Failed to write file: {e}")
            return {'CANCELLED'}

        self.report(
            {'INFO'},
            f"Exported {entity_count} entities to {os.path.basename(filepath)}",
        )
        return {'FINISHED'}

    def _export_object(self, obj, scale: float, layer: str,
                       doc: ifcx_core.IfcxDocument, depsgraph):
        """Export a single Blender object to IFCX entities."""
        if obj.type == 'MESH':
            mesh = _get_evaluated_mesh(obj, depsgraph, self.apply_modifiers)
            if mesh:
                _mesh_to_entities(obj, mesh, scale, layer, doc)
                if self.apply_modifiers:
                    obj.evaluated_get(depsgraph).to_mesh_clear()
                else:
                    obj.to_mesh_clear()

        elif obj.type == 'CURVE':
            _curve_to_entities(obj, scale, layer, doc)

        elif obj.type == 'FONT':
            _font_to_entity(obj, scale, layer, doc)

        elif obj.type == 'EMPTY':
            _empty_to_entity(obj, scale, layer, doc)

        elif obj.type == 'GPENCIL':
            _grease_pencil_to_entities(obj, scale, layer, doc)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "export_format")
        layout.prop(self, "selected_only")
        layout.prop(self, "apply_modifiers")
        layout.prop(self, "export_scale")

    def check(self, context):
        """Update the filename extension when format changes."""
        changed = False
        base, ext = os.path.splitext(self.filepath)
        ext_map = {
            'IFCX': '.ifcx',
            'IFCXB': '.ifcxb',
            'DXF': '.dxf',
        }
        expected = ext_map.get(self.export_format, '.ifcx')
        if ext.lower() != expected:
            self.filepath = base + expected
            changed = True
        return changed
