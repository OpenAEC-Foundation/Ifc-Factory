"""
Export Active View to IFCXB - PyRevit Pushbutton Script

Exports the current Revit view as an IFCX binary file (.ifcxb).
Collects all visible 2D geometry (lines, arcs, text, dimensions,
hatches, detail items, etc.) and serializes to IFCXB format.

Compatible with IronPython 2.7 and CPython 3 (pyRevit 4.8+).
"""

from __future__ import print_function

import sys
import os
import math
import json
import datetime

# Add script directory to path so we can import the encoder
script_dir = os.path.dirname(__file__)
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from ifcx_encoder import encode_ifcxb, encode_ifcx_json

# Revit API imports
from Autodesk.Revit.DB import (
    FilteredElementCollector,
    Options,
    GeometryInstance,
    Solid,
    Curve,
    Line,
    Arc,
    Ellipse,
    NurbSpline,
    HermiteSpline,
    PolyLine,
    XYZ,
    TextNote,
    IndependentTag,
    Dimension,
    DimensionType,
    DimensionStyleType,
    SpotDimension,
    DetailLine,
    DetailArc,
    DetailCurve,
    DetailNurbSpline,
    FilledRegion,
    FilledRegionType,
    CurveElement,
    Grid,
    Level,
    FamilyInstance,
    Group,
    ViewType,
    BuiltInCategory,
    ElementId,
    UnitUtils,
    CurveLoop,
    ModelLine,
    ModelArc,
    ModelCurve,
    RevitLinkInstance,
    AnnotationSymbol,
    TextNoteType,
    Color as RevitColor,
)

# pyRevit imports
from pyrevit import revit, DB, forms, script

# IronPython 2 / CPython 3 compat
try:
    string_types = (str, unicode)
except NameError:
    string_types = (str,)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FEET_TO_MM = 304.8  # 1 foot = 304.8 mm


# ---------------------------------------------------------------------------
# Utility: coordinate conversion
# ---------------------------------------------------------------------------

def xyz_to_list(xyz):
    """Convert Revit XYZ (in feet) to [x, y, z] in millimeters."""
    return [
        round(xyz.X * FEET_TO_MM, 4),
        round(xyz.Y * FEET_TO_MM, 4),
        round(xyz.Z * FEET_TO_MM, 4),
    ]


def xyz_to_2d(xyz):
    """Convert Revit XYZ (in feet) to [x, y, 0] in mm (flatten to 2D)."""
    return [
        round(xyz.X * FEET_TO_MM, 4),
        round(xyz.Y * FEET_TO_MM, 4),
        0,
    ]


def ft_to_mm(value):
    """Convert feet to millimeters."""
    return round(value * FEET_TO_MM, 4)


def rad_to_deg(radians):
    """Convert radians to degrees."""
    return radians * 180.0 / math.pi


def revit_color_to_dict(color):
    """Convert Revit Color to IFCX color dict."""
    if color is None or not color.IsValid:
        return None
    return {
        "r": round(color.Red / 255.0, 3),
        "g": round(color.Green / 255.0, 3),
        "b": round(color.Blue / 255.0, 3),
    }


# ---------------------------------------------------------------------------
# Handle generator
# ---------------------------------------------------------------------------

class HandleGenerator(object):
    """Generates unique hex handles for IFCX entities."""
    def __init__(self):
        self._counter = 0

    def next(self):
        self._counter += 1
        return format(self._counter, "X")


# ---------------------------------------------------------------------------
# Category / Layer mapping
# ---------------------------------------------------------------------------

def category_to_layer_name(category):
    """Map a Revit Category to an IFCX layer name."""
    if category is None:
        return "0"
    name = category.Name
    if not name:
        return "0"
    # Clean up name for use as layer
    return name.replace(" ", "_").replace("/", "-")


def get_category_color(category):
    """Get line color from a Revit category."""
    if category is None:
        return None
    try:
        color = category.LineColor
        return revit_color_to_dict(color)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Curve conversion
# ---------------------------------------------------------------------------

