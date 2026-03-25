"""IFCX Import module for FreeCAD.

Provides open() and insert() functions called by FreeCAD's import system
when a user opens or inserts an .ifcx or .ifcxb file.
"""

from __future__ import annotations

import math
import os
import sys

import FreeCAD

# Ensure the workbench directory is on sys.path so ifcx_core can be found
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if _THIS_DIR not in sys.path:
    sys.path.insert(0, _THIS_DIR)

from ifcx_core import (
    IfcxDocument,
    read_ifcx,
    color_dict_to_rgb,
)


# ---------------------------------------------------------------------------
# Public API expected by FreeCAD
# ---------------------------------------------------------------------------

def open(filename: str) -> None:
    """Open an IFCX/IFCXB file as a new document."""
    doc_name = os.path.splitext(os.path.basename(filename))[0]
    doc = FreeCAD.newDocument(doc_name)
    _import_ifcx(filename, doc)
    doc.recompute()
    FreeCAD.Console.PrintMessage(f"IFCX: Opened {filename}\n")


def insert(filename: str, docname: str = None) -> None:
    """Insert an IFCX/IFCXB file into an existing document."""
    if docname:
        doc = FreeCAD.getDocument(docname)
    else:
        doc = FreeCAD.ActiveDocument
    if doc is None:
        doc = FreeCAD.newDocument("IFCX Import")
    _import_ifcx(filename, doc)
    doc.recompute()
    FreeCAD.Console.PrintMessage(f"IFCX: Inserted {filename}\n")


# ---------------------------------------------------------------------------
# Internal import logic
# ---------------------------------------------------------------------------

def _import_ifcx(filename: str, doc) -> None:
    """Read an IFCX document and populate a FreeCAD document."""
    ifcx_doc = read_ifcx(filename)

    # Resolve layer colors for entities that inherit from layer
    layer_colors = {}
    layers_table = ifcx_doc.tables.get("layers", {})
    for layer_name, layer_data in layers_table.items():
        color = layer_data.get("color")
        if isinstance(color, dict):
            layer_colors[layer_name] = color_dict_to_rgb(color)

    # Create FreeCAD groups for layers
    layer_groups = {}
    for layer_name in layers_table:
        grp = doc.addObject("App::DocumentObjectGroup", _sanitize(layer_name))
        layer_groups[layer_name] = grp

    # Process block definitions
    block_data = {}
    for block_name, bdata in ifcx_doc.blocks.items():
        block_data[block_name] = bdata

    # Create entities
    for entity in ifcx_doc.entities:
        try:
            obj = _create_entity(doc, entity, block_data, ifcx_doc)
            if obj is None:
                continue

            # Assign to layer group
            layer = entity.get("layer", "0")
            if layer in layer_groups:
                layer_groups[layer].addObject(obj)

            # Set color
            _apply_color(obj, entity, layer, layer_colors)

        except Exception as exc:
            FreeCAD.Console.PrintWarning(
                f"IFCX: Could not create entity {entity.get('type', '?')} "
                f"(handle={entity.get('handle', '?')}): {exc}\n"
            )


def _sanitize(name: str) -> str:
    """Make a string safe for FreeCAD object names."""
    safe = name.replace(" ", "_").replace("-", "_")
    # Remove characters not allowed in FreeCAD names
    safe = "".join(c for c in safe if c.isalnum() or c == "_")
    if not safe or safe[0].isdigit():
        safe = "L_" + safe
    return safe


def _apply_color(obj, entity: dict, layer: str, layer_colors: dict) -> None:
    """Set the visual color on a FreeCAD object."""
    if not hasattr(obj, "ViewObject") or obj.ViewObject is None:
        return

    color = entity.get("color")
    if isinstance(color, dict):
        rgb = color_dict_to_rgb(color)
    elif layer in layer_colors:
        rgb = layer_colors[layer]
    else:
        return

    try:
        obj.ViewObject.LineColor = rgb + (0.0,)
        obj.ViewObject.ShapeColor = rgb + (0.0,)
    except Exception:
        pass


def _vec(point) -> "FreeCAD.Vector":
    """Convert an IFCX point (list/tuple) to FreeCAD.Vector."""
    if isinstance(point, dict):
        return FreeCAD.Vector(
            float(point.get("x", 0)),
            float(point.get("y", 0)),
            float(point.get("z", 0)),
        )
    if isinstance(point, (list, tuple)):
        x = float(point[0]) if len(point) > 0 else 0.0
        y = float(point[1]) if len(point) > 1 else 0.0
        z = float(point[2]) if len(point) > 2 else 0.0
        return FreeCAD.Vector(x, y, z)
    return FreeCAD.Vector(0, 0, 0)


