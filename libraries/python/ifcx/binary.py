"""IFCXB binary format encoder/decoder.

Uses CBOR (RFC 8949) for binary encoding and Zstandard for compression.
File layout follows the GLB-style chunked container specified in ifcxb.spec.md.
"""

from __future__ import annotations

import struct
import json
from typing import Any

from ifcx.document import IfcxDocument

MAGIC = b"IFCX"
VERSION = 0x00010000
CHUNK_META = b"META"
CHUNK_DATA = b"DATA"

# Compression flags
COMPRESS_NONE = 0
COMPRESS_ZSTD = 1
COMPRESS_LZ4 = 2
COMPRESS_BROTLI = 3


def _pad8(data: bytes) -> bytes:
    """Pad data to 8-byte alignment."""
    remainder = len(data) % 8
    if remainder:
        data += b"\x00" * (8 - remainder)
    return data


class IfcxbEncoder:
    """Encodes IfcxDocument to IFCXB binary format."""

    @staticmethod
    def encode(doc: IfcxDocument, compression: int = COMPRESS_ZSTD, level: int = 3) -> bytes:
        """Encode document to IFCXB binary.

        Args:
            doc: The document to encode.
            compression: Compression algorithm (0=none, 1=zstd, 2=lz4, 3=brotli).
            level: Compression level (1-22 for zstd).

        Returns:
            IFCXB binary data.
        """
        doc_dict = doc.to_dict()

        # Build string table
        string_table = IfcxbEncoder._build_string_table(doc)

        # Separate metadata and entity data
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

        # Encode chunks with CBOR
        try:
            import cbor2
            meta_raw = cbor2.dumps(meta)
            data_raw = cbor2.dumps(entities)
        except ImportError:
            # Fallback to JSON if cbor2 not available
            meta_raw = json.dumps(meta, separators=(",", ":")).encode("utf-8")
            data_raw = json.dumps(entities, separators=(",", ":")).encode("utf-8")

        # Compress
        meta_compressed = IfcxbEncoder._compress(meta_raw, compression, level)
        data_compressed = IfcxbEncoder._compress(data_raw, compression, level)

        # Build chunks
        meta_chunk = IfcxbEncoder._build_chunk(CHUNK_META, meta_compressed, len(meta_raw))
        data_chunk = IfcxbEncoder._build_chunk(CHUNK_DATA, data_compressed, len(data_raw))

        # Calculate total size
        body = meta_chunk + data_chunk
        total_length = 16 + len(body)

        # Build header
        flags = compression & 0x0F
        header = MAGIC + struct.pack("<III", VERSION, flags, total_length)

        return header + body

    @staticmethod
    def _build_chunk(chunk_type: bytes, compressed_data: bytes, uncompressed_len: int) -> bytes:
        """Build a chunk with header."""
        chunk_header = struct.pack("<I", len(compressed_data))
        chunk_header += chunk_type
        chunk_header += struct.pack("<I", uncompressed_len)
        chunk_header += struct.pack("<I", 0)  # CRC32 placeholder
        padded = _pad8(compressed_data)
        return chunk_header + padded

    @staticmethod
    def _compress(data: bytes, compression: int, level: int) -> bytes:
        """Compress data with the specified algorithm."""
        if compression == COMPRESS_NONE:
            return data
        elif compression == COMPRESS_ZSTD:
            try:
                import zstandard as zstd
                compressor = zstd.ZstdCompressor(level=level)
                return compressor.compress(data)
            except ImportError:
                return data  # Fall back to uncompressed
        else:
            return data  # Unsupported compression, fall back

    @staticmethod
    def _build_string_table(doc: IfcxDocument) -> list[str]:
        """Build deduplicated string table from document."""
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
        """Encode and write to file."""
        from pathlib import Path
        data = IfcxbEncoder.encode(doc, **kwargs)
        Path(path).write_bytes(data)


class IfcxbDecoder:
    """Decodes IFCXB binary format to IfcxDocument."""

    @staticmethod
    def decode(data: bytes) -> IfcxDocument:
        """Decode IFCXB binary to document."""
        if len(data) < 16:
            raise ValueError("Invalid IFCXB file: too short")
        if data[:4] != MAGIC:
            raise ValueError("Invalid IFCXB file: bad magic bytes")

        # Parse header
        version, flags, total_length = struct.unpack("<III", data[4:16])
        compression = flags & 0x0F

        # Parse chunks
        offset = 16
        meta_data = None
        entity_data = None

        while offset < len(data):
            if offset + 16 > len(data):
                break

            chunk_len = struct.unpack("<I", data[offset:offset + 4])[0]
            chunk_type = data[offset + 4:offset + 8]
            uncompressed_len = struct.unpack("<I", data[offset + 8:offset + 12])[0]
            # crc32 = struct.unpack("<I", data[offset + 12:offset + 16])[0]

            chunk_data = data[offset + 16:offset + 16 + chunk_len]
            decompressed = IfcxbDecoder._decompress(chunk_data, compression, uncompressed_len)

            if chunk_type == CHUNK_META:
                meta_data = decompressed
            elif chunk_type == CHUNK_DATA:
                entity_data = decompressed

            # Advance to next chunk (padded to 8 bytes)
            padded_len = chunk_len + (8 - chunk_len % 8) % 8
            offset += 16 + padded_len

        if meta_data is None:
            raise ValueError("Invalid IFCXB file: missing META chunk")

        # Decode CBOR
        try:
            import cbor2
            meta = cbor2.loads(meta_data)
            entities = cbor2.loads(entity_data) if entity_data else []
        except ImportError:
            meta = json.loads(meta_data.decode("utf-8"))
            entities = json.loads(entity_data.decode("utf-8")) if entity_data else []

        # Reconstruct document
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
        """Decompress data."""
        if compression == COMPRESS_NONE:
            return data
        elif compression == COMPRESS_ZSTD:
            try:
                import zstandard as zstd
                decompressor = zstd.ZstdDecompressor()
                return decompressor.decompress(data, max_output_size=expected_len + 1024)
            except ImportError:
                return data
        else:
            return data

    @staticmethod
    def from_file(path: str) -> IfcxDocument:
        """Read and decode from file."""
        from pathlib import Path
        data = Path(path).read_bytes()
        return IfcxbDecoder.decode(data)