def curve_to_ifcx(curve, handle_gen, layer="0", linetype=None):
    """Convert a Revit Curve to an IFCX entity dict."""
    entity = {
        "handle": handle_gen.next(),
        "layer": layer,
    }
    if linetype:
        entity["linetype"] = linetype

    if isinstance(curve, Line):
        entity["type"] = "LINE"
        entity["start"] = xyz_to_list(curve.GetEndPoint(0))
        entity["end"] = xyz_to_list(curve.GetEndPoint(1))

    elif isinstance(curve, Arc):
        center = curve.Center
        radius = curve.Radius
        entity["type"] = "ARC"
        entity["center"] = xyz_to_list(center)
        entity["radius"] = ft_to_mm(radius)

        # Check if full circle
        if curve.IsBound:
            # Get the normal to determine arc plane
            normal = curve.Normal
            start_pt = curve.GetEndPoint(0)
            end_pt = curve.GetEndPoint(1)

            # Calculate angles from center
            dx0 = start_pt.X - center.X
            dy0 = start_pt.Y - center.Y
            dx1 = end_pt.X - center.X
            dy1 = end_pt.Y - center.Y

            start_angle = math.atan2(dy0, dx0)
            end_angle = math.atan2(dy1, dx1)

            if start_angle < 0:
                start_angle += 2 * math.pi
            if end_angle < 0:
                end_angle += 2 * math.pi

            entity["startAngle"] = round(start_angle, 7)
            entity["endAngle"] = round(end_angle, 7)
        else:
            # Full circle
            entity["type"] = "CIRCLE"
            entity.pop("startAngle", None)
            entity.pop("endAngle", None)

    elif isinstance(curve, Ellipse):
        entity["type"] = "ELLIPSE"
        entity["center"] = xyz_to_list(curve.Center)

        # Major axis endpoint (relative to center)
        major_radius = ft_to_mm(curve.RadiusX)
        x_dir = curve.XDirection
        entity["majorAxisEndpoint"] = [
            round(x_dir.X * major_radius, 4),
            round(x_dir.Y * major_radius, 4),
            round(x_dir.Z * major_radius, 4),
        ]
        entity["minorAxisRatio"] = round(curve.RadiusY / curve.RadiusX, 6) if curve.RadiusX > 0 else 1.0

        if curve.IsBound:
            entity["startParam"] = round(curve.GetEndParameter(0), 7)
            entity["endParam"] = round(curve.GetEndParameter(1), 7)
        else:
            entity["startParam"] = 0
            entity["endParam"] = round(2 * math.pi, 7)

    elif isinstance(curve, NurbSpline):
        entity["type"] = "SPLINE"
        entity["degree"] = curve.Degree

        ctrl_pts = []
        for pt in curve.CtrlPoints:
            ctrl_pts.append(xyz_to_list(pt))
        entity["controlPoints"] = ctrl_pts

        knots = []
        for k in curve.Knots:
            knots.append(round(k, 7))
        entity["knots"] = knots

        if curve.isRational:
            weights = []
            for w in curve.Weights:
                weights.append(round(w, 7))
            entity["weights"] = weights

    elif isinstance(curve, HermiteSpline):
        # Convert HermiteSpline control points to polyline approximation
        entity["type"] = "LWPOLYLINE"
        entity["closed"] = curve.IsClosed
        vertices = []
        for pt in curve.ControlPoints:
            p = xyz_to_list(pt)
            vertices.append({"x": p[0], "y": p[1]})
        entity["vertices"] = vertices

    else:
        # Generic curve - tessellate to polyline
        entity["type"] = "LWPOLYLINE"
        entity["closed"] = False
        vertices = []
        try:
            tess = curve.Tessellate()
            for pt in tess:
                p = xyz_to_list(pt)
                vertices.append({"x": p[0], "y": p[1]})
        except Exception:
            return None
        entity["vertices"] = vertices

    return entity


# ---------------------------------------------------------------------------
# Element processors
# ---------------------------------------------------------------------------

