"""Pure-Python DWG binary file parser.

Parses Autodesk DWG files from raw bytes without external libraries.
Currently supports R2000 (AC1015) with graceful degradation for other versions.

References:
    - Open Design Alliance DWG specification
    - LibreDWG reverse-engineering documentation and spec files
"""

from __future__ import annotations

import logging
import struct
from dataclasses import dataclass, field
from typing import Any

from ifcx.converters.dwg_bitreader import DwgBitReader

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Version constants
# ---------------------------------------------------------------------------
VERSION_MAP: dict[bytes, str] = {
    b"AC1012": "R13",
    b"AC1014": "R14",
    b"AC1015": "R2000",
    b"AC1018": "R2004",
    b"AC1021": "R2007",
    b"AC1024": "R2010",
    b"AC1027": "R2013",
    b"AC1032": "R2018",
}

# Section record IDs (R2000)
SECTION_HEADER = 0
SECTION_CLASSES = 1
SECTION_OBJECT_MAP = 2
SECTION_R13C3 = 3
SECTION_PADDING = 4
SECTION_TEMPLATE = 5

# Object type constants
OBJ_TYPE_NAMES: dict[int, str] = {
    0x01: "TEXT",
    0x02: "ATTRIB",
    0x03: "ATTDEF",
    0x04: "BLOCK",
    0x05: "ENDBLK",
    0x06: "SEQEND",
    0x07: "INSERT",
    0x08: "MINSERT",
    0x0A: "VERTEX_2D",
    0x0B: "VERTEX_3D",
    0x0C: "VERTEX_MESH",
    0x0D: "VERTEX_PFACE",
    0x0E: "VERTEX_PFACE_FACE",
    0x0F: "POLYLINE_2D",
    0x10: "POLYLINE_3D",
    0x11: "ARC",
    0x12: "CIRCLE",
    0x13: "LINE",
    0x14: "DIMENSION_ORDINATE",
    0x15: "DIMENSION_LINEAR",
    0x16: "DIMENSION_ALIGNED",
    0x17: "DIMENSION_ANG3PT",
    0x18: "DIMENSION_ANG2LN",
    0x19: "DIMENSION_RADIUS",
    0x1A: "DIMENSION_DIAMETER",
    0x1B: "POINT",
    0x1C: "3DFACE",
    0x1D: "POLYLINE_PFACE",
    0x1E: "POLYLINE_MESH",
    0x1F: "SOLID",
    0x20: "TRACE",
    0x21: "SHAPE",
    0x22: "VIEWPORT",
    0x23: "ELLIPSE",
    0x24: "SPLINE",
    0x25: "REGION",
    0x26: "3DSOLID",
    0x27: "BODY",
    0x28: "RAY",
    0x29: "XLINE",
    0x2A: "DICTIONARY",
    0x2B: "OLEFRAME",
    0x2C: "MTEXT",
    0x2D: "LEADER",
    0x2E: "TOLERANCE",
    0x2F: "MLINE",
    0x30: "BLOCK_CONTROL",
    0x31: "BLOCK_HEADER",
    0x32: "LAYER_CONTROL",
    0x33: "LAYER",
    0x34: "STYLE_CONTROL",
    0x35: "STYLE",
    0x38: "LTYPE_CONTROL",
    0x39: "LTYPE",
    0x3C: "VIEW_CONTROL",
    0x3D: "VIEW",
    0x3E: "UCS_CONTROL",
    0x3F: "UCS",
    0x40: "VPORT_CONTROL",
    0x41: "VPORT",
    0x42: "APPID_CONTROL",
    0x43: "APPID",
    0x44: "DIMSTYLE_CONTROL",
    0x45: "DIMSTYLE",
    0x46: "VP_ENT_HDR_CONTROL",
    0x47: "VP_ENT_HDR",
    0x48: "GROUP",
    0x49: "MLINESTYLE",
    0x4A: "OLE2FRAME",
    0x4C: "LONG_TRANSACTION",
    0x4D: "LWPOLYLINE",
    0x4E: "HATCH",
    0x4F: "XRECORD",
    0x50: "PLACEHOLDER",
    0x51: "VBA_PROJECT",
    0x52: "LAYOUT",
}

# Entity type numbers (for is_entity check)
_ENTITY_TYPES = set(range(0x01, 0x2A))  # TEXT through XLINE
_ENTITY_TYPES |= {0x2C, 0x2D, 0x2E, 0x2F}  # MTEXT, LEADER, TOLERANCE, MLINE
_ENTITY_TYPES |= {0x4D, 0x4E}  # LWPOLYLINE, HATCH
# Also entities: BLOCK(04), ENDBLK(05), SEQEND(06), VIEWPORT(22)
# Exclude: control objects, table objects
_TABLE_CONTROL_TYPES = {
    0x30, 0x32, 0x34, 0x38, 0x3C, 0x3E, 0x40, 0x42, 0x44, 0x46,
}
_TABLE_ENTRY_TYPES = {
    0x31, 0x33, 0x35, 0x39, 0x3D, 0x3F, 0x41, 0x43, 0x45, 0x47,
}
_NON_ENTITY_TYPES = {
    0x2A,  # DICTIONARY
    0x48,  # GROUP
    0x49,  # MLINESTYLE
    0x4F,  # XRECORD
    0x50,  # PLACEHOLDER
    0x51,  # VBA_PROJECT
    0x52,  # LAYOUT
}