# ---------------------------------------------------------------------------
# Entity creation
# ---------------------------------------------------------------------------

def _create_entity(doc, entity: dict, block_data: dict, ifcx_doc: IfcxDocument):
    """Dispatch entity creation by type. Returns a FreeCAD object or None."""
    etype = entity.get("type", "")
    handler = _ENTITY_HANDLERS.get(etype)
    if handler:
        return handler(doc, entity, block_data, ifcx_doc)

    FreeCAD.Console.PrintLog(f"IFCX: Unsupported entity type '{etype}'\n")
    return None


def _make_line(doc, ent, *_):
    import Part
    start = _vec(ent.get("start", [0, 0, 0]))
    end = _vec(ent.get("end", [0, 0, 0]))
    if start.isEqual(end, 1e-6):
        return None
    shape = Part.makeLine(start, end)
    obj = doc.addObject("Part::Feature", "Line")
    obj.Shape = shape
    return obj


def _make_point(doc, ent, *_):
    """Create a Draft Point or Part vertex."""
    pos = _vec(ent.get("position", [0, 0, 0]))
    try:
        import Draft
        obj = Draft.make_point(pos.x, pos.y, pos.z)
        return obj
    except Exception:
        import Part
        obj = doc.addObject("Part::Feature", "Point")
        obj.Shape = Part.Point(pos).toShape()
        return obj


def _make_circle(doc, ent, *_):
    import Part
    center = _vec(ent.get("center", [0, 0, 0]))
    radius = float(ent.get("radius", 1))
    if radius <= 0:
        return None
    edge = Part.makeCircle(radius, center)
    obj = doc.addObject("Part::Feature", "Circle")
    obj.Shape = Part.Wire(edge)
    return obj


def _make_arc(doc, ent, *_):
    import Part
    center = _vec(ent.get("center", [0, 0, 0]))
    radius = float(ent.get("radius", 1))
    start_angle = math.degrees(float(ent.get("startAngle", 0)))
    end_angle = math.degrees(float(ent.get("endAngle", math.pi)))
    if radius <= 0:
        return None
    edge = Part.makeCircle(radius, center, FreeCAD.Vector(0, 0, 1), start_angle, end_angle)
    obj = doc.addObject("Part::Feature", "Arc")
    obj.Shape = Part.Wire(edge)
    return obj


def _make_ellipse(doc, ent, *_):
    import Part
    center = _vec(ent.get("center", [0, 0, 0]))
    major_ep = _vec(ent.get("majorAxisEndpoint", [1, 0, 0]))
    ratio = float(ent.get("minorAxisRatio", 0.5))

    major_len = major_ep.Length
    if major_len <= 0:
        return None
    minor_len = major_len * ratio

    # Part.Ellipse(S1, S2, Center) where S1 is major semi-axis length
    ellipse = Part.Ellipse(center, major_len, minor_len)

    # Compute rotation from default X-axis to majorAxisEndpoint direction
    angle = math.atan2(major_ep.y, major_ep.x)
    if abs(angle) > 1e-9:
        ellipse.rotate(Part.Vector(center.x, center.y, center.z),
                       Part.Vector(0, 0, 1), math.degrees(angle))

    start_param = float(ent.get("startParam", 0))
    end_param = float(ent.get("endParam", 2 * math.pi))

    if abs(end_param - start_param - 2 * math.pi) < 1e-6:
        edge = ellipse.toShape()
    else:
        edge = ellipse.toShape(start_param, end_param)

    obj = doc.addObject("Part::Feature", "Ellipse")
    obj.Shape = Part.Wire(edge) if edge.ShapeType == "Edge" else edge
    return obj


