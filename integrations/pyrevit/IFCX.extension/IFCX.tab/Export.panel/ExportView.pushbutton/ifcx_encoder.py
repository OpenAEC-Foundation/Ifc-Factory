"""
IFCXB Encoder - Self-contained IFCX Binary encoder for IronPython/CPython.

Encodes an IFCX document (Python dict) into the IFCXB binary container format.
Uses a minimal CBOR encoder with gzip compression (no external dependencies).

IFCXB Container Format:
    [4 bytes] Magic: "XCXB"
    [2 bytes] Version: major.minor (uint8 each)
    [4 bytes] Flags (uint32 LE)
    [4 bytes] Number of chunks (uint32 LE)
    For each chunk:
        [4 bytes] Chunk type ID (uint32 LE)
        [4 bytes] Compressed size (uint32 LE)
        [4 bytes] Uncompressed size (uint32 LE)
        [N bytes] Chunk data
    Chunk types:
        0x01 = Header (JSON, gzip)
        0x02 = Tables (CBOR, gzip)
        0x03 = Entities (CBOR, gzip)
        0x04 = Blocks (CBOR, gzip)
        0x05 = Objects (CBOR, gzip)
        0x06 = Extensions (CBOR, gzip)
"""

from __future__ import print_function

import struct
import json
import io

try:
    import gzip as _gzip
    HAS_GZIP = True
except ImportError:
    HAS_GZIP = False

try:
    import zlib as _zlib
    HAS_ZLIB = True
except ImportError:
    HAS_ZLIB = False


# ---------------------------------------------------------------------------
# Minimal CBOR encoder (RFC 7049 subset)
# Supports: unsigned int, negative int, bytes, text, array, map, float,
#           bool, null, undefined
# ---------------------------------------------------------------------------

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
CBOR_FLOAT16 = 0xF9
CBOR_FLOAT32 = 0xFA
CBOR_FLOAT64 = 0xFB


def _encode_head(major, value):
    """Encode a CBOR major type + additional info header."""
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


def cbor_encode(obj):
    """Encode a Python object to CBOR bytes.

    Supported types: None, bool, int, float, str, bytes, list, tuple, dict.
    Dicts are encoded with text keys; values are recursively encoded.
    """
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

    # IronPython 2.7 unicode support
    try:
        if isinstance(obj, unicode):
            encoded = obj.encode("utf-8")
            return _encode_head(CBOR_TEXT, len(encoded)) + encoded
    except NameError:
        pass  # Python 3, no unicode type

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

    # Fallback: convert to string
    return cbor_encode(str(obj))


# ---------------------------------------------------------------------------
# Compression helpers
# ---------------------------------------------------------------------------

def compress_gzip(data):
    """Compress bytes with gzip. Falls back to zlib, then raw data."""
    if HAS_GZIP:
        buf = io.BytesIO()
        with _gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as f:
            f.write(data)
        return buf.getvalue()
    elif HAS_ZLIB:
        return _zlib.compress(data, 6)
    else:
        return data


def decompress_gzip(data):
    """Decompress gzip bytes. Falls back to zlib, then returns raw data."""
    if HAS_GZIP:
        buf = io.BytesIO(data)
        with _gzip.GzipFile(fileobj=buf, mode="rb") as f:
            return f.read()
    elif HAS_ZLIB:
        return _zlib.decompress(data)
    else:
        return data


# ---------------------------------------------------------------------------
# IFCXB Container
# ---------------------------------------------------------------------------

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


def _make_chunk(chunk_type, data_raw, use_cbor=True):
    """Create a single chunk: type + compressed_size + uncompressed_size + data."""
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