# Header section sentinels (R2000)
HEADER_SENTINEL_START = bytes([
    0xCF, 0x7B, 0x1F, 0x23, 0xFD, 0xDE, 0x38, 0xA9,
    0x5F, 0x7C, 0x68, 0xB8, 0x4E, 0x6D, 0x33, 0x5F,
])
HEADER_SENTINEL_END = bytes([
    0x30, 0x84, 0xE0, 0xDC, 0x02, 0x21, 0xC7, 0x56,
    0xA0, 0x83, 0x97, 0x47, 0xB1, 0x92, 0xCC, 0xA0,
])

CLASSES_SENTINEL_START = bytes([
    0x8D, 0xA1, 0xC4, 0xB8, 0xC4, 0xA9, 0xF8, 0xC5,
    0xC0, 0xDC, 0xF4, 0x5F, 0xE7, 0xCF, 0xB6, 0x8A,
])
CLASSES_SENTINEL_END = bytes([
    0x72, 0x5E, 0x3B, 0x47, 0x3B, 0x56, 0x07, 0x3A,
    0x3F, 0x23, 0x0B, 0xA0, 0x18, 0x30, 0x49, 0x75,
])


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class DwgClass:
    """A DWG class definition."""
    class_number: int = 0
    proxy_flags: int = 0
    app_name: str = ""
    cpp_class_name: str = ""
    dxf_name: str = ""
    was_zombie: bool = False
    item_class_id: int = 0


@dataclass
class DwgObject:
    """A parsed DWG object or entity."""
    handle: int = 0
    type_num: int = 0
    type_name: str = ""
    data: dict = field(default_factory=dict)
    is_entity: bool = False


@dataclass
class DwgFile:
    """Top-level container for parsed DWG data."""
    version: str = ""
    version_code: str = ""
    codepage: int = 0
    header_vars: dict = field(default_factory=dict)
    classes: list[DwgClass] = field(default_factory=list)
    objects: list[DwgObject] = field(default_factory=list)
    object_map: dict[int, int] = field(default_factory=dict)
    layers: dict[int, dict] = field(default_factory=dict)
    blocks: dict[int, dict] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

