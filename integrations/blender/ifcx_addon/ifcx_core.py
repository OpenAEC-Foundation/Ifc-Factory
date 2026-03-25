"""
IFCX Core Library - Self-contained IFCX/IFCXB/DXF/DGN library for Blender.

Provides:
- IfcxDocument: in-memory IFCX document model
- IFCXB binary encoder/decoder (CBOR + gzip)
- DXF tokenizer and parser (simplified, for import)
- DXF writer (for export)
- DGN V7 parser (simplified, for import)
- ACI (AutoCAD Color Index) color table
"""

from __future__ import annotations

import struct
import json
import math
import io
import gzip as _gzip

try:
    import zlib as _zlib
    HAS_ZLIB = True
except ImportError:
    HAS_ZLIB = False


# ============================================================================
# ACI Color Table (AutoCAD Color Index -> RGB 0-255)
# ============================================================================

ACI_COLORS = {
    0: (0, 0, 0),        # BYBLOCK
    1: (255, 0, 0),      # Red
    2: (255, 255, 0),    # Yellow
    3: (0, 255, 0),      # Green
    4: (0, 255, 255),    # Cyan
    5: (0, 0, 255),      # Blue
    6: (255, 0, 255),    # Magenta
    7: (255, 255, 255),  # White/Black
    8: (128, 128, 128),  # Dark gray
    9: (192, 192, 192),  # Light gray
    10: (255, 0, 0),
    11: (255, 127, 127),
    12: (204, 0, 0),
    13: (204, 102, 102),
    14: (153, 0, 0),
    15: (153, 76, 76),
    16: (127, 0, 0),
    17: (127, 63, 63),
    18: (76, 0, 0),
    19: (76, 38, 38),
    20: (255, 63, 0),
    21: (255, 159, 127),
    22: (204, 51, 0),
    23: (204, 127, 102),
    24: (153, 38, 0),
    25: (153, 95, 76),
    30: (255, 127, 0),
    31: (255, 191, 127),
    40: (255, 191, 0),
    41: (255, 223, 127),
    50: (255, 255, 0),
    51: (255, 255, 127),
    60: (191, 255, 0),
    70: (127, 255, 0),
    80: (63, 255, 0),
    90: (0, 255, 0),
    100: (0, 255, 63),
    110: (0, 255, 127),
    120: (0, 255, 191),
    130: (0, 255, 255),
    140: (0, 191, 255),
    150: (0, 127, 255),
    160: (0, 63, 255),
    170: (0, 0, 255),
    180: (63, 0, 255),
    190: (127, 0, 255),
    200: (191, 0, 255),
    210: (255, 0, 255),
    220: (255, 0, 191),
    230: (255, 0, 127),
    240: (255, 0, 63),
    250: (51, 51, 51),
    251: (91, 91, 91),
    252: (132, 132, 132),
    253: (173, 173, 173),
    254: (214, 214, 214),
    255: (255, 255, 255),
}


def aci_to_rgb(color_index: int) -> tuple[float, float, float]:
    """Convert ACI color index to (R, G, B) floats in 0.0-1.0 range."""
    if color_index in ACI_COLORS:
        r, g, b = ACI_COLORS[color_index]
    else:
        # Approximate for missing indices
        r, g, b = 200, 200, 200
    return (r / 255.0, g / 255.0, b / 255.0)


# ============================================================================
# Minimal CBOR Encoder/Decoder (RFC 7049 subset)
# ============================================================================

CBOR_UINT = 0
CBOR_NEGINT = 1
CBOR_BYTES = 2
CBOR_TEXT = 3
CBOR_ARRAY = 4
CBOR_MAP = 5
CBOR_TAG = 6
CBOR_SIMPLE = 7

CBOR_FALSE = 0xF4
CBOR_TRUE = 0xF5
CBOR_NULL = 0xF6
CBOR_FLOAT64 = 0xFB


def _encode_head(major: int, value: int) -> bytes:
    mt = major << 5
    if value < 24:
        return struct.pack("B", mt | value)
    elif value < 0x100:
        return struct.pack("BB", mt | 24, value)
    elif value < 0x10000:
        return struct.pack("!BH", mt | 25, value)
    elif value < 0x100000000:
        return struct.pack("!BI", mt | 26, value)
    else:
        return struct.pack("!BQ", mt | 27, value)


def cbor_encode(obj) -> bytes:
    """Encode a Python object to CBOR bytes."""
    if obj is None:
        return struct.pack("B", CBOR_NULL)
    if isinstance(obj, bool):
        return struct.pack("B", CBOR_TRUE if obj else CBOR_FALSE)
    if isinstance(obj, int):
        if obj >= 0:
            return _encode_head(CBOR_UINT, obj)
        else:
            return _encode_head(CBOR_NEGINT, -1 - obj)
    if isinstance(obj, float):
        return struct.pack("!Bd", CBOR_FLOAT64, obj)
    if isinstance(obj, bytes):
        return _encode_head(CBOR_BYTES, len(obj)) + obj
    if isinstance(obj, str):
        encoded = obj.encode("utf-8")
        return _encode_head(CBOR_TEXT, len(encoded)) + encoded
    if isinstance(obj, (list, tuple)):
        parts = [_encode_head(CBOR_ARRAY, len(obj))]
        for item in obj:
            parts.append(cbor_encode(item))
        return b"".join(parts)
    if isinstance(obj, dict):
        parts = [_encode_head(CBOR_MAP, len(obj))]
        for key, value in obj.items():
            parts.append(cbor_encode(key))
            parts.append(cbor_encode(value))
        return b"".join(parts)
    return cbor_encode(str(obj))


