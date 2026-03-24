"""IFCXB binary format encoder/decoder."""

from __future__ import annotations

from ifcx.document import IfcxDocument

MAGIC = b"IFCX"
VERSION = 0x00010000


class IfcxbEncoder:
    """Encodes IfcxDocument to IFCXB binary format."""

    @staticmethod
    def encode(doc: IfcxDocument) -> bytes:
        """Encode document to IFCXB binary."""
        # TODO: Implement IFCXB encoding
        # 1. Build string table from document
        # 2. CBOR-encode META chunk (header, tables, blocks, objects, string table, entity index)
        # 3. CBOR-encode DATA chunk (entities with string table references)
        # 4. Pack GEOM chunk (binary geometry arrays)
        # 5. Compress each chunk with Zstandard
        # 6. Write file header + chunks
        raise NotImplementedError("IFCXB encoding not yet implemented")

    @staticmethod
    def build_string_table(doc: IfcxDocument) -> list[str]:
        """Build deduplicated string table from document."""
        strings: set[str] = set()
        for entity in doc.entities:
            if "type" in entity:
                strings.add(entity["type"])
            if "layer" in entity:
                strings.add(entity["layer"])
        for section in ["layers", "linetypes", "textStyles", "dimStyles"]:
            if section in doc.tables:
                strings.update(doc.tables[section].keys())
        return sorted(strings)


class IfcxbDecoder:
    """Decodes IFCXB binary format to IfcxDocument."""

    @staticmethod
    def decode(data: bytes) -> IfcxDocument:
        """Decode IFCXB binary to document."""
        if len(data) < 16:
            raise ValueError("Invalid IFCXB file: too short")
        if data[:4] != MAGIC:
            raise ValueError("Invalid IFCXB file: bad magic bytes")

        # TODO: Implement IFCXB decoding
        raise NotImplementedError("IFCXB decoding not yet implemented")
