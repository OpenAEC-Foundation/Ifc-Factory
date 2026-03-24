"""IFCX file reader."""

from __future__ import annotations

import json
from pathlib import Path

from ifcx.document import IfcxDocument


class IfcxReader:
    """Reads IFCX (JSON) files."""

    @staticmethod
    def from_file(path: str | Path) -> IfcxDocument:
        """Read IFCX from file."""
        path = Path(path)
        text = path.read_text(encoding="utf-8")
        return IfcxDocument.from_json(text)

    @staticmethod
    def from_string(json_str: str) -> IfcxDocument:
        """Read IFCX from JSON string."""
        return IfcxDocument.from_json(json_str)

    @staticmethod
    def from_bytes(data: bytes) -> IfcxDocument:
        """Read IFCX from bytes."""
        return IfcxDocument.from_json(data.decode("utf-8"))
