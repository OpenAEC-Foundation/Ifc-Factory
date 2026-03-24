"""DXF ASCII tokenizer -- pure Python, no external dependencies.

Reads a DXF text (ASCII) file and yields ``(group_code, typed_value)`` pairs.
"""

from __future__ import annotations

from typing import Generator, Union

# Type alias for a parsed DXF value.
DxfValue = Union[str, int, float, bool]


def _value_type_for_code(code: int) -> str:
    """Return the expected Python type key for a DXF group code.

    Returns one of: 'str', 'float', 'int', 'bool'.
    """
    if 0 <= code <= 9:
        return "str"
    if 10 <= code <= 39:
        return "float"
    if 40 <= code <= 59:
        return "float"
    if 60 <= code <= 79:
        return "int"
    if 90 <= code <= 99:
        return "int"
    if code == 100:
        return "str"
    if code == 102:
        return "str"
    if code == 105:
        return "str"
    if 110 <= code <= 149:
        return "float"
    if 160 <= code <= 169:
        return "int"
    if 170 <= code <= 179:
        return "int"
    if 210 <= code <= 239:
        return "float"
    if 270 <= code <= 289:
        return "int"
    if 290 <= code <= 299:
        return "bool"
    if 300 <= code <= 309:
        return "str"
    if 310 <= code <= 319:
        return "str"
    if 320 <= code <= 369:
        return "str"
    if 370 <= code <= 379:
        return "int"
    if 380 <= code <= 389:
        return "int"
    if 390 <= code <= 399:
        return "str"
    if 410 <= code <= 419:
        return "str"
    if 420 <= code <= 429:
        return "int"
    if 430 <= code <= 439:
        return "str"
    if 440 <= code <= 449:
        return "int"
    if code == 999:
        return "str"
    if 1000 <= code <= 1009:
        return "str"
    if 1010 <= code <= 1059:
        return "float"
    if 1060 <= code <= 1071:
        return "int"
    # Default: treat as string
    return "str"


def _cast_value(code: int, raw: str) -> DxfValue:
    """Convert a raw string value to the appropriate Python type."""
    vtype = _value_type_for_code(code)
    if vtype == "float":
        try:
            return float(raw)
        except ValueError:
            return 0.0
    if vtype == "int":
        try:
            return int(raw)
        except ValueError:
            return 0
    if vtype == "bool":
        try:
            return bool(int(raw))
        except ValueError:
            return False
    # string
    return raw


def tokenize(content: str) -> Generator[tuple[int, DxfValue], None, None]:
    """Yield ``(group_code, typed_value)`` pairs from DXF ASCII text.

    Handles both DOS (CRLF) and Unix (LF) line endings.
    """
    # Normalize line endings to LF, then split.
    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    idx = 0
    length = len(lines)

    while idx + 1 < length:
        code_str = lines[idx].strip()
        val_str = lines[idx + 1].strip()
        idx += 2

        if code_str == "":
            continue

        try:
            code = int(code_str)
        except ValueError:
            continue

        yield code, _cast_value(code, val_str)
