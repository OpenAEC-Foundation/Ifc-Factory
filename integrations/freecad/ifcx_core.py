"""Self-contained IFCX core library for FreeCAD addon.

Provides IfcxDocument, IFCXB binary encoder/decoder, DXF writer,
and color utilities. No external dependencies required beyond the
Python standard library.
"""

from __future__ import annotations

import json
import struct
import gzip
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional


# ---------------------------------------------------------------------------
# ACI (AutoCAD Color Index) to RGB mapping -- standard 256-color table
# Only the first 10 standard colors shown; full table follows the DXF spec.
# ---------------------------------------------------------------------------

ACI_COLORS = {
    0: (0, 0, 0),          # BYBLOCK
    1: (255, 0, 0),        # Red
    2: (255, 255, 0),      # Yellow
    3: (0, 255, 0),        # Green
    4: (0, 255, 255),      # Cyan
    5: (0, 0, 255),        # Blue
    6: (255, 0, 255),      # Magenta
    7: (255, 255, 255),    # White/Black
    8: (128, 128, 128),    # Dark gray
    9: (192, 192, 192),    # Light gray
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


def aci_to_rgb(aci: int) -> tuple[float, float, float]:
    """Convert ACI color index to (r, g, b) floats in 0-1 range."""
    r, g, b = ACI_COLORS.get(aci, (255, 255, 255))
    return (r / 255.0, g / 255.0, b / 255.0)


def color_dict_to_rgb(color: dict) -> tuple[float, float, float]:
    """Convert IFCX color dict {r, g, b} (0-1) to FreeCAD-compatible tuple."""
    return (
        float(color.get("r", 1.0)),
        float(color.get("g", 1.0)),
        float(color.get("b", 1.0)),
    )


def rgb_to_color_dict(r: float, g: float, b: float) -> dict:
    """Convert RGB floats (0-1) to IFCX color dict."""
    return {"r": round(r, 4), "g": round(g, 4), "b": round(b, 4)}


def rgb_to_aci(r: float, g: float, b: float) -> int:
    """Find nearest ACI color index for an RGB value."""
    best_aci = 7
    best_dist = float("inf")
    ri, gi, bi = int(r * 255), int(g * 255), int(b * 255)
    for aci, (ar, ag, ab) in ACI_COLORS.items():
        if aci == 0:
            continue
        dist = (ri - ar) ** 2 + (gi - ag) ** 2 + (bi - ab) ** 2
        if dist < best_dist:
            best_dist = dist
            best_aci = aci
    return best_aci


# ---------------------------------------------------------------------------
# IfcxDocument
# ---------------------------------------------------------------------------

@dataclass
class IfcxDocument:
    """IFCX drawing document."""

    ifcx: str = "1.0"
    header: dict[str, Any] = field(default_factory=lambda: {
        "units": {"measurement": "metric", "linear": "millimeters"}
    })
    tables: dict[str, Any] = field(default_factory=lambda: {
        "layers": {"0": {}},
        "linetypes": {},
        "textStyles": {},
        "dimStyles": {},
    })
    blocks: dict[str, Any] = field(default_factory=dict)
    entities: list[dict[str, Any]] = field(default_factory=list)
    objects: list[dict[str, Any]] = field(default_factory=list)
    extensions: dict[str, Any] = field(default_factory=dict)

    _next_handle: int = field(default=1, repr=False)

    def alloc_handle(self) -> str:
        handle = format(self._next_handle, "X")
        self._next_handle += 1
        return handle

    def add_layer(self, name: str, **props: Any) -> None:
        self.tables.setdefault("layers", {})[name] = props

    def add_linetype(self, name: str, **props: Any) -> None:
        self.tables.setdefault("linetypes", {})[name] = props

    def add_text_style(self, name: str, **props: Any) -> None:
        self.tables.setdefault("textStyles", {})[name] = props

    def add_dim_style(self, name: str, **props: Any) -> None:
        self.tables.setdefault("dimStyles", {})[name] = props

    def add_entity(self, entity: dict[str, Any]) -> str:
        handle = self.alloc_handle()
        entity["handle"] = handle
        self.entities.append(entity)
        return handle

    def add_block(self, name: str, **props: Any) -> None:
        props["name"] = name
        self.blocks[name] = props

    def find_by_type(self, entity_type: str) -> list[dict[str, Any]]:
        return [e for e in self.entities if e.get("type") == entity_type]

    def find_by_layer(self, layer: str) -> list[dict[str, Any]]:
        return [e for e in self.entities if e.get("layer") == layer]

    def get_by_handle(self, handle: str) -> Optional[dict[str, Any]]:
        for e in self.entities:
            if e.get("handle") == handle:
                return e
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "ifcx": self.ifcx,
            "header": self.header,
            "tables": self.tables,
            "blocks": self.blocks,
            "entities": self.entities,
            "objects": self.objects,
            "extensions": self.extensions,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "IfcxDocument":
        return cls(
            ifcx=data.get("ifcx", "1.0"),
            header=data.get("header", {}),
            tables=data.get("tables", {}),
            blocks=data.get("blocks", {}),
            entities=data.get("entities", []),
            objects=data.get("objects", []),
            extensions=data.get("extensions", {}),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "IfcxDocument":
        return cls.from_dict(json.loads(json_str))


# ---------------------------------------------------------------------------
# IFCXB binary encoder / decoder  (GLB-style chunked container)
# Uses CBOR if available, otherwise falls back to JSON.
# Uses zstandard if available, otherwise gzip.
# ---------------------------------------------------------------------------

MAGIC = b"IFCX"
BIN_VERSION = 0x00010000
CHUNK_META = b"META"
CHUNK_DATA = b"DATA"

COMPRESS_NONE = 0
COMPRESS_ZSTD = 1
COMPRESS_GZIP = 4   # Fallback ID we use when zstd not available


def _pad8(data: bytes) -> bytes:
    remainder = len(data) % 8
    if remainder:
        data += b"\x00" * (8 - remainder)
    return data


class IfcxbEncoder:
    """Encodes IfcxDocument to IFCXB binary format."""

    @staticmethod
    def encode(doc: IfcxDocument, compression: int = COMPRESS_ZSTD, level: int = 3) -> bytes:
        doc_dict = doc.to_dict()

        string_table = IfcxbEncoder._build_string_table(doc)

        meta = {
            "ifcx": doc_dict["ifcx"],
            "header": doc_dict["header"],
            "tables": doc_dict["tables"],
            "blocks": doc_dict["blocks"],
            "objects": doc_dict["objects"],
            "extensions": doc_dict["extensions"],
            "stringTable": string_table,
        }
        entities = doc_dict["entities"]

        try:
            import cbor2
            meta_raw = cbor2.dumps(meta)
            data_raw = cbor2.dumps(entities)
        except ImportError:
            meta_raw = json.dumps(meta, separators=(",", ":")).encode("utf-8")
            data_raw = json.dumps(entities, separators=(",", ":")).encode("utf-8")

        actual_compression = compression
        meta_compressed = IfcxbEncoder._compress(meta_raw, compression, level)
        data_compressed = IfcxbEncoder._compress(data_raw, compression, level)

        # Detect fallback
        if compression == COMPRESS_ZSTD:
            try:
                import zstandard  # noqa: F401
            except ImportError:
                actual_compression = COMPRESS_GZIP

        meta_chunk = IfcxbEncoder._build_chunk(CHUNK_META, meta_compressed, len(meta_raw))
        data_chunk = IfcxbEncoder._build_chunk(CHUNK_DATA, data_compressed, len(data_raw))

        body = meta_chunk + data_chunk
        total_length = 16 + len(body)
        flags = actual_compression & 0x0F
        header = MAGIC + struct.pack("<III", BIN_VERSION, flags, total_length)
        return header + body

    @staticmethod
    def _build_chunk(chunk_type: bytes, compressed_data: bytes, uncompressed_len: int) -> bytes:
        chunk_header = struct.pack("<I", len(compressed_data))
        chunk_header += chunk_type
        chunk_header += struct.pack("<I", uncompressed_len)
        chunk_header += struct.pack("<I", 0)  # CRC32 placeholder
        return chunk_header + _pad8(compressed_data)

    @staticmethod
    def _compress(data: bytes, compression: int, level: int) -> bytes:
        if compression == COMPRESS_NONE:
            return data
        if compression == COMPRESS_ZSTD:
            try:
                import zstandard as zstd
                return zstd.ZstdCompressor(level=level).compress(data)
            except ImportError:
                return gzip.compress(data, compresslevel=min(level, 9))
        return data

    @staticmethod
    def _build_string_table(doc: IfcxDocument) -> list[str]:
        strings: set[str] = set()
        for entity in doc.entities:
            if "type" in entity:
                strings.add(entity["type"])
            if "layer" in entity:
                strings.add(str(entity["layer"]))
        for section in ["layers", "linetypes", "textStyles", "dimStyles"]:
            if section in doc.tables:
                strings.update(doc.tables[section].keys())
        return sorted(strings)

    @staticmethod
    def to_file(doc: IfcxDocument, path: str, **kwargs) -> None:
        data = IfcxbEncoder.encode(doc, **kwargs)
        Path(path).write_bytes(data)


class IfcxbDecoder:
    """Decodes IFCXB binary format to IfcxDocument."""

    @staticmethod
    def decode(data: bytes) -> IfcxDocument:
        if len(data) < 16:
            raise ValueError("Invalid IFCXB file: too short")
        if data[:4] != MAGIC:
            raise ValueError("Invalid IFCXB file: bad magic bytes")

        version, flags, total_length = struct.unpack("<III", data[4:16])
        compression = flags & 0x0F

        offset = 16
        meta_data = None
        entity_data = None

        while offset < len(data):
            if offset + 16 > len(data):
                break
            chunk_len = struct.unpack("<I", data[offset:offset + 4])[0]
            chunk_type = data[offset + 4:offset + 8]
            uncompressed_len = struct.unpack("<I", data[offset + 8:offset + 12])[0]

            chunk_data = data[offset + 16:offset + 16 + chunk_len]
            decompressed = IfcxbDecoder._decompress(chunk_data, compression, uncompressed_len)

            if chunk_type == CHUNK_META:
                meta_data = decompressed
            elif chunk_type == CHUNK_DATA:
                entity_data = decompressed

            padded_len = chunk_len + (8 - chunk_len % 8) % 8
            offset += 16 + padded_len

        if meta_data is None:
            raise ValueError("Invalid IFCXB file: missing META chunk")

        try:
            import cbor2
            meta = cbor2.loads(meta_data)
            entities = cbor2.loads(entity_data) if entity_data else []
        except (ImportError, Exception):
            meta = json.loads(meta_data.decode("utf-8"))
            entities = json.loads(entity_data.decode("utf-8")) if entity_data else []

        doc_dict = {
            "ifcx": meta.get("ifcx", "1.0"),
            "header": meta.get("header", {}),
            "tables": meta.get("tables", {}),
            "blocks": meta.get("blocks", {}),
            "entities": entities,
            "objects": meta.get("objects", []),
            "extensions": meta.get("extensions", {}),
        }
        return IfcxDocument.from_dict(doc_dict)

    @staticmethod
    def _decompress(data: bytes, compression: int, expected_len: int) -> bytes:
        if compression == COMPRESS_NONE:
            return data
        if compression == COMPRESS_ZSTD:
            try:
                import zstandard as zstd
                return zstd.ZstdDecompressor().decompress(data, max_output_size=expected_len + 1024)
            except ImportError:
                return data
        if compression == COMPRESS_GZIP:
            return gzip.decompress(data)
        return data

    @staticmethod
    def from_file(path: str) -> IfcxDocument:
        data = Path(path).read_bytes()
        return IfcxbDecoder.decode(data)


# ---------------------------------------------------------------------------
# IFCX file reader/writer helpers
# ---------------------------------------------------------------------------

def read_ifcx(path: str) -> IfcxDocument:
    """Read .ifcx (JSON) or .ifcxb (binary) from path."""
    p = Path(path)
    if p.suffix.lower() == ".ifcxb":
        return IfcxbDecoder.from_file(path)
    text = p.read_text(encoding="utf-8")
    return IfcxDocument.from_json(text)


def write_ifcx(doc: IfcxDocument, path: str, indent: int = 2) -> None:
    """Write .ifcx (JSON) to path."""
    Path(path).write_text(doc.to_json(indent=indent), encoding="utf-8")


def write_ifcxb(doc: IfcxDocument, path: str, **kwargs) -> None:
    """Write .ifcxb (binary) to path."""
    IfcxbEncoder.to_file(doc, path, **kwargs)


# ---------------------------------------------------------------------------
# DXF writer  (minimal, for export support)
# ---------------------------------------------------------------------------

class DxfWriter:
    """Minimal DXF R2010 writer for exporting IFCX documents."""

    def __init__(self):
        self._sections: list[str] = []

    def write(self, doc: IfcxDocument, path: str) -> None:
        """Write an IfcxDocument as DXF to the given path."""
        self._sections = []
        self._write_header(doc)
        self._write_tables(doc)
        self._write_blocks(doc)
        self._write_entities(doc)
        self._add("0", "EOF")
        Path(path).write_text("\r\n".join(self._sections) + "\r\n", encoding="utf-8")

    def _add(self, *pairs):
        """Add group code / value pairs."""
        for i in range(0, len(pairs), 2):
            self._sections.append(str(pairs[i]))
            self._sections.append(str(pairs[i + 1]))

    def _write_header(self, doc: IfcxDocument) -> None:
        self._add("0", "SECTION", "2", "HEADER")
        self._add("9", "$ACADVER", "1", "AC1024")  # R2010
        self._add("9", "$INSUNITS", "70", "4")  # millimeters
        self._add("0", "ENDSEC")

    def _write_tables(self, doc: IfcxDocument) -> None:
        self._add("0", "SECTION", "2", "TABLES")

        # Linetype table
        linetypes = doc.tables.get("linetypes", {})
        self._add("0", "TABLE", "2", "LTYPE", "70", str(len(linetypes) + 1))
        # ByBlock
        self._add("0", "LTYPE", "2", "ByBlock", "70", "0", "3", "", "72", "65", "73", "0", "40", "0.0")
        for lt_name, lt_data in linetypes.items():
            pattern = lt_data.get("pattern", [])
            plen = lt_data.get("patternLength", 0)
            self._add("0", "LTYPE", "2", lt_name, "70", "0")
            self._add("3", lt_data.get("description", ""), "72", "65")
            self._add("73", str(len(pattern)), "40", str(plen))
            for elem in pattern:
                self._add("49", str(elem))
        self._add("0", "ENDTAB")

        # Layer table
        layers = doc.tables.get("layers", {"0": {}})
        self._add("0", "TABLE", "2", "LAYER", "70", str(len(layers)))
        for layer_name, layer_data in layers.items():
            color = layer_data.get("color", {})
            if isinstance(color, dict) and color:
                aci = rgb_to_aci(color.get("r", 1), color.get("g", 1), color.get("b", 1))
            elif isinstance(color, int):
                aci = color
            else:
                aci = 7
            self._add("0", "LAYER", "2", layer_name, "70", "0", "62", str(aci), "6", "Continuous")
        self._add("0", "ENDTAB")

        # Style table
        styles = doc.tables.get("textStyles", {})
        if styles:
            self._add("0", "TABLE", "2", "STYLE", "70", str(len(styles)))
            for style_name, style_data in styles.items():
                font = style_data.get("fontFamily", "txt")
                self._add("0", "STYLE", "2", style_name, "70", "0", "40", "0", "41", "1")
                self._add("3", font)
            self._add("0", "ENDTAB")

        self._add("0", "ENDSEC")

    def _write_blocks(self, doc: IfcxDocument) -> None:
        self._add("0", "SECTION", "2", "BLOCKS")
        # Model space and paper space blocks
        self._add("0", "BLOCK", "2", "*Model_Space", "70", "0",
                   "10", "0", "20", "0", "30", "0")
        self._add("0", "ENDBLK")
        self._add("0", "BLOCK", "2", "*Paper_Space", "70", "0",
                   "10", "0", "20", "0", "30", "0")
        self._add("0", "ENDBLK")

        for block_name, block_data in doc.blocks.items():
            bp = block_data.get("basePoint", [0, 0, 0])
            self._add("0", "BLOCK", "2", block_name, "70", "0",
                       "10", str(bp[0]), "20", str(bp[1]), "30", str(bp[2]))
            for ent in block_data.get("entities", []):
                self._write_entity(ent)
            self._add("0", "ENDBLK")

        self._add("0", "ENDSEC")

    def _write_entities(self, doc: IfcxDocument) -> None:
        self._add("0", "SECTION", "2", "ENTITIES")
        for ent in doc.entities:
            self._write_entity(ent)
        self._add("0", "ENDSEC")

    def _write_entity(self, ent: dict) -> None:
        etype = ent.get("type", "")
        layer = ent.get("layer", "0")

        if etype == "LINE":
            s = ent.get("start", [0, 0, 0])
            e = ent.get("end", [0, 0, 0])
            self._add("0", "LINE", "8", layer)
            self._add("10", str(s[0]), "20", str(s[1]), "30", str(s[2]))
            self._add("11", str(e[0]), "21", str(e[1]), "31", str(e[2]))

        elif etype == "CIRCLE":
            c = ent.get("center", [0, 0, 0])
            r = ent.get("radius", 0)
            self._add("0", "CIRCLE", "8", layer)
            self._add("10", str(c[0]), "20", str(c[1]), "30", str(c[2]))
            self._add("40", str(r))

        elif etype == "ARC":
            c = ent.get("center", [0, 0, 0])
            r = ent.get("radius", 0)
            sa = math.degrees(ent.get("startAngle", 0))
            ea = math.degrees(ent.get("endAngle", 0))
            self._add("0", "ARC", "8", layer)
            self._add("10", str(c[0]), "20", str(c[1]), "30", str(c[2]))
            self._add("40", str(r), "50", str(sa), "51", str(ea))

        elif etype == "ELLIPSE":
            c = ent.get("center", [0, 0, 0])
            maj = ent.get("majorAxisEndpoint", [1, 0, 0])
            ratio = ent.get("minorAxisRatio", 1)
            sp = ent.get("startParam", 0)
            ep = ent.get("endParam", 2 * math.pi)
            self._add("0", "ELLIPSE", "8", layer)
            self._add("10", str(c[0]), "20", str(c[1]), "30", str(c[2]))
            self._add("11", str(maj[0]), "21", str(maj[1]), "31", str(maj[2]))
            self._add("40", str(ratio), "41", str(sp), "42", str(ep))

        elif etype == "POINT":
            p = ent.get("position", [0, 0, 0])
            self._add("0", "POINT", "8", layer)
            self._add("10", str(p[0]), "20", str(p[1]), "30", str(p[2]))

        elif etype == "TEXT":
            ip = ent.get("insertionPoint", [0, 0, 0])
            h = ent.get("height", 2.5)
            txt = ent.get("text", "")
            self._add("0", "TEXT", "8", layer)
            self._add("10", str(ip[0]), "20", str(ip[1]), "30", str(ip[2]))
            self._add("40", str(h), "1", txt)

        elif etype == "MTEXT":
            ip = ent.get("insertionPoint", [0, 0, 0])
            h = ent.get("height", 2.5)
            w = ent.get("width", 0)
            txt = ent.get("text", "")
            self._add("0", "MTEXT", "8", layer)
            self._add("10", str(ip[0]), "20", str(ip[1]), "30", str(ip[2]))
            self._add("40", str(h), "41", str(w), "1", txt)

        elif etype == "LWPOLYLINE":
            verts = ent.get("vertices", [])
            closed = 1 if ent.get("closed", False) else 0
            self._add("0", "LWPOLYLINE", "8", layer)
            self._add("90", str(len(verts)), "70", str(closed))
            for v in verts:
                x = v.get("x", v[0] if isinstance(v, (list, tuple)) else 0)
                y = v.get("y", v[1] if isinstance(v, (list, tuple)) else 0)
                self._add("10", str(x), "20", str(y))
                bulge = v.get("bulge", 0) if isinstance(v, dict) else 0
                if bulge:
                    self._add("42", str(bulge))

        elif etype == "SPLINE":
            degree = ent.get("degree", 3)
            cps = ent.get("controlPoints", [])
            knots = ent.get("knots", [])
            self._add("0", "SPLINE", "8", layer)
            self._add("70", "8", "71", str(degree))
            self._add("72", str(len(knots)), "73", str(len(cps)))
            for k in knots:
                self._add("40", str(k))
            for cp in cps:
                self._add("10", str(cp[0]), "20", str(cp[1]), "30", str(cp[2] if len(cp) > 2 else 0))

        elif etype == "INSERT":
            ip = ent.get("insertionPoint", [0, 0, 0])
            bn = ent.get("blockName", "")
            sx = ent.get("scaleX", 1)
            sy = ent.get("scaleY", 1)
            rot = ent.get("rotation", 0)
            self._add("0", "INSERT", "8", layer, "2", bn)
            self._add("10", str(ip[0]), "20", str(ip[1]), "30", str(ip[2]))
            self._add("41", str(sx), "42", str(sy), "50", str(math.degrees(rot) if rot else 0))

        elif etype == "SOLID":
            pts = [ent.get(f"point{i}", [0, 0, 0]) for i in range(1, 5)]
            if len(pts) < 4:
                pts.append(pts[-1])
            self._add("0", "SOLID", "8", layer)
            for i, gc in enumerate([("10", "20", "30"), ("11", "21", "31"),
                                     ("12", "22", "32"), ("13", "23", "33")]):
                if i < len(pts):
                    self._add(gc[0], str(pts[i][0]), gc[1], str(pts[i][1]), gc[2], str(pts[i][2]))

        elif etype == "3DFACE":
            pts = [ent.get(f"point{i}", [0, 0, 0]) for i in range(1, 5)]
            self._add("0", "3DFACE", "8", layer)
            for i, gc in enumerate([("10", "20", "30"), ("11", "21", "31"),
                                     ("12", "22", "32"), ("13", "23", "33")]):
                if i < len(pts):
                    self._add(gc[0], str(pts[i][0]), gc[1], str(pts[i][1]), gc[2], str(pts[i][2]))

        # Handle entity color
        color = ent.get("color")
        if isinstance(color, dict) and color:
            aci = rgb_to_aci(color.get("r", 1), color.get("g", 1), color.get("b", 1))
            self._add("62", str(aci))