def process_text_note(elem, handle_gen):
    """Convert a TextNote to an IFCX TEXT entity."""
    text = elem.Text
    if not text:
        return None

    coord = elem.Coord
    layer = category_to_layer_name(elem.Category)

    # Get text height from TextNoteType
    text_type = elem.Document.GetElement(elem.GetTypeId())
    height = 2.5  # default mm
    if text_type:
        try:
            height = ft_to_mm(text_type.get_Parameter(
                DB.BuiltInParameter.TEXT_SIZE
            ).AsDouble())
        except Exception:
            pass

    # Get style name
    style_name = "Standard"
    if text_type:
        try:
            style_name = text_type.get_Parameter(
                DB.BuiltInParameter.ALL_MODEL_TYPE_NAME
            ).AsString() or "Standard"
        except Exception:
            pass

    # Check if multiline
    lines = text.split("\n") if "\n" in text else text.split("\r")
    if len(lines) > 1:
        entity = {
            "type": "MTEXT",
            "handle": handle_gen.next(),
            "layer": layer,
            "text": text.replace("\n", "\\P").replace("\r", "\\P"),
            "insertionPoint": xyz_to_list(coord),
            "height": height,
            "style": style_name,
            "attachment": "top_left",
        }
        # Estimate width
        entity["width"] = height * max(len(line) for line in lines) * 0.6
    else:
        entity = {
            "type": "TEXT",
            "handle": handle_gen.next(),
            "layer": layer,
            "text": text,
            "insertionPoint": xyz_to_list(coord),
            "height": height,
            "style": style_name,
        }

    return entity


def process_dimension(elem, handle_gen):
    """Convert a Revit Dimension to an IFCX DIMENSION entity."""
    if elem.NumberOfSegments == 0 and elem.Value is None:
        return None

    layer = category_to_layer_name(elem.Category)

    # Get dimension style name
    dim_style = "Standard"
    dim_type = elem.Document.GetElement(elem.GetTypeId())
    if dim_type:
        try:
            dim_style = dim_type.get_Parameter(
                DB.BuiltInParameter.ALL_MODEL_TYPE_NAME
            ).AsString() or "Standard"
        except Exception:
            pass

    entities = []

    try:
        curve = elem.Curve
    except Exception:
        curve = None

    if curve and isinstance(curve, Line):
        # Linear dimension
        start = curve.GetEndPoint(0)
        end = curve.GetEndPoint(1)

        # Get definition points from references
        refs = elem.References
        if refs and refs.Size >= 2:
            # Use the curve endpoints as dim line reference
            dim_line_mid = XYZ(
                (start.X + end.X) / 2.0,
                (start.Y + end.Y) / 2.0,
                (start.Z + end.Z) / 2.0,
            )

            entity = {
                "type": "DIMENSION_LINEAR",
                "handle": handle_gen.next(),
                "layer": layer,
                "dimStyle": dim_style,
                "defPoint1": xyz_to_list(start),
                "defPoint2": xyz_to_list(end),
                "dimLinePoint": xyz_to_list(dim_line_mid),
            }
            entities.append(entity)
        else:
            entity = {
                "type": "DIMENSION_LINEAR",
                "handle": handle_gen.next(),
                "layer": layer,
                "dimStyle": dim_style,
                "defPoint1": xyz_to_list(start),
                "defPoint2": xyz_to_list(end),
                "dimLinePoint": xyz_to_list(start),
            }
            entities.append(entity)

    elif curve and isinstance(curve, Arc):
        # Angular or radial dimension
        center = curve.Center
        entity = {
            "type": "DIMENSION_RADIUS",
            "handle": handle_gen.next(),
            "layer": layer,
            "dimStyle": dim_style,
            "center": xyz_to_list(center),
            "chordPoint": xyz_to_list(curve.GetEndPoint(0)),
            "leaderLength": ft_to_mm(curve.Radius) * 0.3,
        }
        entities.append(entity)

    else:
        # Fallback: extract geometry as lines
        pass

    return entities


