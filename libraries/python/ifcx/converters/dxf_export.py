"""IFCX to DXF exporter -- pure Python, no external dependencies.

Generates valid DXF ASCII output (AutoCAD 2018 / AC1032 by default)
that can be opened in AutoCAD, BricsCAD, LibreCAD and similar programs.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from ifcx.document import IfcxDocument
from ifcx.converters.dxf_writer import DxfWriter


class DxfExporter:
    """Exports IFCX documents to DXF format."""

    @staticmethod
    def to_file(doc: IfcxDocument, path: str | Path, version: str = "AC1032") -> None:
        """Export to a DXF file on disk."""
        Path(path).write_text(DxfExporter.to_string(doc, version), encoding="utf-8")

    @staticmethod
    def to_string(doc: IfcxDocument, version: str = "AC1032") -> str:
        """Export to a DXF string."""
        w = DxfWriter()

        DxfExporter._write_header(w, doc, version)
        DxfExporter._write_tables(w, doc)
        DxfExporter._write_blocks(w, doc)
        DxfExporter._write_entities(w, doc)
        DxfExporter._write_objects(w, doc)

        w.group(0, "EOF")
        return w.to_string()

    # ------------------------------------------------------------------
    # HEADER section
    # ------------------------------------------------------------------

    @staticmethod
    def _write_header(w: DxfWriter, doc: IfcxDocument, version: str) -> None:
        with w.section("HEADER"):
            # $ACADVER
            w.group(9, "$ACADVER")
            w.group(1, version)

            # $HANDSEED
            w.group(9, "$HANDSEED")
            w.group(5, "FFFF")

            # $INSUNITS
            units_str = doc.header.get("units", {}).get("linear", "millimeters") if isinstance(doc.header.get("units"), dict) else "millimeters"
            unit_map = {
                "unitless": 0, "inches": 1, "feet": 2, "miles": 3,
                "millimeters": 4, "centimeters": 5, "meters": 6, "kilometers": 7,
            }
            w.group(9, "$INSUNITS")
            w.group(70, unit_map.get(units_str, 4))

            # $MEASUREMENT
            measurement = doc.header.get("units", {}).get("measurement", "metric") if isinstance(doc.header.get("units"), dict) else "metric"
            w.group(9, "$MEASUREMENT")
            w.group(70, 1 if measurement == "metric" else 0)

            # $CLAYER
            clayer = doc.header.get("currentLayer", "0")
            w.group(9, "$CLAYER")
            w.group(8, clayer)

            # $LTSCALE
            ltscale = doc.header.get("linetypeScale", 1.0)
            w.group(9, "$LTSCALE")
            w.group(40, float(ltscale))

    # ------------------------------------------------------------------
    # TABLES section
    # ------------------------------------------------------------------

    @staticmethod
    def _write_tables(w: DxfWriter, doc: IfcxDocument) -> None:
        tables = doc.tables or {}
        layers = tables.get("layers", {"0": {}})
        linetypes = tables.get("linetypes", {})
        styles = tables.get("textStyles", {})
        dimstyles = tables.get("dimStyles", {})

        with w.section("TABLES"):
            # --- VPORT ---
            with w.table("VPORT", w.next_handle(), 1):
                w.group(0, "VPORT")
                h = w.next_handle()
                w.handle(h)
                w.group(100, "AcDbSymbolTableRecord")
                w.group(100, "AcDbViewportTableRecord")
                w.group(2, "*Active")
                w.group(70, 0)
                w.point(0.0, 0.0, 0.0)       # lower-left
                w.point(1.0, 1.0, 0.0, 11)   # upper-right
                w.point(0.0, 0.0, 0.0, 12)   # view center
                w.point(0.0, 0.0, 0.0, 13)   # snap base
                w.point(1.0, 1.0, 0.0, 14)   # snap spacing
                w.point(1.0, 1.0, 0.0, 15)   # grid spacing
                w.point(0.0, 0.0, 1.0, 16)   # view direction
                w.point(0.0, 0.0, 0.0, 17)   # view target
                w.group(42, 50.0)             # lens length
                w.group(43, 0.0)              # front clip
                w.group(44, 0.0)              # back clip
                w.group(45, 1.0)              # view height
                w.group(50, 0.0)              # snap rotation
                w.group(51, 0.0)              # view twist

            # --- LTYPE ---
            # Always include ByBlock, ByLayer, Continuous
            builtin_lt = 3 + len(linetypes)
            with w.table("LTYPE", w.next_handle(), builtin_lt):
                for lt_name in ("ByBlock", "ByLayer", "Continuous"):
                    w.group(0, "LTYPE")
                    w.handle(w.next_handle())
                    w.group(100, "AcDbSymbolTableRecord")
                    w.group(100, "AcDbLinetypeTableRecord")
                    w.group(2, lt_name)
                    w.group(70, 0)
                    w.group(3, "")
                    w.group(72, 65)
                    w.group(73, 0)
                    w.group(40, 0.0)

                for lt_name, lt_props in linetypes.items():
                    w.group(0, "LTYPE")
                    w.handle(w.next_handle())
                    w.group(100, "AcDbSymbolTableRecord")
                    w.group(100, "AcDbLinetypeTableRecord")
                    w.group(2, lt_name)
                    w.group(70, 0)
                    w.group(3, lt_props.get("description", ""))
                    w.group(72, 65)
                    pattern = lt_props.get("pattern", [])
                    w.group(73, len(pattern))
                    total = sum(abs(v) for v in pattern) if pattern else 0.0
                    w.group(40, total)
                    for elem in pattern:
                        w.group(49, elem)
                        w.group(74, 0)

            # --- LAYER ---
            with w.table("LAYER", w.next_handle(), len(layers)):
                for layer_name, layer_props in layers.items():
                    w.group(0, "LAYER")
                    w.handle(w.next_handle())
                    w.group(100, "AcDbSymbolTableRecord")
                    w.group(100, "AcDbLayerTableRecord")
                    w.group(2, layer_name)
                    flags = 0
                    if layer_props.get("frozen"):
                        flags |= 1
                    if layer_props.get("locked"):
                        flags |= 4
                    w.group(70, flags)
                    color = layer_props.get("color", 7)
                    if layer_props.get("off"):
                        color = -abs(color)
                    w.group(62, color)
                    w.group(6, layer_props.get("linetype", "Continuous"))
                    if "plot" in layer_props:
                        w.group(290, 1 if layer_props["plot"] else 0)
                    if "lineweight" in layer_props:
                        w.group(370, layer_props["lineweight"])
                    else:
                        w.group(370, -3)  # default

            # --- STYLE ---
            style_count = max(1, len(styles))
            with w.table("STYLE", w.next_handle(), style_count):
                if not styles:
                    # Default style
                    w.group(0, "STYLE")
                    w.handle(w.next_handle())
                    w.group(100, "AcDbSymbolTableRecord")
                    w.group(100, "AcDbTextStyleTableRecord")
                    w.group(2, "Standard")
                    w.group(70, 0)
                    w.group(40, 0.0)
                    w.group(41, 1.0)
                    w.group(50, 0.0)
                    w.group(71, 0)
                    w.group(42, 2.5)
                    w.group(3, "txt")
                    w.group(4, "")
                else:
                    for style_name, style_props in styles.items():
                        w.group(0, "STYLE")
                        w.handle(w.next_handle())
                        w.group(100, "AcDbSymbolTableRecord")
                        w.group(100, "AcDbTextStyleTableRecord")
                        w.group(2, style_name)
                        w.group(70, 0)
                        w.group(40, style_props.get("height", 0.0))
                        w.group(41, style_props.get("widthFactor", 1.0))
                        w.group(50, 0.0)
                        w.group(71, 0)
                        w.group(42, style_props.get("height", 2.5) or 2.5)
                        w.group(3, style_props.get("fontFamily", "txt"))
                        w.group(4, "")

            # --- VIEW ---
            with w.table("VIEW", w.next_handle(), 0):
                pass

            # --- UCS ---
            with w.table("UCS", w.next_handle(), 0):
                pass

            # --- APPID ---
            with w.table("APPID", w.next_handle(), 1):
                w.group(0, "APPID")
                w.handle(w.next_handle())
                w.group(100, "AcDbSymbolTableRecord")
                w.group(100, "AcDbRegAppTableRecord")
                w.group(2, "ACAD")
                w.group(70, 0)

            # --- DIMSTYLE ---
            ds_count = max(1, len(dimstyles))
            with w.table("DIMSTYLE", w.next_handle(), ds_count):
                if not dimstyles:
                    w.group(0, "DIMSTYLE")
                    w.handle(w.next_handle())
                    w.group(100, "AcDbSymbolTableRecord")
                    w.group(100, "AcDbDimStyleTableRecord")
                    w.group(2, "Standard")
                    w.group(70, 0)
                    w.group(40, 1.0)   # DIMSCALE
                    w.group(41, 2.5)   # DIMASZ
                    w.group(42, 0.625) # DIMEXO
                    w.group(43, 3.75)  # DIMDLI
                    w.group(44, 1.25)  # DIMEXE
                    w.group(140, 2.5)  # DIMTXT
                    w.group(141, 2.5)  # DIMCEN
                    w.group(147, 0.625) # DIMGAP
                    w.group(77, 1)     # DIMTAD
                    w.group(271, 2)    # DIMDEC
                else:
                    for ds_name, ds_props in dimstyles.items():
                        w.group(0, "DIMSTYLE")
                        w.handle(w.next_handle())
                        w.group(100, "AcDbSymbolTableRecord")
                        w.group(100, "AcDbDimStyleTableRecord")
                        w.group(2, ds_name)
                        w.group(70, 0)
                        w.group(40, ds_props.get("overallScale", 1.0))
                        w.group(41, ds_props.get("arrowSize", 2.5))
                        w.group(140, ds_props.get("textHeight", 2.5))

            # --- BLOCK_RECORD ---
            block_names = list(doc.blocks.keys()) if doc.blocks else []
            br_count = 2 + len(block_names)  # *Model_Space + *Paper_Space + user blocks
            with w.table("BLOCK_RECORD", w.next_handle(), br_count):
                for br_name in ["*Model_Space", "*Paper_Space"] + block_names:
                    w.group(0, "BLOCK_RECORD")
                    w.handle(w.next_handle())
                    w.group(100, "AcDbSymbolTableRecord")
                    w.group(100, "AcDbBlockTableRecord")
                    w.group(2, br_name)

    # ------------------------------------------------------------------
    # BLOCKS section
    # ------------------------------------------------------------------

    @staticmethod
    def _write_blocks(w: DxfWriter, doc: IfcxDocument) -> None:
        with w.section("BLOCKS"):
            # *Model_Space
            DxfExporter._write_block_wrapper(w, "*Model_Space", "0", [])
            # *Paper_Space
            DxfExporter._write_block_wrapper(w, "*Paper_Space", "0", [])
            # User blocks
            if doc.blocks:
                for block_name, block_data in doc.blocks.items():
                    layer = block_data.get("layer", "0")
                    bp = block_data.get("basePoint", [0, 0, 0])
                    entities = block_data.get("entities", [])
                    DxfExporter._write_block_wrapper(w, block_name, layer, entities, bp)

    @staticmethod
    def _write_block_wrapper(w: DxfWriter, name: str, layer: str,
                             entities: list[dict[str, Any]],
                             base_point: list[float] | None = None) -> None:
        bp = base_point or [0, 0, 0]
        w.group(0, "BLOCK")
        w.handle(w.next_handle())
        w.group(100, "AcDbEntity")
        w.group(8, layer)
        w.group(100, "AcDbBlockBegin")
        w.group(2, name)
        w.group(70, 0)
        w.point(bp[0], bp[1], bp[2] if len(bp) > 2 else 0.0)
        w.group(3, name)
        w.group(1, "")

        for ent in entities:
            DxfExporter._write_entity(w, ent)

        w.group(0, "ENDBLK")
        w.handle(w.next_handle())
        w.group(100, "AcDbEntity")
        w.group(8, layer)
        w.group(100, "AcDbBlockEnd")

    # ------------------------------------------------------------------
    # ENTITIES section
    # ------------------------------------------------------------------

    @staticmethod
    def _write_entities(w: DxfWriter, doc: IfcxDocument) -> None:
        with w.section("ENTITIES"):
            for ent in doc.entities:
                DxfExporter._write_entity(w, ent)

    @staticmethod
    def _write_entity(w: DxfWriter, ent: dict[str, Any]) -> None:
        etype = ent.get("type", "")

        dispatch = {
            "LINE": DxfExporter._write_line,
            "POINT": DxfExporter._write_point_entity,
            "CIRCLE": DxfExporter._write_circle,
            "ARC": DxfExporter._write_arc,
            "ELLIPSE": DxfExporter._write_ellipse,
            "SPLINE": DxfExporter._write_spline,
            "LWPOLYLINE": DxfExporter._write_lwpolyline,
            "POLYLINE2D": DxfExporter._write_polyline,
            "POLYLINE3D": DxfExporter._write_polyline,
            "TEXT": DxfExporter._write_text,
            "MTEXT": DxfExporter._write_mtext,
            "DIMENSION_LINEAR": DxfExporter._write_dimension,
            "DIMENSION_ALIGNED": DxfExporter._write_dimension,
            "DIMENSION_ANGULAR": DxfExporter._write_dimension,
            "DIMENSION_ANGULAR3P": DxfExporter._write_dimension,
            "DIMENSION_DIAMETER": DxfExporter._write_dimension,
            "DIMENSION_RADIUS": DxfExporter._write_dimension,
            "DIMENSION_ORDINATE": DxfExporter._write_dimension,
            "DIMENSION": DxfExporter._write_dimension,
            "LEADER": DxfExporter._write_leader,
            "HATCH": DxfExporter._write_hatch,
            "INSERT": DxfExporter._write_insert,
            "ATTDEF": DxfExporter._write_attdef,
            "SOLID": DxfExporter._write_solid_trace,
            "TRACE": DxfExporter._write_solid_trace,
            "3DFACE": DxfExporter._write_3dface,
            "VIEWPORT": DxfExporter._write_viewport,
            "XLINE": DxfExporter._write_xline_ray,
            "RAY": DxfExporter._write_xline_ray,
            "IMAGE": DxfExporter._write_image,
            "WIPEOUT": DxfExporter._write_wipeout,
            "3DSOLID": DxfExporter._write_acis,
            "BODY": DxfExporter._write_acis,
            "REGION": DxfExporter._write_acis,
            "SURFACE": DxfExporter._write_acis,
            "MESH": DxfExporter._write_mesh,
            "POLYLINE": DxfExporter._write_polyline,
            "MULTILEADER": DxfExporter._write_multileader,
            "ARC_DIMENSION": DxfExporter._write_dimension,
            "LARGE_RADIAL_DIMENSION": DxfExporter._write_dimension,
            "DIMENSION_ARC": DxfExporter._write_dimension,
        }

        handler = dispatch.get(etype)
        if handler is not None:
            handler(w, ent)
        # Silently skip unsupported entity types.

    @staticmethod
    def _write_common(w: DxfWriter, ent: dict[str, Any], subclass: str) -> None:
        """Write common entity properties."""
        h = ent.get("handle") or w.next_handle()
        w.handle(h)
        w.group(100, "AcDbEntity")
        if ent.get("paperSpace"):
            w.group(67, 1)
        w.group(8, ent.get("layer", "0"))
        if "linetype" in ent:
            w.group(6, ent["linetype"])
        if "color" in ent:
            w.group(62, ent["color"])
        if "lineweight" in ent:
            w.group(370, ent["lineweight"])
        if "trueColor" in ent:
            w.group(420, ent["trueColor"])
        if "transparency" in ent:
            w.group(440, ent["transparency"])
        if "visibility" in ent:
            w.group(60, ent["visibility"])
        w.group(100, subclass)

    # --- LINE ---
    @staticmethod
    def _write_line(w: DxfWriter, ent: dict) -> None:
        w.entity("LINE")
        DxfExporter._write_common(w, ent, "AcDbLine")
        s = ent.get("start", [0, 0, 0])
        e = ent.get("end", [0, 0, 0])
        w.point(s[0], s[1], s[2] if len(s) > 2 else 0.0)
        w.point(e[0], e[1], e[2] if len(e) > 2 else 0.0, 11)

    # --- POINT ---
    @staticmethod
    def _write_point_entity(w: DxfWriter, ent: dict) -> None:
        w.entity("POINT")
        DxfExporter._write_common(w, ent, "AcDbPoint")
        p = ent.get("position", [0, 0, 0])
        w.point(p[0], p[1], p[2] if len(p) > 2 else 0.0)

    # --- CIRCLE ---
    @staticmethod
    def _write_circle(w: DxfWriter, ent: dict) -> None:
        w.entity("CIRCLE")
        DxfExporter._write_common(w, ent, "AcDbCircle")
        c = ent.get("center", [0, 0, 0])
        w.point(c[0], c[1], c[2] if len(c) > 2 else 0.0)
        w.group(40, ent.get("radius", 0.0))

    # --- ARC ---
    @staticmethod
    def _write_arc(w: DxfWriter, ent: dict) -> None:
        w.entity("ARC")
        DxfExporter._write_common(w, ent, "AcDbCircle")
        c = ent.get("center", [0, 0, 0])
        w.point(c[0], c[1], c[2] if len(c) > 2 else 0.0)
        w.group(40, ent.get("radius", 0.0))
        w.group(100, "AcDbArc")
        w.group(50, ent.get("startAngle", 0.0))
        w.group(51, ent.get("endAngle", 360.0))

    # --- ELLIPSE ---
    @staticmethod
    def _write_ellipse(w: DxfWriter, ent: dict) -> None:
        w.entity("ELLIPSE")
        DxfExporter._write_common(w, ent, "AcDbEllipse")
        c = ent.get("center", [0, 0, 0])
        w.point(c[0], c[1], c[2] if len(c) > 2 else 0.0)
        ma = ent.get("majorAxisEndpoint", [1, 0, 0])
        w.point(ma[0], ma[1], ma[2] if len(ma) > 2 else 0.0, 11)
        w.group(40, ent.get("minorAxisRatio", 0.5))
        w.group(41, ent.get("startParam", 0.0))
        w.group(42, ent.get("endParam", 6.283185307179586))

    # --- SPLINE ---
    @staticmethod
    def _write_spline(w: DxfWriter, ent: dict) -> None:
        w.entity("SPLINE")
        DxfExporter._write_common(w, ent, "AcDbSpline")
        flags = 0
        if ent.get("closed"):
            flags |= 1
        if ent.get("rational"):
            flags |= 4
        w.group(70, flags)
        w.group(71, ent.get("degree", 3))
        knots = ent.get("knots", [])
        ctrl_pts = ent.get("controlPoints", [])
        fit_pts = ent.get("fitPoints", [])
        w.group(72, len(knots))
        w.group(73, len(ctrl_pts))
        w.group(74, len(fit_pts))
        for k in knots:
            w.group(40, k)
        weights = ent.get("weights", [])
        for i, cp in enumerate(ctrl_pts):
            w.point(cp[0], cp[1], cp[2] if len(cp) > 2 else 0.0)
            if i < len(weights):
                w.group(41, weights[i])
        for fp in fit_pts:
            w.point(fp[0], fp[1], fp[2] if len(fp) > 2 else 0.0, 11)

    # --- LWPOLYLINE ---
    @staticmethod
    def _write_lwpolyline(w: DxfWriter, ent: dict) -> None:
        w.entity("LWPOLYLINE")
        DxfExporter._write_common(w, ent, "AcDbPolyline")
        verts = ent.get("vertices", [])
        w.group(90, len(verts))
        flags = 0
        if ent.get("closed"):
            flags |= 1
        w.group(70, flags)
        if "elevation" in ent:
            w.group(38, float(ent["elevation"]))
        for v in verts:
            w.group(10, v.get("x", 0.0))
            w.group(20, v.get("y", 0.0))
            if "startWidth" in v:
                w.group(40, v["startWidth"])
            if "endWidth" in v:
                w.group(41, v["endWidth"])
            if "bulge" in v:
                w.group(42, v["bulge"])

    # --- POLYLINE (2D/3D) ---
    @staticmethod
    def _write_polyline(w: DxfWriter, ent: dict) -> None:
        is_3d = ent.get("type") == "POLYLINE3D"
        w.entity("POLYLINE")
        h = ent.get("handle") or w.next_handle()
        w.handle(h)
        w.group(100, "AcDbEntity")
        w.group(8, ent.get("layer", "0"))
        if is_3d:
            w.group(100, "AcDb3dPolyline")
            flags = 8
        else:
            w.group(100, "AcDb2dPolyline")
            flags = 0
        if ent.get("closed"):
            flags |= 1
        w.group(66, 1)  # vertices follow
        w.group(70, flags)
        w.point(0.0, 0.0, 0.0)

        verts = ent.get("vertices", [])
        for v in verts:
            w.entity("VERTEX")
            w.handle(w.next_handle())
            w.group(100, "AcDbEntity")
            w.group(8, ent.get("layer", "0"))
            if is_3d:
                w.group(100, "AcDb3dPolylineVertex")
                if isinstance(v, list):
                    w.point(v[0], v[1], v[2] if len(v) > 2 else 0.0)
                else:
                    pos = v.get("position", [0, 0, 0])
                    w.point(pos[0], pos[1], pos[2] if len(pos) > 2 else 0.0)
                w.group(70, 32)
            else:
                w.group(100, "AcDb2dVertex")
                if isinstance(v, dict) and "position" in v:
                    pos = v["position"]
                    w.point(pos[0], pos[1], pos[2] if len(pos) > 2 else 0.0)
                    if "bulge" in v:
                        w.group(42, v["bulge"])
                elif isinstance(v, list):
                    w.point(v[0], v[1], v[2] if len(v) > 2 else 0.0)
                w.group(70, 0)

        w.entity("SEQEND")
        w.handle(w.next_handle())
        w.group(100, "AcDbEntity")
        w.group(8, ent.get("layer", "0"))

    # --- TEXT ---
    @staticmethod
    def _write_text(w: DxfWriter, ent: dict) -> None:
        w.entity("TEXT")
        DxfExporter._write_common(w, ent, "AcDbText")
        ip = ent.get("insertionPoint", [0, 0, 0])
        w.point(ip[0], ip[1], ip[2] if len(ip) > 2 else 0.0)
        w.group(40, ent.get("height", 2.5))
        w.group(1, ent.get("text", ""))
        if "rotation" in ent:
            w.group(50, ent["rotation"])
        if "style" in ent:
            w.group(7, ent["style"])
        if "widthFactor" in ent:
            w.group(41, ent["widthFactor"])
        if "obliqueAngle" in ent:
            w.group(51, ent["obliqueAngle"])
        if "textGenerationFlags" in ent:
            w.group(71, ent["textGenerationFlags"])
        if "horizontalAlignment" in ent:
            h_val = ent["horizontalAlignment"]
            if isinstance(h_val, str):
                h_map = {"left": 0, "center": 1, "right": 2, "aligned": 3, "middle": 4, "fit": 5}
                h_val = h_map.get(h_val, 0)
            w.group(72, h_val)
        if "alignmentPoint" in ent:
            ap = ent["alignmentPoint"]
            w.point(ap[0], ap[1], ap[2] if len(ap) > 2 else 0.0, 11)
        w.group(100, "AcDbText")
        if "verticalAlignment" in ent:
            w.group(73, ent["verticalAlignment"])

    # --- MTEXT ---
    @staticmethod
    def _write_mtext(w: DxfWriter, ent: dict) -> None:
        w.entity("MTEXT")
        DxfExporter._write_common(w, ent, "AcDbMText")
        ip = ent.get("insertionPoint", [0, 0, 0])
        w.point(ip[0], ip[1], ip[2] if len(ip) > 2 else 0.0)
        w.group(40, ent.get("height", 2.5))
        if "width" in ent:
            w.group(41, ent["width"])
        attachment = ent.get("attachment", 1)
        if isinstance(attachment, str):
            att_map = {
                "top_left": 1, "top_center": 2, "top_right": 3,
                "middle_left": 4, "middle_center": 5, "middle_right": 6,
                "bottom_left": 7, "bottom_center": 8, "bottom_right": 9,
            }
            attachment = att_map.get(attachment, 1)
        w.group(71, attachment)
        if "drawingDirection" in ent:
            w.group(72, ent["drawingDirection"])
        text = ent.get("text", "")
        # Split long text into group 3 chunks + final group 1
        chunk_size = 250
        while len(text) > chunk_size:
            w.group(3, text[:chunk_size])
            text = text[chunk_size:]
        w.group(1, text)
        if "rotation" in ent:
            w.group(50, ent["rotation"])
        if "style" in ent:
            w.group(7, ent["style"])
        if "lineSpacingFactor" in ent:
            w.group(44, ent["lineSpacingFactor"])
        if "lineSpacingStyle" in ent:
            w.group(73, ent["lineSpacingStyle"])

    # --- DIMENSION ---
    @staticmethod
    def _write_dimension(w: DxfWriter, ent: dict) -> None:
        w.entity("DIMENSION")
        DxfExporter._write_common(w, ent, "AcDbDimension")

        if "blockName" in ent:
            w.group(2, ent["blockName"])
        dp = ent.get("dimLinePoint", ent.get("center", [0, 0, 0]))
        w.point(dp[0], dp[1], dp[2] if len(dp) > 2 else 0.0)
        mp = ent.get("textPosition", [0, 0, 0])
        w.point(mp[0], mp[1], mp[2] if len(mp) > 2 else 0.0, 11)

        etype = ent.get("type", ent.get("dimType", "DIMENSION_LINEAR"))
        type_map = {
            "DIMENSION_LINEAR": 0, "DIMENSION_ALIGNED": 1,
            "DIMENSION_ANGULAR": 2, "DIMENSION_DIAMETER": 3,
            "DIMENSION_RADIUS": 4, "DIMENSION_ANGULAR3P": 5,
            "DIMENSION_ORDINATE": 6,
        }
        dimtype = ent.get("dimTypeRaw", type_map.get(etype, 0))
        w.group(70, dimtype)

        if "overrideText" in ent:
            w.group(1, ent["overrideText"])
        if "dimStyle" in ent:
            w.group(3, ent["dimStyle"])
        if "rotationAngle" in ent:
            w.group(53, ent["rotationAngle"])

        subtype = dimtype & 0x0F
        if subtype in (0, 1):
            w.group(100, "AcDbAlignedDimension")
            d1 = ent.get("defPoint1", [0, 0, 0])
            w.point(d1[0], d1[1], d1[2] if len(d1) > 2 else 0.0, 13)
            d2 = ent.get("defPoint2", [0, 0, 0])
            w.point(d2[0], d2[1], d2[2] if len(d2) > 2 else 0.0, 14)
            if subtype == 0:
                w.group(100, "AcDbRotatedDimension")
        elif subtype in (2, 5):
            w.group(100, "AcDb3PointAngularDimension")
            d1 = ent.get("defPoint1", [0, 0, 0])
            w.point(d1[0], d1[1], d1[2] if len(d1) > 2 else 0.0, 13)
            d2 = ent.get("defPoint2", [0, 0, 0])
            w.point(d2[0], d2[1], d2[2] if len(d2) > 2 else 0.0, 14)
            d3 = ent.get("defPoint3", [0, 0, 0])
            w.point(d3[0], d3[1], d3[2] if len(d3) > 2 else 0.0, 15)
        elif subtype in (3, 4):
            w.group(100, "AcDbRadialDimension")
            d1 = ent.get("defPoint1", ent.get("chordPoint", [0, 0, 0]))
            w.point(d1[0], d1[1], d1[2] if len(d1) > 2 else 0.0, 15)
            w.group(40, ent.get("leaderLength", 0.0))
        elif subtype == 6:
            w.group(100, "AcDbOrdinateDimension")
            d1 = ent.get("defPoint1", [0, 0, 0])
            w.point(d1[0], d1[1], d1[2] if len(d1) > 2 else 0.0, 13)
            d2 = ent.get("defPoint2", [0, 0, 0])
            w.point(d2[0], d2[1], d2[2] if len(d2) > 2 else 0.0, 14)

    # --- LEADER ---
    @staticmethod
    def _write_leader(w: DxfWriter, ent: dict) -> None:
        w.entity("LEADER")
        DxfExporter._write_common(w, ent, "AcDbLeader")
        if "dimStyle" in ent:
            w.group(3, ent["dimStyle"])
        w.group(71, 1 if ent.get("hasArrowhead", True) else 0)
        path = ent.get("pathType", "straight")
        w.group(72, 1 if path == "spline" else 0)
        verts = ent.get("vertices", [])
        w.group(76, len(verts))
        for v in verts:
            w.point(v[0], v[1], v[2] if len(v) > 2 else 0.0)

    # --- HATCH ---
    @staticmethod
    def _write_hatch(w: DxfWriter, ent: dict) -> None:
        w.entity("HATCH")
        DxfExporter._write_common(w, ent, "AcDbHatch")
        # Elevation point (always 0,0,0 for 2D)
        w.point(0.0, 0.0, 0.0)
        w.group(210, 0.0)
        w.group(220, 0.0)
        w.group(230, 1.0)
        w.group(2, ent.get("patternName", "SOLID"))
        w.group(70, 1 if ent.get("solid", True) else 0)
        w.group(71, 1 if ent.get("associative", False) else 0)

        boundaries = ent.get("boundaries", [])
        w.group(91, len(boundaries))

        for boundary in boundaries:
            btype = boundary.get("type", "polyline")
            flags = boundary.get("flags", 2 if btype == "polyline" else 0)
            w.group(92, flags)

            if btype == "polyline":
                poly = boundary.get("polyline", {})
                verts = poly.get("vertices", [])
                has_bulge = any(v.get("bulge", 0) != 0 for v in verts)
                w.group(72, 1 if has_bulge else 0)
                w.group(73, 1 if poly.get("closed", True) else 0)
                w.group(93, len(verts))
                for v in verts:
                    w.group(10, v.get("x", 0.0))
                    w.group(20, v.get("y", 0.0))
                    if has_bulge:
                        w.group(42, v.get("bulge", 0.0))
            else:
                edges = boundary.get("edges", [])
                w.group(93, len(edges))
                for edge in edges:
                    edge_type = edge.get("edgeType", "line")
                    if edge_type == "line":
                        w.group(72, 1)
                        s = edge.get("start", [0, 0])
                        e = edge.get("end", [0, 0])
                        w.group(10, s[0])
                        w.group(20, s[1])
                        w.group(11, e[0])
                        w.group(21, e[1])
                    elif edge_type == "arc":
                        w.group(72, 2)
                        c = edge.get("center", [0, 0])
                        w.group(10, c[0])
                        w.group(20, c[1])
                        w.group(40, edge.get("radius", 0))
                        w.group(50, edge.get("startAngle", 0))
                        w.group(51, edge.get("endAngle", 360))
                        w.group(73, 1 if edge.get("counterClockwise", True) else 0)

        # Pattern data
        if not ent.get("solid", True):
            w.group(75, ent.get("hatchStyle", 0))
            w.group(76, ent.get("patternType", 1))
            if "patternAngle" in ent:
                w.group(52, ent["patternAngle"])
            if "patternScale" in ent:
                w.group(41, ent["patternScale"])
        else:
            w.group(75, ent.get("hatchStyle", 0))
            w.group(76, ent.get("patternType", 1))

        w.group(98, 0)  # num seed points

    # --- INSERT ---
    @staticmethod
    def _write_insert(w: DxfWriter, ent: dict) -> None:
        w.entity("INSERT")
        DxfExporter._write_common(w, ent, "AcDbBlockReference")
        has_attribs = bool(ent.get("attributes"))
        if has_attribs:
            w.group(66, 1)
        w.group(2, ent.get("blockName", ""))
        ip = ent.get("insertionPoint", [0, 0, 0])
        w.point(ip[0], ip[1], ip[2] if len(ip) > 2 else 0.0)
        if "scaleX" in ent:
            w.group(41, ent["scaleX"])
        if "scaleY" in ent:
            w.group(42, ent["scaleY"])
        if "scaleZ" in ent:
            w.group(43, ent["scaleZ"])
        if "rotation" in ent:
            w.group(50, ent["rotation"])
        if "columnCount" in ent:
            w.group(70, ent["columnCount"])
        if "rowCount" in ent:
            w.group(71, ent["rowCount"])
        if "columnSpacing" in ent:
            w.group(44, ent["columnSpacing"])
        if "rowSpacing" in ent:
            w.group(45, ent["rowSpacing"])

        if has_attribs:
            for attr in ent["attributes"]:
                DxfExporter._write_attrib_entity(w, attr, ent.get("layer", "0"))
            w.entity("SEQEND")
            w.handle(w.next_handle())
            w.group(100, "AcDbEntity")
            w.group(8, ent.get("layer", "0"))

    @staticmethod
    def _write_attrib_entity(w: DxfWriter, attr: dict, layer: str) -> None:
        w.entity("ATTRIB")
        w.handle(w.next_handle())
        w.group(100, "AcDbEntity")
        w.group(8, attr.get("layer", layer))
        w.group(100, "AcDbText")
        ip = attr.get("insertionPoint", [0, 0, 0])
        w.point(ip[0], ip[1], ip[2] if len(ip) > 2 else 0.0)
        w.group(40, attr.get("height", 2.5))
        w.group(1, attr.get("value", ""))
        w.group(100, "AcDbAttribute")
        w.group(2, attr.get("tag", ""))
        w.group(70, attr.get("flags", 0))

    # --- ATTDEF ---
    @staticmethod
    def _write_attdef(w: DxfWriter, ent: dict) -> None:
        w.entity("ATTDEF")
        DxfExporter._write_common(w, ent, "AcDbText")
        ip = ent.get("insertionPoint", [0, 0, 0])
        w.point(ip[0], ip[1], ip[2] if len(ip) > 2 else 0.0)
        w.group(40, ent.get("height", 2.5))
        w.group(1, ent.get("defaultValue", ""))
        w.group(100, "AcDbAttributeDefinition")
        w.group(3, ent.get("prompt", ""))
        w.group(2, ent.get("tag", ""))
        w.group(70, ent.get("flags", 0))

    # --- SOLID / TRACE ---
    @staticmethod
    def _write_solid_trace(w: DxfWriter, ent: dict) -> None:
        etype = ent.get("type", "SOLID")
        w.entity(etype)
        DxfExporter._write_common(w, ent, "AcDbTrace" if etype == "TRACE" else "AcDbTrace")
        for i, base in enumerate([10, 11, 12, 13]):
            pt = ent.get(f"point{i + 1}", [0, 0, 0])
            w.point(pt[0], pt[1], pt[2] if len(pt) > 2 else 0.0, base)

    # --- 3DFACE ---
    @staticmethod
    def _write_3dface(w: DxfWriter, ent: dict) -> None:
        w.entity("3DFACE")
        DxfExporter._write_common(w, ent, "AcDbFace")
        for i, base in enumerate([10, 11, 12, 13]):
            pt = ent.get(f"point{i + 1}", [0, 0, 0])
            w.point(pt[0], pt[1], pt[2] if len(pt) > 2 else 0.0, base)
        if "invisibleEdges" in ent:
            w.group(70, ent["invisibleEdges"])

    # --- VIEWPORT ---
    @staticmethod
    def _write_viewport(w: DxfWriter, ent: dict) -> None:
        w.entity("VIEWPORT")
        DxfExporter._write_common(w, ent, "AcDbViewport")
        c = ent.get("center", [0, 0, 0])
        w.point(c[0], c[1], c[2] if len(c) > 2 else 0.0)
        w.group(40, ent.get("width", 297.0))
        w.group(41, ent.get("height", 210.0))
        if "id" in ent:
            w.group(69, ent["id"])
        if "viewCenter" in ent:
            vc = ent["viewCenter"]
            w.group(12, vc[0])
            w.group(22, vc[1])
        if "viewHeight" in ent:
            w.group(45, ent["viewHeight"])
        if "statusFlags" in ent:
            w.group(90, ent["statusFlags"])

    # --- XLINE / RAY ---
    @staticmethod
    def _write_xline_ray(w: DxfWriter, ent: dict) -> None:
        etype = ent.get("type", "XLINE")
        w.entity(etype)
        DxfExporter._write_common(w, ent, "AcDbXline" if etype == "XLINE" else "AcDbRay")
        o = ent.get("origin", [0, 0, 0])
        w.point(o[0], o[1], o[2] if len(o) > 2 else 0.0)
        d = ent.get("direction", [1, 0, 0])
        w.point(d[0], d[1], d[2] if len(d) > 2 else 0.0, 11)

    # --- IMAGE ---
    @staticmethod
    def _write_image(w: DxfWriter, ent: dict) -> None:
        w.entity("IMAGE")
        DxfExporter._write_common(w, ent, "AcDbRasterImage")
        ip = ent.get("insertionPoint", [0, 0, 0])
        w.point(ip[0], ip[1], ip[2] if len(ip) > 2 else 0.0)
        u = ent.get("uVector", [1, 0, 0])
        w.point(u[0], u[1], u[2] if len(u) > 2 else 0.0, 11)
        v = ent.get("vVector", [0, 1, 0])
        w.point(v[0], v[1], v[2] if len(v) > 2 else 0.0, 12)
        sz = ent.get("size", [1, 1])
        w.group(13, sz[0])
        w.group(23, sz[1])
        if "imageDefHandle" in ent:
            w.group(340, ent["imageDefHandle"])
        w.group(70, ent.get("displayFlags", 7))
        w.group(280, ent.get("clippingState", 0))
        w.group(281, ent.get("brightness", 50))
        w.group(282, ent.get("contrast", 50))
        w.group(283, ent.get("fade", 0))

    # --- WIPEOUT ---
    @staticmethod
    def _write_wipeout(w: DxfWriter, ent: dict) -> None:
        w.entity("WIPEOUT")
        DxfExporter._write_common(w, ent, "AcDbWipeout")
        ip = ent.get("insertionPoint", [0, 0, 0])
        w.point(ip[0], ip[1], ip[2] if len(ip) > 2 else 0.0)
        u = ent.get("uVector", [1, 0, 0])
        w.point(u[0], u[1], u[2] if len(u) > 2 else 0.0, 11)
        v = ent.get("vVector", [0, 1, 0])
        w.point(v[0], v[1], v[2] if len(v) > 2 else 0.0, 12)
        clip_verts = ent.get("clipVertices", [])
        if clip_verts:
            w.group(71, ent.get("clipType", 1))
            w.group(91, len(clip_verts))
            for cv in clip_verts:
                w.group(14, cv[0])
                w.group(24, cv[1])

    # --- ACIS (3DSOLID, BODY, REGION, SURFACE) ---
    @staticmethod
    def _write_acis(w: DxfWriter, ent: dict) -> None:
        etype = ent.get("type", "3DSOLID")
        w.entity(etype)
        subclass_map = {
            "3DSOLID": "AcDb3dSolid",
            "BODY": "AcDbBody",
            "REGION": "AcDbRegion",
            "SURFACE": "AcDbSurface",
        }
        DxfExporter._write_common(w, ent, "AcDbModelerGeometry")
        if "modelerVersion" in ent:
            w.group(70, ent["modelerVersion"])
        acis_data = ent.get("acisData", "")
        if acis_data:
            lines = acis_data.split("\n")
            for line in lines[:-1]:
                w.group(1, line)
            if lines:
                w.group(1, lines[-1])

    # --- MESH ---
    @staticmethod
    def _write_mesh(w: DxfWriter, ent: dict) -> None:
        w.entity("MESH")
        DxfExporter._write_common(w, ent, "AcDbSubDMesh")
        w.group(71, ent.get("version", 2))
        w.group(72, ent.get("subdivisionLevel", 0))
        verts = ent.get("vertices", [])
        w.group(92, len(verts))
        for v in verts:
            w.point(v[0], v[1], v[2] if len(v) > 2 else 0.0)
        faces = ent.get("faces", [])
        # Build face data list
        face_data: list[int] = []
        for f in faces:
            face_data.append(len(f))
            face_data.extend(f)
        w.group(93, len(face_data))
        for fd in face_data:
            w.group(90, fd)

    # --- MULTILEADER ---
    @staticmethod
    def _write_multileader(w: DxfWriter, ent: dict) -> None:
        w.entity("MULTILEADER")
        DxfExporter._write_common(w, ent, "AcDbMLeader")
        # MULTILEADER is very complex; write a minimal representation
        w.group(170, 1)  # leader line type: straight
        w.group(171, 1)  # content type: mtext
        tc = ent.get("textContent", {})
        if tc:
            text = tc.get("text", "")
            if text:
                w.group(304, text)

    # ------------------------------------------------------------------
    # OBJECTS section
    # ------------------------------------------------------------------

    @staticmethod
    def _write_objects(w: DxfWriter, doc: IfcxDocument) -> None:
        with w.section("OBJECTS"):
            # Root dictionary
            root_handle = w.next_handle()
            w.entity("DICTIONARY")
            w.handle(root_handle)
            w.group(100, "AcDbDictionary")
            w.group(281, 1)  # hard owner

            # ACAD_GROUP dictionary
            group_dict_handle = w.next_handle()
            w.group(3, "ACAD_GROUP")
            w.group(350, group_dict_handle)

            # Write the group dictionary
            w.entity("DICTIONARY")
            w.handle(group_dict_handle)
            w.group(100, "AcDbDictionary")
            w.group(281, 1)
