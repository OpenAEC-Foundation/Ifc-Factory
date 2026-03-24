"""IFCX to DXF exporter."""

from __future__ import annotations

from pathlib import Path

from ifcx.document import IfcxDocument


class DxfExporter:
    """Exports IFCX documents to DXF format."""

    @staticmethod
    def to_file(doc: IfcxDocument, path: str | Path, version: str = "AC1032") -> None:
        """Export to DXF file."""
        # TODO: Implement DXF writer
        raise NotImplementedError("DXF export not yet implemented")

    @staticmethod
    def to_string(doc: IfcxDocument, version: str = "AC1032") -> str:
        """Export to DXF string."""
        # TODO: Implement DXF writer
        raise NotImplementedError("DXF export not yet implemented")
