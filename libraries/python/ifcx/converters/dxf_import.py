"""DXF to IFCX importer -- pure Python, no external dependencies.

Uses the built-in :class:`DxfParser` to read DXF ASCII files and converts
the parsed data into an :class:`IfcxDocument`.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from ifcx.document import IfcxDocument
from ifcx.converters.dxf_parser import DxfFile, DxfParser


class DxfImporter:
    """Imports DXF files into IFCX documents."""

    @staticmethod
    def from_file(path: str | Path) -> IfcxDocument:
        """Import DXF from a file path."""
        content = Path(path).read_text(encoding="utf-8", errors="replace")
        return DxfImporter.from_string(content)

    @staticmethod
    def from_string(dxf: str) -> IfcxDocument:
        """Import DXF from a string."""
        parser = DxfParser()
        dxf_file = parser.parse(dxf)
        return DxfImporter._convert(dxf_file)

    # ------------------------------------------------------------------
    # Conversion
    # ------------------------------------------------------------------

    @staticmethod
    def _convert(dxf_file: DxfFile) -> IfcxDocument:
        doc = IfcxDocument()
        doc.header = DxfImporter._convert_header(dxf_file)
        doc.tables = DxfImporter._convert_tables(dxf_file)
        doc.blocks = DxfImporter._convert_blocks(dxf_file)
        doc.entities = DxfImporter._convert_entities(dxf_file)
        doc.objects = DxfImporter._convert_objects(dxf_file)
        return doc

    # ------------------------------------------------------------------
    # Header
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_header(dxf: DxfFile) -> dict[str, Any]:
        header: dict[str, Any] = {}
        raw = dxf.header

        # Version
        header["version"] = raw.get("$ACADVER", "AC1032")

        # Units
        insunits = raw.get("$INSUNITS", 0)
        if isinstance(insunits, (list, dict)):
            insunits = 0
        unit_map = {
            0: "unitless", 1: "inches", 2: "feet", 3: "miles",
            4: "millimeters", 5: "centimeters", 6: "meters", 7: "kilometers",
        }
        measurement = raw.get("$MEASUREMENT", 1)
        if isinstance(measurement, (list, dict)):
            measurement = 1
        header["units"] = {
            "linear": unit_map.get(int(insunits), "unitless"),
            "measurement": "metric" if int(measurement) == 1 else "imperial",
        }

        # Current layer
        clayer = raw.get("$CLAYER", "0")
        if isinstance(clayer, str):
            header["currentLayer"] = clayer

        # Linetype scale
        ltscale = raw.get("$LTSCALE", 1.0)
        if isinstance(ltscale, (int, float)):
            header["linetypeScale"] = float(ltscale)

        return header

    # ------------------------------------------------------------------
    # Tables
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_tables(dxf: DxfFile) -> dict[str, Any]:
        tables: dict[str, Any] = {
            "layers": {},
            "linetypes": {},
            "textStyles": {},
            "dimStyles": {},
        }

        raw_tables = dxf.tables

        # Layers
        for entry in raw_tables.get("LAYER", []):
            name = entry.get("name", "")
            if not name:
                continue
            props: dict[str, Any] = {}
            if "color" in entry:
                props["color"] = entry["color"]
            if "linetype" in entry:
                props["linetype"] = entry["linetype"]
            if "frozen" in entry:
                props["frozen"] = entry["frozen"]
            if "locked" in entry:
                props["locked"] = entry["locked"]
            if "off" in entry:
                props["off"] = entry["off"]
            if "plot" in entry:
                props["plot"] = entry["plot"]
            if "lineweight" in entry:
                props["lineweight"] = entry["lineweight"]
            tables["layers"][name] = props

        # Ensure layer "0" exists
        if "0" not in tables["layers"]:
            tables["layers"]["0"] = {}

        # Linetypes
        for entry in raw_tables.get("LTYPE", []):
            name = entry.get("name", "")
            if not name or name in ("ByBlock", "ByLayer", "Continuous"):
                continue
            props = {}
            if "description" in entry:
                props["description"] = entry["description"]
            if "pattern" in entry:
                props["pattern"] = entry["pattern"]
            tables["linetypes"][name] = props

        # Text styles
        for entry in raw_tables.get("STYLE", []):
            name = entry.get("name", "")
            if not name:
                continue
            props = {}
            if "font" in entry:
                props["fontFamily"] = entry["font"]
            if "height" in entry and entry["height"]:
                props["height"] = entry["height"]
            if "widthFactor" in entry:
                props["widthFactor"] = entry["widthFactor"]
            tables["textStyles"][name] = props

        # Dim styles
        for entry in raw_tables.get("DIMSTYLE", []):
            name = entry.get("name", "")
            if not name:
                continue
            props = {}
            if "DIMTXT" in entry:
                props["textHeight"] = entry["DIMTXT"]
            if "DIMASZ" in entry:
                props["arrowSize"] = entry["DIMASZ"]
            if "DIMSCALE" in entry:
                props["overallScale"] = entry["DIMSCALE"]
            if "DIMEXO" in entry:
                props["extensionOffset"] = entry["DIMEXO"]
            if "DIMDLI" in entry:
                props["dimensionLineIncrement"] = entry["DIMDLI"]
            if "DIMEXE" in entry:
                props["extensionExtend"] = entry["DIMEXE"]
            if "DIMGAP" in entry:
                props["textGap"] = entry["DIMGAP"]
            if "DIMTAD" in entry:
                props["textAbove"] = entry["DIMTAD"]
            if "DIMDEC" in entry:
                props["decimalPlaces"] = entry["DIMDEC"]
            tables["dimStyles"][name] = props

        return tables

    # ------------------------------------------------------------------
    # Blocks
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_blocks(dxf: DxfFile) -> dict[str, Any]:
        blocks: dict[str, Any] = {}
        for name, block_data in dxf.blocks.items():
            # Skip model/paper space blocks
            if name.startswith("*Model_Space") or name.startswith("*Paper_Space"):
                continue
            blk: dict[str, Any] = {
                "name": name,
                "basePoint": block_data.get("basePoint", [0, 0, 0]),
            }
            entities = []
            for ent in block_data.get("entities", []):
                converted = DxfImporter._convert_entity(ent)
                if converted:
                    entities.append(converted)
            blk["entities"] = entities
            blocks[name] = blk
        return blocks

    # ------------------------------------------------------------------
    # Entities
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_entities(dxf: DxfFile) -> list[dict[str, Any]]:
        entities = []
        for ent in dxf.entities:
            converted = DxfImporter._convert_entity(ent)
            if converted:
                entities.append(converted)
        return entities

    @staticmethod
    def _convert_entity(ent: dict[str, Any]) -> dict[str, Any] | None:
        """Convert a parsed DXF entity dict to IFCX entity format.

        The parser already produces a close-to-final dict.  This method
        applies final normalisation (e.g. angle unit conversion for arcs
        stored in degrees) and ensures a consistent schema.
        """
        result = dict(ent)  # shallow copy

        # Ensure type is present
        etype = result.get("type", "")

        # --- Common property normalisation ---
        # Handle is already a string.
        # lineweight: the parser stores raw DXF value; convert to mm
        if "lineweight" in result:
            lw = result["lineweight"]
            if isinstance(lw, (int, float)) and lw >= 0:
                result["lineweight"] = lw / 100.0
            else:
                del result["lineweight"]

        # Color 256 = BYLAYER (remove for cleaner output)
        if result.get("color") == 256:
            del result["color"]

        # Linetype BYLAYER -> remove
        if result.get("linetype") == "BYLAYER":
            del result["linetype"]

        # --- Entity-specific normalisation ---

        if etype == "ARC":
            # Parser stores angles in degrees; convert to radians
            if "startAngle" in result:
                result["startAngle"] = math.radians(result["startAngle"])
            if "endAngle" in result:
                result["endAngle"] = math.radians(result["endAngle"])

        elif etype == "TEXT":
            # Convert rotation from degrees to radians if present
            if "rotation" in result:
                result["rotation"] = math.radians(result["rotation"])
            # Map numeric horizontal alignment to string
            halign = result.get("horizontalAlignment", 0)
            if isinstance(halign, int):
                h_map = {0: "left", 1: "center", 2: "right", 3: "aligned", 4: "middle", 5: "fit"}
                result["horizontalAlignment"] = h_map.get(halign, "left")

        elif etype == "MTEXT":
            # Map numeric attachment to string
            att = result.get("attachment", 1)
            if isinstance(att, int):
                att_map = {
                    1: "top_left", 2: "top_center", 3: "top_right",
                    4: "middle_left", 5: "middle_center", 6: "middle_right",
                    7: "bottom_left", 8: "bottom_center", 9: "bottom_right",
                }
                result["attachment"] = att_map.get(att, "top_left")

        elif etype == "INSERT":
            # Convert rotation from degrees to radians if present
            if "rotation" in result:
                result["rotation"] = math.radians(result["rotation"])

        elif etype == "DIMENSION":
            # dimType is already mapped by the parser; rename to type
            if "dimType" in result:
                result["type"] = result.pop("dimType")

        elif etype in ("DIMENSION_LINEAR", "DIMENSION_ALIGNED", "DIMENSION_ANGULAR",
                        "DIMENSION_ANGULAR3P", "DIMENSION_DIAMETER", "DIMENSION_RADIUS",
                        "DIMENSION_ORDINATE"):
            # Already has proper type from parser
            pass

        elif etype == "LEADER":
            if "hasArrowhead" not in result:
                result["hasArrowhead"] = True
            if "pathType" not in result:
                result["pathType"] = "straight"

        # Remove internal fields and non-string keys
        for key in list(result.keys()):
            if not isinstance(key, str):
                del result[key]
            elif key.startswith("_"):
                del result[key]

        return result

    # ------------------------------------------------------------------
    # Objects
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_objects(dxf: DxfFile) -> list[dict[str, Any]]:
        objects: list[dict[str, Any]] = []
        for obj in dxf.objects:
            obj_type = obj.get("type", "")
            if obj_type == "LAYOUT":
                converted: dict[str, Any] = {
                    "objectType": "LAYOUT",
                    "name": obj.get("name", ""),
                    "isModelSpace": obj.get("name") == "Model",
                }
                objects.append(converted)
            elif obj_type == "DICTIONARY":
                # Preserve dictionaries
                converted = {
                    "objectType": "DICTIONARY",
                    "handle": obj.get("handle", ""),
                    "name": obj.get("name", ""),
                }
                if "entries" in obj:
                    converted["entries"] = obj["entries"]
                if "entryHandles" in obj:
                    converted["entryHandles"] = obj["entryHandles"]
                objects.append(converted)
        return objects