def _cbor_read_head(data: bytes, offset: int):
    first = struct.unpack_from("B", data, offset)[0]
    offset += 1
    major = first >> 5
    info = first & 0x1F
    if info < 24:
        return major, info, offset
    elif info == 24:
        val = struct.unpack_from("B", data, offset)[0]
        return major, val, offset + 1
    elif info == 25:
        val = struct.unpack_from("!H", data, offset)[0]
        return major, val, offset + 2
    elif info == 26:
        val = struct.unpack_from("!I", data, offset)[0]
        return major, val, offset + 4
    elif info == 27:
        val = struct.unpack_from("!Q", data, offset)[0]
        return major, val, offset + 8
    else:
        return major, info, offset


def _cbor_decode_item(data: bytes, offset: int):
    major, info, offset = _cbor_read_head(data, offset)
    if major == CBOR_UINT:
        return info, offset
    elif major == CBOR_NEGINT:
        return -1 - info, offset
    elif major == CBOR_BYTES:
        end = offset + info
        return data[offset:end], end
    elif major == CBOR_TEXT:
        end = offset + info
        return data[offset:end].decode("utf-8"), end
    elif major == CBOR_ARRAY:
        result = []
        for _ in range(info):
            item, offset = _cbor_decode_item(data, offset)
            result.append(item)
        return result, offset
    elif major == CBOR_MAP:
        result = {}
        for _ in range(info):
            key, offset = _cbor_decode_item(data, offset)
            val, offset = _cbor_decode_item(data, offset)
            result[key] = val
        return result, offset
    elif major == CBOR_SIMPLE:
        if info == 20:
            return False, offset
        elif info == 21:
            return True, offset
        elif info == 22:
            return None, offset
        elif info == 25:
            raw = struct.unpack_from("!H", data, offset - 2)[0]
            sign = (raw >> 15) & 1
            exp = (raw >> 10) & 0x1F
            frac = raw & 0x3FF
            if exp == 0:
                val = ((-1) ** sign) * (2 ** -14) * (frac / 1024.0)
            elif exp == 31:
                val = float('-inf') if sign else float('inf')
                if frac != 0:
                    val = float('nan')
            else:
                val = ((-1) ** sign) * (2 ** (exp - 15)) * (1.0 + frac / 1024.0)
            return val, offset
        elif info == 26:
            val = struct.unpack_from("!f", data, offset - 4)[0]
            return val, offset
        elif info == 27:
            val = struct.unpack_from("!d", data, offset - 8)[0]
            return val, offset
    return None, offset


def cbor_decode(data: bytes):
    result, _ = _cbor_decode_item(data, 0)
    return result


# ============================================================================
# Compression Helpers
# ============================================================================

def compress_gzip(data: bytes) -> bytes:
    buf = io.BytesIO()
    with _gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as f:
        f.write(data)
    return buf.getvalue()


def decompress_gzip(data: bytes) -> bytes:
    buf = io.BytesIO(data)
    with _gzip.GzipFile(fileobj=buf, mode="rb") as f:
        return f.read()


# ============================================================================
# IFCXB Binary Container
# ============================================================================

IFCXB_MAGIC = b"XCXB"
IFCXB_VERSION = (1, 0)
IFCXB_FLAG_GZIP = 0x0001
IFCXB_FLAG_CBOR = 0x0002

CHUNK_HEADER = 0x01
CHUNK_TABLES = 0x02
CHUNK_ENTITIES = 0x03
CHUNK_BLOCKS = 0x04
CHUNK_OBJECTS = 0x05
CHUNK_EXTENSIONS = 0x06


def _make_chunk(chunk_type: int, data_raw, use_cbor: bool = True) -> bytes:
    if use_cbor:
        try:
            payload = cbor_encode(data_raw)
        except Exception:
            payload = json.dumps(data_raw).encode("utf-8")
    else:
        if isinstance(data_raw, bytes):
            payload = data_raw
        else:
            payload = json.dumps(data_raw).encode("utf-8")
    uncompressed_size = len(payload)
    compressed = compress_gzip(payload)
    compressed_size = len(compressed)
    header = struct.pack("<III", chunk_type, compressed_size, uncompressed_size)
    return header + compressed


def encode_ifcxb(ifcx_doc: dict) -> bytes:
    """Encode an IFCX document dict to IFCXB binary bytes."""
    chunks = []

    header_data = {
        "ifcx": ifcx_doc.get("ifcx", "1.0"),
        "header": ifcx_doc.get("header", {}),
    }
    header_json = json.dumps(header_data).encode("utf-8")
    chunks.append(_make_chunk(CHUNK_HEADER, header_json, use_cbor=False))

    for key, chunk_id in [
        ("tables", CHUNK_TABLES),
        ("entities", CHUNK_ENTITIES),
        ("blocks", CHUNK_BLOCKS),
        ("objects", CHUNK_OBJECTS),
        ("extensions", CHUNK_EXTENSIONS),
    ]:
        data = ifcx_doc.get(key)
        if data:
            chunks.append(_make_chunk(chunk_id, data, use_cbor=True))

    flags = IFCXB_FLAG_GZIP | IFCXB_FLAG_CBOR
    file_header = struct.pack(
        "<4sBBI",
        IFCXB_MAGIC,
        IFCXB_VERSION[0],
        IFCXB_VERSION[1],
        flags,
    )
    num_chunks = struct.pack("<I", len(chunks))
    return file_header + num_chunks + b"".join(chunks)


