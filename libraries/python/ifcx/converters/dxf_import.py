"""DXF to IFCX importer."""

from __future__ import annotations

from pathlib import Path

from ifcx.document import IfcxDocument


class DxfImporter:
    """Imports DXF files into IFCX documents."""

    @staticmethod
    def from_file(path: str | Path) -> IfcxDocument:
        """Import DXF from file."""
        # TODO: Implement DXF parser
        raise NotImplementedError("DXF import not yet implemented")

    @staticmethod
    def from_string(dxf: str) -> IfcxDocument:
        """Import DXF from string."""
        # TODO: Implement DXF parser
        raise NotImplementedError("DXF import not yet implemented")