def encode_ifcxb(ifcx_doc):
    """Encode an IFCX document dict to IFCXB binary bytes.

    Args:
        ifcx_doc: dict with keys: ifcx, header, tables, entities, blocks,
                  objects, extensions (all optional except ifcx and header).

    Returns:
        bytes: The encoded IFCXB container.
    """
    chunks = []

    # Header chunk - always JSON for readability/debugging
    header_data = {
        "ifcx": ifcx_doc.get("ifcx", "1.0"),
        "header": ifcx_doc.get("header", {}),
    }
    header_json = json.dumps(header_data).encode("utf-8")
    chunks.append(_make_chunk(CHUNK_HEADER, header_json, use_cbor=False))

    # Tables chunk
    tables = ifcx_doc.get("tables")
    if tables:
        chunks.append(_make_chunk(CHUNK_TABLES, tables, use_cbor=True))

    # Entities chunk
    entities = ifcx_doc.get("entities")
    if entities:
        chunks.append(_make_chunk(CHUNK_ENTITIES, entities, use_cbor=True))

    # Blocks chunk
    blocks = ifcx_doc.get("blocks")
    if blocks:
        chunks.append(_make_chunk(CHUNK_BLOCKS, blocks, use_cbor=True))

    # Objects chunk
    objects = ifcx_doc.get("objects")
    if objects:
        chunks.append(_make_chunk(CHUNK_OBJECTS, objects, use_cbor=True))

    # Extensions chunk
    extensions = ifcx_doc.get("extensions")
    if extensions:
        chunks.append(_make_chunk(CHUNK_EXTENSIONS, extensions, use_cbor=True))

    # Assemble container
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


def decode_ifcxb(data):
    """Decode IFCXB binary bytes to an IFCX document dict.

    Args:
        data: bytes of an IFCXB file.

    Returns:
        dict: The decoded IFCX document.
    """
    offset = 0

    # Read magic
    magic = data[offset:offset + 4]
    offset += 4
    if magic != IFCXB_MAGIC:
        raise ValueError("Not a valid IFCXB file (bad magic: {})".format(repr(magic)))

    # Read version
    ver_major, ver_minor = struct.unpack_from("BB", data, offset)
    offset += 2

    # Read flags
    flags = struct.unpack_from("<I", data, offset)[0]
    offset += 4

    # Read number of chunks
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

        # Decompress
        try:
            raw = decompress_gzip(chunk_data)
        except Exception:
            raw = chunk_data

        # Decode: try JSON first (header is always JSON), then assume CBOR
        key = chunk_map.get(chunk_type)
        if key is None:
            continue

        if chunk_type == CHUNK_HEADER:
            parsed = json.loads(raw.decode("utf-8"))
            doc["ifcx"] = parsed.get("ifcx", "1.0")
            doc["header"] = parsed.get("header", {})
        else:
            # For CBOR-encoded chunks, fall back to JSON parsing
            # (since we may have encoded as JSON if CBOR failed)
            try:
                parsed = json.loads(raw.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                # Attempt CBOR decode (minimal decoder below)
                parsed = _cbor_decode(raw)
            doc[key] = parsed

    return doc


# ---------------------------------------------------------------------------
# Minimal CBOR decoder
# ---------------------------------------------------------------------------

def _cbor_decode(data):
    """Decode CBOR bytes to a Python object."""
    result, _ = _cbor_decode_item(data, 0)
    return result


def _cbor_read_head(data, offset):
    """Read CBOR head: returns (major_type, additional_value, new_offset)."""
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


def _cbor_decode_item(data, offset):
    """Decode one CBOR item starting at offset. Returns (value, new_offset)."""
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
        first_byte = (major << 5) | (info & 0x1F) if info < 24 else info
        if info == 20:  # false
            return False, offset
        elif info == 21:  # true
            return True, offset
        elif info == 22:  # null
            return None, offset
        elif info == 25:  # float16 - read as raw, approximate
            raw = struct.unpack_from("!H", data, offset - 2)[0]
            # Simplified float16 decode
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
        elif info == 26:  # float32
            val = struct.unpack_from("!f", data, offset - 4)[0]
            return val, offset
        elif info == 27:  # float64
            val = struct.unpack_from("!d", data, offset - 8)[0]
            return val, offset

        # For float64 (info==27 in simple), the head reader already consumed 8 bytes
        # Re-check: the _cbor_read_head treats info=27 as reading 8-byte uint
        # For CBOR_SIMPLE major=7 with info=27, we need special handling
        return None, offset

    return None, offset


# ---------------------------------------------------------------------------
# Convenience: encode IFCX dict to JSON string
# ---------------------------------------------------------------------------

def encode_ifcx_json(ifcx_doc, indent=2):
    """Encode an IFCX document dict to a formatted JSON string."""
    return json.dumps(ifcx_doc, indent=indent, ensure_ascii=False)
