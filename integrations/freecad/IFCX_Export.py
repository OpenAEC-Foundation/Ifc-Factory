"""IFCX Export module for FreeCAD.

Provides the export(objects, filename) function called by FreeCAD's
export system. Supports .ifcx, .ifcxb, and .dxf output formats.
"""

from __future__ import annotations

import math
import os
import sys
from datetime import datetime, timezone

import FreeCAD

# Ensure workbench dir is on sys.path
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if _THIS_DIR not in sys.path:
    sys.path.insert(0, _THIS_DIR)

from ifcx_core import (
    IfcxDocument,
    write_ifcx,
    write_ifcxb,
    DxfWriter,
    rgb_to_color_dict,
)


# ---------------------------------------------------------------------------
# Public API expected by FreeCAD
# ---------------------------------------------------------------------------

def export(objects, filename: str) -> None:
    """Export FreeCAD objects to IFCX, IFCXB, or DXF.

    Args:
        objects: List of FreeCAD objects to export. If empty, exports all
                 objects in the active document.
        filename: Output file path. Extension determines format.
    """
    doc = FreeCAD.ActiveDocument
    if doc is None:
        FreeCAD.Console.PrintError("IFCX Export: No active document.\n")
        return

    if not objects:
        objects = doc.Objects

    ifcx_doc = _build_ifcx_document(doc, objects)

    ext = os.path.splitext(filename)[1].lower()
    if ext == ".ifcxb":
        write_ifcxb(ifcx_doc, filename)
    elif ext == ".dxf":
        writer = DxfWriter()
        writer.write(ifcx_doc, filename)
    else:
        write_ifcx(ifcx_doc, filename)

    FreeCAD.Console.PrintMessage(f"IFCX: Exported to {filename}\n")


# ---------------------------------------------------------------------------
# Build IFCX document from FreeCAD objects
# ---------------------------------------------------------------------------

def _build_ifcx_document(doc, objects) -> IfcxDocument:
    """Convert FreeCAD objects into an IfcxDocument."""
    ifcx_doc = IfcxDocument()

    # Header
    ifcx_doc.header = {
        "application": f"FreeCAD {FreeCAD.Version()[0]}.{FreeCAD.Version()[1]}",
        "createDate": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "units": {"measurement": "metric", "linear": "millimeters"},
    }

    # Collect layers from groups
    layer_map = {}  # FreeCAD group name -> layer name
    for obj in objects:
        if obj.TypeId == "App::DocumentObjectGroup":
            layer_name = obj.Label
            layer_map[obj.Name] = layer_name
            color_dict = _get_group_color(obj)
            ifcx_doc.add_layer(layer_name, **({"color": color_dict} if color_dict else {}))

    # Ensure layer "0" exists
    if "0" not in ifcx_doc.tables.get("layers", {}):
        ifcx_doc.add_layer("0")

    # Process objects
    processed = set()
    for obj in objects:
        if obj.Name in processed:
            continue
        if obj.TypeId == "App::DocumentObjectGroup":
            # Process group members
            for member in obj.Group:
                if member.Name not in processed:
                    _export_object(ifcx_doc, member, obj.Label, processed)
        elif obj.TypeId == "App::Part":
            _export_app_part(ifcx_doc, obj, "0", processed)
        else:
            layer = _find_layer(obj, objects, layer_map)
            _export_object(ifcx_doc, obj, layer, processed)

    return ifcx_doc


def _get_group_color(obj) -> dict | None:
    """Try to extract a color from a group/layer object."""
    if not hasattr(obj, "ViewObject") or obj.ViewObject is None:
        return None
    try:
        # Draft Layer objects have LineColor
        lc = getattr(obj.ViewObject, "LineColor", None)
        if lc and len(lc) >= 3:
            return rgb_to_color_dict(lc[0], lc[1], lc[2])
    except Exception:
        pass
    return None


def _find_layer(obj, all_objects, layer_map) -> str:
    """Find the layer name for an object by checking its parent groups."""
    for candidate in all_objects:
        if candidate.TypeId == "App::DocumentObjectGroup":
            if hasattr(candidate, "Group") and obj in candidate.Group:
                return candidate.Label
    return "0"


def _export_app_part(ifcx_doc: IfcxDocument, obj, layer: str, processed: set) -> None:
    """Export an App::Part as an IFCX block + INSERT."""
    processed.add(obj.Name)
    block_name = obj.Label

    block_entities = []
    for child in obj.Group if hasattr(obj, "Group") else []:
        ent = _object_to_entity(child, "0")
        if ent:
            block_entities.append(ent)
            processed.add(child.Name)

    if block_entities:
        bp = [0, 0, 0]
        if hasattr(obj, "Placement"):
            bp = [obj.Placement.Base.x, obj.Placement.Base.y, obj.Placement.Base.z]

        ifcx_doc.add_block(block_name, basePoint=bp, entities=block_entities)

        insert_ent = {
            "type": "INSERT",
            "layer": layer,
            "blockName": block_name,
            "insertionPoint": bp,
        }
        ifcx_doc.add_entity(insert_ent)