def decode_ifcxb(data: bytes) -> dict:
    """Decode IFCXB binary bytes to an IFCX document dict."""
    offset = 0
    magic = data[offset:offset + 4]
    offset += 4
    if magic != IFCXB_MAGIC:
        raise ValueError(f"Not a valid IFCXB file (bad magic: {repr(magic)})")

    ver_major, ver_minor = struct.unpack_from("BB", data, offset)
    offset += 2

    flags = struct.unpack_from("<I", data, offset)[0]
    offset += 4

    num_chunks = struct.unpack_from("<I", data, offset)[0]
    offset += 4

    doc = {"ifcx": "1.0"}

    chunk_map = {
        CHUNK_HEADER: "header",
        CHUNK_TABLES: "tables",
        CHUNK_ENTITIES: "entities",
        CHUNK_BLOCKS: "blocks",
        CHUNK_OBJECTS: "objects",
        CHUNK_EXTENSIONS: "extensions",
    }

    for _ in range(num_chunks):
        chunk_type, comp_size, uncomp_size = struct.unpack_from("<III", data, offset)
        offset += 12
        chunk_data = data[offset:offset + comp_size]
        offset += comp_size

        try:
            raw = decompress_gzip(chunk_data)
        except Exception:
            raw = chunk_data

        key = chunk_map.get(chunk_type)
        if key is None:
            continue

        if chunk_type == CHUNK_HEADER:
            parsed = json.loads(raw.decode("utf-8"))
            doc["ifcx"] = parsed.get("ifcx", "1.0")
            doc["header"] = parsed.get("header", {})
        else:
            try:
                parsed = json.loads(raw.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                parsed = cbor_decode(raw)
            doc[key] = parsed

    return doc


# ============================================================================
# IFCX JSON
# ============================================================================

def encode_ifcx_json(ifcx_doc: dict, indent: int = 2) -> str:
    return json.dumps(ifcx_doc, indent=indent, ensure_ascii=False)


def decode_ifcx_json(text: str) -> dict:
    return json.loads(text)


# ============================================================================
# IfcxDocument - In-memory document model
# ============================================================================

class IfcxDocument:
    """In-memory IFCX document for building and reading IFCX files."""

    def __init__(self):
        self.ifcx_version = "1.0"
        self.header = {
            "description": "",
            "author": "",
            "organization": "",
            "application": "Blender IFCX Addon",
            "schema": "IFCX_1_0",
        }
        self.tables = {
            "layers": {},
            "linetypes": {},
            "styles": {},
        }
        self.entities = []
        self.blocks = {}
        self.objects = {}
        self.extensions = {}

    # --- Layer management ---

    def add_layer(self, name: str, color: int = 7, linetype: str = "Continuous",
                  frozen: bool = False, off: bool = False):
        self.tables.setdefault("layers", {})[name] = {
            "color": color,
            "linetype": linetype,
            "frozen": frozen,
            "off": off,
        }

    def get_layers(self) -> dict:
        return self.tables.get("layers", {})

    # --- Entity management ---

    def add_entity(self, entity: dict):
        self.entities.append(entity)

    def add_line(self, start: list, end: list, layer: str = "0", color: int = None):
        e = {"type": "LINE", "start": start, "end": end, "layer": layer}
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_circle(self, center: list, radius: float, layer: str = "0",
                   color: int = None):
        e = {"type": "CIRCLE", "center": center, "radius": radius, "layer": layer}
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_arc(self, center: list, radius: float, start_angle: float,
                end_angle: float, layer: str = "0", color: int = None):
        e = {
            "type": "ARC", "center": center, "radius": radius,
            "start_angle": start_angle, "end_angle": end_angle, "layer": layer,
        }
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_lwpolyline(self, points: list, closed: bool = False,
                       layer: str = "0", color: int = None, bulges: list = None):
        e = {
            "type": "LWPOLYLINE", "points": points, "closed": closed,
            "layer": layer,
        }
        if color is not None:
            e["color"] = color
        if bulges:
            e["bulges"] = bulges
        self.entities.append(e)

    def add_spline(self, control_points: list, degree: int = 3,
                   knots: list = None, weights: list = None,
                   layer: str = "0", color: int = None):
        e = {
            "type": "SPLINE", "control_points": control_points,
            "degree": degree, "layer": layer,
        }
        if knots:
            e["knots"] = knots
        if weights:
            e["weights"] = weights
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_text(self, text: str, position: list, height: float = 2.5,
                 rotation: float = 0.0, layer: str = "0", color: int = None):
        e = {
            "type": "TEXT", "text": text, "position": position,
            "height": height, "rotation": rotation, "layer": layer,
        }
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_mtext(self, text: str, position: list, height: float = 2.5,
                  width: float = 100.0, layer: str = "0", color: int = None):
        e = {
            "type": "MTEXT", "text": text, "position": position,
            "height": height, "width": width, "layer": layer,
        }
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_point(self, position: list, layer: str = "0", color: int = None):
        e = {"type": "POINT", "position": position, "layer": layer}
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_solid(self, vertices: list, layer: str = "0", color: int = None):
        e = {"type": "SOLID", "vertices": vertices, "layer": layer}
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_3dface(self, vertices: list, layer: str = "0", color: int = None):
        e = {"type": "3DFACE", "vertices": vertices, "layer": layer}
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_ellipse(self, center: list, major_axis: list, ratio: float,
                    start_param: float = 0.0, end_param: float = 2 * math.pi,
                    layer: str = "0", color: int = None):
        e = {
            "type": "ELLIPSE", "center": center, "major_axis": major_axis,
            "ratio": ratio, "start_param": start_param,
            "end_param": end_param, "layer": layer,
        }
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_insert(self, block_name: str, position: list,
                   scale: list = None, rotation: float = 0.0,
                   layer: str = "0"):
        e = {
            "type": "INSERT", "block": block_name, "position": position,
            "rotation": rotation, "layer": layer,
        }
        if scale:
            e["scale"] = scale
        self.entities.append(e)

    def add_hatch(self, boundary_paths: list, pattern: str = "SOLID",
                  color: int = None, layer: str = "0"):
        e = {
            "type": "HATCH", "boundary_paths": boundary_paths,
            "pattern": pattern, "layer": layer,
        }
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    def add_mesh(self, vertices: list, faces: list, layer: str = "0",
                 color: int = None):
        e = {
            "type": "MESH", "vertices": vertices, "faces": faces,
            "layer": layer,
        }
        if color is not None:
            e["color"] = color
        self.entities.append(e)

    # --- Block management ---

    def add_block(self, name: str, entities: list,
                  base_point: list = None):
        self.blocks[name] = {
            "base_point": base_point or [0, 0, 0],
            "entities": entities,
        }

    # --- Serialization ---

    def to_dict(self) -> dict:
        doc = {
            "ifcx": self.ifcx_version,
            "header": self.header,
            "tables": self.tables,
            "entities": self.entities,
        }
        if self.blocks:
            doc["blocks"] = self.blocks
        if self.objects:
            doc["objects"] = self.objects
        if self.extensions:
            doc["extensions"] = self.extensions
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "IfcxDocument":
        doc = cls()
        doc.ifcx_version = data.get("ifcx", "1.0")
        doc.header = data.get("header", doc.header)
        doc.tables = data.get("tables", doc.tables)
        doc.entities = data.get("entities", [])
        doc.blocks = data.get("blocks", {})
        doc.objects = data.get("objects", {})
        doc.extensions = data.get("extensions", {})
        return doc

    def save_ifcx(self, filepath: str):
        text = encode_ifcx_json(self.to_dict())
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)

    def save_ifcxb(self, filepath: str):
        data = encode_ifcxb(self.to_dict())
        with open(filepath, "wb") as f:
            f.write(data)

    @classmethod
    def load_ifcx(cls, filepath: str) -> "IfcxDocument":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)

    @classmethod
    def load_ifcxb(cls, filepath: str) -> "IfcxDocument":
        with open(filepath, "rb") as f:
            raw = f.read()
        data = decode_ifcxb(raw)
        return cls.from_dict(data)


