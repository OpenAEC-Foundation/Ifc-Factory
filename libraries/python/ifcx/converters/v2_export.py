"""V2 (IFC5 node-based) to V1 (DXF-style IfcxDocument) converter.

Converts the v2 node graph back into the flat entity-list format that the
existing DXF exporter (``DxfExporter``) understands.  The typical export path
is: v2 dict -> ``V2Export.to_v1()`` -> ``DxfExporter.to_file()``.
"""

from __future__ import annotations

import math
from typing import Any

from ifcx.document import IfcxDocument


class V2Export:
    """Converts a v2 IFC5-node dict back to a v1 ``IfcxDocument``."""

    @staticmethod
    def to_v1(v2: dict[str, Any]) -> IfcxDocument:
        """Convert a v2 dict to a v1 ``IfcxDocument``."""
        conv = V2Export(v2)
        conv._convert()
        return conv._doc

    # ----- internals --------------------------------------------------------

    def __init__(self, v2: dict[str, Any]) -> None:
        self._v2 = v2
        self._doc = IfcxDocument()
        self._nodes_by_path: dict[str, dict[str, Any]] = {}
        self._layers: dict[str, dict[str, Any]] = {}   # path -> layer props
        self._layer_name_by_path: dict[str, str] = {}
        self._styles: dict[str, dict[str, Any]] = {}    # path -> style dict
        self._definitions: dict[str, dict[str, Any]] = {}  # path -> block

    def _convert(self) -> None:
        # Index all nodes by path
        for node in self._v2.get("data", []):
            path = node.get("path", "")
            if path:
                self._nodes_by_path[path] = node

        # Reconstruct header
        self._convert_header()

        # First pass: extract layers, styles, definitions
        for node in self._v2.get("data", []):
            attrs = node.get("attributes", {})
            path = node.get("path", "")

            if "ifcx::layer::assignment" in attrs:
                name = attrs["ifcx::layer::assignment"].get("name", path)
                self._layer_name_by_path[path] = name
                layer_props: dict[str, Any] = {}
                ls = attrs.get("ifcx::layer::style", {})
                if "colour" in ls:
                    c = ls["colour"]
                    layer_props["color"] = self._rgb_to_aci(c)
                if "lineWeight" in ls:
                    layer_props["lineweight"] = int(ls["lineWeight"] * 100)
                if "frozen" in ls:
                    layer_props["frozen"] = ls["frozen"]
                if "locked" in ls:
                    layer_props["locked"] = ls["locked"]
                if "visible" in ls:
                    layer_props["off"] = not ls["visible"]
                if "plot" in ls:
                    layer_props["plot"] = ls["plot"]
                self._layers[path] = layer_props
                self._doc.add_layer(name, **layer_props)

            if "ifcx::style::textStyle" in attrs:
                self._styles[path] = attrs["ifcx::style::textStyle"]

            if "ifcx::style::curveStyle" in attrs:
                self._styles[path] = attrs["ifcx::style::curveStyle"]

            if "ifcx::component::definition" in attrs:
                self._definitions[path] = node

        # Convert text styles
        for path, style in list(self._styles.items()):
            if "font" in style:
                name = path.split("-", 1)[-1] if "-" in path else path
                props: dict[str, Any] = {}
                if "font" in style:
                    props["fontFamily"] = style["font"]
                if "size" in style:
                    props["height"] = style["size"]
                if "widthFactor" in style:
                    props["widthFactor"] = style["widthFactor"]
                self._doc.add_text_style(name, **props)

        # Convert blocks (definitions)
        for path, def_node in self._definitions.items():
            comp = def_node.get("attributes", {}).get("ifcx::component::definition", {})
            name = comp.get("name", path)
            base_pt = comp.get("basePoint", [0, 0, 0])
            block_entities: list[dict[str, Any]] = []
            children = def_node.get("children", {})
            for _child_key, child_path in children.items():
                child_node = self._nodes_by_path.get(child_path)
                if child_node:
                    ent = self._node_to_entity(child_node)
                    if ent:
                        block_entities.append(ent)
            self._doc.add_block(name, basePoint=base_pt, entities=block_entities)

        # Convert entity nodes -- walk views and collect elements
        for node in self._v2.get("data", []):
            attrs = node.get("attributes", {})
            # A view node has children that are element references
            if "ifcx::view::name" in attrs:
                children = node.get("children", {})
                for _key, child_path in children.items():
                    child_node = self._nodes_by_path.get(child_path)
                    if child_node:
                        ent = self._node_to_entity(child_node)
                        if ent:
                            self._doc.add_entity(ent)

        # If no views found, scan all data nodes for geometry
        if not self._doc.entities:
            for node in self._v2.get("data", []):
                ent = self._node_to_entity(node)
                if ent:
                    self._doc.add_entity(ent)

    def _convert_header(self) -> None:
        header = self._v2.get("header", {})
        units = header.get("units", {})
        length = units.get("length", "mm")
        unit_map = {
            "mm": "millimeters", "cm": "centimeters", "m": "meters",
            "km": "kilometers", "in": "inches", "ft": "feet", "mi": "miles",
        }
        self._doc.header = {
            "units": {
                "linear": unit_map.get(length, "millimeters"),
                "measurement": "metric",
            }
        }

    def _node_to_entity(self, node: dict[str, Any]) -> dict[str, Any] | None:
        """Convert a v2 node to a v1 entity dict. Returns None if not a geometry node."""
        attrs = node.get("attributes", {})
        result: dict[str, Any] = {}

        # Resolve layer from connection
        layer_ref = attrs.get("ifcx::connects::layer", {}).get("ref", "")
        if layer_ref and layer_ref in self._layer_name_by_path:
            result["layer"] = self._layer_name_by_path[layer_ref]

        # Entity-level curve style
        cs = attrs.get("ifcx::style::curveStyle", {})
        if "colour" in cs:
            result["color"] = self._rgb_to_aci(cs["colour"])
        if "width" in cs:
            result["lineweight"] = cs["width"]
        if "pattern" in cs and isinstance(cs["pattern"], str):
            result["linetype"] = cs["pattern"]

        # --- Geometry attributes -> entity type ---

        if "ifcx::geom::line" in attrs:
            result["type"] = "LINE"
            pts = attrs["ifcx::geom::line"].get("points", [])
            if len(pts) >= 2:
                result["start"] = list(pts[0])
                result["end"] = list(pts[1])
            return result

        if "ifcx::geom::circle" in attrs:
            result["type"] = "CIRCLE"
            g = attrs["ifcx::geom::circle"]
            result["center"] = list(g.get("center", [0, 0, 0]))
            result["radius"] = g.get("radius", 0)
            return result

        if "ifcx::geom::trimmedCurve" in attrs:
            result["type"] = "ARC"
            g = attrs["ifcx::geom::trimmedCurve"]
            result["center"] = list(g.get("center", [0, 0, 0]))
            result["radius"] = g.get("radius", 0)
            result["startAngle"] = g.get("startAngle", 0)
            result["endAngle"] = g.get("endAngle", 0)
            return result

        if "ifcx::geom::ellipse" in attrs:
            result["type"] = "ELLIPSE"
            g = attrs["ifcx::geom::ellipse"]
            result["center"] = list(g.get("center", [0, 0, 0]))
            result["semiAxis1"] = g.get("semiAxis1", 0)
            result["semiAxis2"] = g.get("semiAxis2", 0)
            result["rotation"] = g.get("rotation", 0)
            return result

        if "ifcx::geom::bspline" in attrs:
            result["type"] = "SPLINE"
            g = attrs["ifcx::geom::bspline"]
            if "degree" in g:
                result["degree"] = g["degree"]
            if "controlPoints" in g:
                result["controlPoints"] = g["controlPoints"]
            if "knots" in g:
                result["knots"] = g["knots"]
            if "weights" in g:
                result["weights"] = g["weights"]
            return result

        if "ifcx::geom::compositeCurve" in attrs:
            result["type"] = "LWPOLYLINE"
            g = attrs["ifcx::geom::compositeCurve"]
            result["closed"] = g.get("closed", False)
            # Reconstruct vertices and bulges from segments
            verts, bulges = self._segments_to_lwpoly(g.get("segments", []))
            result["vertices"] = verts
            if any(b != 0 for b in bulges):
                result["bulges"] = bulges
            return result

        if "ifcx::geom::polyline" in attrs:
            result["type"] = "LWPOLYLINE"
            g = attrs["ifcx::geom::polyline"]
            result["closed"] = g.get("closed", False)
            result["vertices"] = g.get("points", [])
            return result

        if "ifcx::geom::polygon" in attrs:
            g = attrs["ifcx::geom::polygon"]
            pts = g.get("points", [])
            result["type"] = "SOLID" if len(pts) <= 4 else "3DFACE"
            for i, p in enumerate(pts[:4], 1):
                result[f"p{i}"] = list(p)
            return result

        if "ifcx::geom::point" in attrs:
            result["type"] = "POINT"
            result["position"] = list(attrs["ifcx::geom::point"].get("position", [0, 0, 0]))
            return result

        if "ifcx::geom::ray" in attrs:
            result["type"] = "RAY"
            g = attrs["ifcx::geom::ray"]
            result["origin"] = list(g.get("origin", [0, 0, 0]))
            result["direction"] = list(g.get("direction", [1, 0, 0]))
            return result

        if "ifcx::geom::constructionLine" in attrs:
            result["type"] = "XLINE"
            g = attrs["ifcx::geom::constructionLine"]
            result["origin"] = list(g.get("origin", [0, 0, 0]))
            result["direction"] = list(g.get("direction", [1, 0, 0]))
            return result

        if "ifcx::geom::solid" in attrs:
            result["type"] = "3DSOLID"
            result["acisData"] = attrs["ifcx::geom::solid"].get("data", "")
            return result

        if "ifcx::geom::mesh" in attrs:
            result["type"] = "MESH"
            g = attrs["ifcx::geom::mesh"]
            if "points" in g:
                result["vertices"] = g["points"]
            if "faceVertexIndices" in g:
                result["faces"] = g["faceVertexIndices"]
            return result

        if "ifcx::annotation::text" in attrs:
            g = attrs["ifcx::annotation::text"]
            # Distinguish TEXT vs MTEXT by presence of "width"
            if "width" in g:
                result["type"] = "MTEXT"
            else:
                result["type"] = "TEXT"
            result["text"] = g.get("value", "")
            if "placement" in g:
                result["insertionPoint"] = list(g["placement"])
            if "height" in g:
                result["height"] = g["height"]
            if "width" in g:
                result["width"] = g["width"]
            if "attachment" in g:
                result["attachment"] = g["attachment"]
            if "alignment" in g:
                result["horizontalAlignment"] = g["alignment"]
            if "style" in g and isinstance(g["style"], dict):
                if "rotation" in g["style"]:
                    result["rotation"] = g["style"]["rotation"]
            return result

        if "ifcx::annotation::dimension" in attrs:
            g = attrs["ifcx::annotation::dimension"]
            subtype = g.get("subtype", "linear")
            type_map = {
                "linear": "DIMENSION_LINEAR",
                "aligned": "DIMENSION_ALIGNED",
                "angular": "DIMENSION_ANGULAR",
                "diameter": "DIMENSION_DIAMETER",
                "radius": "DIMENSION_RADIUS",
                "ordinate": "DIMENSION_ORDINATE",
            }
            result["type"] = type_map.get(subtype, "DIMENSION_LINEAR")
            pts = g.get("measurePoints", [])
            if len(pts) >= 1:
                result["defPoint1"] = list(pts[0])
            if len(pts) >= 2:
                result["defPoint2"] = list(pts[1])
            if "dimensionLine" in g:
                result["dimLine"] = list(g["dimensionLine"])
            if "text" in g:
                result["text"] = g["text"]
            if "value" in g:
                result["measurement"] = g["value"]
            return result

        if "ifcx::annotation::leader" in attrs:
            result["type"] = "LEADER"
            g = attrs["ifcx::annotation::leader"]
            if "path" in g:
                result["vertices"] = g["path"]
            result["hasArrowhead"] = g.get("arrowhead", True)
            return result

        if "ifcx::hatch::solid" in attrs or "ifcx::hatch::pattern" in attrs:
            result["type"] = "HATCH"
            if "ifcx::hatch::solid" in attrs:
                result["solid"] = True
                s = attrs["ifcx::hatch::solid"]
                if "colour" in s:
                    result["color"] = self._rgb_to_aci(s["colour"])
            else:
                result["solid"] = False
                p = attrs["ifcx::hatch::pattern"]
                if "name" in p:
                    result["patternName"] = p["name"]
                if "angle" in p:
                    result["patternAngle"] = p["angle"]
                if "scale" in p:
                    result["patternScale"] = p["scale"]
            if "ifcx::hatch::boundary" in attrs:
                result["boundary"] = attrs["ifcx::hatch::boundary"]
            return result

        if "ifcx::sheet::viewport" in attrs:
            result["type"] = "VIEWPORT"
            g = attrs["ifcx::sheet::viewport"]
            if "center" in g:
                result["center"] = list(g["center"])
            if "width" in g:
                result["width"] = g["width"]
            if "height" in g:
                result["height"] = g["height"]
            if "viewTarget" in g:
                result["viewTarget"] = list(g["viewTarget"])
            if "viewScale" in g:
                result["viewScale"] = g["viewScale"]
            return result

        if "ifcx::image::raster" in attrs:
            result["type"] = "IMAGE"
            g = attrs["ifcx::image::raster"]
            if "insertionPoint" in g:
                result["insertionPoint"] = list(g["insertionPoint"])
            media = self._v2.get("media", {})
            mid = g.get("mediaId", "")
            if mid and mid in media:
                result["imagePath"] = media[mid].get("path", "")
            return result

        if "ifcx::image::wipeout" in attrs:
            result["type"] = "WIPEOUT"
            result["boundary"] = attrs["ifcx::image::wipeout"].get("boundary", [])
            return result

        # INSERT via inherits
        inherits = node.get("inherits", [])
        if inherits and "ifcx::xform::matrix" in attrs:
            result["type"] = "INSERT"
            # Find block name from definition
            def_path = inherits[0]
            def_node = self._nodes_by_path.get(def_path, {})
            comp = def_node.get("attributes", {}).get("ifcx::component::definition", {})
            result["name"] = comp.get("name", def_path)
            # Decompose matrix
            matrix = attrs["ifcx::xform::matrix"]
            result["insertionPoint"] = [matrix[3][0], matrix[3][1], matrix[3][2]]
            # Extract scale and rotation from the matrix
            sx = math.hypot(matrix[0][0], matrix[0][1])
            sy = math.hypot(matrix[1][0], matrix[1][1])
            sz = matrix[2][2]
            rotation = math.atan2(matrix[0][1], matrix[0][0])
            result["xScale"] = sx
            result["yScale"] = sy
            result["zScale"] = sz
            result["rotation"] = rotation
            return result

        if "ifcx::unknown::entity" in attrs:
            g = attrs["ifcx::unknown::entity"]
            result["type"] = g.get("originalType", "UNKNOWN")
            result.update(g.get("data", {}))
            return result

        # Not a convertible geometry/annotation node
        return None

    @staticmethod
    def _segments_to_lwpoly(
        segments: list[dict[str, Any]],
    ) -> tuple[list[list[float]], list[float]]:
        """Convert composite-curve segments back to LWPOLYLINE vertices + bulges."""
        verts: list[list[float]] = []
        bulges: list[float] = []

        for seg in segments:
            stype = seg.get("type", "line")
            if stype == "line":
                pts = seg.get("points", [])
                if pts:
                    if not verts:
                        verts.append(list(pts[0]))
                        bulges.append(0.0)
                    if len(pts) > 1:
                        # The start should match the last vertex
                        verts.append(list(pts[-1]))
                        # Update the bulge of the *previous* vertex
                        bulges[-1] = 0.0
                        bulges.append(0.0)
            elif stype == "arc":
                center = seg.get("center", [0, 0, 0])
                radius = seg.get("radius", 0)
                sa = seg.get("startAngle", 0)
                ea = seg.get("endAngle", 0)
                p1 = [center[0] + radius * math.cos(sa),
                      center[1] + radius * math.sin(sa),
                      0.0]
                p2 = [center[0] + radius * math.cos(ea),
                      center[1] + radius * math.sin(ea),
                      0.0]

                # Calculate bulge
                angle = ea - sa
                if angle < 0:
                    angle += 2 * math.pi
                bulge = math.tan(angle / 4.0)

                if not verts:
                    verts.append(p1)
                    bulges.append(bulge)
                else:
                    bulges[-1] = bulge
                verts.append(p2)
                bulges.append(0.0)

        # Remove trailing zero bulge if present
        if bulges and bulges[-1] == 0.0 and len(bulges) == len(verts):
            pass  # keep it -- it matches the vertex count

        return verts, bulges

    @staticmethod
    def _rgb_to_aci(rgb: dict[str, float] | None) -> int:
        """Convert normalised RGB dict to the nearest ACI index."""
        if not rgb:
            return 7
        r, g, b = rgb.get("r", 1), rgb.get("g", 1), rgb.get("b", 1)
        # Simple nearest-match to the 9 standard ACI colours
        _TABLE = [
            (1, 1.0, 0.0, 0.0),
            (2, 1.0, 1.0, 0.0),
            (3, 0.0, 1.0, 0.0),
            (4, 0.0, 1.0, 1.0),
            (5, 0.0, 0.0, 1.0),
            (6, 1.0, 0.0, 1.0),
            (7, 1.0, 1.0, 1.0),
            (8, 0.5, 0.5, 0.5),
            (9, 0.75, 0.75, 0.75),
        ]
        best_aci = 7
        best_dist = float("inf")
        for aci, cr, cg, cb in _TABLE:
            d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
            if d < best_dist:
                best_dist = d
                best_aci = aci
        return best_aci