def _export_object(ifcx_doc: IfcxDocument, obj, layer: str, processed: set) -> None:
    """Export a single FreeCAD object as one or more IFCX entities."""
    if obj.Name in processed:
        return
    processed.add(obj.Name)

    entity = _object_to_entity(obj, layer)
    if entity:
        if isinstance(entity, list):
            for e in entity:
                ifcx_doc.add_entity(e)
        else:
            ifcx_doc.add_entity(entity)


# ---------------------------------------------------------------------------
# Convert individual FreeCAD objects to IFCX entity dicts
# ---------------------------------------------------------------------------

def _object_to_entity(obj, layer: str):
    """Convert a FreeCAD object to an IFCX entity dict (or list of dicts)."""
    type_id = obj.TypeId

    # Draft objects
    if type_id.startswith("Draft::"):
        return _export_draft_object(obj, layer)

    # Part objects with shapes
    if hasattr(obj, "Shape"):
        return _export_shape(obj, layer)

    # Sketcher objects
    if type_id.startswith("Sketcher::"):
        return _export_sketch(obj, layer)

    return None


def _get_entity_color(obj) -> dict | None:
    """Extract color from an object's ViewObject."""
    if not hasattr(obj, "ViewObject") or obj.ViewObject is None:
        return None
    try:
        lc = getattr(obj.ViewObject, "LineColor", None)
        if lc and len(lc) >= 3:
            if not (abs(lc[0] - 1) < 0.01 and abs(lc[1] - 1) < 0.01 and abs(lc[2] - 1) < 0.01):
                return rgb_to_color_dict(lc[0], lc[1], lc[2])
    except Exception:
        pass
    return None


def _export_draft_object(obj, layer: str):
    """Convert Draft objects to IFCX entities."""
    type_id = obj.TypeId
    color = _get_entity_color(obj)

    if "Wire" in type_id or "BezCurve" in type_id:
        points = []
        if hasattr(obj, "Points"):
            for p in obj.Points:
                points.append({"x": p.x, "y": p.y})
        closed = getattr(obj, "Closed", False)
        ent = {"type": "LWPOLYLINE", "layer": layer, "closed": closed, "vertices": points}
        if color:
            ent["color"] = color
        return ent

    if "Circle" in type_id:
        if hasattr(obj, "Shape") and obj.Shape.Edges:
            edge = obj.Shape.Edges[0]
            curve = edge.Curve
            center = curve.Center
            radius = curve.Radius
            ent = {
                "type": "CIRCLE",
                "layer": layer,
                "center": [center.x, center.y, center.z],
                "radius": radius,
            }
            if color:
                ent["color"] = color
            return ent

    if "Text" in type_id:
        text_content = ""
        if hasattr(obj, "Text"):
            text_content = "\\P".join(obj.Text) if isinstance(obj.Text, (list, tuple)) else str(obj.Text)
        pos = [0, 0, 0]
        if hasattr(obj, "Placement"):
            pos = [obj.Placement.Base.x, obj.Placement.Base.y, obj.Placement.Base.z]
        height = 2.5
        try:
            if hasattr(obj, "ViewObject") and obj.ViewObject and hasattr(obj.ViewObject, "FontSize"):
                height = float(obj.ViewObject.FontSize)
        except Exception:
            pass
        ent = {
            "type": "MTEXT" if len(text_content) > 100 else "TEXT",
            "layer": layer,
            "text": text_content,
            "insertionPoint": pos,
            "height": height,
        }
        if color:
            ent["color"] = color
        return ent

    if "Dimension" in type_id:
        p1 = [0, 0, 0]
        p2 = [0, 0, 0]
        dp = [0, 0, 0]
        if hasattr(obj, "Start"):
            p1 = [obj.Start.x, obj.Start.y, obj.Start.z]
        if hasattr(obj, "End"):
            p2 = [obj.End.x, obj.End.y, obj.End.z]
        if hasattr(obj, "Dimline"):
            dp = [obj.Dimline.x, obj.Dimline.y, obj.Dimline.z]
        ent = {
            "type": "DIMENSION_LINEAR",
            "layer": layer,
            "defPoint1": p1,
            "defPoint2": p2,
            "dimLinePoint": dp,
        }
        if color:
            ent["color"] = color
        return ent

    if "Point" in type_id:
        pos = [0, 0, 0]
        if hasattr(obj, "X"):
            pos = [float(obj.X), float(obj.Y), float(obj.Z)]
        ent = {"type": "POINT", "layer": layer, "position": pos}
        if color:
            ent["color"] = color
        return ent

    if "BSpline" in type_id:
        points = []
        if hasattr(obj, "Points"):
            for p in obj.Points:
                points.append([p.x, p.y, p.z])
        ent = {
            "type": "SPLINE",
            "layer": layer,
            "degree": 3,
            "controlPoints": points,
        }
        if color:
            ent["color"] = color
        return ent

    # Fallback: try to export the shape
    if hasattr(obj, "Shape"):
        return _export_shape(obj, layer)

    return None