def _make_spline(doc, ent, *_):
    import Part
    degree = int(ent.get("degree", 3))
    cps = ent.get("controlPoints", [])
    knots = ent.get("knots", [])

    if len(cps) < 2:
        return None

    points = [_vec(p) for p in cps]

    try:
        bs = Part.BSplineCurve()

        # Determine multiplicities from knots
        unique_knots = []
        mults = []
        for k in knots:
            if not unique_knots or abs(k - unique_knots[-1]) > 1e-10:
                unique_knots.append(k)
                mults.append(1)
            else:
                mults[-1] += 1

        if unique_knots and mults:
            bs.buildFromPolesMultsKnots(
                points, mults, unique_knots, False, degree
            )
        else:
            # Fallback: interpolate through points
            bs.interpolate(points)

        edge = bs.toShape()
        obj = doc.addObject("Part::Feature", "Spline")
        obj.Shape = Part.Wire(edge) if edge.ShapeType == "Edge" else edge
        return obj
    except Exception as exc:
        FreeCAD.Console.PrintWarning(f"IFCX: Spline creation failed, using interpolation: {exc}\n")
        try:
            bs = Part.BSplineCurve()
            bs.interpolate(points)
            edge = bs.toShape()
            obj = doc.addObject("Part::Feature", "Spline")
            obj.Shape = Part.Wire(edge) if edge.ShapeType == "Edge" else edge
            return obj
        except Exception:
            return None


def _make_lwpolyline(doc, ent, *_):
    """Create a wire from LWPOLYLINE vertices, handling bulge (arc segments)."""
    import Part
    vertices = ent.get("vertices", [])
    closed = ent.get("closed", False)

    if len(vertices) < 2:
        return None

    points = []
    bulges = []
    for v in vertices:
        if isinstance(v, dict):
            points.append(FreeCAD.Vector(float(v.get("x", 0)),
                                         float(v.get("y", 0)),
                                         float(v.get("z", 0))))
            bulges.append(float(v.get("bulge", 0)))
        else:
            points.append(FreeCAD.Vector(float(v[0]), float(v[1]),
                                         float(v[2]) if len(v) > 2 else 0))
            bulges.append(0)

    edges = []
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        if not closed and j == 0 and i == n - 1:
            break
        p1 = points[i]
        p2 = points[j]
        bulge = bulges[i]

        if abs(bulge) < 1e-10:
            if not p1.isEqual(p2, 1e-6):
                edges.append(Part.makeLine(p1, p2))
        else:
            arc_edge = _bulge_to_arc(p1, p2, bulge)
            if arc_edge:
                edges.append(arc_edge)

    if not edges:
        return None

    wire = Part.Wire(edges)
    obj = doc.addObject("Part::Feature", "Polyline")
    obj.Shape = wire
    return obj


def _bulge_to_arc(p1, p2, bulge):
    """Convert a bulge value between two 2D points to a Part arc edge."""
    import Part
    dx = p2.x - p1.x
    dy = p2.y - p1.y
    chord = math.sqrt(dx * dx + dy * dy)
    if chord < 1e-10:
        return None

    sagitta = abs(bulge) * chord / 2.0
    radius = (chord * chord / 4.0 + sagitta * sagitta) / (2.0 * sagitta)

    # Center of chord
    mx = (p1.x + p2.x) / 2.0
    my = (p1.y + p2.y) / 2.0

    # Perpendicular direction
    px = -dy / chord
    py = dx / chord

    # Distance from midpoint to center
    d = radius - sagitta
    if bulge < 0:
        d = -d

    cx = mx + px * d
    cy = my + py * d
    center = FreeCAD.Vector(cx, cy, 0)

    # Calculate start/end angles
    start_angle = math.atan2(p1.y - cy, p1.x - cx)
    end_angle = math.atan2(p2.y - cy, p2.x - cx)

    sa_deg = math.degrees(start_angle)
    ea_deg = math.degrees(end_angle)

    # Bulge > 0 means CCW arc, < 0 means CW
    if bulge > 0:
        if ea_deg <= sa_deg:
            ea_deg += 360
    else:
        if sa_deg <= ea_deg:
            sa_deg += 360
        sa_deg, ea_deg = ea_deg, sa_deg

    try:
        edge = Part.makeCircle(abs(radius), center,
                               FreeCAD.Vector(0, 0, 1), sa_deg, ea_deg)
        return edge
    except Exception:
        return Part.makeLine(p1, p2)


def _make_text(doc, ent, *_):
    """Create a Draft text annotation."""
    text = ent.get("text", "")
    ip = _vec(ent.get("insertionPoint", [0, 0, 0]))
    try:
        import Draft
        lines = text.replace("\\P", "\n").split("\n")
        obj = Draft.make_text(lines, ip)
        height = ent.get("height")
        if height and hasattr(obj, "ViewObject") and obj.ViewObject:
            try:
                obj.ViewObject.FontSize = float(height)
            except Exception:
                pass
        return obj
    except Exception as exc:
        FreeCAD.Console.PrintWarning(f"IFCX: Text creation failed: {exc}\n")
        return None