def process_filled_region(elem, handle_gen):
    """Convert a FilledRegion to an IFCX HATCH entity."""
    layer = category_to_layer_name(elem.Category)

    boundaries = []
    try:
        boundary_loops = elem.GetBoundaries()
        for loop in boundary_loops:
            vertices = []
            for curve in loop:
                pt = curve.GetEndPoint(0)
                p = xyz_to_list(pt)
                vertices.append({"x": p[0], "y": p[1]})
            if vertices:
                boundaries.append({
                    "type": "polyline",
                    "polyline": {"vertices": vertices},
                })
    except Exception:
        return None

    if not boundaries:
        return None

    # Get fill pattern info
    fr_type = elem.Document.GetElement(elem.GetTypeId())
    pattern_name = "SOLID"
    is_solid = True
    try:
        if fr_type:
            fg_pattern_id = fr_type.ForegroundPatternId
            if fg_pattern_id and fg_pattern_id != ElementId.InvalidElementId:
                pattern_elem = elem.Document.GetElement(fg_pattern_id)
                if pattern_elem:
                    fill_pattern = pattern_elem.GetFillPattern()
                    if fill_pattern:
                        pattern_name = fill_pattern.Name or "SOLID"
                        is_solid = fill_pattern.IsSolidFill
    except Exception:
        pass

    entity = {
        "type": "HATCH",
        "handle": handle_gen.next(),
        "layer": layer,
        "patternName": pattern_name,
        "solid": is_solid,
        "boundaries": boundaries,
    }

    # Get color
    try:
        color = revit_color_to_dict(fr_type.ForegroundPatternColor)
        if color:
            entity["color"] = color
    except Exception:
        pass

    return entity


def process_grid(elem, handle_gen):
    """Convert a Grid element to IFCX entities (line + text label)."""
    entities = []
    layer = "Grids"

    try:
        curve = elem.Curve
        if curve:
            ent = curve_to_ifcx(curve, handle_gen, layer=layer)
            if ent:
                ent["linetype"] = "Center"
                entities.append(ent)

        # Grid label
        name = elem.Name
        if name and curve:
            end_pt = curve.GetEndPoint(1)
            label = {
                "type": "TEXT",
                "handle": handle_gen.next(),
                "layer": layer,
                "text": name,
                "insertionPoint": xyz_to_list(end_pt),
                "height": 5.0,
                "style": "Standard",
                "horizontalAlignment": "center",
            }
            entities.append(label)
    except Exception:
        pass

    return entities


def process_level(elem, handle_gen):
    """Convert a Level element to IFCX entities (for section/elevation views)."""
    entities = []
    layer = "Levels"

    try:
        elevation = ft_to_mm(elem.Elevation)
        name = elem.Name or "Level"

        # Level line (horizontal, arbitrary length)
        entity = {
            "type": "LINE",
            "handle": handle_gen.next(),
            "layer": layer,
            "start": [-10000, elevation, 0],
            "end": [10000, elevation, 0],
            "linetype": "Dashed",
        }
        entities.append(entity)

        # Level label
        label = {
            "type": "TEXT",
            "handle": handle_gen.next(),
            "layer": layer,
            "text": "{} ({:.0f})".format(name, elevation),
            "insertionPoint": [-9500, elevation + 200, 0],
            "height": 3.0,
            "style": "Standard",
        }
        entities.append(label)
    except Exception:
        pass

    return entities


def process_family_instance_annotation(elem, handle_gen):
    """Convert an annotation FamilyInstance to an IFCX INSERT entity."""
    layer = category_to_layer_name(elem.Category)

    try:
        location = elem.Location
        if hasattr(location, "Point"):
            pt = location.Point
        else:
            return None
    except Exception:
        return None

    # Get family and type name as block reference
    family_name = ""
    try:
        family_name = elem.Symbol.Family.Name
    except Exception:
        pass

    type_name = ""
    try:
        type_name = elem.Name
    except Exception:
        pass

    block_name = "{}_{}".format(family_name, type_name).replace(" ", "_")

    entity = {
        "type": "INSERT",
        "handle": handle_gen.next(),
        "layer": layer,
        "blockName": block_name,
        "insertionPoint": xyz_to_list(pt),
    }

    # Rotation
    try:
        if hasattr(location, "Rotation"):
            entity["rotation"] = round(location.Rotation, 7)
    except Exception:
        pass

    return entity


def process_independent_tag(elem, handle_gen):
    """Convert an IndependentTag to an IFCX TEXT entity."""
    layer = category_to_layer_name(elem.Category)

    try:
        tag_text = elem.TagText
    except Exception:
        tag_text = ""

    if not tag_text:
        return None

    try:
        head_pt = elem.TagHeadPosition
    except Exception:
        return None

    entity = {
        "type": "TEXT",
        "handle": handle_gen.next(),
        "layer": layer,
        "text": tag_text,
        "insertionPoint": xyz_to_list(head_pt),
        "height": 2.5,
        "style": "Standard",
    }

    return entity


