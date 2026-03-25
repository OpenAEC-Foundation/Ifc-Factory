#!/usr/bin/env python3
"""IFCX CLI -- command-line interface for IFCX file conversions and inspection.

Usage examples:
    python ifcx_cli.py convert drawing.dxf drawing.ifcx
    python ifcx_cli.py info drawing.ifcx
    python ifcx_cli.py validate drawing.ifcx
    python ifcx_cli.py diff original.dxf roundtrip.dxf
    python ifcx_cli.py list drawing.ifcx
    python ifcx_cli.py layers drawing.ifcx
    python ifcx_cli.py stats drawing.ifcxb
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Resolve library path so that ``python cli/ifcx_cli.py`` works without
# installing the ifcx package.
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parent.parent
_LIB_PATH = _REPO_ROOT / "libraries" / "python"
if str(_LIB_PATH) not in sys.path:
    sys.path.insert(0, str(_LIB_PATH))

from ifcx import __version__ as IFCX_VERSION
from ifcx.document import IfcxDocument
from ifcx.reader import IfcxReader
from ifcx.writer import IfcxWriter
from ifcx.binary import IfcxbEncoder, IfcxbDecoder
from ifcx.converters import DxfImporter, DxfExporter, DwgImporter, DgnImporter

__version__ = "0.1.0"

# ---------------------------------------------------------------------------
# ANSI colour helpers (with Windows fallback)
# ---------------------------------------------------------------------------

_NO_COLOR = os.environ.get("NO_COLOR") is not None


def _supports_color() -> bool:
    """Return True if the terminal likely supports ANSI colours."""
    if _NO_COLOR:
        return False
    if sys.platform == "win32":
        # Modern Windows 10+ terminal supports ANSI if ENABLE_VIRTUAL_TERMINAL_PROCESSING is set.
        # We try to enable it; fall back to no-colour on failure.
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
            handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
            mode = ctypes.c_ulong()
            kernel32.GetConsoleMode(handle, ctypes.byref(mode))
            # ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)
            return True
        except Exception:
            return False
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


_COLOR = _supports_color()


def _c(code: str, text: str) -> str:
    """Wrap *text* in ANSI colour *code* if colour is enabled."""
    if not _COLOR:
        return text
    return f"\033[{code}m{text}\033[0m"


def bold(text: str) -> str:
    return _c("1", text)


def green(text: str) -> str:
    return _c("32", text)


def yellow(text: str) -> str:
    return _c("33", text)


def red(text: str) -> str:
    return _c("31", text)


def cyan(text: str) -> str:
    return _c("36", text)


def dim(text: str) -> str:
    return _c("2", text)


# ---------------------------------------------------------------------------
# Format detection
# ---------------------------------------------------------------------------

EXTENSION_MAP: dict[str, str] = {
    ".ifcx": "ifcx",
    ".ifcxb": "ifcxb",
    ".dxf": "dxf",
    ".dwg": "dwg",
    ".dgn": "dgn",
}

FORMAT_LABELS: dict[str, str] = {
    "ifcx": "IFCX JSON",
    "ifcxb": "IFCXB Binary",
    "dxf": "DXF (ASCII)",
    "dwg": "DWG (R2000)",
    "dgn": "DGN V7",
}


def detect_format(path: str) -> str:
    """Detect file format from extension."""
    ext = Path(path).suffix.lower()
    fmt = EXTENSION_MAP.get(ext)
    if fmt is None:
        raise ValueError(f"Unsupported file extension: {ext!r}. "
                         f"Supported: {', '.join(EXTENSION_MAP.keys())}")
    return fmt


# ---------------------------------------------------------------------------
# Reading / Writing helpers
# ---------------------------------------------------------------------------

def read_document(path: str, verbose: bool = False) -> IfcxDocument:
    """Read a file of any supported format into an IfcxDocument."""
    fmt = detect_format(path)
    if verbose:
        print(dim(f"  Reading {FORMAT_LABELS[fmt]} file: {path}"))

    if fmt == "ifcx":
        return IfcxReader.from_file(path)
    elif fmt == "ifcxb":
        return IfcxbDecoder.from_file(path)
    elif fmt == "dxf":
        return DxfImporter.from_file(path)
    elif fmt == "dwg":
        return DwgImporter.from_file(path)
    elif fmt == "dgn":
        return DgnImporter.from_file(path)
    else:
        raise ValueError(f"Cannot read format: {fmt}")


def write_document(doc: IfcxDocument, path: str, verbose: bool = False) -> None:
    """Write an IfcxDocument to a file, auto-detecting format from extension."""
    fmt = detect_format(path)
    if verbose:
        print(dim(f"  Writing {FORMAT_LABELS[fmt]} file: {path}"))

    # Ensure parent directory exists
    Path(path).parent.mkdir(parents=True, exist_ok=True)

    if fmt == "ifcx":
        IfcxWriter.to_file(doc, path)
    elif fmt == "ifcxb":
        IfcxbEncoder.to_file(doc, path)
    elif fmt == "dxf":
        DxfExporter.to_file(doc, path)
    else:
        raise ValueError(f"Cannot write to format: {fmt}. "
                         f"Writable formats: .ifcx, .ifcxb, .dxf")


# ---------------------------------------------------------------------------
# Entity / layer analysis helpers
# ---------------------------------------------------------------------------

def _entity_types(doc: IfcxDocument) -> Counter:
    return Counter(e.get("type", "UNKNOWN") for e in doc.entities)


def _layer_counts(doc: IfcxDocument) -> Counter:
    return Counter(e.get("layer", "0") for e in doc.entities)


def _compute_extents(doc: IfcxDocument) -> dict[str, Any] | None:
    """Compute bounding box from entity geometry."""
    xs: list[float] = []
    ys: list[float] = []
    zs: list[float] = []

    for e in doc.entities:
        for key in ("start", "end", "center", "position", "insertionPoint",
                     "origin", "defPoint1", "defPoint2", "basePoint"):
            pt = e.get(key)
            if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                xs.append(float(pt[0]))
                ys.append(float(pt[1]))
                if len(pt) >= 3:
                    zs.append(float(pt[2]))

        # LWPOLYLINE vertices
        verts = e.get("vertices")
        if isinstance(verts, list):
            for v in verts:
                if isinstance(v, dict):
                    if "x" in v:
                        xs.append(float(v["x"]))
                    if "y" in v:
                        ys.append(float(v["y"]))
                elif isinstance(v, (list, tuple)) and len(v) >= 2:
                    xs.append(float(v[0]))
                    ys.append(float(v[1]))

        # Spline control points
        cps = e.get("controlPoints")
        if isinstance(cps, list):
            for cp in cps:
                if isinstance(cp, (list, tuple)) and len(cp) >= 2:
                    xs.append(float(cp[0]))
                    ys.append(float(cp[1]))
                    if len(cp) >= 3:
                        zs.append(float(cp[2]))

    if not xs:
        return None

    return {
        "min": [min(xs), min(ys), min(zs) if zs else 0.0],
        "max": [max(xs), max(ys), max(zs) if zs else 0.0],
    }


def _format_point(pt: list[float]) -> str:
    return f"({pt[0]:.2f}, {pt[1]:.2f}, {pt[2]:.2f})"


def _human_size(size: int) -> str:
    """Human-readable file size."""
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}" if unit != "B" else f"{size} {unit}"
        size /= 1024  # type: ignore[assignment]
    return f"{size:.1f} TB"


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

_REQUIRED_SECTIONS = ["ifcx", "header", "tables", "entities"]
_KNOWN_ENTITY_TYPES = {
    "LINE", "POINT", "CIRCLE", "ARC", "ELLIPSE", "SPLINE", "RAY", "XLINE",
    "LWPOLYLINE", "POLYLINE", "TEXT", "MTEXT", "HATCH", "INSERT",
    "DIMENSION_LINEAR", "DIMENSION_ALIGNED", "DIMENSION_ANGULAR",
    "DIMENSION_RADIUS", "DIMENSION_DIAMETER", "DIMENSION_ORDINATE",
    "LEADER", "TOLERANCE", "3DFACE", "SOLID", "TRACE", "VIEWPORT",
    "IMAGE", "WIPEOUT", "3DSOLID", "REGION", "BODY", "ATTRIB", "ATTDEF",
    "SHAPE", "MESH",
}


def _validate_document(doc: IfcxDocument) -> list[dict[str, str]]:
    """Validate an IFCX document. Returns list of {level, message} dicts."""
    issues: list[dict[str, str]] = []

    # Check version
    if not doc.ifcx:
        issues.append({"level": "error", "message": "Missing IFCX version"})

    # Check header
    if not doc.header:
        issues.append({"level": "warning", "message": "Empty header section"})

    # Check tables
    if not doc.tables:
        issues.append({"level": "warning", "message": "Empty tables section"})
    else:
        if "layers" not in doc.tables or not doc.tables["layers"]:
            issues.append({"level": "warning", "message": "No layers defined"})

    # Check entities
    handles_seen: set[str] = set()
    layers = set(doc.tables.get("layers", {}).keys()) if doc.tables else set()

    for i, entity in enumerate(doc.entities):
        etype = entity.get("type")
        if not etype:
            issues.append({"level": "error",
                           "message": f"Entity [{i}] missing 'type' field"})
        elif etype not in _KNOWN_ENTITY_TYPES:
            issues.append({"level": "info",
                           "message": f"Entity [{i}] has non-standard type: {etype}"})

        handle = entity.get("handle")
        if not handle:
            issues.append({"level": "warning",
                           "message": f"Entity [{i}] ({etype}) missing 'handle'"})
        elif handle in handles_seen:
            issues.append({"level": "error",
                           "message": f"Entity [{i}] ({etype}) duplicate handle: {handle}"})
        else:
            handles_seen.add(handle)

        layer = entity.get("layer")
        if layer and layers and layer not in layers:
            issues.append({"level": "warning",
                           "message": f"Entity [{i}] ({etype}) references undefined layer: {layer}"})

    if not issues:
        issues.append({"level": "ok", "message": "Document is valid"})

    return issues


# ---------------------------------------------------------------------------
# Progress indicator
# ---------------------------------------------------------------------------

class _Progress:
    """Simple progress indicator for terminal output."""

    def __init__(self, label: str, quiet: bool = False):
        self._label = label
        self._quiet = quiet
        self._start = time.time()

    def __enter__(self) -> _Progress:
        if not self._quiet:
            print(f"  {self._label}...", end="", flush=True)
        return self

    def __exit__(self, *_: Any) -> None:
        elapsed = time.time() - self._start
        if not self._quiet:
            print(f" {green('done')} {dim(f'({elapsed:.2f}s)')}")


# ---------------------------------------------------------------------------
# CLI Commands
# ---------------------------------------------------------------------------

def cmd_convert(args: argparse.Namespace) -> int:
    """Convert between file formats."""
    input_path = args.input
    output_path = args.output

    if not Path(input_path).exists():
        print(red(f"Error: Input file not found: {input_path}"))
        return 1

    in_fmt = detect_format(input_path)
    out_fmt = detect_format(output_path)

    # Validate conversion pair
    valid_writes = {"ifcx", "ifcxb", "dxf"}
    if out_fmt not in valid_writes:
        print(red(f"Error: Cannot write to {FORMAT_LABELS.get(out_fmt, out_fmt)} format. "
                   f"Supported output formats: .ifcx, .ifcxb, .dxf"))
        return 1

    if not args.quiet:
        print(bold("IFCX Convert"))
        print(f"  {FORMAT_LABELS[in_fmt]} -> {FORMAT_LABELS[out_fmt]}")
        print(f"  Input:  {input_path}")
        print(f"  Output: {output_path}")
        print()

    try:
        with _Progress("Reading input", quiet=args.quiet):
            doc = read_document(input_path, verbose=args.verbose)

        if args.verbose:
            print(dim(f"  Loaded {len(doc.entities)} entities"))

        with _Progress("Writing output", quiet=args.quiet):
            write_document(doc, output_path, verbose=args.verbose)

        out_size = Path(output_path).stat().st_size
        in_size = Path(input_path).stat().st_size

        if not args.quiet:
            print()
            print(green("  Conversion complete"))
            print(f"  Input size:  {_human_size(in_size)}")
            print(f"  Output size: {_human_size(out_size)}")
            print(f"  Entities:    {len(doc.entities)}")
        else:
            # Machine-readable output
            print(json.dumps({
                "status": "ok",
                "input": input_path,
                "output": output_path,
                "input_format": in_fmt,
                "output_format": out_fmt,
                "input_size": in_size,
                "output_size": out_size,
                "entity_count": len(doc.entities),
            }))

    except Exception as exc:
        print(red(f"Error: {exc}"))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0


def cmd_info(args: argparse.Namespace) -> int:
    """Show file information."""
    path = args.file

    if not Path(path).exists():
        print(red(f"Error: File not found: {path}"))
        return 1

    try:
        fmt = detect_format(path)
        file_size = Path(path).stat().st_size

        with _Progress("Reading file", quiet=args.quiet):
            doc = read_document(path, verbose=args.verbose)

        type_counts = _entity_types(doc)
        layer_counts = _layer_counts(doc)
        extents = _compute_extents(doc)

        if args.quiet:
            print(json.dumps({
                "file": path,
                "format": fmt,
                "format_label": FORMAT_LABELS[fmt],
                "size": file_size,
                "version": doc.ifcx,
                "entity_count": len(doc.entities),
                "entity_types": dict(type_counts.most_common()),
                "layer_count": len(layer_counts),
                "layers": dict(layer_counts.most_common()),
                "blocks": len(doc.blocks),
                "extents": extents,
            }))
            return 0

        print()
        print(bold("IFCX File Info"))
        print(f"  File:     {path}")
        print(f"  Format:   {FORMAT_LABELS[fmt]}")
        print(f"  Size:     {_human_size(file_size)}")
        print(f"  Version:  {doc.ifcx}")
        print()

        # Header info
        if doc.header:
            print(bold("  Header:"))
            for k, v in doc.header.items():
                print(f"    {k}: {v}")
            print()

        # Entity summary
        print(bold("  Entities:") + f" {len(doc.entities)} total")
        for etype, count in type_counts.most_common():
            print(f"    {cyan(etype):>30s}  {count}")
        print()

        # Layers
        print(bold("  Layers:") + f" {len(layer_counts)} used")
        for layer, count in layer_counts.most_common():
            print(f"    {yellow(layer):>30s}  {count} entities")
        print()

        # Blocks
        if doc.blocks:
            print(bold("  Blocks:") + f" {len(doc.blocks)}")
            for name in doc.blocks:
                block = doc.blocks[name]
                bent = len(block.get("entities", []))
                print(f"    {name} ({bent} entities)")
            print()

        # Extents
        if extents:
            print(bold("  Extents:"))
            print(f"    Min: {_format_point(extents['min'])}")
            print(f"    Max: {_format_point(extents['max'])}")
            print()

    except Exception as exc:
        print(red(f"Error: {exc}"))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    """Validate an IFCX file."""
    path = args.file

    if not Path(path).exists():
        print(red(f"Error: File not found: {path}"))
        return 1

    try:
        with _Progress("Reading file", quiet=args.quiet):
            doc = read_document(path, verbose=args.verbose)

        issues = _validate_document(doc)

        if args.quiet:
            print(json.dumps({
                "file": path,
                "issues": issues,
                "error_count": sum(1 for i in issues if i["level"] == "error"),
                "warning_count": sum(1 for i in issues if i["level"] == "warning"),
            }))
            return 0

        print()
        print(bold("IFCX Validate"))
        print(f"  File: {path}")
        print()

        errors = 0
        warnings = 0
        for issue in issues:
            level = issue["level"]
            msg = issue["message"]
            if level == "error":
                print(f"  {red('ERROR')}   {msg}")
                errors += 1
            elif level == "warning":
                print(f"  {yellow('WARN')}    {msg}")
                warnings += 1
            elif level == "info":
                print(f"  {cyan('INFO')}    {msg}")
            elif level == "ok":
                print(f"  {green('OK')}      {msg}")

        print()
        if errors:
            print(red(f"  {errors} error(s), {warnings} warning(s)"))
            return 1
        elif warnings:
            print(yellow(f"  {warnings} warning(s), no errors"))
        else:
            print(green("  Document is valid"))

    except Exception as exc:
        print(red(f"Error: {exc}"))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0


def cmd_diff(args: argparse.Namespace) -> int:
    """Compare two files."""
    path1 = args.file1
    path2 = args.file2

    for p in (path1, path2):
        if not Path(p).exists():
            print(red(f"Error: File not found: {p}"))
            return 1

    try:
        with _Progress("Reading file 1", quiet=args.quiet):
            doc1 = read_document(path1, verbose=args.verbose)
        with _Progress("Reading file 2", quiet=args.quiet):
            doc2 = read_document(path2, verbose=args.verbose)

        types1 = _entity_types(doc1)
        types2 = _entity_types(doc2)
        layers1 = _layer_counts(doc1)
        layers2 = _layer_counts(doc2)

        all_types = sorted(set(types1.keys()) | set(types2.keys()))
        all_layers = sorted(set(layers1.keys()) | set(layers2.keys()))

        if args.quiet:
            print(json.dumps({
                "file1": path1,
                "file2": path2,
                "entity_count_1": len(doc1.entities),
                "entity_count_2": len(doc2.entities),
                "type_diff": {t: [types1.get(t, 0), types2.get(t, 0)] for t in all_types},
                "layer_diff": {l: [layers1.get(l, 0), layers2.get(l, 0)] for l in all_layers},
            }))
            return 0

        print()
        print(bold("IFCX Diff"))
        print(f"  File 1: {path1}")
        print(f"  File 2: {path2}")
        print()

        # Entity count comparison
        c1, c2 = len(doc1.entities), len(doc2.entities)
        delta = c2 - c1
        delta_str = f"+{delta}" if delta > 0 else str(delta)
        color_fn = green if delta == 0 else yellow
        print(bold("  Entity Counts:"))
        print(f"    File 1: {c1}")
        print(f"    File 2: {c2}")
        print(f"    Delta:  {color_fn(delta_str)}")
        print()

        # Type breakdown
        print(bold("  Entity Types:"))
        print(f"    {'Type':>25s}  {'File 1':>8s}  {'File 2':>8s}  {'Delta':>8s}")
        print(f"    {'─' * 25}  {'─' * 8}  {'─' * 8}  {'─' * 8}")
        for t in all_types:
            v1, v2 = types1.get(t, 0), types2.get(t, 0)
            d = v2 - v1
            ds = f"+{d}" if d > 0 else str(d)
            cf = green if d == 0 else (red if d < 0 else yellow)
            print(f"    {t:>25s}  {v1:>8d}  {v2:>8d}  {cf(ds):>8s}")
        print()

        # Layer breakdown
        print(bold("  Layers:"))
        print(f"    {'Layer':>25s}  {'File 1':>8s}  {'File 2':>8s}  {'Delta':>8s}")
        print(f"    {'─' * 25}  {'─' * 8}  {'─' * 8}  {'─' * 8}")
        for l in all_layers:
            v1, v2 = layers1.get(l, 0), layers2.get(l, 0)
            d = v2 - v1
            ds = f"+{d}" if d > 0 else str(d)
            cf = green if d == 0 else (red if d < 0 else yellow)
            print(f"    {l:>25s}  {v1:>8d}  {v2:>8d}  {cf(ds):>8s}")
        print()

        # Summary
        diffs = sum(1 for t in all_types if types1.get(t, 0) != types2.get(t, 0))
        if diffs == 0 and c1 == c2:
            print(green("  Files have identical entity structure"))
        else:
            print(yellow(f"  {diffs} type(s) differ"))

    except Exception as exc:
        print(red(f"Error: {exc}"))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0


def cmd_list(args: argparse.Namespace) -> int:
    """List all entities in a file."""
    path = args.file

    if not Path(path).exists():
        print(red(f"Error: File not found: {path}"))
        return 1

    try:
        with _Progress("Reading file", quiet=args.quiet):
            doc = read_document(path, verbose=args.verbose)

        if args.quiet:
            for e in doc.entities:
                print(json.dumps({
                    "handle": e.get("handle", ""),
                    "type": e.get("type", ""),
                    "layer": e.get("layer", "0"),
                }))
            return 0

        print()
        print(bold("IFCX Entity List"))
        print(f"  File: {path}")
        print(f"  Total: {len(doc.entities)} entities")
        print()

        print(f"  {'Handle':>8s}  {'Type':>25s}  {'Layer':<20s}")
        print(f"  {'─' * 8}  {'─' * 25}  {'─' * 20}")
        for e in doc.entities:
            handle = e.get("handle", "")
            etype = e.get("type", "UNKNOWN")
            layer = e.get("layer", "0")
            print(f"  {handle:>8s}  {cyan(etype):>25s}  {yellow(layer):<20s}")

            if args.verbose:
                # Show additional properties
                skip = {"handle", "type", "layer"}
                extras = {k: v for k, v in e.items() if k not in skip}
                if extras:
                    for k, v in extras.items():
                        val_str = json.dumps(v) if isinstance(v, (list, dict)) else str(v)
                        if len(val_str) > 60:
                            val_str = val_str[:57] + "..."
                        print(f"  {'':>8s}  {dim(f'{k}: {val_str}'):>25s}")
        print()

    except Exception as exc:
        print(red(f"Error: {exc}"))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0


def cmd_layers(args: argparse.Namespace) -> int:
    """List all layers with entity counts."""
    path = args.file

    if not Path(path).exists():
        print(red(f"Error: File not found: {path}"))
        return 1

    try:
        with _Progress("Reading file", quiet=args.quiet):
            doc = read_document(path, verbose=args.verbose)

        # Defined layers from tables
        defined_layers = doc.tables.get("layers", {}) if doc.tables else {}
        # Used layers from entities
        used_counts = _layer_counts(doc)
        all_layer_names = sorted(set(defined_layers.keys()) | set(used_counts.keys()))

        if args.quiet:
            result = []
            for name in all_layer_names:
                entry: dict[str, Any] = {
                    "name": name,
                    "entity_count": used_counts.get(name, 0),
                    "defined": name in defined_layers,
                }
                if name in defined_layers:
                    entry["properties"] = defined_layers[name]
                result.append(entry)
            print(json.dumps(result))
            return 0

        print()
        print(bold("IFCX Layers"))
        print(f"  File: {path}")
        print(f"  Defined: {len(defined_layers)} layers")
        print(f"  Used:    {len(used_counts)} layers")
        print()

        print(f"  {'Layer':<25s}  {'Entities':>10s}  {'Defined':>8s}  {'Properties':<30s}")
        print(f"  {'─' * 25}  {'─' * 10}  {'─' * 8}  {'─' * 30}")
        for name in all_layer_names:
            count = used_counts.get(name, 0)
            defined = green("yes") if name in defined_layers else red("no")
            props = ""
            if name in defined_layers and defined_layers[name]:
                props = json.dumps(defined_layers[name], separators=(",", ":"))
                if len(props) > 30:
                    props = props[:27] + "..."
            print(f"  {yellow(name):<25s}  {count:>10d}  {defined:>8s}  {dim(props):<30s}")
        print()

    except Exception as exc:
        print(red(f"Error: {exc}"))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    """Show file statistics."""
    path = args.file

    if not Path(path).exists():
        print(red(f"Error: File not found: {path}"))
        return 1

    try:
        fmt = detect_format(path)
        file_size = Path(path).stat().st_size
        raw_data = Path(path).read_bytes()

        with _Progress("Reading file", quiet=args.quiet):
            doc = read_document(path, verbose=args.verbose)

        # Compute JSON size for comparison
        json_text = doc.to_json(indent=2)
        json_size = len(json_text.encode("utf-8"))
        json_compact = json.dumps(doc.to_dict(), separators=(",", ":"))
        json_compact_size = len(json_compact.encode("utf-8"))

        type_counts = _entity_types(doc)
        layer_counts = _layer_counts(doc)

        # IFCXB-specific stats
        ifcxb_info: dict[str, Any] = {}
        if fmt == "ifcxb" and len(raw_data) >= 16:
            magic = raw_data[:4]
            version, flags, total_length = struct.unpack("<III", raw_data[4:16])
            compression = flags & 0x0F
            comp_names = {0: "none", 1: "zstd", 2: "lz4", 3: "brotli"}
            ifcxb_info = {
                "magic": magic.decode("ascii", errors="replace"),
                "version": f"{(version >> 16) & 0xFF}.{(version >> 8) & 0xFF}.{version & 0xFF}",
                "compression": comp_names.get(compression, f"unknown({compression})"),
                "total_length": total_length,
                "compression_ratio": f"{json_compact_size / file_size:.1f}x" if file_size else "N/A",
            }

        if args.quiet:
            print(json.dumps({
                "file": path,
                "format": fmt,
                "file_size": file_size,
                "json_size": json_size,
                "json_compact_size": json_compact_size,
                "entity_count": len(doc.entities),
                "type_count": len(type_counts),
                "layer_count": len(layer_counts),
                "block_count": len(doc.blocks),
                "ifcxb": ifcxb_info if ifcxb_info else None,
            }))
            return 0

        print()
        print(bold("IFCX File Statistics"))
        print(f"  File:   {path}")
        print(f"  Format: {FORMAT_LABELS[fmt]}")
        print()

        # Size info
        print(bold("  Size:"))
        print(f"    File on disk:       {_human_size(file_size)}")
        print(f"    IFCX JSON:          {_human_size(json_size)}")
        print(f"    IFCX JSON compact:  {_human_size(json_compact_size)}")

        if fmt == "ifcxb" and ifcxb_info:
            ratio = json_compact_size / file_size if file_size else 0
            print(f"    Compression ratio:  {cyan(f'{ratio:.1f}x')}")
            print()
            print(bold("  IFCXB Details:"))
            print(f"    Compression:     {ifcxb_info['compression']}")
            print(f"    Binary version:  {ifcxb_info['version']}")
            print(f"    Total length:    {ifcxb_info['total_length']}")
        elif fmt == "ifcx":
            ratio = json_size / json_compact_size if json_compact_size else 0
            print(f"    Pretty/compact:     {ratio:.1f}x")
        print()

        # Content stats
        print(bold("  Content:"))
        print(f"    Entities: {len(doc.entities)}")
        print(f"    Types:    {len(type_counts)}")
        print(f"    Layers:   {len(layer_counts)}")
        print(f"    Blocks:   {len(doc.blocks)}")
        print()

        # Type distribution
        if type_counts:
            print(bold("  Entity Distribution:"))
            total = len(doc.entities)
            for etype, count in type_counts.most_common():
                pct = count / total * 100 if total else 0
                bar_len = int(pct / 2)
                bar = "█" * bar_len
                print(f"    {etype:>25s}  {count:>6d}  {pct:>5.1f}%  {cyan(bar)}")
            print()

    except Exception as exc:
        print(red(f"Error: {exc}"))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        prog="ifcx",
        description="IFCX CLI -- convert, inspect and validate IFCX/IFCXB/DXF/DWG/DGN files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Supported formats:
  .ifcx   IFCX JSON
  .ifcxb  IFCXB Binary (CBOR + Zstandard)
  .dxf    DXF ASCII (AutoCAD)
  .dwg    DWG R2000 binary (read-only)
  .dgn    DGN V7 (Microstation, read-only)

Examples:
  ifcx convert drawing.dxf drawing.ifcx
  ifcx convert drawing.dwg drawing.ifcxb
  ifcx convert model.dgn model.dxf
  ifcx info drawing.ifcx
  ifcx diff original.dxf roundtrip.dxf
  ifcx stats drawing.ifcxb
""",
    )

    parser.add_argument("--version", action="version",
                        version=f"ifcx-cli {__version__} (ifcx {IFCX_VERSION})")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable verbose output")
    parser.add_argument("--quiet", "-q", action="store_true",
                        help="Machine-readable JSON output")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # convert
    p_convert = subparsers.add_parser("convert", help="Convert between file formats")
    p_convert.add_argument("input", help="Input file path")
    p_convert.add_argument("output", help="Output file path")

    # info
    p_info = subparsers.add_parser("info", help="Show file information")
    p_info.add_argument("file", help="File to inspect")

    # validate
    p_validate = subparsers.add_parser("validate", help="Validate IFCX against schema")
    p_validate.add_argument("file", help="File to validate")

    # diff
    p_diff = subparsers.add_parser("diff", help="Compare two files")
    p_diff.add_argument("file1", help="First file")
    p_diff.add_argument("file2", help="Second file")

    # list
    p_list = subparsers.add_parser("list", help="List all entities")
    p_list.add_argument("file", help="File to list entities from")

    # layers
    p_layers = subparsers.add_parser("layers", help="List all layers with entity counts")
    p_layers.add_argument("file", help="File to inspect")

    # stats
    p_stats = subparsers.add_parser("stats", help="File statistics")
    p_stats.add_argument("file", help="File to analyze")

    return parser


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    """CLI entry point."""
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 0

    commands = {
        "convert": cmd_convert,
        "info": cmd_info,
        "validate": cmd_validate,
        "diff": cmd_diff,
        "list": cmd_list,
        "layers": cmd_layers,
        "stats": cmd_stats,
    }

    handler = commands.get(args.command)
    if handler is None:
        parser.print_help()
        return 1

    return handler(args)


if __name__ == "__main__":
    sys.exit(main())