def _make_mtext(doc, ent, *_):
    """Create a Draft text for MTEXT entities."""
    return _make_text(doc, ent)


def _make_dimension_linear(doc, ent, *_):
    """Create a Draft linear dimension."""
    p1 = _vec(ent.get("defPoint1", [0, 0, 0]))
    p2 = _vec(ent.get("defPoint2", [0, 0, 0]))
    dim_pt = _vec(ent.get("dimLinePoint", [0, 0, 0]))
    try:
        import Draft
        obj = Draft.make_linear_dimension(p1, p2, dim_pt)
        return obj
    except Exception as exc:
        FreeCAD.Console.PrintWarning(f"IFCX: Dimension creation failed: {exc}\n")
        return None


def _make_dimension_aligned(doc, ent, *_):
    """Create a Draft linear dimension for DIMENSION_ALIGNED."""
    return _make_dimension_linear(doc, ent)


def _make_dimension_radius(doc, ent, *_):
    """Create radius dimension as annotation line + text."""
    center = _vec(ent.get("center", [0, 0, 0]))
    chord = _vec(ent.get("chordPoint", [0, 0, 0]))
    radius = center.distanceToPoint(chord)
    try:
        import Part
        line = Part.makeLine(center, chord)
        obj = doc.addObject("Part::Feature", "RadiusDim")
        obj.Shape = line
        return obj
    except Exception:
        return None


def _make_dimension_diameter(doc, ent, *_):
    """Create diameter dimension as annotation line."""
    return _make_dimension_radius(doc, ent)


def _make_dimension_angular(doc, ent, *_):
    """Create angular dimension as annotation lines."""
    center = _vec(ent.get("center", [0, 0, 0]))
    p1 = _vec(ent.get("defPoint1", [0, 0, 0]))
    p2 = _vec(ent.get("defPoint2", [0, 0, 0]))
    try:
        import Part
        edges = [Part.makeLine(center, p1), Part.makeLine(center, p2)]
        wire = Part.Wire(Part.sortEdges(edges)[0]) if len(edges) > 1 else Part.Wire(edges)
        obj = doc.addObject("Part::Feature", "AngularDim")
        obj.Shape = wire
        return obj
    except Exception:
        return None


def _make_dimension_ordinate(doc, ent, *_):
    """Create ordinate dimension as a line."""
    fp = _vec(ent.get("featurePoint", [0, 0, 0]))
    ep = _vec(ent.get("leaderEndpoint", [0, 0, 0]))
    try:
        import Part
        line = Part.makeLine(fp, ep)
        obj = doc.addObject("Part::Feature", "OrdinateDim")
        obj.Shape = line
        return obj
    except Exception:
        return None


def _make_leader(doc, ent, *_):
    """Create a leader line."""
    verts = ent.get("vertices", [])
    if len(verts) < 2:
        return None
    try:
        import Part
        points = [_vec(v) for v in verts]
        edges = []
        for i in range(len(points) - 1):
            if not points[i].isEqual(points[i + 1], 1e-6):
                edges.append(Part.makeLine(points[i], points[i + 1]))
        if not edges:
            return None
        wire = Part.Wire(edges)
        obj = doc.addObject("Part::Feature", "Leader")
        obj.Shape = wire
        return obj
    except Exception:
        return None


def _make_hatch(doc, ent, *_):
    """Create a hatch as a face or wire boundary."""
    import Part
    boundaries = ent.get("boundaries", [])
    if not boundaries:
        return None

    faces = []
    for boundary in boundaries:
        btype = boundary.get("type", "")
        if btype == "polyline":
            poly = boundary.get("polyline", {})
            verts = poly.get("vertices", [])
            if len(verts) < 3:
                continue
            points = []
            for v in verts:
                if isinstance(v, dict):
                    points.append(FreeCAD.Vector(float(v.get("x", 0)),
                                                  float(v.get("y", 0)), 0))
                else:
                    points.append(FreeCAD.Vector(float(v[0]), float(v[1]), 0))
            points.append(points[0])  # close
            edges = []
            for i in range(len(points) - 1):
                if not points[i].isEqual(points[i + 1], 1e-6):
                    edges.append(Part.makeLine(points[i], points[i + 1]))
            if edges:
                wire = Part.Wire(edges)
                try:
                    face = Part.Face(wire)
                    faces.append(face)
                except Exception:
                    faces.append(wire)

    if not faces:
        return None

    if len(faces) == 1:
        shape = faces[0]
    else:
        shape = Part.makeCompound(faces)

    obj = doc.addObject("Part::Feature", "Hatch")
    obj.Shape = shape
    return obj