# ---------------------------------------------------------------------------
# Geometry extraction from generic elements
# ---------------------------------------------------------------------------

def extract_geometry_entities(elem, options, handle_gen):
    """Extract geometry from a Revit element and return IFCX entities."""
    entities = []
    layer = category_to_layer_name(elem.Category)

    try:
        geom = elem.get_Geometry(options)
    except Exception:
        return entities

    if geom is None:
        return entities

    _process_geom_element(geom, layer, handle_gen, entities)
    return entities


def _process_geom_element(geom, layer, handle_gen, entities):
    """Recursively process Revit GeometryElement."""
    for geom_obj in geom:
        if isinstance(geom_obj, GeometryInstance):
            try:
                inst_geom = geom_obj.GetInstanceGeometry()
                if inst_geom:
                    _process_geom_element(inst_geom, layer, handle_gen, entities)
            except Exception:
                pass

        elif isinstance(geom_obj, Solid):
            try:
                if geom_obj.Volume > 0 or geom_obj.SurfaceArea > 0:
                    _process_solid(geom_obj, layer, handle_gen, entities)
            except Exception:
                pass

        elif isinstance(geom_obj, Curve):
            ent = curve_to_ifcx(geom_obj, handle_gen, layer=layer)
            if ent:
                entities.append(ent)

        elif isinstance(geom_obj, PolyLine):
            coords = geom_obj.GetCoordinates()
            if len(coords) >= 2:
                vertices = []
                for pt in coords:
                    p = xyz_to_list(pt)
                    vertices.append({"x": p[0], "y": p[1]})
                entity = {
                    "type": "LWPOLYLINE",
                    "handle": handle_gen.next(),
                    "layer": layer,
                    "closed": False,
                    "vertices": vertices,
                }
                entities.append(entity)


def _process_solid(solid, layer, handle_gen, entities):
    """Extract edges from a Solid for 2D representation."""
    try:
        edges = solid.Edges
        if edges:
            for edge in edges:
                try:
                    curve = edge.AsCurve()
                    if curve:
                        ent = curve_to_ifcx(curve, handle_gen, layer=layer)
                        if ent:
                            entities.append(ent)
                except Exception:
                    pass
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Table builders
# ---------------------------------------------------------------------------

def build_layers(doc, elements):
    """Build IFCX layers table from Revit categories."""
    layers = {"0": {}}

    for elem in elements:
        try:
            cat = elem.Category
            if cat is None:
                continue
            name = category_to_layer_name(cat)
            if name in layers:
                continue

            layer_def = {}
            color = get_category_color(cat)
            if color:
                layer_def["color"] = color

            # Line weight
            try:
                lw = cat.GetLineWeight(DB.GraphicsStyleType.Projection)
                if lw and lw > 0:
                    layer_def["lineweight"] = round(lw * 0.01, 2)  # hundredths to mm
            except Exception:
                pass

            layers[name] = layer_def
        except Exception:
            pass

    # Standard layers
    if "Grids" not in layers:
        layers["Grids"] = {"color": {"r": 0.5, "g": 0.5, "b": 0.5}, "linetype": "Center"}
    if "Levels" not in layers:
        layers["Levels"] = {"color": {"r": 0.0, "g": 0.0, "b": 1.0}, "linetype": "Dashed"}

    return layers


def build_text_styles(doc):
    """Build IFCX text styles from Revit TextNoteTypes."""
    styles = {"Standard": {"fontFamily": "Arial", "isTrueType": True}}

    try:
        collector = FilteredElementCollector(doc).OfClass(TextNoteType)
        for tnt in collector:
            try:
                name = tnt.get_Parameter(
                    DB.BuiltInParameter.ALL_MODEL_TYPE_NAME
                ).AsString()
                if not name:
                    continue

                style = {"isTrueType": True}

                # Font family
                font_param = tnt.get_Parameter(DB.BuiltInParameter.TEXT_FONT)
                if font_param and font_param.AsString():
                    style["fontFamily"] = font_param.AsString()
                else:
                    style["fontFamily"] = "Arial"

                # Bold
                bold_param = tnt.get_Parameter(DB.BuiltInParameter.TEXT_STYLE_BOLD)
                if bold_param and bold_param.AsInteger() == 1:
                    style["bold"] = True

                # Italic
                italic_param = tnt.get_Parameter(DB.BuiltInParameter.TEXT_STYLE_ITALIC)
                if italic_param and italic_param.AsInteger() == 1:
                    style["italic"] = True

                styles[name.replace(" ", "_")] = style
            except Exception:
                pass
    except Exception:
        pass

    return styles


