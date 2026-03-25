"""
Bonsai (BlenderBIM) Integration Bridge.

Provides functions to interoperate with the Bonsai addon:
- Convert IFC model annotations to IFCX format
- Export Bonsai 2D documentation sheets to IFCX layouts
- Add menu items under Bonsai's menu when available
"""

from __future__ import annotations

import bpy
from bpy.props import StringProperty, EnumProperty

from . import ifcx_core


# ============================================================================
# Detection
# ============================================================================

def is_bonsai_available() -> bool:
    """Check if the Bonsai (BlenderBIM) addon is installed and enabled."""
    return "bonsai" in bpy.context.preferences.addons


def get_ifc_file():
    """Get the active IFC file from Bonsai, or None if unavailable."""
    if not is_bonsai_available():
        return None
    try:
        import bonsai.tool as tool
        return tool.Ifc.get()
    except (ImportError, AttributeError):
        pass
    # Fallback: try legacy BlenderBIM path
    try:
        import blenderbim.tool as tool
        return tool.Ifc.get()
    except (ImportError, AttributeError):
        pass
    return None


# ============================================================================
# IFC Annotation -> IFCX Conversion
# ============================================================================

def _extract_annotation_entities(ifc_file) -> list[dict]:
    """Extract 2D annotation entities from an IFC model.

    Looks for IfcAnnotation elements and their geometric representations,
    converting them to IFCX entity dicts.
    """
    entities = []

    try:
        annotations = ifc_file.by_type("IfcAnnotation")
    except Exception:
        return entities

    for ann in annotations:
        layer = "Annotations"
        name = getattr(ann, "Name", "") or "Annotation"

        # Try to get the 2D representation
        if not hasattr(ann, "Representation") or ann.Representation is None:
            continue

        for rep in ann.Representation.Representations:
            if rep.RepresentationIdentifier not in ("Annotation", "Plan", "FootPrint"):
                continue

            for item in rep.Items:
                entity = _convert_representation_item(item, layer, name)
                if entity:
                    entities.append(entity)

    return entities


def _convert_representation_item(item, layer: str, name: str) -> dict | None:
    """Convert a single IFC representation item to an IFCX entity dict."""
    item_type = item.is_a()

    if item_type == "IfcPolyline":
        points = []
        for pt in item.Points:
            coords = list(pt.Coordinates)
            while len(coords) < 3:
                coords.append(0.0)
            points.append(coords)
        if len(points) >= 2:
            return {
                "type": "LWPOLYLINE",
                "points": points,
                "closed": False,
                "layer": layer,
            }

    elif item_type == "IfcCircle":
        if hasattr(item, "Position") and item.Position:
            pos = item.Position
            center = list(pos.Location.Coordinates)
            while len(center) < 3:
                center.append(0.0)
        else:
            center = [0.0, 0.0, 0.0]
        return {
            "type": "CIRCLE",
            "center": center,
            "radius": item.Radius,
            "layer": layer,
        }

    elif item_type == "IfcTrimmedCurve":
        basis = item.BasisCurve
        if basis.is_a("IfcCircle"):
            if hasattr(basis, "Position") and basis.Position:
                center = list(basis.Position.Location.Coordinates)
                while len(center) < 3:
                    center.append(0.0)
            else:
                center = [0.0, 0.0, 0.0]
            # Extract trim parameters
            try:
                t1 = float(item.Trim1[0].wrappedValue)
                t2 = float(item.Trim2[0].wrappedValue)
            except Exception:
                t1, t2 = 0.0, 360.0
            return {
                "type": "ARC",
                "center": center,
                "radius": basis.Radius,
                "start_angle": t1,
                "end_angle": t2,
                "layer": layer,
            }

    elif item_type in ("IfcTextLiteral", "IfcTextLiteralWithExtent"):
        text = getattr(item, "Literal", "") or ""
        placement = getattr(item, "Placement", None)
        pos = [0.0, 0.0, 0.0]
        if placement and hasattr(placement, "Location"):
            coords = list(placement.Location.Coordinates)
            while len(coords) < 3:
                coords.append(0.0)
            pos = coords
        return {
            "type": "TEXT",
            "text": text,
            "position": pos,
            "height": 2.5,
            "layer": layer,
        }

    elif item_type == "IfcIndexedPolyCurve":
        points_list = item.Points
        if hasattr(points_list, "CoordList"):
            points = []
            for coords in points_list.CoordList:
                pt = list(coords)
                while len(pt) < 3:
                    pt.append(0.0)
                points.append(pt)
            if points:
                return {
                    "type": "LWPOLYLINE",
                    "points": points,
                    "closed": False,
                    "layer": layer,
                }

    return None


# ============================================================================
# Export Operators
# ============================================================================