def _make_solid(doc, ent, *_):
    """Create a SOLID entity (2D filled triangle/quad)."""
    import Part
    pts = []
    for i in range(1, 5):
        p = ent.get(f"point{i}")
        if p:
            pts.append(_vec(p))
    if len(pts) < 3:
        return None

    # Remove duplicates at end
    unique = [pts[0]]
    for p in pts[1:]:
        if not p.isEqual(unique[-1], 1e-6):
            unique.append(p)
    if len(unique) < 3:
        return None

    unique.append(unique[0])  # close
    edges = [Part.makeLine(unique[i], unique[i + 1]) for i in range(len(unique) - 1)
             if not unique[i].isEqual(unique[i + 1], 1e-6)]
    if len(edges) < 3:
        return None

    try:
        wire = Part.Wire(edges)
        face = Part.Face(wire)
        obj = doc.addObject("Part::Feature", "Solid2D")
        obj.Shape = face
        return obj
    except Exception:
        wire = Part.Wire(edges)
        obj = doc.addObject("Part::Feature", "Solid2D")
        obj.Shape = wire
        return obj


def _make_3dface(doc, ent, *_):
    """Create a 3DFACE entity."""
    import Part
    pts = []
    for i in range(1, 5):
        p = ent.get(f"point{i}")
        if p:
            pts.append(_vec(p))
    if len(pts) < 3:
        return None

    unique = [pts[0]]
    for p in pts[1:]:
        if not p.isEqual(unique[-1], 1e-6):
            unique.append(p)
    if len(unique) < 3:
        return None

    unique.append(unique[0])
    edges = [Part.makeLine(unique[i], unique[i + 1]) for i in range(len(unique) - 1)
             if not unique[i].isEqual(unique[i + 1], 1e-6)]
    if len(edges) < 3:
        return None

    try:
        wire = Part.Wire(edges)
        face = Part.Face(wire)
        obj = doc.addObject("Part::Feature", "Face3D")
        obj.Shape = face
        return obj
    except Exception:
        return None


def _make_insert(doc, ent, block_data, ifcx_doc):
    """Create an INSERT (block reference) as a group with transformed children."""
    block_name = ent.get("blockName", "")
    ip = _vec(ent.get("insertionPoint", [0, 0, 0]))
    sx = float(ent.get("scaleX", 1))
    sy = float(ent.get("scaleY", 1))
    sz = float(ent.get("scaleZ", 1))
    rotation = float(ent.get("rotation", 0))

    bdata = block_data.get(block_name)
    if not bdata:
        FreeCAD.Console.PrintLog(f"IFCX: Block '{block_name}' not found.\n")
        return None

    group = doc.addObject("App::Part", _sanitize("Insert_" + block_name))

    base_pt = _vec(bdata.get("basePoint", [0, 0, 0]))

    for sub_ent in bdata.get("entities", []):
        try:
            sub_obj = _create_entity(doc, sub_ent, block_data, ifcx_doc)
            if sub_obj is None:
                continue
            group.addObject(sub_obj)

            # Apply transformation: translate relative to base point, scale, rotate, then position
            import Part as PartMod
            placement = FreeCAD.Placement()
            placement.move(ip - base_pt)
            if abs(rotation) > 1e-9:
                placement.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1),
                                                       math.degrees(rotation))
            sub_obj.Placement = placement.multiply(sub_obj.Placement)

            # Scale if non-uniform
            if abs(sx - 1) > 1e-9 or abs(sy - 1) > 1e-9 or abs(sz - 1) > 1e-9:
                try:
                    mat = FreeCAD.Matrix()
                    mat.scale(sx, sy, sz)
                    if hasattr(sub_obj, "Shape"):
                        sub_obj.Shape = sub_obj.Shape.transformGeometry(mat)
                except Exception:
                    pass

        except Exception as exc:
            FreeCAD.Console.PrintWarning(
                f"IFCX: Error creating block sub-entity: {exc}\n"
            )

    return group


