"""
Import IFCX/IFCXB into Revit - PyRevit Pushbutton Script

Imports an IFCX (.ifcx JSON) or IFCXB (.ifcxb binary) file into the
active Revit view as detail lines, arcs, text notes, and filled regions.

Compatible with IronPython 2.7 and CPython 3 (pyRevit 4.8+).
"""

from __future__ import print_function

import sys
import os
import math
import json

# Add the ExportView pushbutton directory for shared encoder module
script_dir = os.path.dirname(__file__)
export_view_dir = os.path.join(
    os.path.dirname(os.path.dirname(script_dir)),
    "Export.panel", "ExportView.pushbutton"
)
if export_view_dir not in sys.path:
    sys.path.insert(0, export_view_dir)

from ifcx_encoder import decode_ifcxb

# Revit API imports
from Autodesk.Revit.DB import (
    XYZ,
    Line,
    Arc,
    Ellipse,
    NurbSpline,
    CurveLoop,
    Plane,
    SketchPlane,
    TextNote,
    TextNoteOptions,
    TextNoteType,
    FilledRegion,
    FilledRegionType,
    FilteredElementCollector,
    ElementId,
    ViewType,
    Transaction,
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

MM_TO_FEET = 1.0 / 304.8


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def pt_to_xyz(pt):
    """Convert [x, y, z] or [x, y] in mm to Revit XYZ in feet."""
    x = pt[0] * MM_TO_FEET if len(pt) > 0 else 0
    y = pt[1] * MM_TO_FEET if len(pt) > 1 else 0
    z = pt[2] * MM_TO_FEET if len(pt) > 2 else 0
    return XYZ(x, y, z)


def get_sketch_plane(doc, view):
    """Get or create a sketch plane for the active view."""
    sp = view.SketchPlane
    if sp is not None:
        return sp

    # Create a sketch plane on the view's plane
    try:
        plane = view.GetPlane() if hasattr(view, "GetPlane") else None
        if plane is None:
            plane = Plane.CreateByNormalAndOrigin(XYZ.BasisZ, XYZ.Zero)
        sp = SketchPlane.Create(doc, plane)
        return sp
    except Exception:
        # Fallback: create at Z=0
        plane = Plane.CreateByNormalAndOrigin(XYZ.BasisZ, XYZ.Zero)
        return SketchPlane.Create(doc, plane)


def get_default_text_type(doc):
    """Get the default TextNoteType from the document."""
    collector = FilteredElementCollector(doc).OfClass(TextNoteType)
    for tnt in collector:
        return tnt.Id
    return None


def get_default_filled_region_type(doc):
    """Get the default FilledRegionType from the document."""
    collector = FilteredElementCollector(doc).OfClass(FilledRegionType)
    for frt in collector:
        return frt.Id
    return None


# ---------------------------------------------------------------------------
# File loading
# ---------------------------------------------------------------------------

def load_ifcx_file(filepath):
    """Load an IFCX or IFCXB file and return the document dict."""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".ifcxb":
        with open(filepath, "rb") as f:
            data = f.read()
        return decode_ifcxb(data)
    else:
        # Assume JSON
        with open(filepath, "r") as f:
            content = f.read()
        return json.loads(content)


# ---------------------------------------------------------------------------
# Entity creators
# ---------------------------------------------------------------------------

def create_line(doc, view, sketch_plane, entity):
    """Create a DetailLine from a LINE entity."""
    start = pt_to_xyz(entity.get("start", [0, 0, 0]))
    end = pt_to_xyz(entity.get("end", [0, 0, 0]))

    # Skip zero-length lines
    if start.DistanceTo(end) < 0.001:
        return None

    line = Line.CreateBound(start, end)
    try:
        return doc.Create.NewDetailCurve(view, line)
    except Exception:
        return None


def create_arc(doc, view, sketch_plane, entity):
    """Create a DetailArc from an ARC entity."""
    center = pt_to_xyz(entity.get("center", [0, 0, 0]))
    radius = entity.get("radius", 10) * MM_TO_FEET
    start_angle = entity.get("startAngle", 0)
    end_angle = entity.get("endAngle", 2 * math.pi)

    if radius < 0.001:
        return None

    # Create arc from center, radius, and angles
    # Revit Arc.Create needs start, end, and a point on the arc
    start_pt = XYZ(
        center.X + radius * math.cos(start_angle),
        center.Y + radius * math.sin(start_angle),
        center.Z,
    )
    end_pt = XYZ(
        center.X + radius * math.cos(end_angle),
        center.Y + radius * math.sin(end_angle),
        center.Z,
    )
    mid_angle = (start_angle + end_angle) / 2.0
    if end_angle < start_angle:
        mid_angle += math.pi
    mid_pt = XYZ(
        center.X + radius * math.cos(mid_angle),
        center.Y + radius * math.sin(mid_angle),
        center.Z,
    )

    # Skip degenerate arcs
    if start_pt.DistanceTo(end_pt) < 0.001:
        return None

    try:
        arc = Arc.Create(start_pt, end_pt, mid_pt)
        return doc.Create.NewDetailCurve(view, arc)
    except Exception:
        return None


def create_circle(doc, view, sketch_plane, entity):
    """Create a DetailArc (full circle) from a CIRCLE entity."""
    center = pt_to_xyz(entity.get("center", [0, 0, 0]))
    radius = entity.get("radius", 10) * MM_TO_FEET

    if radius < 0.001:
        return None

    try:
        # Revit doesn't have a "circle" curve - use Arc.Create with
        # center, radius, angles 0 to 2*pi
        arc = Arc.Create(
            Plane.CreateByNormalAndOrigin(XYZ.BasisZ, center),
            radius,
            0,
            2 * math.pi,
        )
        return doc.Create.NewDetailCurve(view, arc)
    except Exception:
        return None


def create_text(doc, view, entity, text_type_id):
    """Create a TextNote from a TEXT or MTEXT entity."""
    text = entity.get("text", "")
    if not text:
        return None

    # Convert MTEXT formatting
    text = text.replace("\\P", "\n").replace("\\p", "\n")

    ip = pt_to_xyz(entity.get("insertionPoint", [0, 0, 0]))

    if text_type_id is None:
        return None

    try:
        opts = TextNoteOptions(text_type_id)
        opts.HorizontalAlignment = DB.HorizontalTextAlignment.Left

        # Map alignment
        h_align = entity.get("horizontalAlignment", "left")
        if h_align == "center":
            opts.HorizontalAlignment = DB.HorizontalTextAlignment.Center
        elif h_align == "right":
            opts.HorizontalAlignment = DB.HorizontalTextAlignment.Right

        note = TextNote.Create(doc, view.Id, ip, text, opts)
        return note
    except Exception:
        # Fallback for older Revit API
        try:
            note = TextNote.Create(doc, view.Id, ip, text, text_type_id)
            return note
        except Exception:
            return None


def create_lwpolyline(doc, view, sketch_plane, entity):
    """Create DetailLines from an LWPOLYLINE entity."""
    vertices = entity.get("vertices", [])
    if len(vertices) < 2:
        return []

    created = []
    closed = entity.get("closed", False)

    points = []
    for v in vertices:
        if isinstance(v, dict):
            x = v.get("x", 0)
            y = v.get("y", 0)
        elif isinstance(v, (list, tuple)):
            x = v[0] if len(v) > 0 else 0
            y = v[1] if len(v) > 1 else 0
        else:
            continue
        points.append(XYZ(x * MM_TO_FEET, y * MM_TO_FEET, 0))

    for i in range(len(points) - 1):
        if points[i].DistanceTo(points[i + 1]) < 0.001:
            continue
        try:
            line = Line.CreateBound(points[i], points[i + 1])
            elem = doc.Create.NewDetailCurve(view, line)
            if elem:
                created.append(elem)
        except Exception:
            pass

    # Close the polyline
    if closed and len(points) >= 3:
        if points[-1].DistanceTo(points[0]) >= 0.001:
            try:
                line = Line.CreateBound(points[-1], points[0])
                elem = doc.Create.NewDetailCurve(view, line)
                if elem:
                    created.append(elem)
            except Exception:
                pass

    return created


def create_spline(doc, view, sketch_plane, entity):
    """Create a DetailCurve from a SPLINE entity."""
    ctrl_pts = entity.get("controlPoints", [])
    knots = entity.get("knots", [])
    degree = entity.get("degree", 3)
    weights = entity.get("weights")

    if len(ctrl_pts) < 2:
        return None

    # Convert control points
    pts = []
    for cp in ctrl_pts:
        pts.append(pt_to_xyz(cp))

    # Convert to IList for Revit API
    try:
        from System.Collections.Generic import List as SysList
        pt_list = SysList[XYZ]()
        for p in pts:
            pt_list.Add(p)

        knot_list = SysList[float]()
        for k in knots:
            knot_list.Add(float(k))

        if weights:
            w_list = SysList[float]()
            for w in weights:
                w_list.Add(float(w))
            spline = NurbSpline.CreateCurve(degree, knot_list, pt_list, w_list)
        else:
            spline = NurbSpline.CreateCurve(degree, knot_list, pt_list)

        return doc.Create.NewDetailCurve(view, spline)
    except Exception:
        # Fallback: create as polyline segments
        created = []
        for i in range(len(pts) - 1):
            if pts[i].DistanceTo(pts[i + 1]) < 0.001:
                continue
            try:
                line = Line.CreateBound(pts[i], pts[i + 1])
                elem = doc.Create.NewDetailCurve(view, line)
                if elem:
                    created.append(elem)
            except Exception:
                pass
        return created if created else None


def create_ellipse(doc, view, sketch_plane, entity):
    """Create a DetailCurve from an ELLIPSE entity."""
    center = pt_to_xyz(entity.get("center", [0, 0, 0]))
    major_ep = entity.get("majorAxisEndpoint", [100, 0, 0])

    # Major axis length and direction
    major_dx = major_ep[0] * MM_TO_FEET
    major_dy = major_ep[1] * MM_TO_FEET
    major_dz = major_ep[2] * MM_TO_FEET if len(major_ep) > 2 else 0
    major_radius = math.sqrt(major_dx ** 2 + major_dy ** 2 + major_dz ** 2)

    ratio = entity.get("minorAxisRatio", 0.5)
    minor_radius = major_radius * ratio

    if major_radius < 0.001 or minor_radius < 0.001:
        return None

    # Normalize major axis direction
    if major_radius > 0:
        x_dir = XYZ(major_dx / major_radius,
                     major_dy / major_radius,
                     major_dz / major_radius)
    else:
        x_dir = XYZ.BasisX

    y_dir = XYZ(-x_dir.Y, x_dir.X, 0)  # perpendicular in XY plane

    try:
        ellipse = Ellipse.CreateCurve(
            center, major_radius, minor_radius,
            x_dir, y_dir,
            entity.get("startParam", 0),
            entity.get("endParam", 2 * math.pi),
        )
        return doc.Create.NewDetailCurve(view, ellipse)
    except Exception:
        return None


def create_hatch(doc, view, entity, filled_region_type_id):
    """Create a FilledRegion from a HATCH entity."""
    if filled_region_type_id is None:
        return None

    boundaries = entity.get("boundaries", [])
    if not boundaries:
        return None

    curve_loops = []

    for boundary in boundaries:
        poly = boundary.get("polyline", {})
        verts = poly.get("vertices", [])
        if not verts:
            continue

        loop = CurveLoop()
        points = []
        for v in verts:
            if isinstance(v, dict):
                x = v.get("x", 0)
                y = v.get("y", 0)
            elif isinstance(v, (list, tuple)):
                x = v[0] if len(v) > 0 else 0
                y = v[1] if len(v) > 1 else 0
            else:
                continue
            points.append(XYZ(x * MM_TO_FEET, y * MM_TO_FEET, 0))

        if len(points) < 3:
            continue

        # Create lines for each segment
        try:
            for i in range(len(points)):
                p1 = points[i]
                p2 = points[(i + 1) % len(points)]
                if p1.DistanceTo(p2) < 0.001:
                    continue
                loop.Append(Line.CreateBound(p1, p2))
            curve_loops.append(loop)
        except Exception:
            continue

    if not curve_loops:
        return None

    try:
        # Create CurveLoop list
        from System.Collections.Generic import List as SysList
        loop_list = SysList[CurveLoop]()
        for cl in curve_loops:
            loop_list.Add(cl)

        return FilledRegion.Create(
            doc, filled_region_type_id, view.Id, loop_list
        )
    except Exception:
        return None


def create_dimension_as_lines(doc, view, sketch_plane, entity):
    """Create dimension representation as lines + text (simplified)."""
    created = []
    etype = entity.get("type", "")

    if etype == "DIMENSION_LINEAR":
        d1 = entity.get("defPoint1", [0, 0, 0])
        d2 = entity.get("defPoint2", [0, 0, 0])
        dl = entity.get("dimLinePoint", [0, 0, 0])

        p1 = pt_to_xyz(d1)
        p2 = pt_to_xyz(d2)

        if p1.DistanceTo(p2) < 0.001:
            return created

        try:
            line = Line.CreateBound(p1, p2)
            elem = doc.Create.NewDetailCurve(view, line)
            if elem:
                created.append(elem)
        except Exception:
            pass

    elif etype == "DIMENSION_RADIUS":
        c = entity.get("center", [0, 0, 0])
        cp = entity.get("chordPoint", [0, 0, 0])

        p1 = pt_to_xyz(c)
        p2 = pt_to_xyz(cp)

        if p1.DistanceTo(p2) < 0.001:
            return created

        try:
            line = Line.CreateBound(p1, p2)
            elem = doc.Create.NewDetailCurve(view, line)
            if elem:
                created.append(elem)
        except Exception:
            pass

    return created


# ---------------------------------------------------------------------------
# Main import logic
# ---------------------------------------------------------------------------

def import_ifcx_to_view(doc, view, ifcx_doc):
    """Import IFCX entities into a Revit view.

    Args:
        doc: Revit Document
        view: Revit View
        ifcx_doc: IFCX document dict

    Returns:
        dict: Statistics of created elements.
    """
    output = script.get_output()
    entities = ifcx_doc.get("entities", [])

    if not entities:
        output.print_md("*No entities found in file.*")
        return {"total": 0}

    output.print_md("**Importing {} entities...**".format(len(entities)))

    # Get defaults
    sketch_plane = get_sketch_plane(doc, view)
    text_type_id = get_default_text_type(doc)
    filled_region_type_id = get_default_filled_region_type(doc)

    stats = {
        "lines": 0,
        "arcs": 0,
        "circles": 0,
        "text": 0,
        "polylines": 0,
        "splines": 0,
        "ellipses": 0,
        "hatches": 0,
        "dimensions": 0,
        "skipped": 0,
        "errors": 0,
    }

    for entity in entities:
        etype = entity.get("type", "")

        try:
            if etype == "LINE":
                result = create_line(doc, view, sketch_plane, entity)
                if result:
                    stats["lines"] += 1
                else:
                    stats["skipped"] += 1

            elif etype == "ARC":
                result = create_arc(doc, view, sketch_plane, entity)
                if result:
                    stats["arcs"] += 1
                else:
                    stats["skipped"] += 1

            elif etype == "CIRCLE":
                result = create_circle(doc, view, sketch_plane, entity)
                if result:
                    stats["circles"] += 1
                else:
                    stats["skipped"] += 1

            elif etype in ("TEXT", "MTEXT"):
                result = create_text(doc, view, entity, text_type_id)
                if result:
                    stats["text"] += 1
                else:
                    stats["skipped"] += 1

            elif etype == "LWPOLYLINE":
                results = create_lwpolyline(doc, view, sketch_plane, entity)
                if results:
                    stats["polylines"] += len(results)
                else:
                    stats["skipped"] += 1

            elif etype == "SPLINE":
                result = create_spline(doc, view, sketch_plane, entity)
                if result:
                    stats["splines"] += 1
                else:
                    stats["skipped"] += 1

            elif etype == "ELLIPSE":
                result = create_ellipse(doc, view, sketch_plane, entity)
                if result:
                    stats["ellipses"] += 1
                else:
                    stats["skipped"] += 1

            elif etype == "HATCH":
                result = create_hatch(doc, view, entity,
                                      filled_region_type_id)
                if result:
                    stats["hatches"] += 1
                else:
                    stats["skipped"] += 1

            elif etype in ("DIMENSION_LINEAR", "DIMENSION_RADIUS",
                           "DIMENSION_ANGULAR", "DIMENSION_DIAMETER"):
                results = create_dimension_as_lines(
                    doc, view, sketch_plane, entity
                )
                if results:
                    stats["dimensions"] += len(results)
                else:
                    stats["skipped"] += 1

            elif etype == "LEADER":
                # Import leader as polyline segments
                verts = entity.get("vertices", [])
                for i in range(len(verts) - 1):
                    p1 = pt_to_xyz(verts[i])
                    p2 = pt_to_xyz(verts[i + 1])
                    if p1.DistanceTo(p2) < 0.001:
                        continue
                    try:
                        line = Line.CreateBound(p1, p2)
                        doc.Create.NewDetailCurve(view, line)
                        stats["lines"] += 1
                    except Exception:
                        stats["errors"] += 1

            elif etype == "INSERT":
                # Block references: skip (would need block definition import)
                stats["skipped"] += 1

            elif etype == "TABLE":
                # Tables: skip
                stats["skipped"] += 1

            elif etype == "SOLID":
                # Solid fill triangles: skip
                stats["skipped"] += 1

            else:
                stats["skipped"] += 1

        except Exception as e:
            stats["errors"] += 1

    stats["total"] = sum(stats.values()) - stats["skipped"] - stats["errors"]
    return stats


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main():
    doc = revit.doc
    active_view = doc.ActiveView

    if active_view is None:
        forms.alert("No active view found.", title="IFCX Import")
        return

    # Validate view type - must support detail curves
    supported_types = [
        ViewType.FloorPlan, ViewType.CeilingPlan, ViewType.EngineeringPlan,
        ViewType.AreaPlan, ViewType.Section, ViewType.Elevation,
        ViewType.Detail, ViewType.DraftingView,
    ]
    try:
        if active_view.ViewType not in supported_types:
            forms.alert(
                "View type '{}' does not support detail elements.\n"
                "Please use a plan, section, elevation, detail, or "
                "drafting view.".format(active_view.ViewType),
                title="IFCX Import",
            )
            return
    except Exception:
        pass

    output = script.get_output()
    output.print_md("# IFCX Import")

    # Open file dialog
    filepath = forms.pick_file(
        file_ext="ifcxb",
        multi_file=False,
        title="Select IFCX or IFCXB file",
        init_dir=None,
        restore_dir=True,
    )
    if not filepath:
        # Try ifcx extension
        filepath = forms.pick_file(
            file_ext="ifcx",
            multi_file=False,
            title="Select IFCX file",
        )
    if not filepath:
        output.print_md("*Import cancelled.*")
        return

    output.print_md("Loading: **{}**".format(os.path.basename(filepath)))

    # Load file
    try:
        ifcx_doc = load_ifcx_file(filepath)
    except Exception as e:
        forms.alert(
            "Failed to load file:\n{}".format(str(e)),
            title="IFCX Import",
        )
        return

    entity_count = len(ifcx_doc.get("entities", []))
    output.print_md("Found **{}** entities in file.".format(entity_count))

    if entity_count == 0:
        forms.alert("No entities found in the IFCX file.", title="IFCX Import")
        return

    # Import within a transaction
    with revit.Transaction("Import IFCX"):
        stats = import_ifcx_to_view(doc, active_view, ifcx_doc)

    # Print stats
    output.print_md("---")
    output.print_md("## Import Complete")
    for key, val in sorted(stats.items()):
        if val > 0:
            output.print_md("- {}: {}".format(key, val))

    # Task dialog
    try:
        from Autodesk.Revit.UI import TaskDialog, TaskDialogCommonButtons
        td = TaskDialog("IFCX Import Complete")
        td.MainContent = (
            "Imported {} elements from IFCX.\n\n"
            "File: {}\n"
            "Lines: {}, Arcs: {}, Text: {}, Hatches: {}\n"
            "Skipped: {}, Errors: {}"
        ).format(
            stats.get("total", 0),
            os.path.basename(filepath),
            stats.get("lines", 0),
            stats.get("arcs", 0),
            stats.get("text", 0),
            stats.get("hatches", 0),
            stats.get("skipped", 0),
            stats.get("errors", 0),
        )
        td.CommonButtons = TaskDialogCommonButtons.Ok
        td.Show()
    except Exception:
        pass


if __name__ == "__main__" or True:
    main()
