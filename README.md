# IFCX - Open Drawing Exchange Format

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Schema Version](https://img.shields.io/badge/Schema-1.0-green.svg)](schema/ifcx.schema.json)
[![Status](https://img.shields.io/badge/Status-Active_Development-orange.svg)](#roadmap)

An open-source alternative to DWG/DXF. IFCX extends the IFC schema with full 2D drawing capabilities, providing a modern, patent-free file format for CAD drawings.

---

## What is IFCX?

IFCX is a drawing exchange format that can store everything DWG and DXF store -- lines, arcs, splines, text, dimensions, hatching, blocks, paper space layouts, 3D geometry, and more -- in two variants:

- **`.ifcx`** -- JSON-based, human-readable, git-diffable
- **`.ifcxb`** -- compact binary (GLB-style container + CBOR + Zstandard), **94% smaller than DXF**

Fully open-source. No patents. No proprietary dependencies. MIT licensed.

## Why IFCX?

| Problem | IFCX Solution |
|---------|---------------|
| **DWG is proprietary** -- controlled by Autodesk, reverse-engineered at best | Fully open schema, MIT licensed, community-governed |
| **DXF is verbose** -- text-based group codes, no formal schema | JSON with strict JSON Schema, easy to parse in any language |
| **IFC lacks 2D** -- no dimensions, no hatching, no paper space | Extends IFC to cover the full DWG/DXF entity set |
| **No compact open binary** -- DXF files are huge | IFCXB rivals DWG in file size (tested: 94% smaller than DXF) |

## Supported Formats

IFCX reads and writes all major CAD formats:

| Format | Read | Write | Description |
|--------|------|-------|-------------|
| `.ifcx` | All languages | All languages | IFCX JSON (native) |
| `.ifcxb` | All languages | All languages | IFCX Binary (CBOR + Zstandard) |
| `.dxf` | All languages | All languages | AutoCAD DXF (R12-R2024) |
| `.dwg` | All languages | -- | AutoCAD DWG (R2000/AC1015) |
| `.dgn` | All languages | -- | MicroStation DGN V7 (ISFF) |

All parsers are built **from scratch** -- no external DXF/DWG/DGN libraries.

## Libraries

First-class libraries in 6 languages:

| Language | Package | DXF | DWG | DGN | IFCXB |
|----------|---------|-----|-----|-----|-------|
| **Python** | `libraries/python/` | Full parser + writer | R2000 parser | V7 parser | CBOR + Zstandard |
| **TypeScript** | `libraries/typescript/` | Full parser + writer | R2000 parser | V7 parser | CBOR + fzstd |
| **Rust** | `libraries/rust/` | Full parser + writer | R2000 parser | V7 parser | ciborium + zstd |
| **C++** | `libraries/cpp/` | Full parser + writer | R2000 parser | V7 parser | Custom |
| **C#** | `libraries/csharp/` | Full parser + writer | R2000 parser | V7 parser | Brotli/GZip |
| **JavaScript** | `viewer/` | Built-in converter | -- | -- | -- |

## Quick Start

### Python

```python
from ifcx.document import IfcxDocument
from ifcx.converters import DxfImporter, DxfExporter
from ifcx.binary import IfcxbEncoder

# Import a DXF file
doc = DxfImporter.from_file("drawing.dxf")
print(f"Entities: {len(doc.entities)}, Layers: {list(doc.tables['layers'].keys())}")

# Add geometry
doc.add_entity({"type": "LINE", "start": [0, 0, 0], "end": [100, 50, 0], "layer": "Walls"})
doc.add_entity({"type": "CIRCLE", "center": [50, 50, 0], "radius": 25})

# Export to IFCX JSON
with open("output.ifcx", "w") as f:
    f.write(doc.to_json())

# Export to IFCXB binary (94% smaller than DXF)
IfcxbEncoder.to_file(doc, "output.ifcxb")

# Export back to DXF
DxfExporter.to_file(doc, "output.dxf")
```

### CLI

```bash
python cli/ifcx_cli.py convert drawing.dxf output.ifcx     # DXF -> IFCX
python cli/ifcx_cli.py convert drawing.dwg output.ifcxb    # DWG -> IFCXB binary
python cli/ifcx_cli.py convert model.dgn output.dxf        # DGN -> DXF
python cli/ifcx_cli.py info drawing.ifcx                   # Show file info
python cli/ifcx_cli.py diff original.dxf roundtrip.dxf     # Compare files
python cli/ifcx_cli.py stats drawing.ifcxb                 # Compression stats
```

### TypeScript

```typescript
import { DxfImporter, IfcxWriter } from '@ifcx/core';

const doc = DxfImporter.fromString(dxfContent);
const json = IfcxWriter.toString(doc);
```

### Rust

```rust
use ifcx::{DxfImporter, IfcxWriter};

let doc = DxfImporter::from_file("drawing.dxf")?;
IfcxWriter::to_file(&doc, "output.ifcx")?;
```

## Schema Overview

The IFCX schema (`schema/ifcx.schema.json`) covers **all** DWG/DXF entity types:

| Category | Entity Types |
|----------|-------------|
| **Geometry** | LINE, POINT, CIRCLE, ARC, ELLIPSE, SPLINE, RAY, XLINE, HELIX |
| **Polylines** | LWPOLYLINE, POLYLINE2D, POLYLINE3D, MLINE |
| **Text** | TEXT, MTEXT (with rich text formatting) |
| **Dimensions** | LINEAR, ALIGNED, ANGULAR, RADIUS, DIAMETER, ORDINATE, ARC |
| **Annotations** | LEADER, MULTILEADER, TOLERANCE (GD&T), TABLE |
| **Hatching** | HATCH (patterns, solid fills, gradients, all boundary types) |
| **Blocks** | BlockDefinition, INSERT, ATTDEF, ATTRIB (with dynamic blocks) |
| **Layouts** | VIEWPORT, LAYOUT, PLOTSETTINGS (paper space / model space) |
| **3D** | 3DSOLID, BODY, REGION, SURFACE, MESH, 3DFACE |
| **Images** | IMAGE, WIPEOUT, UNDERLAY (PDF/DWF/DGN) |
| **Other** | LIGHT, CAMERA, SECTION, GEOPOSITIONMARKER, PROXY |

## Integrations

| Tool | Type | Location |
|------|------|----------|
| **Web Viewer** | HTML5 Canvas 2D viewer | `viewer/` |
| **PyRevit** | Revit view export/import | `integrations/pyrevit/` |
| **FreeCAD** | Workbench (import/export) | `integrations/freecad/` |
| **Blender** | Addon with Bonsai bridge | `integrations/blender/` |
| **CLI** | Command-line converter | `cli/` |

### Web Viewer

Open `viewer/index.html` in a browser. Drag-and-drop `.ifcx` or `.dxf` files. Supports pan, zoom, layer visibility, and entity inspection. No build step needed.

### PyRevit (Revit)

Copy `integrations/pyrevit/IFCX.extension/` to your PyRevit extensions directory. Adds toolbar buttons to export the active view to IFCXB or DXF, and import IFCX files as detail lines.

### FreeCAD

Copy `integrations/freecad/` to `~/.FreeCAD/Mod/IFCX/`. Registers as a workbench with import/export for `.ifcx`, `.ifcxb`, `.dxf`, and `.dgn`. Also available via FreeCAD Addon Manager.

### Blender

Install `integrations/blender/ifcx_addon/` as a Blender addon. Adds File > Import/Export menus for IFCX. Includes a Bonsai (BlenderBIM) bridge for IFC annotation export.

## Round-Trip Verification

Tested with 15 real-world DXF files:

```
Name           Entities  DXF RT  IFCXB RT  DXF KB  IFCXB KB  Compression
polylines      83        PASS    PASS      94      3.6       96% smaller
3dface         71        PASS    PASS      146     4.0       97% smaller
text           224       PASS    PASS      227     12.0      95% smaller
hatches        32        PASS    PASS      143     3.1       98% smaller
dimensions     4         PASS    PASS      99      2.3       98% smaller
world (2875)   2875      PASS    PASS      546     56.6      90% smaller
─────────────────────────────────────────────────────────────────────────
Total                                      2516    138       94% smaller
```

DWG parser tested with 223 entities from `example_2000.dwg`.
DGN parser tested with 896 elements from `tag.dgn`.

## Project Structure

```
Ifc-Factory/
├── schema/                    # IFCX JSON Schema + IFCXB binary spec
│   ├── ifcx.schema.json       # Complete schema (all entity types)
│   └── ifcxb.spec.md          # Binary format specification
├── libraries/
│   ├── python/                # Python library (pip installable)
│   ├── typescript/            # TypeScript/JS library (npm)
│   ├── rust/                  # Rust library (crates.io)
│   ├── cpp/                   # C++ library (CMake)
│   └── csharp/                # C# library (.NET 8)
├── viewer/                    # HTML5 2D viewer
├── cli/                       # Command-line converter tool
├── integrations/
│   ├── pyrevit/               # Autodesk Revit integration
│   ├── freecad/               # FreeCAD workbench
│   └── blender/               # Blender addon + Bonsai bridge
├── testdata/                  # Verification test suite
├── examples/                  # Example IFCX files
├── archives/                  # Previous Ifc-Factory code
├── ROADMAP.md                 # 10-phase development roadmap
└── README.md
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full 10-phase plan. Current status:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation (schema, skeletons) | Done |
| 2 | Core libraries (6 languages) | Done |
| 3 | DXF conversion | Done |
| 4 | DWG conversion | Done (R2000) |
| 5 | Verification test suite | Done |
| 6 | 2D Viewer | Done |
| 7 | FreeCAD integration | Done |
| 8 | Blender/Bonsai integration | Done |
| 9 | Advanced features | Planned |
| 10 | Ecosystem (CLI, publishing) | In progress |

## Design Principles

1. **Full DWG/DXF fidelity** -- every entity, style, and property has an IFCX representation
2. **Open and human-readable** -- JSON format, version-controllable, diffable
3. **Compact binary** -- IFCXB achieves DWG-comparable file sizes
4. **Lossless round-trip** -- IFCX <-> IFCXB is always lossless
5. **Multi-language** -- first-class libraries in Python, TypeScript, Rust, C++, C#
6. **No external dependencies** -- all parsers built from scratch
7. **No vendor lock-in** -- MIT licensed, no patents

## Contributing

Contributions welcome. Key areas:
- Additional DWG version support (R2004, R2007, R2010+)
- DGN V8 parser
- Additional entity types and edge cases
- Package publishing (npm, PyPI, crates.io, NuGet, vcpkg)
- Documentation and examples

## License

MIT License. See [LICENSE](LICENSE) for details.
