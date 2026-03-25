"""DGN V7 (ISFF) parser -- pure Python, no external dependencies.

Parses MicroStation DGN V7 binary files based on the Intergraph Standard
File Format.  Implements middle-endian 32-bit integers, VAX D-Float to
IEEE 754 conversion, and element-type-specific decoding.

Reference implementation: DGNLib by Frank Warmerdam (GDAL/OGR).
"""

from __future__ import annotations

import math
import struct
from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class DgnElement:
    """Represents a single DGN element."""
    type: int
    type_name: str
    level: int
    deleted: bool
    complex: bool
    offset: int          # byte offset in file
    size: int            # size in bytes (header + data)
    graphic_group: int = 0
    properties: int = 0
    color: int = 0
    weight: int = 0
    style: int = 0
    data: dict = field(default_factory=dict)


@dataclass
class DgnFile:
    """Represents a parsed DGN V7 file."""
    version: str = "V7"
    elements: list = field(default_factory=list)
    is_3d: bool = False
    uor_per_sub: int = 1
    sub_per_master: int = 1
    master_unit_name: str = ""
    sub_unit_name: str = ""
    global_origin: tuple = (0.0, 0.0, 0.0)
    color_table: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

class DgnParser:
    """Parses DGN V7 binary files."""

    # DGN V7 element type constants
    ELEMENT_TYPES = {
        1: 'CELL_LIBRARY',
        2: 'CELL_HEADER',
        3: 'LINE',
        4: 'LINE_STRING',
        5: 'GROUP_DATA',
        6: 'SHAPE',
        7: 'TEXT_NODE',
        8: 'DIGITIZER_SETUP',
        9: 'TCB',
        10: 'LEVEL_SYMBOLOGY',
        11: 'CURVE',
        12: 'COMPLEX_CHAIN_HEADER',
        14: 'COMPLEX_SHAPE_HEADER',
        15: 'ELLIPSE',
        16: 'ARC',
        17: 'TEXT',
        18: '3DSURFACE_HEADER',
        19: '3DSOLID_HEADER',
        21: 'BSPLINE_POLE',
        22: 'POINT_STRING',
        23: 'CONE',
        24: 'BSPLINE_SURFACE_HEADER',
        25: 'BSPLINE_SURFACE_BOUNDARY',
        26: 'BSPLINE_KNOT',
        27: 'BSPLINE_CURVE_HEADER',
        28: 'BSPLINE_WEIGHT_FACTOR',
        33: 'DIMENSION',
        34: 'SHARED_CELL_DEFN',
        35: 'SHARED_CELL',
        37: 'TAG_VALUE',
        66: 'APPLICATION',
    }

    # Element types that do NOT have a display header (graphic group,
    # properties, symbology, etc.) after the 4-byte element header.
    _NO_DISPHDR = frozenset([
        0, 1, 9, 10, 32, 44, 48, 49, 50, 51, 57, 60, 61, 62, 63,
    ])

    def __init__(self) -> None:
        self._dimension: int = 2
        self._scale: float = 1.0
        self._origin_x: float = 0.0
        self._origin_y: float = 0.0
        self._origin_z: float = 0.0
        self._got_tcb: bool = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def parse(self, data: bytes) -> DgnFile:
        """Parse a DGN V7 file from raw bytes."""
        dgn = DgnFile()

        if len(data) < 4:
            return dgn

        # Quick 2D/3D check from the first byte of the file (TCB element)
        if data[0] == 0xC8:
            self._dimension = 3
            dgn.is_3d = True
        else:
            self._dimension = 2
            dgn.is_3d = False

        offset = 0
        while offset < len(data) - 3:
            # Check for EOF marker
            if data[offset] == 0xFF and data[offset + 1] == 0xFF:
                break

            elem = self._read_element(data, offset, dgn)
            if elem is None:
                break
            dgn.elements.append(elem)
            offset += elem.size

        return dgn

    # ------------------------------------------------------------------
    # Low-level binary helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _read_uint16_le(data: bytes, offset: int) -> int:
        """Read a little-endian unsigned 16-bit integer."""
        return data[offset] + data[offset + 1] * 256

    @staticmethod
    def _read_int32_me(data: bytes, offset: int) -> int:
        """Read a 32-bit middle-endian (VAX word-swapped) integer.

        DGN stores 32-bit integers with the two 16-bit halves swapped
        relative to standard little-endian.  Byte layout [A, B, C, D]:
          value = C + D*256 + B*256*65536 + A*65536
        This matches the DGN_INT32 macro in DGNLib.
        """
        p = data
        return (p[offset + 2]
                + p[offset + 3] * 256
                + p[offset + 1] * 256 * 65536
                + p[offset] * 65536)

    @staticmethod
    def _read_int32_me_signed(data: bytes, offset: int) -> int:
        """Read a signed 32-bit middle-endian integer."""
        v = DgnParser._read_int32_me(data, offset)
        if v >= 0x80000000:
            v -= 0x100000000
        return v

    @staticmethod
    def _vax_to_ieee(data: bytes, offset: int) -> float:
        """Convert 8-byte VAX D-Float to IEEE 754 double.

        This replicates the DGN2IEEEDouble() function from DGNLib.
        On a little-endian host, the byte reordering is:
          dest[2]=src[0], dest[3]=src[1], dest[0]=src[2], dest[1]=src[3]
          dest[6]=src[4], dest[7]=src[5], dest[4]=src[6], dest[5]=src[7]
        This gives us two 32-bit words (hi, lo) that form a VAX double.
        """
        src = data[offset:offset + 8]
        if len(src) < 8:
            return 0.0

        # Reorder bytes into (hi, lo) pair -- little-endian host order
        dest = bytearray(8)
        dest[2] = src[0]
        dest[3] = src[1]
        dest[0] = src[2]
        dest[1] = src[3]
        dest[6] = src[4]
        dest[7] = src[5]
        dest[4] = src[6]
        dest[5] = src[7]

        # Interpret as two uint32 LE: dt_hi (bytes 0-3), dt_lo (bytes 4-7)
        dt_hi = struct.unpack_from('<I', dest, 0)[0]
        dt_lo = struct.unpack_from('<I', dest, 4)[0]

        # Save sign
        sign = dt_hi & 0x80000000

        # Extract and adjust exponent
        exponent = (dt_hi >> 23) & 0xFF
        if exponent != 0:
            exponent = exponent - 129 + 1023

        # Save rounding bits and shift
        rndbits = dt_lo & 0x00000007
        dt_lo = dt_lo >> 3
        dt_lo = (dt_lo & 0x1FFFFFFF) | ((dt_hi << 29) & 0xFFFFFFFF)
        if rndbits:
            dt_lo = dt_lo | 0x00000001

        # Shift hi and reconstruct
        dt_hi = dt_hi >> 3
        dt_hi = dt_hi & 0x000FFFFF
        dt_hi = dt_hi | ((exponent << 20) & 0xFFFFFFFF) | sign

        # Pack back as IEEE double (little-endian: lo first, then hi)
        ieee_bytes = struct.pack('<II', dt_lo, dt_hi)
        return struct.unpack('<d', ieee_bytes)[0]

    # ------------------------------------------------------------------
    # Element reading
    # ------------------------------------------------------------------

    def _read_element(self, data: bytes, offset: int, dgn: DgnFile) -> DgnElement | None:
        """Read one element starting at the given offset."""
        if offset + 4 > len(data):
            return None

        b0 = data[offset]
        b1 = data[offset + 1]

        level = b0 & 0x3F
        complex_flag = bool(b0 & 0x80)
        etype = b1 & 0x7F
        deleted = bool(b1 & 0x80)

        n_words = self._read_uint16_le(data, offset + 2)
        elem_size = n_words * 2 + 4  # word count excludes the 4-byte header

        if elem_size < 4 or offset + elem_size > len(data):
            return None

        type_name = self.ELEMENT_TYPES.get(etype, f'UNKNOWN_{etype}')

        elem = DgnElement(
            type=etype,
            type_name=type_name,
            level=level,
            deleted=deleted,
            complex=complex_flag,
            offset=offset,
            size=elem_size,
        )

        # Parse display header (symbology, properties, etc.) for graphic types
        if etype not in self._NO_DISPHDR and elem_size >= 36:
            elem.graphic_group = self._read_uint16_le(data, offset + 28)
            elem.properties = self._read_uint16_le(data, offset + 32)
            elem.style = data[offset + 34] & 0x07
            elem.weight = (data[offset + 34] & 0xF8) >> 3
            elem.color = data[offset + 35]

        # Parse element-specific data
        raw = data[offset:offset + elem_size]
        try:
            if etype == 9:
                self._parse_tcb(raw, dgn)
            elif etype == 5 and level == 1:
                self._parse_color_table(raw, dgn)
            elif etype == 3:
                elem.data = self._parse_line(raw)
            elif etype in (4, 6, 11, 21):
                elem.data = self._parse_multipoint(raw, etype)
            elif etype == 15:
                elem.data = self._parse_ellipse(raw)
            elif etype == 16:
                elem.data = self._parse_arc(raw)
            elif etype == 17:
                elem.data = self._parse_text(raw)
            elif etype == 7:
                elem.data = self._parse_text_node(raw)
            elif etype == 2:
                elem.data = self._parse_cell_header(raw)
            elif etype in (12, 14, 18, 19):
                elem.data = self._parse_complex_header(raw)
            elif etype == 37:
                elem.data = self._parse_tag_value(raw)
        except Exception:
            # If parsing fails for a specific element, continue
            pass

        return elem

    # ------------------------------------------------------------------
    # TCB (Type Control Block, type 9) -- file header
    # ------------------------------------------------------------------

    def _parse_tcb(self, raw: bytes, dgn: DgnFile) -> None:
        """Parse the TCB element to extract file metadata.

        Only the first TCB encountered is used for units/origin (matching
        DGNLib behaviour).
        """
        if len(raw) < 1264:
            return

        # Only apply the first TCB
        if self._got_tcb:
            return

        # Dimension flag at byte 1214
        if raw[1214] & 0x40:
            self._dimension = 3
            dgn.is_3d = True
        else:
            self._dimension = 2
            dgn.is_3d = False

        # Unit information
        sub_per_master = self._read_int32_me(raw, 1112)
        uor_per_sub = self._read_int32_me(raw, 1116)

        dgn.sub_per_master = sub_per_master if sub_per_master else 1
        dgn.uor_per_sub = uor_per_sub if uor_per_sub else 1

        # Unit names
        dgn.master_unit_name = (
            chr(raw[1120]) + chr(raw[1121])
        ).rstrip('\x00').strip()
        dgn.sub_unit_name = (
            chr(raw[1122]) + chr(raw[1123])
        ).rstrip('\x00').strip()

        # Scale factor
        if uor_per_sub and sub_per_master:
            self._scale = 1.0 / (uor_per_sub * sub_per_master)
        else:
            self._scale = 1.0

        # Global origin (3 VAX D-Float doubles at offset 1240)
        origin_x = self._vax_to_ieee(raw, 1240)
        origin_y = self._vax_to_ieee(raw, 1248)
        origin_z = self._vax_to_ieee(raw, 1256)

        # Convert origin from UOR to master units
        if uor_per_sub and sub_per_master:
            s = uor_per_sub * sub_per_master
            origin_x /= s
            origin_y /= s
            origin_z /= s

        self._origin_x = origin_x
        self._origin_y = origin_y
        self._origin_z = origin_z
        self._got_tcb = True

        dgn.global_origin = (origin_x, origin_y, origin_z)

    # ------------------------------------------------------------------
    # Color table (GROUP_DATA type 5, level 1)
    # ------------------------------------------------------------------

    def _parse_color_table(self, raw: bytes, dgn: DgnFile) -> None:
        """Parse a color table element (256 RGB entries)."""
        if len(raw) < 806:  # 38 + 3 + 765
            return
        # Byte 38: background color (entry 255), bytes 41..805: entries 0..254
        colors = [None] * 256
        colors[255] = (raw[38], raw[39], raw[40])
        for i in range(255):
            base = 41 + i * 3
            colors[i] = (raw[base], raw[base + 1], raw[base + 2])
        dgn.color_table = colors

    # ------------------------------------------------------------------
    # Coordinate transform helpers
    # ------------------------------------------------------------------

    def _transform_point(self, x: float, y: float, z: float = 0.0) -> tuple:
        """Transform a raw UOR integer coordinate to master units.

        DGNTransformPoint: point = point * scale - origin
        """
        return (
            x * self._scale - self._origin_x,
            y * self._scale - self._origin_y,
            z * self._scale - self._origin_z,
        )

    def _read_point_int(self, raw: bytes, offset: int) -> tuple:
        """Read a 2D or 3D point as middle-endian int32 values and transform."""
        x = self._read_int32_me_signed(raw, offset)
        y = self._read_int32_me_signed(raw, offset + 4)
        z = 0
        if self._dimension == 3:
            z = self._read_int32_me_signed(raw, offset + 8)
        return self._transform_point(x, y, z)

    # ------------------------------------------------------------------
    # LINE (type 3)
    # ------------------------------------------------------------------

    def _parse_line(self, raw: bytes) -> dict:
        """Parse a LINE element -- two endpoints."""
        pntsize = self._dimension * 4
        p0 = self._read_point_int(raw, 36)
        p1 = self._read_point_int(raw, 36 + pntsize)
        result: dict[str, Any] = {'vertices': [p0, p1]}
        return result

    # ------------------------------------------------------------------
    # LINE_STRING (4), SHAPE (6), CURVE (11), BSPLINE_POLE (21)
    # ------------------------------------------------------------------

    def _parse_multipoint(self, raw: bytes, etype: int) -> dict:
        """Parse a multipoint element."""
        pntsize = self._dimension * 4
        count = self._read_uint16_le(raw, 36)

        # Clamp to available data
        max_count = (len(raw) - 38) // pntsize
        if count > max_count:
            count = max_count

        vertices = []
        for i in range(count):
            pt = self._read_point_int(raw, 38 + i * pntsize)
            vertices.append(pt)

        result: dict[str, Any] = {'vertices': vertices}
        if etype == 6:
            result['closed'] = True
        return result

    # ------------------------------------------------------------------
    # ELLIPSE (type 15) -- complete ellipse
    # ------------------------------------------------------------------

    def _parse_ellipse(self, raw: bytes) -> dict:
        """Parse an ELLIPSE element."""
        primary = self._vax_to_ieee(raw, 36) * self._scale
        secondary = self._vax_to_ieee(raw, 44) * self._scale

        if self._dimension == 2:
            rotation = self._read_int32_me_signed(raw, 52) / 360000.0
            ox = self._vax_to_ieee(raw, 56)
            oy = self._vax_to_ieee(raw, 64)
            origin = self._transform_point(ox, oy)
        else:
            quat = [
                self._read_int32_me_signed(raw, 52),
                self._read_int32_me_signed(raw, 56),
                self._read_int32_me_signed(raw, 60),
                self._read_int32_me_signed(raw, 64),
            ]
            ox = self._vax_to_ieee(raw, 68)
            oy = self._vax_to_ieee(raw, 76)
            oz = self._vax_to_ieee(raw, 84)
            origin = self._transform_point(ox, oy, oz)
            rotation = 0.0  # quaternion rotation not yet decoded

        return {
            'primary_axis': primary,
            'secondary_axis': secondary,
            'rotation': rotation,
            'origin': origin,
            'start_angle': 0.0,
            'sweep_angle': 360.0,
        }

    # ------------------------------------------------------------------
    # ARC (type 16)
    # ------------------------------------------------------------------

    def _parse_arc(self, raw: bytes) -> dict:
        """Parse an ARC element (elliptical arc)."""
        start_ang = self._read_int32_me_signed(raw, 36) / 360000.0

        # Sweep: bit 7 of byte 41 indicates negative sweep
        sweep_negative = bool(raw[41] & 0x80)
        # Temporarily mask the sign bit for reading
        saved = raw[41]
        raw_mut = bytearray(raw)
        raw_mut[41] = raw[41] & 0x7F
        sweep_val = self._read_int32_me_signed(bytes(raw_mut), 40)
        if sweep_negative:
            sweep_val = -sweep_val

        if sweep_val == 0:
            sweep_ang = 360.0
        else:
            sweep_ang = sweep_val / 360000.0

        primary = self._vax_to_ieee(raw, 44) * self._scale
        secondary = self._vax_to_ieee(raw, 52) * self._scale

        if self._dimension == 2:
            rotation = self._read_int32_me_signed(raw, 60) / 360000.0
            ox = self._vax_to_ieee(raw, 64)
            oy = self._vax_to_ieee(raw, 72)
            origin = self._transform_point(ox, oy)
        else:
            quat = [
                self._read_int32_me_signed(raw, 60),
                self._read_int32_me_signed(raw, 64),
                self._read_int32_me_signed(raw, 68),
                self._read_int32_me_signed(raw, 72),
            ]
            ox = self._vax_to_ieee(raw, 76)
            oy = self._vax_to_ieee(raw, 84)
            oz = self._vax_to_ieee(raw, 92)
            origin = self._transform_point(ox, oy, oz)
            rotation = 0.0

        return {
            'primary_axis': primary,
            'secondary_axis': secondary,
            'rotation': rotation,
            'origin': origin,
            'start_angle': start_ang,
            'sweep_angle': sweep_ang,
        }

    # ------------------------------------------------------------------
    # TEXT (type 17)
    # ------------------------------------------------------------------

    def _parse_text(self, raw: bytes) -> dict:
        """Parse a TEXT element."""
        font_id = raw[36]
        justification = raw[37]
        length_mult = self._read_int32_me_signed(raw, 38) * self._scale * 6.0 / 1000.0
        height_mult = self._read_int32_me_signed(raw, 42) * self._scale * 6.0 / 1000.0

        if self._dimension == 2:
            rotation = self._read_int32_me_signed(raw, 46) / 360000.0
            ox = self._read_int32_me_signed(raw, 50)
            oy = self._read_int32_me_signed(raw, 54)
            origin = self._transform_point(ox, oy)
            num_chars = raw[58] if len(raw) > 58 else 0
            text_off = 60
        else:
            # 3D: quaternion at 46, origin at 62
            rotation = 0.0
            ox = self._read_int32_me_signed(raw, 62)
            oy = self._read_int32_me_signed(raw, 66)
            oz = self._read_int32_me_signed(raw, 70)
            origin = self._transform_point(ox, oy, oz)
            num_chars = raw[74] if len(raw) > 74 else 0
            text_off = 76

        # Extract text string
        text = ''
        if text_off + num_chars <= len(raw):
            text_bytes = raw[text_off:text_off + num_chars]
            # Check for multibyte marker
            if len(text_bytes) >= 2 and text_bytes[0] == 0xFF and text_bytes[1] == 0xFD:
                # Multibyte (e.g. Korean)
                chars = []
                for i in range(0, len(text_bytes) - 2, 2):
                    w = self._read_uint16_le(text_bytes, 2 + i)
                    if w < 256:
                        chars.append(chr(w))
                    else:
                        chars.append(chr(w))
                text = ''.join(chars)
            else:
                text = text_bytes.decode('ascii', errors='replace').rstrip('\x00')

        return {
            'text': text,
            'font_id': font_id,
            'justification': justification,
            'height': height_mult,
            'width': length_mult,
            'rotation': rotation,
            'origin': origin,
        }

    # ------------------------------------------------------------------
    # TEXT_NODE (type 7)
    # ------------------------------------------------------------------

    def _parse_text_node(self, raw: bytes) -> dict:
        """Parse a TEXT_NODE element (container for text components)."""
        totlength = self._read_uint16_le(raw, 36)
        numelems = self._read_uint16_le(raw, 38)
        node_number = self._read_uint16_le(raw, 40)
        max_length = raw[42]
        max_used = raw[43]
        font_id = raw[44]
        justification = raw[45]
        length_mult = self._read_int32_me_signed(raw, 50) * self._scale * 6.0 / 1000.0
        height_mult = self._read_int32_me_signed(raw, 54) * self._scale * 6.0 / 1000.0

        if self._dimension == 2:
            rotation = self._read_int32_me_signed(raw, 58) / 360000.0
            ox = self._read_int32_me_signed(raw, 62)
            oy = self._read_int32_me_signed(raw, 66)
            origin = self._transform_point(ox, oy)
        else:
            ox = self._read_int32_me_signed(raw, 74)
            oy = self._read_int32_me_signed(raw, 78)
            oz = self._read_int32_me_signed(raw, 82)
            origin = self._transform_point(ox, oy, oz)
            rotation = 0.0

        return {
            'totlength': totlength,
            'numelems': numelems,
            'node_number': node_number,
            'font_id': font_id,
            'justification': justification,
            'height': height_mult,
            'width': length_mult,
            'rotation': rotation,
            'origin': origin,
        }

    # ------------------------------------------------------------------
    # CELL_HEADER (type 2)
    # ------------------------------------------------------------------

    def _parse_cell_header(self, raw: bytes) -> dict:
        """Parse a CELL_HEADER element (placed cell instance)."""
        totlength = self._read_uint16_le(raw, 36)

        # Cell name is encoded in Radix-50 (two 16-bit words -> 6 chars)
        name = ''
        try:
            w1 = self._read_uint16_le(raw, 38)
            w2 = self._read_uint16_le(raw, 40)
            name = self._rad50_to_ascii(w1) + self._rad50_to_ascii(w2)
            name = name.rstrip()
        except Exception:
            pass

        cclass = self._read_uint16_le(raw, 42)

        if self._dimension == 2:
            rnglow = self._read_point_int(raw, 52)
            rnghigh = self._read_point_int(raw, 60)

            # Transformation matrix (2x2, each int32 / 2^31)
            a = self._read_int32_me_signed(raw, 68)
            b = self._read_int32_me_signed(raw, 72)
            c = self._read_int32_me_signed(raw, 76)
            d = self._read_int32_me_signed(raw, 80)

            ox = self._read_int32_me_signed(raw, 84)
            oy = self._read_int32_me_signed(raw, 88)
            origin = self._transform_point(ox, oy)

            a2 = a * a
            c2 = c * c
            xscale = math.sqrt(a2 + c2) / 214748.0 if (a2 + c2) > 0 else 1.0
            yscale = math.sqrt(b * b + d * d) / 214748.0

            if (a2 + c2) <= 0.0:
                rotation = 0.0
            else:
                rotation = math.acos(max(-1.0, min(1.0, a / math.sqrt(a2 + c2))))
                if b <= 0:
                    rotation = math.degrees(rotation)
                else:
                    rotation = 360.0 - math.degrees(rotation)
        else:
            rnglow = self._read_point_int(raw, 52)
            rnghigh = self._read_point_int(raw, 64)

            ox = self._read_int32_me_signed(raw, 112)
            oy = self._read_int32_me_signed(raw, 116)
            oz = self._read_int32_me_signed(raw, 120)
            origin = self._transform_point(ox, oy, oz)
            xscale = 1.0
            yscale = 1.0
            rotation = 0.0

        return {
            'name': name,
            'totlength': totlength,
            'class': cclass,
            'origin': origin,
            'xscale': xscale,
            'yscale': yscale,
            'rotation': rotation,
            'range_low': rnglow,
            'range_high': rnghigh,
        }

    # ------------------------------------------------------------------
    # COMPLEX_CHAIN/SHAPE headers (types 12, 14, 18, 19)
    # ------------------------------------------------------------------

    def _parse_complex_header(self, raw: bytes) -> dict:
        """Parse a complex chain/shape header."""
        totlength = self._read_uint16_le(raw, 36)
        numelems = self._read_uint16_le(raw, 38)
        result: dict[str, Any] = {
            'totlength': totlength,
            'numelems': numelems,
        }
        # Surface/solid types have additional fields
        if len(raw) > 41:
            result['surftype'] = raw[40]
            result['boundelms'] = raw[41] + 1
        return result

    # ------------------------------------------------------------------
    # TAG_VALUE (type 37)
    # ------------------------------------------------------------------

    def _parse_tag_value(self, raw: bytes) -> dict:
        """Parse a TAG_VALUE element."""
        if len(raw) < 156:
            return {}

        tag_type = self._read_uint16_le(raw, 74)
        tag_set = struct.unpack_from('<I', raw, 68)[0]
        tag_index = self._read_uint16_le(raw, 72)
        tag_length = self._read_uint16_le(raw, 150)

        result: dict[str, Any] = {
            'tag_type': tag_type,
            'tag_set': tag_set,
            'tag_index': tag_index,
            'tag_length': tag_length,
        }

        if tag_type == 1 and len(raw) > 154:
            # String
            end = raw.index(0, 154) if 0 in raw[154:] else len(raw)
            result['value'] = raw[154:end].decode('ascii', errors='replace')
        elif tag_type == 3 and len(raw) >= 158:
            result['value'] = struct.unpack_from('<i', raw, 154)[0]
        elif tag_type == 4 and len(raw) >= 162:
            result['value'] = self._vax_to_ieee(raw, 154)

        return result

    # ------------------------------------------------------------------
    # Radix-50 decoding
    # ------------------------------------------------------------------

    @staticmethod
    def _rad50_to_ascii(value: int) -> str:
        """Decode a Radix-50 encoded 16-bit value to 3 ASCII characters."""
        _R50 = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ$.%0123456789'
        chars = []
        for _ in range(3):
            chars.append(_R50[value % 40] if value % 40 < len(_R50) else ' ')
            value //= 40
        return ''.join(reversed(chars))