def _make_mesh(doc, ent, *_):
    """Create a MESH entity from vertices and faces."""
    verts = ent.get("vertices", [])
    face_indices = ent.get("faces", [])

    if not verts or not face_indices:
        return None

    try:
        import Mesh
        triangles = []
        for face in face_indices:
            if len(face) >= 3:
                v0 = verts[face[0]]
                v1 = verts[face[1]]
                v2 = verts[face[2]]
                triangles.append([v0, v1, v2])

        if not triangles:
            return None

        mesh = Mesh.Mesh(triangles)
        obj = doc.addObject("Mesh::Feature", "Mesh")
        obj.Mesh = mesh
        return obj
    except Exception as exc:
        FreeCAD.Console.PrintWarning(f"IFCX: Mesh creation failed: {exc}\n")
        return None


def _make_viewport(doc, ent, *_):
    """Create a VIEWPORT as an annotation rectangle."""
    import Part
    center = _vec(ent.get("center", [0, 0, 0]))
    width = float(ent.get("width", 100))
    height = float(ent.get("height", 100))

    hw, hh = width / 2, height / 2
    pts = [
        FreeCAD.Vector(center.x - hw, center.y - hh, center.z),
        FreeCAD.Vector(center.x + hw, center.y - hh, center.z),
        FreeCAD.Vector(center.x + hw, center.y + hh, center.z),
        FreeCAD.Vector(center.x - hw, center.y + hh, center.z),
    ]
    pts.append(pts[0])
    edges = [Part.makeLine(pts[i], pts[i + 1]) for i in range(4)]
    wire = Part.Wire(edges)
    obj = doc.addObject("Part::Feature", "Viewport")
    obj.Shape = wire
    return obj


def _make_table(doc, ent, *_):
    """Create a TABLE as text annotations."""
    ip = _vec(ent.get("insertionPoint", [0, 0, 0]))
    cells = ent.get("cells", [])
    row_heights = ent.get("rowHeights", [])
    col_widths = ent.get("columnWidths", [])

    if not cells:
        return None

    group = doc.addObject("App::DocumentObjectGroup", "Table")

    try:
        import Draft
        for cell in cells:
            row = cell.get("row", 0)
            col = cell.get("column", 0)
            text = cell.get("text", "")

            # Calculate position
            x_off = sum(col_widths[:col]) if col < len(col_widths) else col * 30
            y_off = -sum(row_heights[:row + 1]) if row < len(row_heights) else -(row + 1) * 8

            pos = FreeCAD.Vector(ip.x + x_off + 1, ip.y + y_off + 1, ip.z)
            obj = Draft.make_text([text], pos)
            if obj:
                group.addObject(obj)
    except Exception as exc:
        FreeCAD.Console.PrintWarning(f"IFCX: Table creation failed: {exc}\n")

    return group


def _make_image(doc, ent, *_):
    """Create an IMAGE reference as a placeholder rectangle."""
    import Part
    ip = _vec(ent.get("insertionPoint", [0, 0, 0]))
    size = ent.get("imageSize", [100, 100])
    w, h = float(size[0]), float(size[1])
    pts = [
        ip,
        FreeCAD.Vector(ip.x + w, ip.y, ip.z),
        FreeCAD.Vector(ip.x + w, ip.y + h, ip.z),
        FreeCAD.Vector(ip.x, ip.y + h, ip.z),
    ]
    pts.append(pts[0])
    edges = [Part.makeLine(pts[i], pts[i + 1]) for i in range(4)]
    wire = Part.Wire(edges)
    obj = doc.addObject("Part::Feature", "Image")
    obj.Shape = wire
    return obj


# ---------------------------------------------------------------------------
# Entity handler dispatch table
# ---------------------------------------------------------------------------

_ENTITY_HANDLERS = {
    "LINE": _make_line,
    "POINT": _make_point,
    "CIRCLE": _make_circle,
    "ARC": _make_arc,
    "ELLIPSE": _make_ellipse,
    "SPLINE": _make_spline,
    "LWPOLYLINE": _make_lwpolyline,
    "TEXT": _make_text,
    "MTEXT": _make_mtext,
    "DIMENSION_LINEAR": _make_dimension_linear,
    "DIMENSION_ALIGNED": _make_dimension_aligned,
    "DIMENSION_RADIUS": _make_dimension_radius,
    "DIMENSION_DIAMETER": _make_dimension_diameter,
    "DIMENSION_ANGULAR": _make_dimension_angular,
    "DIMENSION_ORDINATE": _make_dimension_ordinate,
    "LEADER": _make_leader,
    "HATCH": _make_hatch,
    "SOLID": _make_solid,
    "3DFACE": _make_3dface,
    "INSERT": _make_insert,
    "MESH": _make_mesh,
    "VIEWPORT": _make_viewport,
    "TABLE": _make_table,
    "IMAGE": _make_image,
}