def build_dim_styles(doc):
    """Build IFCX dimension styles from Revit DimensionTypes."""
    dim_styles = {
        "Standard": {
            "arrowSize": 2.5,
            "textHeight": 2.5,
            "textStyle": "Standard",
            "extLineOffset": 1.5,
            "extLineExtension": 1.25,
            "linearPrecision": 0,
            "overallScale": 1,
        }
    }

    try:
        collector = FilteredElementCollector(doc).OfClass(DimensionType)
        for dt in collector:
            try:
                name = dt.get_Parameter(
                    DB.BuiltInParameter.ALL_MODEL_TYPE_NAME
                ).AsString()
                if not name:
                    continue

                style = {
                    "textStyle": "Standard",
                    "overallScale": 1,
                }

                # Text size
                text_size_param = dt.get_Parameter(DB.BuiltInParameter.TEXT_SIZE)
                if text_size_param:
                    style["textHeight"] = ft_to_mm(text_size_param.AsDouble())
                    style["arrowSize"] = style["textHeight"]

                dim_styles[name.replace(" ", "_")] = style
            except Exception:
                pass
    except Exception:
        pass

    return dim_styles


def build_linetypes():
    """Build standard IFCX linetypes."""
    return {
        "Continuous": {"description": "Solid line", "pattern": []},
        "Dashed": {"description": "Dashed line", "patternLength": 12, "pattern": [8, -4]},
        "Center": {"description": "Center line", "patternLength": 20, "pattern": [12, -4, 2, -4]},
        "Hidden": {"description": "Hidden line", "patternLength": 8, "pattern": [4, -4]},
        "Phantom": {"description": "Phantom line", "patternLength": 28, "pattern": [16, -4, 2, -4, 2, -4]},
    }


# ---------------------------------------------------------------------------
# Header builder
# ---------------------------------------------------------------------------

def build_header(doc, view):
    """Build IFCX header from Revit project info."""
    header = {
        "application": "Autodesk Revit via PyRevit IFCX Exporter",
        "createDate": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "units": {
            "linear": "millimeters",
            "measurement": "metric",
            "linearPrecision": 4,
        },
    }

    # Project info
    try:
        proj_info = doc.ProjectInformation
        if proj_info:
            header["organization"] = proj_info.OrganizationName or ""
            # Use project name or number
            name = proj_info.Name or proj_info.Number or ""
            if name:
                header["author"] = name
    except Exception:
        pass

    # View name
    try:
        header["variables"] = {
            "sourceView": view.Name,
            "viewType": str(view.ViewType),
            "viewScale": view.Scale,
        }
    except Exception:
        pass

    return header


# ---------------------------------------------------------------------------
# Main export logic
# ---------------------------------------------------------------------------

