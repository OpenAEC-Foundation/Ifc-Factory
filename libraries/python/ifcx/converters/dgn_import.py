"""DGN V7 to IFCX importer -- pure Python, no external dependencies.

Uses the built-in :class:`DgnParser` to read DGN V7 binary files and converts
the parsed data into an :class:`IfcxDocument`.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from ifcx.document import IfcxDocument
from ifcx.converters.dgn_parser import DgnFile, DgnParser


class DgnImporter:
    """Imports DGN V7 files into IFCX documents."""

    @staticmethod
    def from_file(path: str | Path) -> IfcxDocument:
        """Import DGN from a file path."""
        data = Path(path).read_bytes()
        return DgnImporter.from_bytes(data)

    @staticmethod
    def from_bytes(data: bytes) -> IfcxDocument:
        """Import DGN from raw bytes."""
        parser = DgnParser()
        dgn = parser.parse(data)
        return DgnImporter._convert(dgn)

    # ------------------------------------------------------------------
    # Conversion
    # ------------------------------------------------------------------

    @staticmethod
    def _convert(dgn: DgnFile) -> IfcxDocument:
        doc = IfcxDocument()
        doc.header = DgnImporter._convert_header(dgn)
        doc.tables = DgnImporter._convert_tables(dgn)
        doc.blocks = DgnImporter._convert_blocks(dgn)
        doc.entities = DgnImporter._convert_entities(dgn)
        doc.objects = []
        return doc

    # ------------------------------------------------------------------
    # Header
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_header(dgn: DgnFile) -> dict[str, Any]:
        header: dict[str, Any] = {
            'version': dgn.version,
            'is3d': dgn.is_3d,
        }
        if dgn.master_unit_name:
            header['masterUnits'] = dgn.master_unit_name
        if dgn.sub_unit_name:
            header['subUnits'] = dgn.sub_unit_name
        header['units'] = {
            'uorPerSub': dgn.uor_per_sub,
            'subPerMaster': dgn.sub_per_master,
        }
        if any(v != 0.0 for v in dgn.global_origin):
            header['globalOrigin'] = list(dgn.global_origin)
        return header

    # ------------------------------------------------------------------
    # Tables (layers from DGN levels, color table)
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_tables(dgn: DgnFile) -> dict[str, Any]:
        tables: dict[str, Any] = {
            'layers': {},
            'linetypes': {},
            'textStyles': {},
            'dimStyles': {},
        }

        # Collect levels from elements
        levels_used: set[int] = set()
        for elem in dgn.elements:
            if not elem.deleted and elem.level > 0:
                levels_used.add(elem.level)

        for lvl in sorted(levels_used):
            props: dict[str, Any] = {}
            # If we have a color table and there are elements on this level,
            # we could assign a default color, but DGN levels don't inherently
            # have a color -- elements do.
            tables['layers'][str(lvl)] = props

        # Ensure layer "0" exists (DGN level 0 is used for header elements)
        if '0' not in tables['layers']:
            tables['layers']['0'] = {}

        return tables

    # ------------------------------------------------------------------
    # Blocks (from CELL_HEADER / SHARED_CELL_DEFN elements)
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_blocks(dgn: DgnFile) -> dict[str, Any]:
        blocks: dict[str, Any] = {}
        # Cell definitions would require tracking complex groups;
        # for now we expose cell headers as INSERT-like entities.
        return blocks

    # ------------------------------------------------------------------
    # Entities
    # ------------------------------------------------------------------

    @staticmethod
    def _convert_entities(dgn: DgnFile) -> list[dict[str, Any]]:
        entities: list[dict[str, Any]] = []
        for elem in dgn.elements:
            if elem.deleted:
                continue
            # Skip non-graphic elements
            if elem.type in (0, 9, 10, 8):
                continue
            converted = DgnImporter._convert_entity(elem, dgn)
            if converted:
                entities.append(converted)
        return entities

    @staticmethod
    def _convert_entity(elem: Any, dgn: DgnFile) -> dict[str, Any] | None:
        """Convert a parsed DGN element to IFCX entity format."""
        result: dict[str, Any] = {
            'layer': str(elem.level),
        }

        # Common symbology
        if elem.color:
            result['color'] = elem.color
            # If color table available, resolve to RGB
            if dgn.color_table and 0 <= elem.color < len(dgn.color_table):
                ct = dgn.color_table[elem.color]
                if ct:
                    result['colorRGB'] = list(ct)
        if elem.weight:
            result['lineweight'] = elem.weight
        if elem.style:
            result['linetype'] = elem.style

        etype = elem.type
        data = elem.data

        if etype == 3:
            # LINE
            result['type'] = 'LINE'
            verts = data.get('vertices', [])
            if len(verts) >= 2:
                result['start'] = list(verts[0])
                result['end'] = list(verts[1])
            else:
                return None

        elif etype == 4:
            # LINE_STRING -> LWPOLYLINE (open)
            result['type'] = 'LWPOLYLINE'
            result['closed'] = False
            result['vertices'] = [list(v) for v in data.get('vertices', [])]
            if not result['vertices']:
                return None

        elif etype == 6:
            # SHAPE -> LWPOLYLINE (closed)
            result['type'] = 'LWPOLYLINE'
            result['closed'] = True
            result['vertices'] = [list(v) for v in data.get('vertices', [])]
            if not result['vertices']:
                return None

        elif etype == 11:
            # CURVE
            result['type'] = 'SPLINE'
            result['vertices'] = [list(v) for v in data.get('vertices', [])]
            if not result['vertices']:
                return None

        elif etype == 15:
            # ELLIPSE
            result['type'] = 'ELLIPSE'
            result['center'] = list(data.get('origin', (0, 0, 0)))
            result['majorAxis'] = data.get('primary_axis', 0)
            result['minorAxis'] = data.get('secondary_axis', 0)
            result['rotation'] = math.radians(data.get('rotation', 0))

        elif etype == 16:
            # ARC
            start = data.get('start_angle', 0)
            sweep = data.get('sweep_angle', 360)
            if abs(sweep) >= 360.0:
                result['type'] = 'ELLIPSE'
            else:
                result['type'] = 'ARC'
                result['startAngle'] = math.radians(start)
                result['endAngle'] = math.radians(start + sweep)
            result['center'] = list(data.get('origin', (0, 0, 0)))
            result['majorAxis'] = data.get('primary_axis', 0)
            result['minorAxis'] = data.get('secondary_axis', 0)
            result['rotation'] = math.radians(data.get('rotation', 0))

        elif etype == 17:
            # TEXT
            result['type'] = 'TEXT'
            result['text'] = data.get('text', '')
            result['insertionPoint'] = list(data.get('origin', (0, 0, 0)))
            result['height'] = data.get('height', 0)
            result['rotation'] = math.radians(data.get('rotation', 0))
            result['fontIndex'] = data.get('font_id', 0)

        elif etype == 7:
            # TEXT_NODE
            result['type'] = 'TEXT_NODE'
            result['origin'] = list(data.get('origin', (0, 0, 0)))
            result['height'] = data.get('height', 0)
            result['rotation'] = math.radians(data.get('rotation', 0))
            result['numelems'] = data.get('numelems', 0)

        elif etype == 2:
            # CELL_HEADER -> INSERT
            result['type'] = 'INSERT'
            result['name'] = data.get('name', '')
            result['insertionPoint'] = list(data.get('origin', (0, 0, 0)))
            result['xScale'] = data.get('xscale', 1.0)
            result['yScale'] = data.get('yscale', 1.0)
            result['rotation'] = math.radians(data.get('rotation', 0))

        elif etype in (12, 14):
            # COMPLEX_CHAIN / COMPLEX_SHAPE header
            ctype = 'COMPLEX_CHAIN' if etype == 12 else 'COMPLEX_SHAPE'
            result['type'] = ctype
            result['numelems'] = data.get('numelems', 0)
            result['totlength'] = data.get('totlength', 0)

        elif etype in (18, 19):
            # 3D surface/solid header
            result['type'] = '3DSURFACE' if etype == 18 else '3DSOLID'
            result['numelems'] = data.get('numelems', 0)

        elif etype == 5:
            # GROUP_DATA (level != 1 since color table is handled separately)
            result['type'] = 'GROUP_DATA'

        elif etype == 37:
            # TAG_VALUE
            result['type'] = 'TAG_VALUE'
            result['tagSet'] = data.get('tag_set', 0)
            result['tagIndex'] = data.get('tag_index', 0)
            if 'value' in data:
                result['value'] = data['value']

        elif etype == 21:
            # BSPLINE_POLE
            result['type'] = 'BSPLINE_POLE'
            result['vertices'] = [list(v) for v in data.get('vertices', [])]

        elif etype == 27:
            # BSPLINE_CURVE_HEADER
            result['type'] = 'BSPLINE_CURVE'

        elif etype == 1:
            # CELL_LIBRARY
            result['type'] = 'CELL_LIBRARY'

        elif etype == 34:
            # SHARED_CELL_DEFN
            result['type'] = 'SHARED_CELL_DEFN'

        elif etype == 35:
            # SHARED_CELL
            result['type'] = 'SHARED_CELL'

        else:
            result['type'] = elem.type_name
            result['rawType'] = elem.type

        return result