def _export_shape(obj, layer: str):
    """Convert a Part::Feature shape into IFCX entities."""
    if not hasattr(obj, "Shape") or obj.Shape is None:
        return None

    shape = obj.Shape
    color = _get_entity_color(obj)
    entities = []

    # Process each edge
    for edge in shape.Edges:
        ent = _edge_to_entity(edge, layer)
        if ent:
            if color:
                ent["color"] = color
            entities.append(ent)

    if len(entities) == 1:
        return entities[0]
    return entities if entities else None


def _edge_to_entity(edge, layer: str) -> dict | None:
    """Convert a single Part edge to an IFCX entity dict."""
    curve = edge.Curve
    curve_type = type(curve).__name__

    if curve_type in ("Line", "LineSegment"):
        p1 = edge.Vertexes[0].Point if edge.Vertexes else curve.StartPoint
        p2 = edge.Vertexes[-1].Point if len(edge.Vertexes) > 1 else curve.EndPoint
        return {
            "type": "LINE",
            "layer": layer,
            "start": [p1.x, p1.y, p1.z],
            "end": [p2.x, p2.y, p2.z],
        }

    if curve_type == "Circle":
        center = curve.Center
        radius = curve.Radius
        # Full circle or arc?
        if edge.isClosed():
            return {
                "type": "CIRCLE",
                "layer": layer,
                "center": [center.x, center.y, center.z],
                "radius": radius,
            }
        else:
            sa = edge.FirstParameter
            ea = edge.LastParameter
            return {
                "type": "ARC",
                "layer": layer,
                "center": [center.x, center.y, center.z],
                "radius": radius,
                "startAngle": sa,
                "endAngle": ea,
            }

    if curve_type == "Ellipse":
        center = curve.Center
        major_axis = curve.MajorRadius
        minor_axis = curve.MinorRadius
        ratio = minor_axis / major_axis if major_axis > 0 else 1
        # Major axis direction
        try:
            xdir = curve.XAxis
            maj_ep = [xdir.x * major_axis, xdir.y * major_axis, xdir.z * major_axis]
        except Exception:
            maj_ep = [major_axis, 0, 0]
        return {
            "type": "ELLIPSE",
            "layer": layer,
            "center": [center.x, center.y, center.z],
            "majorAxisEndpoint": maj_ep,
            "minorAxisRatio": ratio,
            "startParam": edge.FirstParameter,
            "endParam": edge.LastParameter,
        }

    if curve_type == "BSplineCurve":
        poles = curve.getPoles()
        knots_raw = curve.getKnots()
        mults = curve.getMultiplicities()
        degree = curve.Degree

        # Expand knot vector from unique knots + multiplicities
        knots = []
        for k, m in zip(knots_raw, mults):
            knots.extend([k] * m)

        cps = [[p.x, p.y, p.z] for p in poles]
        return {
            "type": "SPLINE",
            "layer": layer,
            "degree": degree,
            "controlPoints": cps,
            "knots": knots,
        }

    if curve_type == "BezierCurve":
        poles = curve.getPoles()
        cps = [[p.x, p.y, p.z] for p in poles]
        degree = curve.Degree
        # Convert to spline representation
        n = len(cps)
        knots = [0.0] * (degree + 1) + [1.0] * (degree + 1)
        return {
            "type": "SPLINE",
            "layer": layer,
            "degree": degree,
            "controlPoints": cps,
            "knots": knots,
        }

    # Fallback: discretize the edge and export as LWPOLYLINE
    try:
        points = edge.discretize(Number=20)
        verts = [{"x": p.x, "y": p.y} for p in points]
        return {
            "type": "LWPOLYLINE",
            "layer": layer,
            "closed": edge.isClosed(),
            "vertices": verts,
        }
    except Exception:
        return None


def _export_sketch(obj, layer: str):
    """Export Sketcher geometry as IFCX entities."""
    if not hasattr(obj, "Shape"):
        return None
    return _export_shape(obj, layer)
