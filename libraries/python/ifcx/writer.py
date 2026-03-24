"""IFCX file writer."""

from __future__ import annotations

from pathlib import Path

from ifcx.document import IfcxDocument


class IfcxWriter:
    """Writes IFCX (JSON) files."""

    @staticmethod
    def to_file(doc: IfcxDocument, path: str | Path, indent: int = 2) -> None:
        """Write IFCX to file."""
        path = Path(path)
        path.write_text(doc.to_json(indent=indent), encoding="utf-8")

    @staticmethod
    def to_string(doc: IfcxDocument, indent: int = 2) -> str:
        """Write IFCX to JSON string."""
        return doc.to_json(indent=indent)

    @staticmethod
    def to_bytes(doc: IfcxDocument, indent: int = 2) -> bytes:
        """Write IFCX to bytes."""
        return doc.to_json(indent=indent).encode("utf-8")