class BONSAI_OT_export_annotations_ifcx(bpy.types.Operator):
    """Export IFC annotations to IFCX format"""
    bl_idname = "bonsai.export_annotations_ifcx"
    bl_label = "Export Annotations to IFCX"
    bl_options = {'REGISTER'}

    filepath: StringProperty(
        subtype='FILE_PATH',
    )

    export_format: EnumProperty(
        name="Format",
        items=[
            ('IFCX', "IFCX (JSON)", ""),
            ('IFCXB', "IFCXB (Binary)", ""),
        ],
        default='IFCX',
    )

    def execute(self, context):
        ifc_file = get_ifc_file()
        if ifc_file is None:
            self.report({'ERROR'}, "No IFC file loaded in Bonsai")
            return {'CANCELLED'}

        entities = _extract_annotation_entities(ifc_file)
        if not entities:
            self.report({'WARNING'}, "No annotations found in IFC model")
            return {'CANCELLED'}

        doc = ifcx_core.IfcxDocument()
        doc.header["description"] = "Annotations exported from Bonsai/BlenderBIM"
        doc.header["application"] = "Blender IFCX Addon (Bonsai Bridge)"
        doc.add_layer("Annotations")

        for entity in entities:
            doc.add_entity(entity)

        try:
            if self.export_format == 'IFCXB':
                doc.save_ifcxb(self.filepath)
            else:
                doc.save_ifcx(self.filepath)
        except Exception as e:
            self.report({'ERROR'}, f"Export failed: {e}")
            return {'CANCELLED'}

        self.report({'INFO'},
                    f"Exported {len(entities)} annotations to {self.filepath}")
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class BONSAI_OT_export_sheets_ifcx(bpy.types.Operator):
    """Export Bonsai documentation sheets to IFCX layouts"""
    bl_idname = "bonsai.export_sheets_ifcx"
    bl_label = "Export Sheets to IFCX"
    bl_options = {'REGISTER'}

    filepath: StringProperty(
        subtype='FILE_PATH',
    )

    def execute(self, context):
        ifc_file = get_ifc_file()
        if ifc_file is None:
            self.report({'ERROR'}, "No IFC file loaded in Bonsai")
            return {'CANCELLED'}

        doc = ifcx_core.IfcxDocument()
        doc.header["description"] = "Documentation sheets from Bonsai/BlenderBIM"
        doc.header["application"] = "Blender IFCX Addon (Bonsai Bridge)"

        # Find IfcDocumentInformation for sheets
        sheet_count = 0
        try:
            documents = ifc_file.by_type("IfcDocumentInformation")
            for doc_info in documents:
                sheet_name = getattr(doc_info, "Name", "") or f"Sheet_{sheet_count}"
                doc.add_layer(sheet_name)

                # Get associated drawing references
                if hasattr(doc_info, "HasDocumentReferences"):
                    for ref in doc_info.HasDocumentReferences:
                        # Each reference may point to SVG or drawing data
                        location = getattr(ref, "Location", "")
                        if location:
                            doc.add_text(
                                f"[Sheet: {sheet_name}] {location}",
                                [0, 0, 0],
                                5.0,
                                0.0,
                                sheet_name,
                            )
                sheet_count += 1
        except Exception:
            pass

        if sheet_count == 0:
            self.report({'WARNING'}, "No documentation sheets found")
            return {'CANCELLED'}

        try:
            doc.save_ifcx(self.filepath)
        except Exception as e:
            self.report({'ERROR'}, f"Export failed: {e}")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Exported {sheet_count} sheets to {self.filepath}")
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


# ============================================================================
# Menu Integration
# ============================================================================

def draw_bonsai_menu(self, context):
    """Add IFCX export items to Bonsai's menu (if present)."""
    if is_bonsai_available():
        layout = self.layout
        layout.separator()
        layout.operator(
            BONSAI_OT_export_annotations_ifcx.bl_idname,
            text="Export Annotations to IFCX",
            icon='EXPORT',
        )
        layout.operator(
            BONSAI_OT_export_sheets_ifcx.bl_idname,
            text="Export Sheets to IFCX",
            icon='EXPORT',
        )


# ============================================================================
# Registration
# ============================================================================

_classes = (
    BONSAI_OT_export_annotations_ifcx,
    BONSAI_OT_export_sheets_ifcx,
)


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)

    # Try to add items to Bonsai's menu
    if is_bonsai_available():
        try:
            # Bonsai typically has a menu; try common menu types
            bpy.types.TOPBAR_MT_editor_menus.append(draw_bonsai_menu)
        except Exception:
            pass


def unregister():
    try:
        bpy.types.TOPBAR_MT_editor_menus.remove(draw_bonsai_menu)
    except Exception:
        pass

    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