class DwgParser:
    """Parses DWG binary files."""

    def __init__(self) -> None:
        self._class_map: dict[int, DwgClass] = {}

    def parse(self, data: bytes) -> DwgFile:
        """Parse a DWG file from raw bytes."""
        if len(data) < 25:
            raise ValueError("Data too short to be a valid DWG file")

        dwg = DwgFile()
        dwg.version_code = self._detect_version(data)
        dwg.version = VERSION_MAP.get(dwg.version_code.encode(), dwg.version_code)

        if dwg.version_code == "AC1015":
            self._parse_r2000(data, dwg)
        elif dwg.version_code == "AC1018":
            self._parse_r2004(data, dwg)
        elif dwg.version_code in ("AC1021", "AC1024", "AC1027", "AC1032"):
            self._parse_r2007_plus(data, dwg)
        else:
            raise ValueError(f"Unsupported DWG version: {dwg.version_code}")

        return dwg

    def _detect_version(self, data: bytes) -> str:
        return data[:6].decode("ascii", errors="replace")

    # ------------------------------------------------------------------
    # R2000 (AC1015) parsing
    # ------------------------------------------------------------------

    def _parse_r2000(self, data: bytes, dwg: DwgFile) -> None:
        dwg.codepage = struct.unpack_from("<H", data, 19)[0]
        sections = self._parse_section_locators_r2000(data)

        if SECTION_CLASSES in sections:
            sec = sections[SECTION_CLASSES]
            dwg.classes = self._parse_classes_r2000(data, sec["offset"], sec["size"])
            for cls in dwg.classes:
                self._class_map[cls.class_number] = cls

        if SECTION_HEADER in sections:
            sec = sections[SECTION_HEADER]
            dwg.header_vars = self._parse_header_vars_r2000(
                data, sec["offset"], sec["size"]
            )

        if SECTION_OBJECT_MAP in sections:
            sec = sections[SECTION_OBJECT_MAP]
            dwg.object_map = self._parse_object_map_r2000(
                data, sec["offset"], sec["size"]
            )

        if dwg.object_map:
            dwg.objects = self._parse_objects_r2000(data, dwg.object_map, dwg.classes)

        for obj in dwg.objects:
            if obj.type_name == "LAYER":
                dwg.layers[obj.handle] = obj.data
            elif obj.type_name == "BLOCK_HEADER":
                dwg.blocks[obj.handle] = obj.data

    def _parse_section_locators_r2000(self, data: bytes) -> dict[int, dict]:
        num_records = struct.unpack_from("<i", data, 21)[0]
        sections: dict[int, dict] = {}
        for i in range(num_records):
            off = 25 + i * 9
            if off + 9 > len(data):
                break
            rec_num = data[off]
            seeker = struct.unpack_from("<I", data, off + 1)[0]
            size = struct.unpack_from("<I", data, off + 5)[0]
            if seeker > 0 or rec_num == 0:
                sections[rec_num] = {"offset": seeker, "size": size}
        return sections

    # ------------------------------------------------------------------
    # Header variables (R2000)
    # ------------------------------------------------------------------

    def _parse_header_vars_r2000(
        self, data: bytes, offset: int, size: int
    ) -> dict[str, Any]:
        header: dict[str, Any] = {"$ACADVER": "AC1015"}

        sentinel = data[offset : offset + 16]
        if sentinel != HEADER_SENTINEL_START:
            logger.warning("Header sentinel mismatch at offset %d", offset)

        hdr_data_size = struct.unpack_from("<I", data, offset + 16)[0]
        reader = DwgBitReader(data, offset + 20)

        try:
            # Read header variables in R2000 order (per ODA spec).
            # We read the well-known subset; if parsing drifts we stop gracefully.
            _unk1 = reader.read_BD()
            _unk2 = reader.read_BD()
            _unk3 = reader.read_BD()
            _unk4 = reader.read_BD()
            _unk_t1 = reader.read_T()
            _unk_t2 = reader.read_T()
            _unk_t3 = reader.read_T()
            _unk_t4 = reader.read_T()
            _unk_l1 = reader.read_BL()
            _unk_l2 = reader.read_BL()

            header["$DIMASO"] = reader.read_bit()
            header["$DIMSHO"] = reader.read_bit()
            header["$PLINEGEN"] = reader.read_bit()
            header["$ORTHOMODE"] = reader.read_bit()
            header["$REGENMODE"] = reader.read_bit()
            header["$FILLMODE"] = reader.read_bit()
            header["$QTEXTMODE"] = reader.read_bit()
            header["$PSLTSCALE"] = reader.read_bit()
            header["$LIMCHECK"] = reader.read_bit()
            header["$USRTIMER"] = reader.read_bit()
            header["$SKPOLY"] = reader.read_bit()
            header["$ANGDIR"] = reader.read_bit()
            header["$SPLFRAME"] = reader.read_bit()
            header["$MIRRTEXT"] = reader.read_bit()
            header["$WORLDVIEW"] = reader.read_bit()
            header["$TILEMODE"] = reader.read_bit()
            header["$PLIMCHECK"] = reader.read_bit()
            header["$VISRETAIN"] = reader.read_bit()
            header["$DISPSILH"] = reader.read_bit()
            header["$PELLIPSE"] = reader.read_bit()
            header["$PROXYGRAPHICS"] = reader.read_BS()
            header["$TREEDEPTH"] = reader.read_BS()
            header["$LUNITS"] = reader.read_BS()
            header["$LUPREC"] = reader.read_BS()
            header["$AUNITS"] = reader.read_BS()
            header["$AUPREC"] = reader.read_BS()
            header["$OSMODE"] = reader.read_BS()
            header["$ATTMODE"] = reader.read_BS()
            header["$COORDS"] = reader.read_BS()
            header["$PDMODE"] = reader.read_BS()
            header["$PICKSTYLE"] = reader.read_BS()
            header["$USERI1"] = reader.read_BS()
            header["$USERI2"] = reader.read_BS()
            header["$USERI3"] = reader.read_BS()
            header["$USERI4"] = reader.read_BS()
            header["$USERI5"] = reader.read_BS()
            header["$SPLINESEGS"] = reader.read_BS()
            header["$SURFU"] = reader.read_BS()
            header["$SURFV"] = reader.read_BS()
            header["$SURFTYPE"] = reader.read_BS()
            header["$SURFTAB1"] = reader.read_BS()
            header["$SURFTAB2"] = reader.read_BS()
            header["$SPLINETYPE"] = reader.read_BS()
            header["$SHADEDGE"] = reader.read_BS()
            header["$SHADEDIF"] = reader.read_BS()
            header["$UNITMODE"] = reader.read_BS()
            header["$MAXACTVP"] = reader.read_BS()
            header["$ISOLINES"] = reader.read_BS()
            header["$CMLJUST"] = reader.read_BS()
            header["$TEXTQLTY"] = reader.read_BS()
            header["$LTSCALE"] = reader.read_BD()
            header["$TEXTSIZE"] = reader.read_BD()
            header["$TRACEWID"] = reader.read_BD()
            header["$SKETCHINC"] = reader.read_BD()
            header["$FILLETRAD"] = reader.read_BD()
            header["$THICKNESS"] = reader.read_BD()
            header["$ANGBASE"] = reader.read_BD()
            header["$PDSIZE"] = reader.read_BD()
            header["$PLINEWID"] = reader.read_BD()
            header["$USERR1"] = reader.read_BD()
            header["$USERR2"] = reader.read_BD()
            header["$USERR3"] = reader.read_BD()
            header["$USERR4"] = reader.read_BD()
            header["$USERR5"] = reader.read_BD()
            header["$CMLSCALE"] = reader.read_BD()
            header["$CEPSNTYPE"] = reader.read_BS()

        except (EOFError, IndexError, struct.error) as exc:
            logger.debug("Header variable parsing stopped: %s", exc)

        return header

    # ------------------------------------------------------------------
    # Classes (R2000)
    # ------------------------------------------------------------------

    def _parse_classes_r2000(
        self, data: bytes, offset: int, size: int
    ) -> list[DwgClass]:
        classes: list[DwgClass] = []

        sentinel = data[offset : offset + 16]
        if sentinel != CLASSES_SENTINEL_START:
            logger.warning("Classes sentinel mismatch at offset %d", offset)

        cls_data_size = struct.unpack_from("<I", data, offset + 16)[0]
        reader = DwgBitReader(data, offset + 20)
        end_byte = offset + 20 + cls_data_size

        while reader.tell_byte() < end_byte:
            try:
                cls = DwgClass()
                cls.class_number = reader.read_BS()
                cls.proxy_flags = reader.read_BS()
                cls.app_name = reader.read_T()
                cls.cpp_class_name = reader.read_T()
                cls.dxf_name = reader.read_T()
                cls.was_zombie = bool(reader.read_bit())
                cls.item_class_id = reader.read_BS()
                classes.append(cls)
            except (EOFError, IndexError):
                break

        return classes

    # ------------------------------------------------------------------
    # Object map (R2000)
    # ------------------------------------------------------------------

    def _parse_object_map_r2000(
        self, data: bytes, offset: int, size: int
    ) -> dict[int, int]:
        """Parse the object map section (R2000).

        Divided into sub-sections. Each starts with a 2-byte BE size field
        (does NOT include itself), followed by body + 2-byte CRC.
        Size == 2 (CRC only) marks the end.
        """
        object_map: dict[int, int] = {}
        pos = offset
        end = offset + size

        last_handle = 0
        last_loc = 0

        while pos < end:
            if pos + 2 > len(data):
                break
            section_size = struct.unpack_from(">H", data, pos)[0]
            if section_size <= 2:
                break

            body_start = pos + 2
            body_end = body_start + section_size - 2
            rpos = body_start

            while rpos < body_end:
                try:
                    handle_delta, rpos = DwgBitReader.read_modular_char(data, rpos)
                    loc_delta, rpos = DwgBitReader.read_modular_char(data, rpos)
                except (EOFError, IndexError):
                    break

                last_handle += handle_delta
                last_loc += loc_delta

                if last_handle > 0:
                    object_map[last_handle] = last_loc

            pos += 2 + section_size

        logger.debug("Object map: %d entries", len(object_map))
        return object_map

    # ------------------------------------------------------------------
    # Object/entity parsing (R2000)
    # ------------------------------------------------------------------

    def _parse_objects_r2000(
        self,
        data: bytes,
        object_map: dict[int, int],
        classes: list[DwgClass],
    ) -> list[DwgObject]:
        objects: list[DwgObject] = []

        for handle, file_offset in sorted(object_map.items()):
            try:
                obj = self._parse_single_object_r2000(data, handle, file_offset)
                if obj is not None:
                    objects.append(obj)
            except Exception as exc:
                logger.debug(
                    "Failed to parse handle=0x%X at offset=%d: %s",
                    handle, file_offset, exc,
                )

        return objects

    def _parse_single_object_r2000(
        self, data: bytes, handle: int, file_offset: int
    ) -> DwgObject | None:
        if file_offset >= len(data) or file_offset < 0:
            return None

        obj_size, bit_start = DwgBitReader.read_modular_short(data, file_offset)
        if obj_size <= 0:
            return None

        reader = DwgBitReader(data, bit_start)

        # Object type (BS)
        type_num = reader.read_BS()

        # Determine type name
        type_name = OBJ_TYPE_NAMES.get(type_num, "")
        if not type_name and type_num >= 500:
            cls = self._class_map.get(type_num)
            if cls:
                type_name = cls.dxf_name or cls.cpp_class_name
        if not type_name:
            type_name = f"UNKNOWN_{type_num}"

        # Determine if entity vs object
        is_entity = (
            type_num in _ENTITY_TYPES
            and type_num not in _TABLE_CONTROL_TYPES
            and type_num not in _TABLE_ENTRY_TYPES
            and type_num not in _NON_ENTITY_TYPES
        )
        # Also entities from class table (type >= 500) that have item_class_id==0x1F2
        if type_num >= 500 and not is_entity:
            cls = self._class_map.get(type_num)
            if cls and cls.item_class_id == 0x1F2:
                is_entity = True

        obj = DwgObject(
            handle=handle,
            type_num=type_num,
            type_name=type_name,
            is_entity=is_entity,
        )

        # R2000: bitsize (RL) comes after type for both entities and objects
        try:
            bitsize = reader.read_raw_long()
        except (EOFError, IndexError):
            obj.data = {"type": type_name, "handle": handle}
            return obj

        # Parse the entity/object handle (H)
        try:
            h_code, h_val = reader.read_H()
            # h_val should match the handle from the object map
        except (EOFError, IndexError):
            pass

        # Parse EED (Extended Entity Data)
        try:
            self._skip_eed(reader)
        except (EOFError, IndexError):
            pass

        # Parse type-specific data
        try:
            if is_entity:
                obj.data = self._parse_entity_data(reader, type_num, type_name, obj_size)
            else:
                obj.data = self._parse_table_object(reader, type_num, type_name, obj_size)
        except Exception as exc:
            logger.debug(
                "Partial parse of %s (handle=0x%X): %s", type_name, handle, exc
            )
            if not obj.data:
                obj.data = {}
            obj.data["_parse_error"] = str(exc)

        obj.data["type"] = type_name
        obj.data["handle"] = handle

        return obj

    def _skip_eed(self, reader: DwgBitReader) -> None:
        """Skip Extended Entity Data blocks."""
        while True:
            eed_size = reader.read_BS()
            if eed_size == 0:
                break
            # Skip the EED application handle
            reader.read_H()
            # Skip eed_size bytes of EED data
            for _ in range(eed_size):
                reader.read_byte()

    # ------------------------------------------------------------------
    # Entity common data (R2000)
    # ------------------------------------------------------------------

    def _parse_entity_common(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse R2000 common entity data fields.

        Order (from common_entity_data.spec for R2000):
            B:  preview_exists
            if preview: RL size + RC*size bytes
            BB: entmode
            BL: num_reactors
            B:  nolinks (R13-R2002)
            CMC: color (BS)
            BD: ltype_scale
            BB: ltype_flags
            BB: plotstyle_flags
            BS: invisibility
            RC: lineweight
        """
        result: dict[str, Any] = {}

        # Preview/graphic present
        preview_exists = reader.read_bit()
        if preview_exists:
            preview_size = reader.read_raw_long()
            if 0 < preview_size < 5_000_000:
                for _ in range(preview_size):
                    reader.read_byte()

        # Entity mode
        result["entity_mode"] = reader.read_BB()

        # Number of reactors
        result["_num_reactors"] = reader.read_BL()

        # nolinks (R13-R2002)
        _nolinks = reader.read_bit()

        # Color (CMC = BS for R2000)
        result["color"] = reader.read_CMC()

        # Linetype scale
        result["linetype_scale"] = reader.read_BD()

        # Linetype flags (R2000+)
        _ltype_flags = reader.read_BB()

        # Plotstyle flags (R2000+)
        _plotstyle_flags = reader.read_BB()

        # Invisibility
        invisibility = reader.read_BS()
        result["invisible"] = bool(invisibility)

        # Lineweight (R2000+)
        result["lineweight"] = reader.read_byte()

        return result

    # ------------------------------------------------------------------
    # Entity data dispatch
    # ------------------------------------------------------------------

    def _parse_entity_data(
        self, reader: DwgBitReader, type_num: int, type_name: str, obj_size: int
    ) -> dict[str, Any]:
        """Dispatch to type-specific entity parser."""
        try:
            common = self._parse_entity_common(reader)
        except Exception:
            common = {}

        try:
            if type_num == 0x13:  # LINE
                specific = self._parse_line(reader)
            elif type_num == 0x12:  # CIRCLE
                specific = self._parse_circle(reader)
            elif type_num == 0x11:  # ARC
                specific = self._parse_arc(reader)
            elif type_num == 0x1B:  # POINT
                specific = self._parse_point(reader)
            elif type_num == 0x4D:  # LWPOLYLINE
                specific = self._parse_lwpolyline(reader)
            elif type_num == 0x01:  # TEXT
                specific = self._parse_text(reader)
            elif type_num == 0x2C:  # MTEXT
                specific = self._parse_mtext(reader)
            elif type_num == 0x07:  # INSERT
                specific = self._parse_insert(reader)
            elif type_num == 0x23:  # ELLIPSE
                specific = self._parse_ellipse(reader)
            elif type_num == 0x24:  # SPLINE
                specific = self._parse_spline(reader)
            elif type_num == 0x1F:  # SOLID
                specific = self._parse_solid(reader)
            elif type_num == 0x28:  # RAY
                specific = self._parse_ray(reader)
            elif type_num == 0x29:  # XLINE
                specific = self._parse_xline(reader)
            else:
                specific = {}
        except Exception as exc:
            specific = {"_entity_parse_error": str(exc)}

        return {**common, **specific}

    # ------------------------------------------------------------------
    # Geometric entity parsers (R2000 format)
    # ------------------------------------------------------------------

    def _parse_line(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse LINE entity (R2000 format).

        R2000: z_is_zero(B), start.x(RD), end.x(DD), start.y(RD), end.y(DD),
               [start.z(RD), end.z(DD)], thickness(BT), extrusion(BE)
        """
        z_is_zero = reader.read_bit()
        start_x = reader.read_double()
        end_x = reader.read_DD(start_x)
        start_y = reader.read_double()
        end_y = reader.read_DD(start_y)
        if z_is_zero:
            start_z = 0.0
            end_z = 0.0
        else:
            start_z = reader.read_double()
            end_z = reader.read_DD(start_z)
        thickness = reader.read_BT()
        extrusion = reader.read_BE()
        return {
            "type": "LINE",
            "start": [start_x, start_y, start_z],
            "end": [end_x, end_y, end_z],
            "thickness": thickness,
            "extrusion": list(extrusion),
        }

    def _parse_circle(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse CIRCLE entity (R13+).

        3BD center, BD radius, BT thickness, BE extrusion.
        """
        center = reader.read_3BD()
        radius = reader.read_BD()
        thickness = reader.read_BT()
        extrusion = reader.read_BE()
        return {
            "type": "CIRCLE",
            "center": list(center),
            "radius": radius,
            "thickness": thickness,
            "extrusion": list(extrusion),
        }

    def _parse_arc(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse ARC entity (R13+).

        3BD center, BD radius, BT thickness, BE extrusion,
        BD start_angle, BD end_angle.
        """
        center = reader.read_3BD()
        radius = reader.read_BD()
        thickness = reader.read_BT()
        extrusion = reader.read_BE()
        start_angle = reader.read_BD()
        end_angle = reader.read_BD()
        return {
            "type": "ARC",
            "center": list(center),
            "radius": radius,
            "thickness": thickness,
            "extrusion": list(extrusion),
            "startAngle": start_angle,
            "endAngle": end_angle,
        }

    def _parse_point(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse POINT entity (R13+).

        BD x, BD y, BD z, BT thickness, BE extrusion, BD x_ang.
        """
        x = reader.read_BD()
        y = reader.read_BD()
        z = reader.read_BD()
        thickness = reader.read_BT()
        extrusion = reader.read_BE()
        x_ang = reader.read_BD()
        return {
            "type": "POINT",
            "position": [x, y, z],
            "thickness": thickness,
            "extrusion": list(extrusion),
            "xAxisAngle": x_ang,
        }

    def _parse_ellipse(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse ELLIPSE entity.

        3BD center, 3BD sm_axis (major axis endpoint relative to center),
        3BD extrusion, BD axis_ratio, BD start_angle, BD end_angle.
        """
        center = reader.read_3BD()
        sm_axis = reader.read_3BD()
        extrusion = reader.read_3BD()
        axis_ratio = reader.read_BD()
        start_angle = reader.read_BD()
        end_angle = reader.read_BD()
        return {
            "type": "ELLIPSE",
            "center": list(center),
            "majorAxis": list(sm_axis),
            "extrusion": list(extrusion),
            "axisRatio": axis_ratio,
            "startAngle": start_angle,
            "endAngle": end_angle,
        }

    def _parse_text(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse TEXT entity (R2000 format).

        RC dataflags, then conditional fields based on flag bits.
        """
        dataflags = reader.read_byte()

        elevation = 0.0
        if not (dataflags & 0x01):
            elevation = reader.read_double()

        insertion = reader.read_2RD()

        alignment = (0.0, 0.0)
        if not (dataflags & 0x02):
            # 2DD with default = insertion point
            ax = reader.read_DD(insertion[0])
            ay = reader.read_DD(insertion[1])
            alignment = (ax, ay)

        extrusion = reader.read_BE()
        thickness = reader.read_BT()

        oblique = 0.0
        if not (dataflags & 0x04):
            oblique = reader.read_double()

        rotation = 0.0
        if not (dataflags & 0x08):
            rotation = reader.read_double()

        height = reader.read_double()

        width_factor = 1.0
        if not (dataflags & 0x10):
            width_factor = reader.read_double()

        text_value = reader.read_T()

        generation = 0
        if not (dataflags & 0x20):
            generation = reader.read_BS()

        halign = 0
        if not (dataflags & 0x40):
            halign = reader.read_BS()

        valign = 0
        if not (dataflags & 0x80):
            valign = reader.read_BS()

        return {
            "type": "TEXT",
            "elevation": elevation,
            "insertion": list(insertion),
            "alignment": list(alignment),
            "extrusion": list(extrusion),
            "thickness": thickness,
            "oblique": oblique,
            "rotation": rotation,
            "height": height,
            "widthFactor": width_factor,
            "text": text_value,
            "generation": generation,
            "horizontalAlignment": halign,
            "verticalAlignment": valign,
        }

    def _parse_mtext(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse MTEXT entity.

        3BD ins_pt, 3BD extrusion, 3BD x_axis_dir,
        BD rect_width, [R2007+: BD rect_height], BD text_height,
        BS attachment, BS flow_dir,
        BD extents_height, BD extents_width,
        T text, [HANDLE style],
        R2000+: BS linespace_style, BD linespace_factor, B unknown.
        """
        insertion = reader.read_3BD()
        extrusion = reader.read_3BD()
        x_axis_dir = reader.read_3BD()
        rect_width = reader.read_BD()
        # R2007+: rect_height -- skip for R2000
        text_height = reader.read_BD()
        attachment = reader.read_BS()
        flow_dir = reader.read_BS()
        extents_height = reader.read_BD()
        extents_width = reader.read_BD()
        text = reader.read_T()
        # style handle is in handle section, skip
        line_spacing_style = reader.read_BS()
        line_spacing_factor = reader.read_BD()
        _unknown = reader.read_bit()

        return {
            "type": "MTEXT",
            "insertion": list(insertion),
            "extrusion": list(extrusion),
            "xAxisDirection": list(x_axis_dir),
            "rectWidth": rect_width,
            "textHeight": text_height,
            "attachment": attachment,
            "flowDirection": flow_dir,
            "text": text,
            "lineSpacingStyle": line_spacing_style,
            "lineSpacingFactor": line_spacing_factor,
        }

    def _parse_insert(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse INSERT entity (R2000 format).

        3BD ins_pt, BB scale_flag, scale data, BD rotation,
        3BD extrusion, B has_attribs.
        """
        insertion = reader.read_3BD()
        scale_flag = reader.read_BB()
        scale_x = 1.0
        scale_y = 1.0
        scale_z = 1.0
        if scale_flag == 3:
            # All 1.0
            pass
        elif scale_flag == 1:
            # x=1.0, y and z via DD(default=1.0)
            scale_y = reader.read_DD(1.0)
            scale_z = reader.read_DD(1.0)
        elif scale_flag == 2:
            # x via RD, y=z=x
            scale_x = reader.read_double()
            scale_y = scale_x
            scale_z = scale_x
        else:  # scale_flag == 0
            scale_x = reader.read_double()
            scale_y = reader.read_DD(scale_x)
            scale_z = reader.read_DD(scale_x)

        rotation = reader.read_BD()
        extrusion = reader.read_3BD()
        has_attribs = reader.read_bit()

        return {
            "type": "INSERT",
            "insertion": list(insertion),
            "scale": [scale_x, scale_y, scale_z],
            "rotation": rotation,
            "extrusion": list(extrusion),
            "hasAttribs": bool(has_attribs),
        }

    def _parse_lwpolyline(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse LWPOLYLINE entity (R2000 format).

        BS flag, then conditional: BD const_width, BD elevation, BD thickness,
        3BD extrusion, BL num_points, BL num_bulges, BL num_widths,
        then 2DD_VECTOR for points, BD vector for bulges, BD pairs for widths.
        """
        flag = reader.read_BS()

        const_width = 0.0
        if flag & 4:
            const_width = reader.read_BD()
        elevation = 0.0
        if flag & 8:
            elevation = reader.read_BD()
        thickness = 0.0
        if flag & 2:
            thickness = reader.read_BD()
        normal = (0.0, 0.0, 1.0)
        if flag & 1:
            normal = reader.read_3BD()

        num_points = reader.read_BL()
        num_bulges = 0
        if flag & 16:
            num_bulges = reader.read_BL()
        num_widths = 0
        if flag & 32:
            num_widths = reader.read_BL()

        # Points: R2000 uses 2DD_VECTOR (first as 2RD, rest as DD pairs)
        points = []
        if num_points > 0 and num_points < 100000:
            # First point as 2RD
            pt = reader.read_2RD()
            points.append(list(pt))
            # Remaining points as 2DD
            for i in range(1, num_points):
                px = reader.read_DD(points[i - 1][0])
                py = reader.read_DD(points[i - 1][1])
                points.append([px, py])

        bulges = []
        for _ in range(num_bulges):
            bulges.append(reader.read_BD())

        widths = []
        for _ in range(num_widths):
            sw = reader.read_BD()
            ew = reader.read_BD()
            widths.append((sw, ew))

        return {
            "type": "LWPOLYLINE",
            "flag": flag,
            "constWidth": const_width,
            "elevation": elevation,
            "thickness": thickness,
            "normal": list(normal),
            "points": points,
            "bulges": bulges,
            "widths": widths,
            "closed": bool(flag & 512),
        }

    def _parse_spline(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse SPLINE entity (basic)."""
        scenario = reader.read_BL()
        result: dict[str, Any] = {"type": "SPLINE", "scenario": scenario}

        if scenario == 2:
            degree = reader.read_BL()
            result["degree"] = degree
            num_knots = reader.read_BL()
            num_ctrl = reader.read_BL()
            weighted = reader.read_bit()
            knots = [reader.read_BD() for _ in range(num_knots)]
            ctrl_pts = []
            for _ in range(num_ctrl):
                pt = reader.read_3BD()
                w = reader.read_BD() if weighted else 1.0
                ctrl_pts.append({"point": list(pt), "weight": w})
            result["knots"] = knots
            result["controlPoints"] = ctrl_pts
        elif scenario == 1:
            degree = reader.read_BL()
            result["degree"] = degree
            _knot_param = reader.read_BD()
            num_fit = reader.read_BL()
            fit_pts = [list(reader.read_3BD()) for _ in range(num_fit)]
            result["fitPoints"] = fit_pts

        return result

    def _parse_solid(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse SOLID entity."""
        thickness = reader.read_BT()
        elevation = reader.read_BD()
        c1 = reader.read_2RD()
        c2 = reader.read_2RD()
        c3 = reader.read_2RD()
        c4 = reader.read_2RD()
        extrusion = reader.read_BE()
        return {
            "type": "SOLID",
            "thickness": thickness,
            "elevation": elevation,
            "corners": [list(c1), list(c2), list(c3), list(c4)],
            "extrusion": list(extrusion),
        }

    def _parse_ray(self, reader: DwgBitReader) -> dict[str, Any]:
        point = reader.read_3BD()
        vector = reader.read_3BD()
        return {"type": "RAY", "point": list(point), "vector": list(vector)}

    def _parse_xline(self, reader: DwgBitReader) -> dict[str, Any]:
        point = reader.read_3BD()
        vector = reader.read_3BD()
        return {"type": "XLINE", "point": list(point), "vector": list(vector)}

    # ------------------------------------------------------------------
    # Table / non-entity object parsers
    # ------------------------------------------------------------------

    def _parse_table_object(
        self, reader: DwgBitReader, type_num: int, type_name: str, obj_size: int
    ) -> dict[str, Any]:
        result: dict[str, Any] = {"type": type_name}

        try:
            if type_num == 0x33:  # LAYER
                result.update(self._parse_layer(reader))
            elif type_num == 0x31:  # BLOCK_HEADER
                result.update(self._parse_block_header(reader))
            elif type_num == 0x30:  # BLOCK_CONTROL
                result.update(self._parse_control_object(reader))
            elif type_num == 0x32:  # LAYER_CONTROL
                result.update(self._parse_control_object(reader))
            elif type_num == 0x35:  # STYLE
                result.update(self._parse_style(reader))
            elif type_num == 0x39:  # LTYPE
                result.update(self._parse_ltype(reader))
            elif type_num == 0x2A:  # DICTIONARY
                result.update(self._parse_dictionary(reader))
            elif type_num in _TABLE_CONTROL_TYPES:
                result.update(self._parse_control_object(reader))
        except Exception as exc:
            result["_parse_error"] = str(exc)

        return result

    def _parse_control_object(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse a control object (BLOCK_CONTROL, LAYER_CONTROL, etc.)."""
        num_reactors = reader.read_BL()
        num_entries = reader.read_BL()
        return {"numEntries": num_entries}

    def _parse_layer(self, reader: DwgBitReader) -> dict[str, Any]:
        """Parse LAYER table entry."""
        num_reactors = reader.read_BL()
        name = reader.read_T()
        _bit64 = reader.read_bit()
        _xref_index = reader.read_BS()
        _xdep = reader.read_bit()
        flags = reader.read_BS()
        color = reader.read_CMC()
        return {
            "name": name,
            "flags": flags,
            "color": color,
            "frozen": bool(flags & 1),
            "off": bool(color < 0),  # negative color = layer off
            "locked": bool(flags & 4),
        }

    def _parse_block_header(self, reader: DwgBitReader) -> dict[str, Any]:
        num_reactors = reader.read_BL()
        name = reader.read_T()
        _bit64 = reader.read_bit()
        _xref_index = reader.read_BS()
        _xdep = reader.read_bit()
        anonymous = reader.read_bit()
        has_attribs = reader.read_bit()
        blk_is_xref = reader.read_bit()
        _xref_overlaid = reader.read_bit()
        _loaded_bit = reader.read_bit()
        return {
            "name": name,
            "anonymous": bool(anonymous),
            "hasAttribs": bool(has_attribs),
            "isXref": bool(blk_is_xref),
        }

    def _parse_style(self, reader: DwgBitReader) -> dict[str, Any]:
        num_reactors = reader.read_BL()
        name = reader.read_T()
        _bit64 = reader.read_bit()
        _xref_index = reader.read_BS()
        _xdep = reader.read_bit()
        _is_vertical = reader.read_bit()
        _is_shape_file = reader.read_bit()
        fixed_height = reader.read_BD()
        width_factor = reader.read_BD()
        oblique_angle = reader.read_BD()
        _generation = reader.read_byte()
        _last_height = reader.read_BD()
        font_name = reader.read_T()
        bigfont_name = reader.read_T()
        return {
            "name": name,
            "fixedHeight": fixed_height,
            "widthFactor": width_factor,
            "oblique": oblique_angle,
            "fontName": font_name,
            "bigfontName": bigfont_name,
        }

    def _parse_ltype(self, reader: DwgBitReader) -> dict[str, Any]:
        num_reactors = reader.read_BL()
        name = reader.read_T()
        _bit64 = reader.read_bit()
        _xref_index = reader.read_BS()
        _xdep = reader.read_bit()
        description = reader.read_T()
        pattern_length = reader.read_BD()
        _alignment = reader.read_byte()
        num_dashes = reader.read_byte()
        return {
            "name": name,
            "description": description,
            "patternLength": pattern_length,
            "numDashes": num_dashes,
        }

    def _parse_dictionary(self, reader: DwgBitReader) -> dict[str, Any]:
        num_reactors = reader.read_BL()
        num_items = reader.read_BL()
        cloning_flag = reader.read_BS()
        hard_owner = reader.read_byte()
        entries: dict[str, int] = {}
        for _ in range(num_items):
            try:
                name = reader.read_T()
                code, handle_val = reader.read_H()
                entries[name] = handle_val
            except (EOFError, IndexError):
                break
        return {"numItems": num_items, "cloningFlag": cloning_flag, "entries": entries}

    # ------------------------------------------------------------------
    # R2004+ and R2007+ stubs
    # ------------------------------------------------------------------

    def _parse_r2004(self, data: bytes, dwg: DwgFile) -> None:
        raise NotImplementedError(
            "R2004 (AC1018) DWG parsing is not yet implemented. "
            "Save the file as R2000 format for compatibility."
        )

    def _parse_r2007_plus(self, data: bytes, dwg: DwgFile) -> None:
        raise NotImplementedError(
            f"{dwg.version} DWG parsing is not yet implemented. "
            "Save the file as R2000 format for compatibility."
        )