# ============================================================================
# DXF Tokenizer and Parser (simplified, for import)
# ============================================================================

class DxfToken:
    __slots__ = ("code", "value")

    def __init__(self, code: int, value: str):
        self.code = code
        self.value = value


def tokenize_dxf(filepath: str) -> list[DxfToken]:
    """Tokenize a DXF file into (group_code, value) pairs."""
    tokens = []
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    i = 0
    while i < len(lines) - 1:
        try:
            code = int(lines[i].strip())
        except ValueError:
            i += 1
            continue
        value = lines[i + 1].rstrip("\n").rstrip("\r")
        # Strip leading space only for non-string codes
        if code not in (1, 2, 3, 6, 7, 8, 100, 999):
            value = value.strip()
        else:
            value = value.strip()
        tokens.append(DxfToken(code, value))
        i += 2
    return tokens


def _float_val(val: str) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _int_val(val: str) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def parse_dxf(filepath: str) -> IfcxDocument:
    """Parse a DXF file and return an IfcxDocument."""
    tokens = tokenize_dxf(filepath)
    doc = IfcxDocument()
    doc.header["application"] = "DXF Import (Blender IFCX Addon)"

    # Find ENTITIES section
    i = 0
    n = len(tokens)

    # Parse TABLES section for layers
    while i < n:
        if tokens[i].code == 0 and tokens[i].value == "TABLE":
            i += 1
            if i < n and tokens[i].code == 2 and tokens[i].value == "LAYER":
                i += 1
                i = _parse_layer_table(tokens, i, doc)
                continue
        if tokens[i].code == 0 and tokens[i].value == "SECTION":
            i += 1
            if i < n and tokens[i].code == 2 and tokens[i].value == "ENTITIES":
                i += 1
                i = _parse_entities_section(tokens, i, doc)
                continue
            if i < n and tokens[i].code == 2 and tokens[i].value == "BLOCKS":
                i += 1
                i = _parse_blocks_section(tokens, i, doc)
                continue
        i += 1

    return doc


def _parse_layer_table(tokens: list, i: int, doc: IfcxDocument) -> int:
    n = len(tokens)
    while i < n:
        if tokens[i].code == 0:
            if tokens[i].value == "ENDTAB":
                return i + 1
            if tokens[i].value == "LAYER":
                i += 1
                name = "0"
                color = 7
                linetype = "Continuous"
                frozen = False
                off = False
                while i < n and tokens[i].code != 0:
                    if tokens[i].code == 2:
                        name = tokens[i].value
                    elif tokens[i].code == 62:
                        c = _int_val(tokens[i].value)
                        if c < 0:
                            off = True
                            c = abs(c)
                        color = c
                    elif tokens[i].code == 6:
                        linetype = tokens[i].value
                    elif tokens[i].code == 70:
                        flags = _int_val(tokens[i].value)
                        frozen = bool(flags & 1)
                    i += 1
                doc.add_layer(name, color, linetype, frozen, off)
                continue
        i += 1
    return i


def _parse_entities_section(tokens: list, i: int, doc: IfcxDocument) -> int:
    n = len(tokens)
    while i < n:
        if tokens[i].code == 0:
            etype = tokens[i].value
            if etype == "ENDSEC":
                return i + 1
            i += 1
            i = _parse_entity(tokens, i, etype, doc)
            continue
        i += 1
    return i


