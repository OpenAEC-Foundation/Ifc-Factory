"""V1 (DXF-style IfcxDocument) to V2 (IFC5 node-based) converter.

Transforms the flat entity-list format produced by the DXF/DWG/DGN importers
into the IFC5-compatible node graph used by IfcX v2.

The v1 parsers (dxf_parser, dwg_parser, dgn_parser) remain unchanged -- they
parse binary/text CAD formats into ``IfcxDocument``.  This module converts
their output into the v2 dict structure.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from ifcx.document import IfcxDocument

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_V2_IMPORTS = [
    {"uri": "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx"},
    {"uri": "https://ifcx.dev/@openusd.org/usd@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/geom@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/annotation@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/sheet@v1.ifcx"},
]

# Unit string normalisation (v1 linear unit name -> v2 length abbreviation)
_UNIT_TO_MM: dict[str, str] = {
    "millimeters": "mm",
    "centimeters": "cm",
    "meters": "m",
    "kilometers": "km",
    "inches": "in",
    "feet": "ft",
    "miles": "mi",
    "unitless": "mm",
    # DWG-specific (LUNITS)
    "scientific": "mm",
    "decimal": "mm",
    "engineering": "in",
    "architectural": "in",
    "fractional": "in",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _uid() -> str:
    """Return a short hex UUID (first 12 chars of uuid4)."""
    return uuid4().hex[:12]


def _ensure_3d(pt: list[float] | tuple[float, ...]) -> list[float]:
    """Ensure a point has three components."""
    pt = list(pt)
    while len(pt) < 3:
        pt.append(0.0)
    return pt[:3]


def _build_insert_matrix(
    insert_pt: list[float],
    x_scale: float = 1.0,
    y_scale: float = 1.0,
    z_scale: float = 1.0,
    rotation: float = 0.0,
) -> list[list[float]]:
    """Build a 4x4 column-major transform matrix from INSERT properties.

    ``rotation`` is in **radians**.
    """
    c = math.cos(rotation)
    s = math.sin(rotation)
    tx, ty, tz = _ensure_3d(insert_pt)
    return [
        [x_scale * c, x_scale * s, 0.0, 0.0],
        [-y_scale * s, y_scale * c, 0.0, 0.0],
        [0.0, 0.0, z_scale, 0.0],
        [tx, ty, tz, 1.0],
    ]


# ---------------------------------------------------------------------------
# V2Converter
# ---------------------------------------------------------------------------

class V2Converter:
    """Converts a v1 ``IfcxDocument`` to the v2 IFC5-node dict format."""

    # ----- public API -------------------------------------------------------

    @staticmethod
    def from_v1(doc: IfcxDocument) -> dict[str, Any]:
        """Convert *doc* (v1) to a v2 dict.

        Returns a dict with keys ``header``, ``imports``, ``data``, ``media``.
        """
        conv = V2Converter(doc)
        conv._convert()
        return conv._result

    # ----- internals --------------------------------------------------------

    def __init__(self, doc: IfcxDocument) -> None:
        self._doc = doc
        self._nodes: list[dict[str, Any]] = []
        self._result: dict[str, Any] = {}

        # Maps: v1 name -> v2 path
        self._layer_paths: dict[str, str] = {}
        self._style_paths: dict[str, str] = {}
        self._block_paths: dict[str, str] = {}

        # Collect media (raster images)
        self._media: dict[str, Any] = {}

    # .......................................................................
    # Main orchestrator
    # .......................................................................

    def _convert(self) -> None:
        # Determine length unit
        v1_units = self._doc.header.get("units", {})
        length_unit = "mm"
        if isinstance(v1_units, dict):
            raw = v1_units.get("linear", "millimeters")
            length_unit = _UNIT_TO_MM.get(str(raw), "mm")

        header = {
            "ifcxVersion": "2.0",
            "id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "units": {"length": length_unit, "angle": "rad"},
        }

        # Structural root nodes
        project_path = "project"
        drawings_path = "drawings"
        definitions_path = "definitions"
        styles_path = "styles"

        project_node: dict[str, Any] = {
            "path": project_path,
            "children": {
                "drawings": drawings_path,
                "definitions": definitions_path,
                "styles": styles_path,
            },
            "attributes": {
                "ifcx::purpose": "drawing",
            },
        }
        self._nodes.append(project_node)

        # Styles container
        styles_node: dict[str, Any] = {
            "path": styles_path,
            "children": {},
            "attributes": {"ifcx::purpose": "drawing"},
        }

        # Definitions container
        definitions_node: dict[str, Any] = {
            "path": definitions_path,
            "children": {},
            "attributes": {"ifcx::purpose": "definition"},
        }

        # Drawings container
        drawings_node: dict[str, Any] = {
            "path": drawings_path,
            "children": {},
            "attributes": {"ifcx::purpose": "drawing"},
        }

        # 1. Convert layers -> style nodes
        self._convert_layers(styles_node)

        # 2. Convert text / dim / linetype styles
        self._convert_text_styles(styles_node)
        self._convert_dim_styles(styles_node)
        self._convert_linetypes(styles_node)

        # 3. Convert blocks -> definitions
        self._convert_blocks(definitions_node)

        # 4. Convert entities -> element nodes under a default view
        view_path = "view-main"
        view_node: dict[str, Any] = {
            "path": view_path,
            "children": {},
            "attributes": {
                "ifcx::purpose": "drawing",
                "ifcx::view::name": "Main",
                "ifcx::view::scale": 1,
            },
        }
        self._convert_entities(view_node)

        # Wire view into drawings
        drawings_node["children"]["main"] = view_path

        # Append structural nodes (after children are populated)
        self._nodes.append(styles_node)
        self._nodes.append(definitions_node)
        self._nodes.append(drawings_node)
        self._nodes.append(view_node)

        self._result = {
            "header": header,
            "imports": list(_V2_IMPORTS),
            "data": self._nodes,
            "media": self._media,
        }

    # .......................................................................
    # Layers
    # .......................................................................

    def _convert_layers(self, styles_node: dict[str, Any]) -> None:
        layers = self._doc.tables.get("layers", {})
        for name, props in layers.items():
            path = f"layer-{_uid()}"
            self._layer_paths[name] = path

            attrs: dict[str, Any] = {"ifcx::purpose": "drawing"}

            style_val: dict[str, Any] = {}
            if "color" in props:
                colour = self._aci_to_rgb(props["color"])
                if colour:
                    style_val["colour"] = colour
            if "lineweight" in props:
                lw = props["lineweight"]
                if isinstance(lw, (int, float)) and lw >= 0:
                    style_val["lineWeight"] = lw / 100.0 if lw > 10 else float(lw)
            if "frozen" in props:
                style_val["frozen"] = bool(props["frozen"])
            if "locked" in props:
                style_val["locked"] = bool(props["locked"])
            if "off" in props:
                style_val["visible"] = not bool(props["off"])
            if "plot" in props:
                style_val["plot"] = bool(props["plot"])

            attrs["ifcx::layer::style"] = style_val
            attrs["ifcx::layer::assignment"] = {"name": name}

            node: dict[str, Any] = {"path": path, "attributes": attrs}
            self._nodes.append(node)
            styles_node["children"][f"layer-{name}"] = path

    # .......................................................................
    # Text styles
    # .......................................................................

    def _convert_text_styles(self, styles_node: dict[str, Any]) -> None:
        text_styles = self._doc.tables.get("textStyles", {})
        for name, props in text_styles.items():
            path = f"textstyle-{_uid()}"
            self._style_paths[f"text:{name}"] = path

            style_val: dict[str, Any] = {}
            if "fontFamily" in props:
                style_val["font"] = props["fontFamily"]
            if "height" in props:
                style_val["size"] = props["height"]
            if "widthFactor" in props:
                style_val["widthFactor"] = props["widthFactor"]

            node: dict[str, Any] = {
                "path": path,
                "attributes": {
                    "ifcx::purpose": "drawing",
                    "ifcx::style::textStyle": style_val,
                },
            }
            self._nodes.append(node)
            styles_node["children"][f"textstyle-{name}"] = path

    # .......................................................................
    # Dim styles
    # .......................................................................

    def _convert_dim_styles(self, styles_node: dict[str, Any]) -> None:
        dim_styles = self._doc.tables.get("dimStyles", {})
        for name, props in dim_styles.items():
            path = f"dimstyle-{_uid()}"
            self._style_paths[f"dim:{name}"] = path

            node: dict[str, Any] = {
                "path": path,
                "attributes": {
                    "ifcx::purpose": "drawing",
                    "ifcx::style::dimensionStyle": dict(props),
                },
            }
            self._nodes.append(node)
            styles_node["children"][f"dimstyle-{name}"] = path

    # .......................................................................
    # Linetypes
    # .......................................................................

    def _convert_linetypes(self, styles_node: dict[str, Any]) -> None:
        linetypes = self._doc.tables.get("linetypes", {})
        for name, props in linetypes.items():
            path = f"linetype-{_uid()}"
            self._style_paths[f"lt:{name}"] = path

            style_val: dict[str, Any] = {}
            if "description" in props:
                style_val["description"] = props["description"]
            if "pattern" in props:
                style_val["dashPattern"] = props["pattern"]

            node: dict[str, Any] = {
                "path": path,
                "attributes": {
                    "ifcx::purpose": "drawing",
                    "ifcx::style::curveStyle": style_val,
                },
            }
            self._nodes.append(node)
            styles_node["children"][f"linetype-{name}"] = path

    # .......................................................................
    # Blocks -> definitions
    # .......................................................................

    def _convert_blocks(self, definitions_node: dict[str, Any]) -> None:
        for name, block in self._doc.blocks.items():
            path = f"def-{_uid()}"
            self._block_paths[name] = path

            base_pt = _ensure_3d(block.get("basePoint", [0, 0, 0]))
            children: dict[str, str] = {}

            # Convert block entities
            for ent in block.get("entities", []):
                ent_path = f"e-{_uid()}"
                ent_node = self._entity_to_node(ent, ent_path)
                if ent_node:
                    self._nodes.append(ent_node)
                    child_key = ent.get("handle", _uid())
                    children[str(child_key)] = ent_path

            node: dict[str, Any] = {
                "path": path,
                "children": children,
                "attributes": {
                    "ifcx::purpose": "definition",
                    "ifcx::component::definition": {
                        "name": name,
                        "basePoint": base_pt,
                    },
                },
            }
            self._nodes.append(node)
            definitions_node["children"][name] = path

    # .......................................................................
    # Entities
    # .......................................................................

    def _convert_entities(self, view_node: dict[str, Any]) -> None:
        for ent in self._doc.entities:
            path = f"e-{_uid()}"
            node = self._entity_to_node(ent, path)
            if node:
                self._nodes.append(node)
                child_key = ent.get("handle", path)
                view_node["children"][str(child_key)] = path

    def _entity_to_node(self, ent: dict[str, Any], path: str) -> dict[str, Any] | None:
        """Convert a single v1 entity dict to a v2 node dict."""
        etype = ent.get("type", "")
        attrs: dict[str, Any] = {"ifcx::purpose": "drawing"}
        inherits: list[str] | None = None

        # -- geometry mapping ------------------------------------------------
        if etype == "LINE":
            start = _ensure_3d(ent.get("start", [0, 0, 0]))
            end = _ensure_3d(ent.get("end", [0, 0, 0]))
            attrs["ifcx::geom::line"] = {"points": [start, end]}

        elif etype == "CIRCLE":
            attrs["ifcx::geom::circle"] = {
                "center": _ensure_3d(ent.get("center", [0, 0, 0])),
                "radius": ent.get("radius", 0),
            }

        elif etype == "ARC":
            attrs["ifcx::geom::trimmedCurve"] = {
                "center": _ensure_3d(ent.get("center", [0, 0, 0])),
                "radius": ent.get("radius", 0),
                "startAngle": ent.get("startAngle", 0),
                "endAngle": ent.get("endAngle", 0),
            }

        elif etype == "ELLIPSE":
            center = _ensure_3d(ent.get("center", [0, 0, 0]))
            # v1 may store majorAxis/minorAxis or semiAxis1/semiAxis2
            semi1 = ent.get("semiAxis1") or ent.get("majorAxis", 0)
            semi2 = ent.get("semiAxis2") or ent.get("minorAxis", 0)
            rotation = ent.get("rotation", 0)
            attrs["ifcx::geom::ellipse"] = {
                "center": center,
                "semiAxis1": semi1,
                "semiAxis2": semi2,
                "rotation": rotation,
            }

        elif etype == "SPLINE":
            bspline: dict[str, Any] = {}
            if "degree" in ent:
                bspline["degree"] = ent["degree"]
            if "controlPoints" in ent:
                bspline["controlPoints"] = [_ensure_3d(p) for p in ent["controlPoints"]]
            elif "vertices" in ent:
                bspline["controlPoints"] = [_ensure_3d(p) for p in ent["vertices"]]
            if "knots" in ent:
                bspline["knots"] = ent["knots"]
            if "weights" in ent:
                bspline["weights"] = ent["weights"]
            attrs["ifcx::geom::bspline"] = bspline

        elif etype == "LWPOLYLINE":
            verts = ent.get("vertices", [])
            closed = ent.get("closed", False)
            bulges = ent.get("bulges", [])
            has_bulge = bulges and any(b != 0 for b in bulges)
            if has_bulge:
                segments = self._lwpoly_to_segments(verts, bulges, closed)
                attrs["ifcx::geom::compositeCurve"] = {
                    "segments": segments,
                    "closed": closed,
                }
            else:
                attrs["ifcx::geom::polyline"] = {
                    "points": [_ensure_3d(v) for v in verts],
                    "closed": closed,
                }

        elif etype in ("POLYLINE2D", "POLYLINE3D"):
            verts = ent.get("vertices", [])
            closed = ent.get("closed", False)
            attrs["ifcx::geom::polyline"] = {
                "points": [_ensure_3d(v) for v in verts],
                "closed": closed,
            }

        elif etype == "TEXT":
            text_val: dict[str, Any] = {
                "value": ent.get("text", ""),
            }
            if "insertionPoint" in ent:
                text_val["placement"] = _ensure_3d(ent["insertionPoint"])
            if "height" in ent:
                text_val["height"] = ent["height"]
            if "rotation" in ent:
                text_val["style"] = {"rotation": ent["rotation"]}
            if "horizontalAlignment" in ent:
                text_val["alignment"] = ent["horizontalAlignment"]
            # Link text style if present
            ts = ent.get("style")
            if ts and f"text:{ts}" in self._style_paths:
                attrs["ifcx::connects::style"] = {"ref": self._style_paths[f"text:{ts}"]}
            attrs["ifcx::annotation::text"] = text_val

        elif etype == "MTEXT":
            text_val = {
                "value": ent.get("text", ""),
            }
            if "insertionPoint" in ent:
                text_val["placement"] = _ensure_3d(ent["insertionPoint"])
            if "height" in ent:
                text_val["height"] = ent["height"]
            if "width" in ent:
                text_val["width"] = ent["width"]
            if "attachment" in ent:
                text_val["attachment"] = ent["attachment"]
            ts = ent.get("style")
            if ts and f"text:{ts}" in self._style_paths:
                attrs["ifcx::connects::style"] = {"ref": self._style_paths[f"text:{ts}"]}
            attrs["ifcx::annotation::text"] = text_val

        elif etype.startswith("DIMENSION"):
            dim_val: dict[str, Any] = {}
            subtype_map = {
                "DIMENSION_LINEAR": "linear",
                "DIMENSION_ALIGNED": "aligned",
                "DIMENSION_ANGULAR": "angular",
                "DIMENSION_ANGULAR3P": "angular",
                "DIMENSION_DIAMETER": "diameter",
                "DIMENSION_RADIUS": "radius",
                "DIMENSION_ORDINATE": "ordinate",
                "DIMENSION": "linear",
            }
            dim_val["subtype"] = subtype_map.get(etype, "linear")

            # Collect measure points
            measure_pts = []
            if "defPoint1" in ent:
                measure_pts.append(_ensure_3d(ent["defPoint1"]))
            if "defPoint2" in ent:
                measure_pts.append(_ensure_3d(ent["defPoint2"]))
            if measure_pts:
                dim_val["measurePoints"] = measure_pts

            if "dimLine" in ent:
                dim_val["dimensionLine"] = _ensure_3d(ent["dimLine"])
            if "text" in ent:
                dim_val["text"] = ent["text"]
            if "measurement" in ent:
                dim_val["value"] = ent["measurement"]

            # Link dim style
            ds = ent.get("dimStyle")
            if ds and f"dim:{ds}" in self._style_paths:
                attrs["ifcx::connects::style"] = {"ref": self._style_paths[f"dim:{ds}"]}

            attrs["ifcx::annotation::dimension"] = dim_val

        elif etype == "LEADER":
            leader_val: dict[str, Any] = {}
            if "vertices" in ent:
                leader_val["path"] = [_ensure_3d(v) for v in ent["vertices"]]
            leader_val["arrowhead"] = ent.get("hasArrowhead", True)
            attrs["ifcx::annotation::leader"] = leader_val

        elif etype == "HATCH":
            hatch_type = ent.get("patternType", "")
            if ent.get("solid", False) or hatch_type == "SOLID":
                fill: dict[str, Any] = {}
                if "color" in ent:
                    colour = self._aci_to_rgb(ent["color"])
                    if colour:
                        fill["colour"] = colour
                attrs["ifcx::hatch::solid"] = fill
            else:
                pattern: dict[str, Any] = {}
                if "patternName" in ent:
                    pattern["name"] = ent["patternName"]
                if "patternAngle" in ent:
                    pattern["angle"] = ent["patternAngle"]
                if "patternScale" in ent:
                    pattern["scale"] = ent["patternScale"]
                attrs["ifcx::hatch::pattern"] = pattern

            # Boundary
            if "boundary" in ent:
                attrs["ifcx::hatch::boundary"] = ent["boundary"]

        elif etype == "INSERT":
            block_name = ent.get("name", ent.get("blockName", ""))
            if block_name and block_name in self._block_paths:
                inherits = [self._block_paths[block_name]]

            insert_pt = _ensure_3d(ent.get("insertionPoint", [0, 0, 0]))
            x_scale = ent.get("xScale", ent.get("scaleX", 1.0))
            y_scale = ent.get("yScale", ent.get("scaleY", 1.0))
            z_scale = ent.get("zScale", ent.get("scaleZ", 1.0))
            rotation = ent.get("rotation", 0.0)

            matrix = _build_insert_matrix(insert_pt, x_scale, y_scale, z_scale, rotation)
            attrs["ifcx::xform::matrix"] = matrix

        elif etype in ("SOLID", "TRACE"):
            points = []
            for key in ("p1", "p2", "p3", "p4"):
                if key in ent:
                    points.append(_ensure_3d(ent[key]))
            if not points and "vertices" in ent:
                points = [_ensure_3d(v) for v in ent["vertices"]]
            attrs["ifcx::geom::polygon"] = {"points": points}

        elif etype == "3DFACE":
            points = []
            for key in ("p1", "p2", "p3", "p4"):
                if key in ent:
                    points.append(_ensure_3d(ent[key]))
            if not points and "vertices" in ent:
                points = [_ensure_3d(v) for v in ent["vertices"]]
            attrs["ifcx::geom::polygon"] = {"points": points}

        elif etype == "VIEWPORT":
            vp: dict[str, Any] = {}
            if "center" in ent:
                vp["center"] = _ensure_3d(ent["center"])[:2]
            if "width" in ent:
                vp["width"] = ent["width"]
            if "height" in ent:
                vp["height"] = ent["height"]
            if "viewTarget" in ent:
                vp["viewTarget"] = _ensure_3d(ent["viewTarget"])
            if "viewScale" in ent or "customScale" in ent:
                vp["viewScale"] = ent.get("viewScale") or ent.get("customScale", 1.0)
            attrs["ifcx::sheet::viewport"] = vp

        elif etype == "POINT":
            pos = _ensure_3d(ent.get("position", ent.get("insertionPoint", [0, 0, 0])))
            attrs["ifcx::geom::point"] = {"position": pos}

        elif etype == "RAY":
            attrs["ifcx::geom::ray"] = {
                "origin": _ensure_3d(ent.get("origin", ent.get("start", [0, 0, 0]))),
                "direction": _ensure_3d(ent.get("direction", [1, 0, 0])),
            }

        elif etype == "XLINE":
            attrs["ifcx::geom::constructionLine"] = {
                "origin": _ensure_3d(ent.get("origin", ent.get("start", [0, 0, 0]))),
                "direction": _ensure_3d(ent.get("direction", [1, 0, 0])),
            }

        elif etype in ("3DSOLID", "BODY", "REGION"):
            data_str = ent.get("acisData", ent.get("data", ""))
            attrs["ifcx::geom::solid"] = {"data": data_str}

        elif etype == "MESH":
            mesh_val: dict[str, Any] = {}
            if "vertices" in ent:
                mesh_val["points"] = [_ensure_3d(v) for v in ent["vertices"]]
            if "faces" in ent:
                mesh_val["faceVertexIndices"] = ent["faces"]
            attrs["ifcx::geom::mesh"] = mesh_val

        elif etype == "IMAGE":
            img: dict[str, Any] = {}
            if "insertionPoint" in ent:
                img["insertionPoint"] = _ensure_3d(ent["insertionPoint"])
            if "imageSize" in ent:
                img["imageSize"] = ent["imageSize"]
            if "imagePath" in ent:
                media_id = _uid()
                img["mediaId"] = media_id
                self._media[media_id] = {"path": ent["imagePath"]}
            attrs["ifcx::image::raster"] = img

        elif etype == "WIPEOUT":
            boundary = []
            if "boundary" in ent:
                boundary = [_ensure_3d(p) for p in ent["boundary"]]
            elif "vertices" in ent:
                boundary = [_ensure_3d(p) for p in ent["vertices"]]
            attrs["ifcx::image::wipeout"] = {"boundary": boundary}

        # DGN-specific types that map to known geometry
        elif etype == "TEXT_NODE":
            text_val = {"value": ""}
            if "origin" in ent:
                text_val["placement"] = _ensure_3d(ent["origin"])
            if "height" in ent:
                text_val["height"] = ent["height"]
            attrs["ifcx::annotation::text"] = text_val

        elif etype in ("COMPLEX_CHAIN", "COMPLEX_SHAPE"):
            # Complex groups -- store as composite curve placeholder
            attrs["ifcx::geom::compositeCurve"] = {
                "segments": [],
                "closed": etype == "COMPLEX_SHAPE",
            }

        elif etype in ("3DSURFACE", "3DSOLID"):
            attrs["ifcx::geom::solid"] = {"data": ""}

        elif etype == "BSPLINE_CURVE":
            attrs["ifcx::geom::bspline"] = {}

        elif etype == "BSPLINE_POLE":
            verts = ent.get("vertices", [])
            attrs["ifcx::geom::bspline"] = {
                "controlPoints": [_ensure_3d(v) for v in verts],
            }

        else:
            # Unknown entity -- store raw type for round-tripping
            attrs["ifcx::unknown::entity"] = {"originalType": etype, "data": {
                k: v for k, v in ent.items()
                if k not in ("type", "handle", "layer", "color", "linetype",
                             "lineweight", "style")
            }}

        # -- connections (layer, style) --------------------------------------
        layer_name = ent.get("layer", "0")
        if layer_name in self._layer_paths:
            attrs["ifcx::connects::layer"] = {"ref": self._layer_paths[layer_name]}

        # Curve style from entity-level overrides
        curve_style: dict[str, Any] = {}
        if "color" in ent:
            colour = self._aci_to_rgb(ent["color"])
            if colour:
                curve_style["colour"] = colour
        if "lineweight" in ent:
            curve_style["width"] = ent["lineweight"]
        if "linetype" in ent and ent["linetype"]:
            lt = ent["linetype"]
            if f"lt:{lt}" in self._style_paths:
                attrs.setdefault("ifcx::connects::style", {})["ref"] = self._style_paths[f"lt:{lt}"]
            else:
                curve_style["pattern"] = lt
        if curve_style:
            attrs["ifcx::style::curveStyle"] = curve_style

        # Build node
        node: dict[str, Any] = {"path": path, "attributes": attrs}
        if inherits:
            node["inherits"] = inherits
        return node

    # .......................................................................
    # LWPOLYLINE bulge -> segments
    # .......................................................................

    @staticmethod
    def _lwpoly_to_segments(
        verts: list[Any],
        bulges: list[float],
        closed: bool,
    ) -> list[dict[str, Any]]:
        """Convert LWPOLYLINE vertices + bulges to composite-curve segments."""
        segments: list[dict[str, Any]] = []
        n = len(verts)
        if n == 0:
            return segments

        # Pad bulges to match verts
        bulges_padded = list(bulges) + [0.0] * max(0, n - len(bulges))

        count = n if closed else n - 1
        for i in range(count):
            p1 = _ensure_3d(verts[i])
            p2 = _ensure_3d(verts[(i + 1) % n])
            bulge = bulges_padded[i]

            if abs(bulge) < 1e-10:
                segments.append({"type": "line", "points": [p1, p2]})
            else:
                # Bulge -> arc
                dx = p2[0] - p1[0]
                dy = p2[1] - p1[1]
                chord = math.hypot(dx, dy)
                if chord < 1e-12:
                    segments.append({"type": "line", "points": [p1, p2]})
                    continue
                sagitta = abs(bulge) * chord / 2.0
                radius = (chord * chord / 4.0 + sagitta * sagitta) / (2.0 * sagitta)

                # midpoint and perpendicular
                mx = (p1[0] + p2[0]) / 2.0
                my = (p1[1] + p2[1]) / 2.0
                nx = -dy / chord
                ny = dx / chord
                d = radius - sagitta
                sign = 1.0 if bulge > 0 else -1.0
                cx = mx + sign * d * nx
                cy = my + sign * d * ny

                start_angle = math.atan2(p1[1] - cy, p1[0] - cx)
                end_angle = math.atan2(p2[1] - cy, p2[0] - cx)

                segments.append({
                    "type": "arc",
                    "center": [cx, cy, 0.0],
                    "radius": radius,
                    "startAngle": start_angle,
                    "endAngle": end_angle,
                })

        return segments

    # .......................................................................
    # ACI colour -> RGB
    # .......................................................................

    @staticmethod
    def _aci_to_rgb(aci: int | Any) -> dict[str, float] | None:
        """Convert AutoCAD Color Index to normalised RGB dict."""
        if not isinstance(aci, int) or aci < 1:
            return None
        # Minimal mapping for common ACI colours
        _ACI_TABLE: dict[int, tuple[float, float, float]] = {
            1: (1.0, 0.0, 0.0),       # red
            2: (1.0, 1.0, 0.0),       # yellow
            3: (0.0, 1.0, 0.0),       # green
            4: (0.0, 1.0, 1.0),       # cyan
            5: (0.0, 0.0, 1.0),       # blue
            6: (1.0, 0.0, 1.0),       # magenta
            7: (1.0, 1.0, 1.0),       # white/black
            8: (0.5, 0.5, 0.5),       # dark grey
            9: (0.75, 0.75, 0.75),    # light grey
        }
        rgb = _ACI_TABLE.get(aci)
        if rgb:
            return {"r": rgb[0], "g": rgb[1], "b": rgb[2]}
        # For other indices, return a generic grey
        if 1 <= aci <= 255:
            v = round(aci / 255.0, 3)
            return {"r": v, "g": v, "b": v}
        return None
