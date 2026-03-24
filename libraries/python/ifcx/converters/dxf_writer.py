"""Low-level DXF ASCII writer -- pure Python, no external dependencies.

Provides helpers for emitting group-code/value pairs, sections, tables,
entities, and 3-D points in valid DXF format.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Generator


class DxfWriter:
    """Builds a DXF ASCII string incrementally."""

    def __init__(self) -> None:
        self.lines: list[str] = []
        self._handle_counter = 1

    # ------------------------------------------------------------------
    # Primitive writers
    # ------------------------------------------------------------------

    def group(self, code: int, value: Any) -> None:
        """Write a single group-code / value pair.

        The value is formatted according to DXF conventions:
        - Floats use up to 12 significant digits.
        - Booleans become ``0`` or ``1``.
        - Everything else is converted via ``str()``.
        """
        self.lines.append(f"{code:>3}")
        if isinstance(value, float):
            self.lines.append(f"{value:.12g}")
        elif isinstance(value, bool):
            self.lines.append("1" if value else "0")
        elif isinstance(value, int):
            self.lines.append(str(value))
        else:
            self.lines.append(str(value))

    def point(self, x: float, y: float, z: float = 0.0, code_base: int = 10) -> None:
        """Write a 3-D point using consecutive group codes.

        ``code_base`` gives the X code; Y = ``code_base + 10``;
        Z = ``code_base + 20``.
        """
        self.group(code_base, x)
        self.group(code_base + 10, y)
        self.group(code_base + 20, z)

    def handle(self, h: str) -> None:
        """Write a handle (group code 5)."""
        self.group(5, h)

    def next_handle(self) -> str:
        """Allocate and return the next handle as a hex string."""
        h = format(self._handle_counter, "X")
        self._handle_counter += 1
        return h

    def entity(self, entity_type: str) -> None:
        """Write the entity-type marker (group code 0)."""
        self.group(0, entity_type)

    # ------------------------------------------------------------------
    # Structural context managers
    # ------------------------------------------------------------------

    @contextmanager
    def section(self, name: str) -> Generator[None, None, None]:
        """Context manager that emits ``SECTION`` / ``ENDSEC``."""
        self.group(0, "SECTION")
        self.group(2, name)
        yield
        self.group(0, "ENDSEC")

    @contextmanager
    def table(self, name: str, handle: str, entries: int = 0) -> Generator[None, None, None]:
        """Context manager that emits ``TABLE`` / ``ENDTAB``."""
        self.group(0, "TABLE")
        self.group(2, name)
        self.handle(handle)
        self.group(100, "AcDbSymbolTable")
        self.group(70, entries)
        yield
        self.group(0, "ENDTAB")

    # ------------------------------------------------------------------
    # Output
    # ------------------------------------------------------------------

    def to_string(self) -> str:
        """Return the complete DXF content as a string (LF line endings)."""
        return "\n".join(self.lines) + "\n"