def _parse_blocks_section(tokens: list, i: int, doc: IfcxDocument) -> int:
    n = len(tokens)
    while i < n:
        if tokens[i].code == 0 and tokens[i].value == "ENDSEC":
            return i + 1
        if tokens[i].code == 0 and tokens[i].value == "BLOCK":
            i += 1
            block_name = ""
            base_point = [0.0, 0.0, 0.0]
            block_entities = []

            # Read block header
            while i < n and tokens[i].code != 0:
                if tokens[i].code == 2:
                    block_name = tokens[i].value
                elif tokens[i].code == 10:
                    base_point[0] = _float_val(tokens[i].value)
                elif tokens[i].code == 20:
                    base_point[1] = _float_val(tokens[i].value)
                elif tokens[i].code == 30:
                    base_point[2] = _float_val(tokens[i].value)
                i += 1

            # Read block entities until ENDBLK
            temp_doc = IfcxDocument()
            while i < n:
                if tokens[i].code == 0:
                    if tokens[i].value == "ENDBLK":
                        i += 1
                        # Skip ENDBLK properties
                        while i < n and tokens[i].code != 0:
                            i += 1
                        break
                    etype = tokens[i].value
                    i += 1
                    i = _parse_entity(tokens, i, etype, temp_doc)
                    continue
                i += 1

            if block_name and not block_name.startswith("*"):
                doc.add_block(block_name, temp_doc.entities, base_point)
            continue
        i += 1
    return i


def _parse_entity(tokens: list, i: int, etype: str, doc: IfcxDocument) -> int:
    """Parse a single DXF entity starting at token index i (after entity type).
    Returns the index of the next entity's type token."""
    n = len(tokens)
    props = {}
    multi_vals = {}  # For entities with repeated group codes

    while i < n and tokens[i].code != 0:
        code = tokens[i].code
        val = tokens[i].value

        # Store multiple values for polyline vertices etc.
        if code in multi_vals:
            if not isinstance(multi_vals[code], list):
                multi_vals[code] = [multi_vals[code]]
            multi_vals[code].append(val)
        elif code in props:
            multi_vals[code] = [props[code], val]
            props[code] = multi_vals[code]
        else:
            props[code] = val

        i += 1

    layer = props.get(8, "0")
    color = _int_val(props.get(62, "256")) if 62 in props else None

    if etype == "LINE":
        start = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        end = [
            _float_val(props.get(11, "0")),
            _float_val(props.get(21, "0")),
            _float_val(props.get(31, "0")),
        ]
        doc.add_line(start, end, layer, color)

    elif etype == "CIRCLE":
        center = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        radius = _float_val(props.get(40, "0"))
        doc.add_circle(center, radius, layer, color)

    elif etype == "ARC":
        center = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        radius = _float_val(props.get(40, "0"))
        start_angle = _float_val(props.get(50, "0"))
        end_angle = _float_val(props.get(51, "360"))
        doc.add_arc(center, radius, start_angle, end_angle, layer, color)

    elif etype == "ELLIPSE":
        center = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        major_axis = [
            _float_val(props.get(11, "1")),
            _float_val(props.get(21, "0")),
            _float_val(props.get(31, "0")),
        ]
        ratio = _float_val(props.get(40, "0.5"))
        start_param = _float_val(props.get(41, "0"))
        end_param = _float_val(props.get(42, str(2 * math.pi)))
        doc.add_ellipse(center, major_axis, ratio, start_param, end_param,
                        layer, color)

    elif etype == "LWPOLYLINE":
        # Collect all vertices from repeated group codes 10/20/42
        x_vals = props.get(10, "0")
        y_vals = props.get(20, "0")

        if not isinstance(x_vals, list):
            x_vals = [x_vals]
        if not isinstance(y_vals, list):
            y_vals = [y_vals]

        points = []
        for j in range(len(x_vals)):
            x = _float_val(x_vals[j]) if j < len(x_vals) else 0.0
            y = _float_val(y_vals[j]) if j < len(y_vals) else 0.0
            points.append([x, y, 0.0])

        closed = bool(_int_val(props.get(70, "0")) & 1)

        # Bulge values
        bulge_vals = props.get(42)
        bulges = None
        if bulge_vals is not None:
            if not isinstance(bulge_vals, list):
                bulge_vals = [bulge_vals]
            bulges = [_float_val(b) for b in bulge_vals]

        doc.add_lwpolyline(points, closed, layer, color, bulges)

    elif etype == "SPLINE":
        # Collect control points
        x_vals = props.get(10, "0")
        y_vals = props.get(20, "0")
        z_vals = props.get(30, "0")

        if not isinstance(x_vals, list):
            x_vals = [x_vals]
        if not isinstance(y_vals, list):
            y_vals = [y_vals]
        if not isinstance(z_vals, list):
            z_vals = [z_vals]

        control_points = []
        for j in range(len(x_vals)):
            x = _float_val(x_vals[j]) if j < len(x_vals) else 0.0
            y = _float_val(y_vals[j]) if j < len(y_vals) else 0.0
            z = _float_val(z_vals[j]) if j < len(z_vals) else 0.0
            control_points.append([x, y, z])

        degree = _int_val(props.get(71, "3"))

        knot_vals = props.get(40)
        knots = None
        if knot_vals is not None:
            if not isinstance(knot_vals, list):
                knot_vals = [knot_vals]
            knots = [_float_val(k) for k in knot_vals]

        weight_vals = props.get(41)
        weights = None
        if weight_vals is not None:
            if not isinstance(weight_vals, list):
                weight_vals = [weight_vals]
            weights = [_float_val(w) for w in weight_vals]

        doc.add_spline(control_points, degree, knots, weights, layer, color)

    elif etype in ("TEXT", "ATTDEF", "ATTRIB"):
        text = props.get(1, "")
        position = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        height = _float_val(props.get(40, "2.5"))
        rotation = _float_val(props.get(50, "0"))
        doc.add_text(text, position, height, rotation, layer, color)

    elif etype == "MTEXT":
        text = props.get(1, "")
        # MTEXT can have continuation in group 3
        extra = props.get(3, "")
        if isinstance(extra, list):
            text = "".join(extra) + text
        elif extra:
            text = extra + text
        position = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        height = _float_val(props.get(40, "2.5"))
        width = _float_val(props.get(41, "100"))
        doc.add_mtext(text, position, height, width, layer, color)

    elif etype == "POINT":
        position = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        doc.add_point(position, layer, color)

    elif etype in ("SOLID", "TRACE"):
        verts = []
        for idx in range(4):
            code_x = 10 + idx
            code_y = 20 + idx
            code_z = 30 + idx
            if str(code_x) not in props and code_x not in props:
                if idx >= 3:
                    break
            x = _float_val(props.get(code_x, props.get(str(code_x), "0")))
            y = _float_val(props.get(code_y, props.get(str(code_y), "0")))
            z = _float_val(props.get(code_z, props.get(str(code_z), "0")))
            verts.append([x, y, z])
        doc.add_solid(verts, layer, color)

    elif etype == "3DFACE":
        verts = []
        for idx in range(4):
            code_x = 10 + idx
            code_y = 20 + idx
            code_z = 30 + idx
            x = _float_val(props.get(code_x, props.get(str(code_x), "0")))
            y = _float_val(props.get(code_y, props.get(str(code_y), "0")))
            z = _float_val(props.get(code_z, props.get(str(code_z), "0")))
            verts.append([x, y, z])
        # Remove duplicate 4th vertex if same as 3rd
        if len(verts) == 4 and verts[3] == verts[2]:
            verts = verts[:3]
        doc.add_3dface(verts, layer, color)

    elif etype == "INSERT":
        block_name = props.get(2, "")
        position = [
            _float_val(props.get(10, "0")),
            _float_val(props.get(20, "0")),
            _float_val(props.get(30, "0")),
        ]
        scale = [
            _float_val(props.get(41, "1")),
            _float_val(props.get(42, "1")),
            _float_val(props.get(43, "1")),
        ]
        rotation = _float_val(props.get(50, "0"))
        doc.add_insert(block_name, position, scale, rotation, layer)

    elif etype == "HATCH":
        # Simplified hatch import - just create the entity record
        e = {"type": "HATCH", "layer": layer, "pattern": props.get(2, "SOLID"),
             "boundary_paths": []}
        if color is not None:
            e["color"] = color
        doc.add_entity(e)

    return i


