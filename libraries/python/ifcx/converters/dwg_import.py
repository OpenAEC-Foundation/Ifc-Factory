"""DWG to IFCX importer -- pure Python, no external dependencies.

Uses the built-in :class:`DwgParser` to read DWG binary files and converts
the parsed data into an :class:`IfcxDocument`.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from ifcx.document import IfcxDocument
from ifcx.converters.dwg_parser import DwgFile, DwgParser


class DwgImporter:
    """Imports DWG binary files into IFCX documents."""

    @staticmethod
    def from_file(path: str | Path) -> IfcxDocument:
        """Import DWG from a file path."""
        data = Path(path).read_bytes()
        return DwgImporter.from_bytes(data)

    @staticmethod
    def from_bytes(data: bytes) -> IfcxDocument:
        """Import DWG from raw bytes."""
        parser = DwgParser()
        dwg = parser.parse(data)
        return DwgImporter._convert(dwg)

    # ------------------------------------------------------------------
    # Conversion
    # ------------------------------------------------------------------

    @staticmethod
    def _convert(dwg: DwgFile) -> IfcxDocument:
        doc = IfcxDocument()
        doc.header = DwgImporter._convert_header(dwg)
        doc.tables = DwgImporter._convert_tables(dwg)
        doc.blocks = DwgImporter._convert_blocks(dwg)
        doc.entities = DwgImporter._convert_entities(dwg)
        doc.objects = DwgImporter._convert_objects(dwg)
        return doc

    # ------------------------------------------------------------------
    # Header
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_header(dwg: DwgFile) -> dict[str, Any]:
        header: dict[str, Any] = {}
        hv = dwg.header_vars

        header["version"] = hv.get("$ACADVER", dwg.version_code)

        # Units
        insunits = hv.get("$LUNITS", 0)
        if isinstance(insunits, (list, dict)):
            insunits = 0
        unit_map = {
            0: "unitless",
            1: "scientific",
            2: "decimal",
            3: "engineering",
            4: "architectural",
            5: "fractional",
        }
        measurement = hv.get("$MEASUREMENT", 1) if "$MEASUREMENT" in hv else 1
        if isinstance(measurement, (list, dict)):
            measurement = 1
        header["units"] = {
            "linear": unit_map.get(int(insunits), "unitless"),
            "measurement": "metric" if int(measurement) == 1 else "imperial",
        }

        # Linetype scale
        ltscale = hv.get("$LTSCALE", 1.0)
        if isinstance(ltscale, (int, float)):
            header["linetypeScale"] = float(ltscale)

        return header

    # ------------------------------------------------------------------
    # Tables
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_tables(dwg: DwgFile) -> dict[str, Any]:
        tables: dict[str, Any] = {
            "layers": {},
            "linetypes": {},
            "textStyles": {},
            "dimStyles": {},
        }

        # Layers from parsed objects
        for obj in dwg.objects:
            if obj.type_name == "LAYER":
                name = obj.data.get("name", "")
                if not name:
                    continue
                props: dict[str, Any] = {}
                if "color" in obj.data:
                    props["color"] = obj.data["color"]
                if "frozen" in obj.data:
                    props["frozen"] = obj.data["frozen"]
                if "off" in obj.data:
                    props["off"] = obj.data["off"]
                if "locked" in obj.data:
                    props["locked"] = obj.data["locked"]
                tables["layers"][name] = props

            elif obj.type_name == "STYLE":
                name = obj.data.get("name", "")
                if not name:
                    continue
                props = {}
                if "fontName" in obj.data:
                    props["fontFamily"] = obj.data["fontName"]
                if obj.data.get("fixedHeight"):
                    props["height"] = obj.data["fixedHeight"]
                if "widthFactor" in obj.data:
                    props["widthFactor"] = obj.data["widthFactor"]
                tables["textStyles"][name] = props

            elif obj.type_name == "LTYPE":
                name = obj.data.get("name", "")
                if not name or name in ("ByBlock", "ByLayer", "Continuous"):
                    continue
                props = {}
                if "description" in obj.data:
                    props["description"] = obj.data["description"]
                if "patternLength" in obj.data:
                    props["patternLength"] = obj.data["patternLength"]
                tables["linetypes"][name] = props

        # Ensure layer "0" exists
        if "0" not in tables["layers"]:
            tables["layers"]["0"] = {}

        return tables

    # ------------------------------------------------------------------
    # Blocks
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_blocks(dwg: DwgFile) -> dict[str, Any]:
        blocks: dict[str, Any] = {}
        for obj in dwg.objects:
            if obj.type_name == "BLOCK_HEADER":
                name = obj.data.get("name", "")
                if not name:
                    continue
                # Skip model/paper space
                if name.startswith("*Model_Space") or name.startswith("*Paper_Space"):
                    continue
                blk: dict[str, Any] = {
                    "name": name,
                    "basePoint": [0, 0, 0],
                    "entities": [],
                }
                blocks[name] = blk
        return blocks

    # ------------------------------------------------------------------
    # Entities
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_entities(dwg: DwgFile) -> list[dict[str, Any]]:
        entities: list[dict[str, Any]] = []
        for obj in dwg.objects:
            if not obj.is_entity:
                continue
            converted = DwgImporter._convert_entity(obj)
            if converted:
                entities.append(converted)
        return entities

    @staticmethod
    def _convert_entity(obj: Any) -> dict[str, Any] | None:
        """Convert a parsed DWG entity to IFCX entity format."""
        result = dict(obj.data)  # shallow copy

        etype = result.get("type", "")

        # Normalize handle to string
        if "handle" in result:
            result["handle"] = f"{result['handle']:X}"

        # Remove internal fields
        for key in list(result.keys()):
            if key.startswith("_"):
                del result[key]

        # Entity-specific normalisation
        if etype == "ARC":
            # Angles are already in radians from DWG
            pass
        elif etype == "TEXT":
            if "rotation" in result and isinstance(result["rotation"], (int, float)):
                # DWG stores text rotation in radians already
                pass
        elif etype == "INSERT":
            # DWG stores rotation in radians already
            pass

        # Color: 256 = BYLAYER, 0 = BYBLOCK -> remove
        if result.get("color") in (0, 256):
            result.pop("color", None)

        # Remove zero thickness
        if result.get("thickness") == 0.0:
            result.pop("thickness", None)

        # Remove default extrusion [0,0,1]
        ext = result.get("extrusion")
        if ext == [0.0, 0.0, 1.0]:
            result.pop("extrusion", None)

        # Remove internal/default fields
        result.pop("entity_mode", None)
        result.pop("linetype_scale", None)
        result.pop("invisible", None)
        # Lineweight: 29 = default (BYLAYER); remove non-meaningful values
        lw = result.get("lineweight")
        if lw is not None and (lw == 29 or lw < 0):
            result.pop("lineweight", None)

        return result

    # ------------------------------------------------------------------
    # Objects
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_objects(dwg: DwgFile) -> list[dict[str, Any]]:
        objects: list[dict[str, Any]] = []
        for obj in dwg.objects:
            if obj.type_name == "DICTIONARY":
                converted: dict[str, Any] = {
                    "objectType": "DICTIONARY",
                    "handle": f"{obj.handle:X}",
                }
                if "entries" in obj.data:
                    converted["entries"] = {
                        k: f"{v:X}" if isinstance(v, int) else str(v)
                        for k, v in obj.data["entries"].items()
                    }
                objects.append(converted)
        return objects
