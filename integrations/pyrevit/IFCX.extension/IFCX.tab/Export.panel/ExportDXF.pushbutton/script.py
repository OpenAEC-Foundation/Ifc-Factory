"""
Export Active View to DXF - PyRevit Pushbutton Script

Exports the current Revit view as a DXF file using the IFCX geometry
pipeline. Collects 2D geometry from the view, builds an IFCX document
internally, then serializes to DXF format with an inline DXF writer
(no external dependencies).

Compatible with IronPython 2.7 and CPython 3 (pyRevit 4.8+).
"""

from __future__ import print_function

import sys
import os
import math

# Add the ExportView pushbutton directory to path for shared modules
script_dir = os.path.dirname(__file__)
export_view_dir = os.path.join(
    os.path.dirname(script_dir), "ExportView.pushbutton"
)
if export_view_dir not in sys.path:
    sys.path.insert(0, export_view_dir)

# Revit API imports
from Autodesk.Revit.DB import *

# pyRevit imports
from pyrevit import revit, DB, forms, script

# Reuse the IFCX exporter to collect geometry
from script import export_view_to_ifcx


# ---------------------------------------------------------------------------
# Minimal DXF Writer
# ---------------------------------------------------------------------------

class DXFWriter(object):
    """Minimal DXF R2010 (AC1024) writer. Outputs ASCII DXF."""

    def __init__(self):
        self._sections = []
        self._entities = []
        self._layers = {}
        self._linetypes = {}
        self._text_styles = {}
        self._handle_counter = 0x100

    def _handle(self):
        self._handle_counter += 1
        return format(self._handle_counter, "X")

    def add_layer(self, name, color_index=7, linetype="CONTINUOUS"):
        self._layers[name] = {
            "color": color_index,
            "linetype": linetype,
        }

    def add_linetype(self, name, description="", pattern=None):
        self._linetypes[name] = {
            "description": description or "",
            "pattern": pattern or [],
        }

    def add_text_style(self, name, font="Arial"):
        self._text_styles[name] = {"font": font}

    # --- Entity writers ---

    def add_line(self, x1, y1, x2, y2, layer="0", z1=0, z2=0):
        self._entities.append(
            self._dxf_line(x1, y1, z1, x2, y2, z2, layer)
        )

    def add_arc(self, cx, cy, radius, start_angle_deg, end_angle_deg,
                layer="0", cz=0):
        self._entities.append(
            self._dxf_arc(cx, cy, cz, radius, start_angle_deg,
                          end_angle_deg, layer)
        )

    def add_circle(self, cx, cy, radius, layer="0", cz=0):
        self._entities.append(
            self._dxf_circle(cx, cy, cz, radius, layer)
        )

    def add_text(self, x, y, height, text, layer="0", style="Standard",
                 rotation=0, z=0):
        self._entities.append(
            self._dxf_text(x, y, z, height, text, layer, style, rotation)
        )

    def add_mtext(self, x, y, height, text, width=100, layer="0",
                  style="Standard", z=0):
        self._entities.append(
            self._dxf_mtext(x, y, z, height, text, width, layer, style)
        )

    def add_lwpolyline(self, vertices, closed=False, layer="0"):
        """vertices is list of (x, y) or (x, y, bulge) tuples."""
        self._entities.append(
            self._dxf_lwpolyline(vertices, closed, layer)
        )

    def add_spline(self, degree, control_points, knots, weights=None,
                   layer="0"):
        self._entities.append(
            self._dxf_spline(degree, control_points, knots, weights, layer)
        )

    def add_ellipse(self, cx, cy, major_dx, major_dy, ratio,
                    start_param=0, end_param=6.283185307, layer="0",
                    cz=0, major_dz=0):
        self._entities.append(
            self._dxf_ellipse(cx, cy, cz, major_dx, major_dy, major_dz,
                              ratio, start_param, end_param, layer)
        )

    def add_dimension_linear(self, def_x1, def_y1, def_x2, def_y2,
                              dim_x, dim_y, layer="0"):
        # Simplified: output as lines + text
        self.add_line(def_x1, def_y1, def_x2, def_y2, layer)
        mid_x = (def_x1 + def_x2) / 2.0
        mid_y = (def_y1 + def_y2) / 2.0
        dist = math.sqrt((def_x2 - def_x1) ** 2 + (def_y2 - def_y1) ** 2)
        self.add_text(mid_x, dim_y + 2, 2.5,
                      "{:.0f}".format(dist), layer)

    def add_hatch(self, boundaries, pattern_name="SOLID", solid=True,
                  layer="0"):
        self._entities.append(
            self._dxf_hatch(boundaries, pattern_name, solid, layer)
        )

    # --- DXF group code helpers ---

    @staticmethod
    def _gc(code, value):
        """Format a DXF group code + value pair."""
        return "{}\n{}".format(code, value)

    def _dxf_line(self, x1, y1, z1, x2, y2, z2, layer):
        return "\n".join([
            self._gc(0, "LINE"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbLine"),
            self._gc(10, x1), self._gc(20, y1), self._gc(30, z1),
            self._gc(11, x2), self._gc(21, y2), self._gc(31, z2),
        ])

    def _dxf_arc(self, cx, cy, cz, radius, sa, ea, layer):
        return "\n".join([
            self._gc(0, "ARC"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbCircle"),
            self._gc(10, cx), self._gc(20, cy), self._gc(30, cz),
            self._gc(40, radius),
            self._gc(100, "AcDbArc"),
            self._gc(50, sa),
            self._gc(51, ea),
        ])

    def _dxf_circle(self, cx, cy, cz, radius, layer):
        return "\n".join([
            self._gc(0, "CIRCLE"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbCircle"),
            self._gc(10, cx), self._gc(20, cy), self._gc(30, cz),
            self._gc(40, radius),
        ])

    def _dxf_text(self, x, y, z, height, text, layer, style, rotation):
        return "\n".join([
            self._gc(0, "TEXT"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbText"),
            self._gc(10, x), self._gc(20, y), self._gc(30, z),
            self._gc(40, height),
            self._gc(1, text),
            self._gc(50, rotation),
            self._gc(7, style),
            self._gc(100, "AcDbText"),
        ])

    def _dxf_mtext(self, x, y, z, height, text, width, layer, style):
        return "\n".join([
            self._gc(0, "MTEXT"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbMText"),
            self._gc(10, x), self._gc(20, y), self._gc(30, z),
            self._gc(40, height),
            self._gc(41, width),
            self._gc(71, 1),  # attachment point: top left
            self._gc(1, text),
            self._gc(7, style),
        ])

    def _dxf_lwpolyline(self, vertices, closed, layer):
        parts = [
            self._gc(0, "LWPOLYLINE"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbPolyline"),
            self._gc(90, len(vertices)),
            self._gc(70, 1 if closed else 0),
        ]
        for v in vertices:
            if len(v) >= 3:
                x, y, bulge = v[0], v[1], v[2]
            else:
                x, y = v[0], v[1]
                bulge = 0
            parts.append(self._gc(10, x))
            parts.append(self._gc(20, y))
            if bulge != 0:
                parts.append(self._gc(42, bulge))
        return "\n".join(parts)

    def _dxf_spline(self, degree, ctrl_pts, knots, weights, layer):
        n_ctrl = len(ctrl_pts)
        n_knots = len(knots)
        flag = 0
        if weights:
            flag |= 4  # rational

        parts = [
            self._gc(0, "SPLINE"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbSpline"),
            self._gc(70, flag),
            self._gc(71, degree),
            self._gc(72, n_knots),
            self._gc(73, n_ctrl),
        ]
        for k in knots:
            parts.append(self._gc(40, k))
        for pt in ctrl_pts:
            parts.append(self._gc(10, pt[0]))
            parts.append(self._gc(20, pt[1]))
            parts.append(self._gc(30, pt[2] if len(pt) > 2 else 0))
        if weights:
            for w in weights:
                parts.append(self._gc(41, w))
        return "\n".join(parts)

    def _dxf_ellipse(self, cx, cy, cz, mdx, mdy, mdz, ratio,
                     sp, ep, layer):
        return "\n".join([
            self._gc(0, "ELLIPSE"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbEllipse"),
            self._gc(10, cx), self._gc(20, cy), self._gc(30, cz),
            self._gc(11, mdx), self._gc(21, mdy), self._gc(31, mdz),
            self._gc(40, ratio),
            self._gc(41, sp),
            self._gc(42, ep),
        ])

    def _dxf_hatch(self, boundaries, pattern_name, solid, layer):
        parts = [
            self._gc(0, "HATCH"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbEntity"),
            self._gc(8, layer),
            self._gc(100, "AcDbHatch"),
            self._gc(10, 0), self._gc(20, 0), self._gc(30, 0),
            self._gc(210, 0), self._gc(220, 0), self._gc(230, 1),
            self._gc(2, pattern_name),
            self._gc(70, 1 if solid else 0),
            self._gc(71, 0),  # not associative
            self._gc(91, len(boundaries)),
        ]

        for boundary in boundaries:
            verts = boundary.get("vertices", [])
            parts.append(self._gc(92, 1))  # polyline boundary
            parts.append(self._gc(72, 0))  # not bulge
            parts.append(self._gc(73, 1))  # closed
            parts.append(self._gc(93, len(verts)))
            for v in verts:
                parts.append(self._gc(10, v[0]))
                parts.append(self._gc(20, v[1]))

        parts.append(self._gc(97, 0))  # no source boundary objects
        return "\n".join(parts)

    # --- Full DXF assembly ---

    def _build_header_section(self):
        return "\n".join([
            self._gc(0, "SECTION"),
            self._gc(2, "HEADER"),
            self._gc(9, "$ACADVER"),
            self._gc(1, "AC1024"),
            self._gc(9, "$INSUNITS"),
            self._gc(70, 4),  # millimeters
            self._gc(9, "$MEASUREMENT"),
            self._gc(70, 1),  # metric
            self._gc(0, "ENDSEC"),
        ])

    def _build_tables_section(self):
        parts = [
            self._gc(0, "SECTION"),
            self._gc(2, "TABLES"),
        ]

        # LTYPE table
        parts.append(self._gc(0, "TABLE"))
        parts.append(self._gc(2, "LTYPE"))
        parts.append(self._gc(5, self._handle()))
        parts.append(self._gc(70, len(self._linetypes) + 1))

        # ByLayer linetype
        parts.extend([
            self._gc(0, "LTYPE"),
            self._gc(5, self._handle()),
            self._gc(100, "AcDbSymbolTableRecord"),
            self._gc(100, "AcDbLinetypeTableRecord"),
            self._gc(2, "ByLayer"),
            self._gc(70, 0),
            self._gc(3, ""),
            self._gc(72, 65),
            self._gc(73, 0),
            self._gc(40, 0),
        ])

        for name, lt in self._linetypes.items():
            parts.extend([
                self._gc(0, "LTYPE"),
                self._gc(5, self._handle()),
                self._gc(100, "AcDbSymbolTableRecord"),
                self._gc(100, "AcDbLinetypeTableRecord"),
                self._gc(2, name.upper()),
                self._gc(70, 0),
                self._gc(3, lt["description"]),
                self._gc(72, 65),
                self._gc(73, len(lt["pattern"])),
                self._gc(40, sum(abs(p) for p in lt["pattern"])),
            ])
            for p in lt["pattern"]:
                parts.append(self._gc(49, p))
                parts.append(self._gc(74, 0))

        parts.append(self._gc(0, "ENDTAB"))

        # LAYER table
        parts.append(self._gc(0, "TABLE"))
        parts.append(self._gc(2, "LAYER"))
        parts.append(self._gc(5, self._handle()))
        parts.append(self._gc(70, len(self._layers)))

        for name, layer in self._layers.items():
            parts.extend([
                self._gc(0, "LAYER"),
                self._gc(5, self._handle()),
                self._gc(100, "AcDbSymbolTableRecord"),
                self._gc(100, "AcDbLayerTableRecord"),
                self._gc(2, name),
                self._gc(70, 0),
                self._gc(62, layer["color"]),
                self._gc(6, layer["linetype"]),
            ])

        parts.append(self._gc(0, "ENDTAB"))

        # STYLE table
        parts.append(self._gc(0, "TABLE"))
        parts.append(self._gc(2, "STYLE"))
        parts.append(self._gc(5, self._handle()))
        parts.append(self._gc(70, len(self._text_styles)))

        for name, st in self._text_styles.items():
            parts.extend([
                self._gc(0, "STYLE"),
                self._gc(5, self._handle()),
                self._gc(100, "AcDbSymbolTableRecord"),
                self._gc(100, "AcDbTextStyleTableRecord"),
                self._gc(2, name),
                self._gc(70, 0),
                self._gc(40, 0),  # height (0 = variable)
                self._gc(41, 1),  # width factor
                self._gc(3, st["font"]),
            ])

        parts.append(self._gc(0, "ENDTAB"))

        parts.append(self._gc(0, "ENDSEC"))
        return "\n".join(parts)

    def _build_entities_section(self):
        parts = [
            self._gc(0, "SECTION"),
            self._gc(2, "ENTITIES"),
        ]
        parts.extend(self._entities)
        parts.append(self._gc(0, "ENDSEC"))
        return "\n".join(parts)

    def to_string(self):
        """Generate the complete DXF file as a string."""
        parts = [
            self._build_header_section(),
            self._build_tables_section(),
            self._build_entities_section(),
            self._gc(0, "EOF"),
        ]
        return "\n".join(parts)


# ---------------------------------------------------------------------------
# IFCX to DXF conversion
# ---------------------------------------------------------------------------

# Map IFCX color dict to DXF ACI (approximate)
def color_to_aci(color_dict):
    """Convert IFCX color dict to DXF ACI color index (approximate)."""
    if color_dict is None:
        return 7  # white/black
    if isinstance(color_dict, int):
        return color_dict

    r = color_dict.get("r", 1)
    g = color_dict.get("g", 1)
    b = color_dict.get("b", 1)

    # Simple mapping to basic ACI colors
    if r > 0.8 and g < 0.2 and b < 0.2:
        return 1  # red
    if r > 0.8 and g > 0.8 and b < 0.2:
        return 2  # yellow
    if r < 0.2 and g > 0.8 and b < 0.2:
        return 3  # green
    if r < 0.2 and g > 0.8 and b > 0.8:
        return 4  # cyan
    if r < 0.2 and g < 0.2 and b > 0.8:
        return 5  # blue
    if r > 0.8 and g < 0.2 and b > 0.8:
        return 6  # magenta
    if r > 0.4 and g > 0.4 and b > 0.4:
        return 7  # white
    if r < 0.3 and g < 0.3 and b < 0.3:
        return 8  # dark gray

    return 7  # default


def ifcx_to_dxf(ifcx_doc):
    """Convert an IFCX document dict to a DXF string."""
    writer = DXFWriter()

    # Setup tables
    tables = ifcx_doc.get("tables", {})

    # Linetypes
    linetypes = tables.get("linetypes", {})
    for name, lt in linetypes.items():
        writer.add_linetype(
            name.upper(),
            lt.get("description", ""),
            lt.get("pattern", []),
        )
    # Ensure CONTINUOUS exists
    if "CONTINUOUS" not in [n.upper() for n in linetypes]:
        writer.add_linetype("CONTINUOUS", "Solid line", [])

    # Layers
    layers = tables.get("layers", {})
    for name, layer in layers.items():
        aci = color_to_aci(layer.get("color"))
        lt = layer.get("linetype", "CONTINUOUS").upper()
        writer.add_layer(name, aci, lt)
    if "0" not in layers:
        writer.add_layer("0", 7, "CONTINUOUS")

    # Text styles
    text_styles = tables.get("textStyles", {})
    for name, ts in text_styles.items():
        writer.add_text_style(name, ts.get("fontFamily", "Arial"))
    if "Standard" not in text_styles:
        writer.add_text_style("Standard", "Arial")

    # Entities
    for ent in ifcx_doc.get("entities", []):
        etype = ent.get("type", "")
        layer = ent.get("layer", "0")

        if etype == "LINE":
            s = ent.get("start", [0, 0, 0])
            e = ent.get("end", [0, 0, 0])
            writer.add_line(s[0], s[1], e[0], e[1], layer,
                            s[2] if len(s) > 2 else 0,
                            e[2] if len(e) > 2 else 0)

        elif etype == "ARC":
            c = ent.get("center", [0, 0, 0])
            r = ent.get("radius", 0)
            sa = math.degrees(ent.get("startAngle", 0))
            ea = math.degrees(ent.get("endAngle", 360))
            writer.add_arc(c[0], c[1], r, sa, ea, layer,
                           c[2] if len(c) > 2 else 0)

        elif etype == "CIRCLE":
            c = ent.get("center", [0, 0, 0])
            r = ent.get("radius", 0)
            writer.add_circle(c[0], c[1], r, layer,
                              c[2] if len(c) > 2 else 0)

        elif etype == "ELLIPSE":
            c = ent.get("center", [0, 0, 0])
            ma = ent.get("majorAxisEndpoint", [1, 0, 0])
            ratio = ent.get("minorAxisRatio", 0.5)
            sp = ent.get("startParam", 0)
            ep = ent.get("endParam", 2 * math.pi)
            writer.add_ellipse(
                c[0], c[1], ma[0], ma[1], ratio, sp, ep, layer,
                c[2] if len(c) > 2 else 0,
                ma[2] if len(ma) > 2 else 0,
            )

        elif etype == "TEXT":
            ip = ent.get("insertionPoint", [0, 0, 0])
            writer.add_text(
                ip[0], ip[1], ent.get("height", 2.5),
                ent.get("text", ""), layer,
                ent.get("style", "Standard"),
                ent.get("rotation", 0),
                ip[2] if len(ip) > 2 else 0,
            )

        elif etype == "MTEXT":
            ip = ent.get("insertionPoint", [0, 0, 0])
            writer.add_mtext(
                ip[0], ip[1], ent.get("height", 2.5),
                ent.get("text", ""),
                ent.get("width", 100), layer,
                ent.get("style", "Standard"),
                ip[2] if len(ip) > 2 else 0,
            )

        elif etype == "LWPOLYLINE":
            verts = ent.get("vertices", [])
            pts = []
            for v in verts:
                if isinstance(v, dict):
                    x = v.get("x", 0)
                    y = v.get("y", 0)
                    b = v.get("bulge", 0)
                    pts.append((x, y, b))
                elif isinstance(v, (list, tuple)):
                    pts.append(tuple(v) + (0,) * (3 - len(v)))
            writer.add_lwpolyline(pts, ent.get("closed", False), layer)

        elif etype == "SPLINE":
            ctrl_pts = ent.get("controlPoints", [])
            knots = ent.get("knots", [])
            degree = ent.get("degree", 3)
            weights = ent.get("weights")
            writer.add_spline(degree, ctrl_pts, knots, weights, layer)

        elif etype == "DIMENSION_LINEAR":
            d1 = ent.get("defPoint1", [0, 0, 0])
            d2 = ent.get("defPoint2", [0, 0, 0])
            dl = ent.get("dimLinePoint", [0, 0, 0])
            writer.add_dimension_linear(
                d1[0], d1[1], d2[0], d2[1], dl[0], dl[1], layer
            )

        elif etype == "DIMENSION_RADIUS":
            c = ent.get("center", [0, 0, 0])
            cp = ent.get("chordPoint", [0, 0, 0])
            writer.add_line(c[0], c[1], cp[0], cp[1], layer)
            dist = math.sqrt(
                (cp[0] - c[0]) ** 2 + (cp[1] - c[1]) ** 2
            )
            mid_x = (c[0] + cp[0]) / 2.0
            mid_y = (c[1] + cp[1]) / 2.0
            writer.add_text(
                mid_x, mid_y + 2, 2.5,
                "R{:.0f}".format(dist), layer,
            )

        elif etype == "HATCH":
            bounds = ent.get("boundaries", [])
            hatch_bounds = []
            for b in bounds:
                poly = b.get("polyline", {})
                verts = poly.get("vertices", [])
                pts = []
                for v in verts:
                    if isinstance(v, dict):
                        pts.append((v.get("x", 0), v.get("y", 0)))
                    elif isinstance(v, (list, tuple)):
                        pts.append((v[0], v[1]))
                if pts:
                    hatch_bounds.append({"vertices": pts})
            if hatch_bounds:
                writer.add_hatch(
                    hatch_bounds,
                    ent.get("patternName", "SOLID"),
                    ent.get("solid", True),
                    layer,
                )

        elif etype == "LEADER":
            verts = ent.get("vertices", [])
            for i in range(len(verts) - 1):
                writer.add_line(
                    verts[i][0], verts[i][1],
                    verts[i + 1][0], verts[i + 1][1],
                    layer,
                )

        elif etype == "INSERT":
            # Block references require BLOCKS section - insert as point marker
            ip = ent.get("insertionPoint", [0, 0, 0])
            bn = ent.get("blockName", "?")
            writer.add_text(ip[0], ip[1], 2.0, bn, layer)

    return writer.to_string()


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main():
    doc = revit.doc
    active_view = doc.ActiveView

    if active_view is None:
        forms.alert("No active view found.", title="DXF Export")
        return

    output = script.get_output()
    output.print_md("# DXF Export (via IFCX)")
    output.print_md("Exporting view: **{}**".format(active_view.Name))

    # Export to IFCX first
    ifcx_doc = export_view_to_ifcx(doc, active_view)
    if ifcx_doc is None or not ifcx_doc.get("entities"):
        forms.alert("No geometry found in the active view.", title="DXF Export")
        return

    # Convert IFCX to DXF
    output.print_md("Converting to DXF...")
    dxf_string = ifcx_to_dxf(ifcx_doc)

    # Ask for save location
    save_path = forms.save_file(
        file_ext="dxf",
        default_name="{}.dxf".format(active_view.Name),
        unc_paths=False,
    )
    if not save_path:
        output.print_md("*Export cancelled.*")
        return

    # Write file
    try:
        with open(save_path, "w") as f:
            f.write(dxf_string)
    except Exception as e:
        forms.alert("Failed to write file:\n{}".format(str(e)),
                    title="DXF Export")
        return

    # Summary
    file_size = os.path.getsize(save_path)
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

    try:
        from Autodesk.Revit.UI import TaskDialog, TaskDialogCommonButtons
        td = TaskDialog("DXF Export Complete")
        td.MainContent = (
            "Exported {} entities to DXF.\n\n"
            "File: {}\n"
            "Size: {}"
        ).format(entity_count, os.path.basename(save_path), size_str)
        td.CommonButtons = TaskDialogCommonButtons.Ok
        td.Show()
    except Exception:
        pass


if __name__ == "__main__" or True:
    main()