# ============================================================================
# DXF Writer (for export)
# ============================================================================

class DxfWriter:
    """Minimal DXF writer for exporting IFCX entities to DXF format."""

    def __init__(self):
        self._lines: list[str] = []
        self._handle = 100  # Start handle counter

    def _next_handle(self) -> str:
        h = format(self._handle, "X")
        self._handle += 1
        return h

    def _tag(self, code: int, value):
        self._lines.append(f"{code:>3}")
        self._lines.append(str(value))

    def write(self, filepath: str, doc: IfcxDocument):
        self._lines = []

        # HEADER section
        self._tag(0, "SECTION")
        self._tag(2, "HEADER")
        self._tag(9, "$ACADVER")
        self._tag(1, "AC1027")  # AutoCAD 2013
        self._tag(9, "$INSUNITS")
        self._tag(70, 4)  # Millimeters
        self._tag(0, "ENDSEC")

        # TABLES section
        self._tag(0, "SECTION")
        self._tag(2, "TABLES")
        self._write_layer_table(doc)
        self._tag(0, "ENDSEC")

        # BLOCKS section
        self._tag(0, "SECTION")
        self._tag(2, "BLOCKS")
        self._write_blocks(doc)
        self._tag(0, "ENDSEC")

        # ENTITIES section
        self._tag(0, "SECTION")
        self._tag(2, "ENTITIES")
        for entity in doc.entities:
            self._write_entity(entity)
        self._tag(0, "ENDSEC")

        # EOF
        self._tag(0, "EOF")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(self._lines) + "\n")

    def _write_layer_table(self, doc: IfcxDocument):
        layers = doc.get_layers()
        self._tag(0, "TABLE")
        self._tag(2, "LAYER")
        self._tag(70, len(layers) + 1)

        # Default layer 0
        self._tag(0, "LAYER")
        self._tag(5, self._next_handle())
        self._tag(2, "0")
        self._tag(70, 0)
        self._tag(62, 7)
        self._tag(6, "Continuous")

        for name, props in layers.items():
            if name == "0":
                continue
            self._tag(0, "LAYER")
            self._tag(5, self._next_handle())
            self._tag(2, name)
            flags = 0
            if props.get("frozen"):
                flags |= 1
            self._tag(70, flags)
            color = props.get("color", 7)
            if props.get("off"):
                color = -abs(color)
            self._tag(62, color)
            self._tag(6, props.get("linetype", "Continuous"))

        self._tag(0, "ENDTAB")

    def _write_blocks(self, doc: IfcxDocument):
        # Model space and paper space blocks
        for bname in ("*Model_Space", "*Paper_Space"):
            self._tag(0, "BLOCK")
            self._tag(5, self._next_handle())
            self._tag(8, "0")
            self._tag(2, bname)
            self._tag(70, 0)
            self._tag(10, 0.0)
            self._tag(20, 0.0)
            self._tag(30, 0.0)
            self._tag(0, "ENDBLK")
            self._tag(5, self._next_handle())
            self._tag(8, "0")

        # User blocks
        for name, block in doc.blocks.items():
            bp = block.get("base_point", [0, 0, 0])
            self._tag(0, "BLOCK")
            self._tag(5, self._next_handle())
            self._tag(8, "0")
            self._tag(2, name)
            self._tag(70, 0)
            self._tag(10, bp[0])
            self._tag(20, bp[1])
            self._tag(30, bp[2] if len(bp) > 2 else 0.0)
            for entity in block.get("entities", []):
                self._write_entity(entity)
            self._tag(0, "ENDBLK")
            self._tag(5, self._next_handle())
            self._tag(8, "0")

    def _write_entity(self, entity: dict):
        etype = entity.get("type", "")
        layer = entity.get("layer", "0")
        color = entity.get("color")

        if etype == "LINE":
            self._tag(0, "LINE")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            s = entity.get("start", [0, 0, 0])
            e = entity.get("end", [0, 0, 0])
            self._tag(10, s[0])
            self._tag(20, s[1])
            self._tag(30, s[2] if len(s) > 2 else 0.0)
            self._tag(11, e[0])
            self._tag(21, e[1])
            self._tag(31, e[2] if len(e) > 2 else 0.0)

        elif etype == "CIRCLE":
            self._tag(0, "CIRCLE")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            c = entity.get("center", [0, 0, 0])
            self._tag(10, c[0])
            self._tag(20, c[1])
            self._tag(30, c[2] if len(c) > 2 else 0.0)
            self._tag(40, entity.get("radius", 1.0))

        elif etype == "ARC":
            self._tag(0, "ARC")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            c = entity.get("center", [0, 0, 0])
            self._tag(10, c[0])
            self._tag(20, c[1])
            self._tag(30, c[2] if len(c) > 2 else 0.0)
            self._tag(40, entity.get("radius", 1.0))
            self._tag(50, entity.get("start_angle", 0.0))
            self._tag(51, entity.get("end_angle", 360.0))

        elif etype == "LWPOLYLINE":
            self._tag(0, "LWPOLYLINE")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            points = entity.get("points", [])
            self._tag(90, len(points))
            flags = 1 if entity.get("closed") else 0
            self._tag(70, flags)
            bulges = entity.get("bulges", [])
            for j, pt in enumerate(points):
                self._tag(10, pt[0])
                self._tag(20, pt[1] if len(pt) > 1 else 0.0)
                if j < len(bulges):
                    self._tag(42, bulges[j])

        elif etype == "SPLINE":
            self._tag(0, "SPLINE")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            degree = entity.get("degree", 3)
            self._tag(71, degree)
            cps = entity.get("control_points", [])
            knots = entity.get("knots", [])
            self._tag(72, len(knots))
            self._tag(73, len(cps))
            for k in knots:
                self._tag(40, k)
            for cp in cps:
                self._tag(10, cp[0])
                self._tag(20, cp[1] if len(cp) > 1 else 0.0)
                self._tag(30, cp[2] if len(cp) > 2 else 0.0)

        elif etype == "TEXT":
            self._tag(0, "TEXT")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            pos = entity.get("position", [0, 0, 0])
            self._tag(10, pos[0])
            self._tag(20, pos[1])
            self._tag(30, pos[2] if len(pos) > 2 else 0.0)
            self._tag(40, entity.get("height", 2.5))
            self._tag(1, entity.get("text", ""))
            rotation = entity.get("rotation", 0.0)
            if rotation != 0.0:
                self._tag(50, rotation)

        elif etype == "MTEXT":
            self._tag(0, "MTEXT")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            pos = entity.get("position", [0, 0, 0])
            self._tag(10, pos[0])
            self._tag(20, pos[1])
            self._tag(30, pos[2] if len(pos) > 2 else 0.0)
            self._tag(40, entity.get("height", 2.5))
            self._tag(41, entity.get("width", 100.0))
            self._tag(1, entity.get("text", ""))

        elif etype == "POINT":
            self._tag(0, "POINT")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            pos = entity.get("position", [0, 0, 0])
            self._tag(10, pos[0])
            self._tag(20, pos[1])
            self._tag(30, pos[2] if len(pos) > 2 else 0.0)

        elif etype in ("SOLID", "TRACE"):
            self._tag(0, etype)
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            verts = entity.get("vertices", [])
            for j, v in enumerate(verts[:4]):
                self._tag(10 + j, v[0])
                self._tag(20 + j, v[1] if len(v) > 1 else 0.0)
                self._tag(30 + j, v[2] if len(v) > 2 else 0.0)

        elif etype == "3DFACE":
            self._tag(0, "3DFACE")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            verts = entity.get("vertices", [])
            # Pad to 4 vertices
            while len(verts) < 4:
                verts.append(verts[-1] if verts else [0, 0, 0])
            for j, v in enumerate(verts[:4]):
                self._tag(10 + j, v[0])
                self._tag(20 + j, v[1] if len(v) > 1 else 0.0)
                self._tag(30 + j, v[2] if len(v) > 2 else 0.0)

        elif etype == "ELLIPSE":
            self._tag(0, "ELLIPSE")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            if color is not None:
                self._tag(62, color)
            c = entity.get("center", [0, 0, 0])
            self._tag(10, c[0])
            self._tag(20, c[1])
            self._tag(30, c[2] if len(c) > 2 else 0.0)
            ma = entity.get("major_axis", [1, 0, 0])
            self._tag(11, ma[0])
            self._tag(21, ma[1] if len(ma) > 1 else 0.0)
            self._tag(31, ma[2] if len(ma) > 2 else 0.0)
            self._tag(40, entity.get("ratio", 0.5))
            self._tag(41, entity.get("start_param", 0.0))
            self._tag(42, entity.get("end_param", 2 * math.pi))

        elif etype == "INSERT":
            self._tag(0, "INSERT")
            self._tag(5, self._next_handle())
            self._tag(8, layer)
            self._tag(2, entity.get("block", ""))
            pos = entity.get("position", [0, 0, 0])
            self._tag(10, pos[0])
            self._tag(20, pos[1])
            self._tag(30, pos[2] if len(pos) > 2 else 0.0)
            scale = entity.get("scale", [1, 1, 1])
            self._tag(41, scale[0])
            self._tag(42, scale[1] if len(scale) > 1 else scale[0])
            self._tag(43, scale[2] if len(scale) > 2 else scale[0])
            self._tag(50, entity.get("rotation", 0.0))