def export_view_to_ifcx(doc, view):
    """Export a Revit view to an IFCX document dict.

    Args:
        doc: Revit Document
        view: Revit View

    Returns:
        dict: The IFCX document, or None on failure.
    """
    output = script.get_output()
    handle_gen = HandleGenerator()

    # Collect all visible elements in the view
    collector = FilteredElementCollector(doc, view.Id)
    all_elements = collector.WhereElementIsNotElementType().ToElements()

    output.print_md("**Collected {} elements from view '{}'**".format(
        len(all_elements), view.Name
    ))

    # Geometry options
    options = Options()
    options.View = view
    options.ComputeReferences = False

    entities = []
    stats = {
        "lines": 0,
        "arcs": 0,
        "circles": 0,
        "text": 0,
        "dimensions": 0,
        "hatches": 0,
        "splines": 0,
        "polylines": 0,
        "inserts": 0,
        "other": 0,
        "skipped": 0,
    }

    for elem in all_elements:
        try:
            # ----- TextNote -----
            if isinstance(elem, TextNote):
                ent = process_text_note(elem, handle_gen)
                if ent:
                    entities.append(ent)
                    stats["text"] += 1
                continue

            # ----- IndependentTag -----
            if isinstance(elem, IndependentTag):
                ent = process_independent_tag(elem, handle_gen)
                if ent:
                    entities.append(ent)
                    stats["text"] += 1
                continue

            # ----- Dimension -----
            if isinstance(elem, Dimension):
                dim_ents = process_dimension(elem, handle_gen)
                if dim_ents:
                    entities.extend(dim_ents)
                    stats["dimensions"] += len(dim_ents)
                continue

            # ----- SpotDimension -----
            if isinstance(elem, SpotDimension):
                dim_ents = process_dimension(elem, handle_gen)
                if dim_ents:
                    entities.extend(dim_ents)
                    stats["dimensions"] += len(dim_ents)
                continue

            # ----- FilledRegion -----
            if isinstance(elem, FilledRegion):
                ent = process_filled_region(elem, handle_gen)
                if ent:
                    entities.append(ent)
                    stats["hatches"] += 1
                continue

            # ----- Grid -----
            if isinstance(elem, Grid):
                grid_ents = process_grid(elem, handle_gen)
                entities.extend(grid_ents)
                stats["lines"] += len(grid_ents)
                continue

            # ----- Level (in section/elevation views) -----
            if isinstance(elem, Level):
                level_ents = process_level(elem, handle_gen)
                entities.extend(level_ents)
                stats["lines"] += len(level_ents)
                continue

            # ----- Detail curves -----
            if isinstance(elem, (DetailLine, DetailArc, DetailCurve, DetailNurbSpline)):
                try:
                    crv = elem.GeometryCurve
                    if crv:
                        ent = curve_to_ifcx(crv, handle_gen,
                                            layer=category_to_layer_name(elem.Category))
                        if ent:
                            entities.append(ent)
                            t = ent.get("type", "")
                            if t == "LINE":
                                stats["lines"] += 1
                            elif t == "ARC":
                                stats["arcs"] += 1
                            elif t == "CIRCLE":
                                stats["circles"] += 1
                            elif t == "SPLINE":
                                stats["splines"] += 1
                            else:
                                stats["other"] += 1
                except Exception:
                    pass
                continue

            # ----- Model curves -----
            if isinstance(elem, (ModelLine, ModelArc, ModelCurve)):
                try:
                    crv = elem.GeometryCurve
                    if crv:
                        ent = curve_to_ifcx(crv, handle_gen,
                                            layer=category_to_layer_name(elem.Category))
                        if ent:
                            entities.append(ent)
                            stats["lines"] += 1
                except Exception:
                    pass
                continue

            # ----- CurveElement (generic) -----
            if isinstance(elem, CurveElement):
                try:
                    crv = elem.GeometryCurve
                    if crv:
                        ent = curve_to_ifcx(crv, handle_gen,
                                            layer=category_to_layer_name(elem.Category))
                        if ent:
                            entities.append(ent)
                            stats["lines"] += 1
                except Exception:
                    pass
                continue

            # ----- Annotation FamilyInstance -----
            if isinstance(elem, FamilyInstance):
                try:
                    if elem.Symbol and elem.Symbol.Family:
                        if elem.Symbol.Family.FamilyPlacementType.ToString() == "ViewBased":
                            ent = process_family_instance_annotation(elem, handle_gen)
                            if ent:
                                entities.append(ent)
                                stats["inserts"] += 1
                                continue
                except Exception:
                    pass

            # ----- Groups -----
            if isinstance(elem, Group):
                # Groups are expanded - their members are collected individually
                continue

            # ----- Skip link instances -----
            if isinstance(elem, RevitLinkInstance):
                stats["skipped"] += 1
                continue

            # ----- Generic element: extract geometry -----
            geom_ents = extract_geometry_entities(elem, options, handle_gen)
            if geom_ents:
                entities.extend(geom_ents)
                for ent in geom_ents:
                    t = ent.get("type", "")
                    if t == "LINE":
                        stats["lines"] += 1
                    elif t == "ARC":
                        stats["arcs"] += 1
                    elif t == "CIRCLE":
                        stats["circles"] += 1
                    elif t == "SPLINE":
                        stats["splines"] += 1
                    elif t == "LWPOLYLINE":
                        stats["polylines"] += 1
                    else:
                        stats["other"] += 1
            else:
                stats["skipped"] += 1

        except Exception as e:
            stats["skipped"] += 1

    # Build document
    ifcx_doc = {
        "ifcx": "1.0",
        "header": build_header(doc, view),
        "tables": {
            "layers": build_layers(doc, all_elements),
            "linetypes": build_linetypes(),
            "textStyles": build_text_styles(doc),
            "dimStyles": build_dim_styles(doc),
        },
        "entities": entities,
    }

    # Print stats
    output.print_md("---")
    output.print_md("**Export Statistics:**")
    for key, val in sorted(stats.items()):
        if val > 0:
            output.print_md("- {}: {}".format(key, val))
    output.print_md("- **Total entities: {}**".format(len(entities)))

    return ifcx_doc


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main():
    doc = revit.doc
    active_view = doc.ActiveView

    if active_view is None:
        forms.alert("No active view found.", title="IFCX Export")
        return

    # Validate view type
    unsupported = [ViewType.Schedule, ViewType.DrawingSheet,
                   ViewType.Report, ViewType.Undefined]
    try:
        if active_view.ViewType in unsupported:
            forms.alert(
                "View type '{}' is not supported for geometry export.\n"
                "Please use a plan, section, elevation, or detail view.".format(
                    active_view.ViewType
                ),
                title="IFCX Export",
            )
            return
    except Exception:
        pass

    output = script.get_output()
    output.print_md("# IFCX Export")
    output.print_md("Exporting view: **{}**".format(active_view.Name))

    # Export
    ifcx_doc = export_view_to_ifcx(doc, active_view)
    if ifcx_doc is None or not ifcx_doc.get("entities"):
        forms.alert("No geometry found in the active view.", title="IFCX Export")
        return

    # Ask for save location
    save_path = forms.save_file(
        file_ext="ifcxb",
        default_name="{}.ifcxb".format(active_view.Name),
        unc_paths=False,
    )
    if not save_path:
        output.print_md("*Export cancelled.*")
        return

    # Encode to IFCXB
    try:
        binary_data = encode_ifcxb(ifcx_doc)
    except Exception as e:
        output.print_md("**Error encoding IFCXB:** {}".format(str(e)))
        output.print_md("Falling back to JSON (.ifcx) format...")
        save_path = save_path.replace(".ifcxb", ".ifcx")
        binary_data = encode_ifcx_json(ifcx_doc).encode("utf-8")

    # Write file
    try:
        with open(save_path, "wb") as f:
            f.write(binary_data)
    except Exception as e:
        forms.alert("Failed to write file:\n{}".format(str(e)), title="IFCX Export")
        return

    # Summary
    file_size = len(binary_data)
    entity_count = len(ifcx_doc.get("entities", []))

    if file_size > 1024 * 1024:
        size_str = "{:.1f} MB".format(file_size / (1024.0 * 1024.0))
    elif file_size > 1024:
        size_str = "{:.1f} KB".format(file_size / 1024.0)
    else:
        size_str = "{} bytes".format(file_size)

    output.print_md("---")
    output.print_md("## Export Complete")
    output.print_md("- **File:** {}".format(save_path))
    output.print_md("- **Size:** {}".format(size_str))
    output.print_md("- **Entities:** {}".format(entity_count))

    # Also show a task dialog
    try:
        from Autodesk.Revit.UI import TaskDialog, TaskDialogCommonButtons
        td = TaskDialog("IFCX Export Complete")
        td.MainContent = (
            "Exported {} entities to IFCXB.\n\n"
            "File: {}\n"
            "Size: {}"
        ).format(entity_count, os.path.basename(save_path), size_str)
        td.CommonButtons = TaskDialogCommonButtons.Ok
        td.Show()
    except Exception:
        pass


# Run the script
if __name__ == "__main__" or True:
    main()