# ============================================================================
# DGN V7 Parser (simplified, for import)
# ============================================================================

# DGN element types
DGN_LINE = 3
DGN_LINE_STRING = 4
DGN_SHAPE = 6
DGN_CURVE = 11
DGN_TEXT = 17
DGN_ARC = 16
DGN_ELLIPSE = 15
DGN_BSPLINE = 21


def parse_dgn(filepath: str) -> IfcxDocument:
    """Parse a DGN V7/V8 file (simplified binary parser).

    This is a best-effort parser that handles common V7 elements.
    V8 DGN files use a different format and may not be fully supported.
    """
    doc = IfcxDocument()
    doc.header["application"] = "DGN Import (Blender IFCX Addon)"

    try:
        with open(filepath, "rb") as f:
            data = f.read()
    except IOError:
        return doc

    if len(data) < 32:
        return doc

    # Try to detect V8 format (has signature bytes)
    # V8 DGN is actually an OLE compound file
    if data[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        # V8 DGN (OLE format) - not supported in this simplified parser
        return doc

    offset = 0
    uor_per_mm = 1000.0  # Default UOR scale

    while offset + 4 <= len(data):
        if offset + 36 > len(data):
            break

        try:
            # DGN V7 element header: type/level (2 bytes), length (2 bytes)
            type_level = struct.unpack_from("<H", data, offset)[0]
            elem_type = (type_level >> 8) & 0x7F
            level = type_level & 0x3F
            word_length = struct.unpack_from("<H", data, offset + 2)[0]
            elem_length = word_length * 2

            if elem_length < 4 or elem_length > 65536:
                offset += 4
                continue

            elem_data = data[offset:offset + elem_length + 4]

            layer_name = f"Level_{level}"
            if layer_name not in doc.get_layers():
                doc.add_layer(layer_name)

            if elem_type == DGN_LINE and len(elem_data) >= 36:
                # Line element: start point at offset 16, end point at offset 28
                x1 = struct.unpack_from("<i", elem_data, 16)[0] / uor_per_mm
                y1 = struct.unpack_from("<i", elem_data, 20)[0] / uor_per_mm
                z1 = struct.unpack_from("<i", elem_data, 24)[0] / uor_per_mm
                x2 = struct.unpack_from("<i", elem_data, 28)[0] / uor_per_mm
                y2 = struct.unpack_from("<i", elem_data, 32)[0] / uor_per_mm
                z2 = 0.0
                if len(elem_data) >= 40:
                    z2 = struct.unpack_from("<i", elem_data, 36)[0] / uor_per_mm
                doc.add_line([x1, y1, z1], [x2, y2, z2], layer_name)

            elif elem_type == DGN_LINE_STRING and len(elem_data) >= 28:
                # Line string: number of vertices at offset 16
                if len(elem_data) >= 20:
                    num_verts = struct.unpack_from("<H", elem_data, 16)[0]
                    points = []
                    voff = 18
                    for _ in range(num_verts):
                        if voff + 12 > len(elem_data):
                            break
                        x = struct.unpack_from("<i", elem_data, voff)[0] / uor_per_mm
                        y = struct.unpack_from("<i", elem_data, voff + 4)[0] / uor_per_mm
                        z = struct.unpack_from("<i", elem_data, voff + 8)[0] / uor_per_mm
                        points.append([x, y, z])
                        voff += 12
                    if points:
                        doc.add_lwpolyline(points, False, layer_name)

            elif elem_type == DGN_SHAPE and len(elem_data) >= 28:
                # Shape: similar to line string but closed
                if len(elem_data) >= 20:
                    num_verts = struct.unpack_from("<H", elem_data, 16)[0]
                    points = []
                    voff = 18
                    for _ in range(num_verts):
                        if voff + 12 > len(elem_data):
                            break
                        x = struct.unpack_from("<i", elem_data, voff)[0] / uor_per_mm
                        y = struct.unpack_from("<i", elem_data, voff + 4)[0] / uor_per_mm
                        z = struct.unpack_from("<i", elem_data, voff + 8)[0] / uor_per_mm
                        points.append([x, y, z])
                        voff += 12
                    if points:
                        doc.add_lwpolyline(points, True, layer_name)

            elif elem_type == DGN_TEXT and len(elem_data) >= 28:
                # Text element
                x = struct.unpack_from("<i", elem_data, 16)[0] / uor_per_mm
                y = struct.unpack_from("<i", elem_data, 20)[0] / uor_per_mm
                z = 0.0
                # Text string starts after the coordinate data
                text_offset = 28
                if text_offset < len(elem_data):
                    text_bytes = elem_data[text_offset:]
                    try:
                        text = text_bytes.decode("ascii", errors="replace").rstrip("\x00")
                    except Exception:
                        text = ""
                    if text.strip():
                        doc.add_text(text.strip(), [x, y, z], 2.5, 0.0, layer_name)

            offset += elem_length + 4

        except (struct.error, IndexError):
            offset += 4
            continue

    return doc
