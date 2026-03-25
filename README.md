# IFCX - Open Drawing Exchange Format

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Schema Version](https://img.shields.io/badge/Schema-2.0_(v2)-green.svg)](schema/ifcx-v2.schema.json)
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
| **No versioning in CAD files** -- changes require external VCS | Built-in GitDiff: revision tracking, branching, merging inside the file |
| **Drawing vs Model confusion** -- IFC is model-only, DWG is drawing-only | Explicit `purpose` separation: drawing, model, annotation, sheet |

## Schema Versions

IFCX supports two schema versions:

| Version | Schema File | Architecture | Description |
|---------|-------------|-------------|-------------|
| **v1** | `schema/ifcx.schema.json` | Entity-based | DWG/DXF-style flat entity list. Direct mapping to CAD entities. |
| **v2** | `schema/ifcx-v2.schema.json` | IFC5 node-based | Composition-based architecture with `path`, `children`, `attributes`, `inherits`. IFC5-compatible. |

### v2 Schema (IFC5 Architecture)

The v2 schema adopts the IFC5 node/composition model from buildingSMART. Instead of flat entity lists, data is organized as composable nodes with namespaced attributes:

```json
{
  "header": {
    "ifcxVersion": "2.0",
    "id": "project-001"
  },
  "imports": [
    {"uri": "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/geom@v1.ifcx"}
  ],
  "data": [
    {
      "path": "wall-line-001",
      "attributes": {
        "ifcx::purpose": "drawing",
        "ifcx::geom::line": {"points": [[0, 0], [5000, 0]]},
        "ifcx::style::curveStyle": {"colour": {"r":0,"g":0,"b":0}, "width": 0.35},
        "ifcx::layer::assignment": {"name": "Walls"}
      }
    }
  ]
}
```

Key v2 concepts:

- **Nodes with paths** -- each element has a unique `path` identifier
- **Namespaced attributes** -- `ifcx::geom::*`, `ifcx::annotation::*`, `bsi::ifc::*`, etc.
- **Composition** -- `children` and `inherits` enable hierarchy and reuse
- **IFC5 compatibility** -- every valid IFC5 file is a valid IFCX file
- **Drawing vs Model** -- explicit `ifcx::purpose` attribute separates drawing geometry from BIM model data

See [docs/ifc5-compatibility.md](docs/ifc5-compatibility.md) and [docs/drawing-vs-model.md](docs/drawing-vs-model.md) for details.

### v1-to-v2 Conversion

Convert existing v1 files to v2 format:

```python
from ifcx.converters import V2Converter

# Convert v1 document to v2 node-based format
v2_doc = V2Converter.from_v1(v1_doc)

# Each v1 entity becomes a node with namespaced attributes
# LINE -> ifcx::geom::line, CIRCLE -> ifcx::geom::circle, etc.
```

## Supported Formats

IFCX reads and writes all major CAD formats:

| Format | Read | Write | Description |
|--------|------|-------|-------------|
| `.ifcx` (v1) | All languages | All languages | IFCX JSON -- entity-based schema |
| `.ifcx` (v2) | All languages | All languages | IFCX JSON -- IFC5 node-based schema |
| `.ifcxb` | All languages | All languages | IFCX Binary (CBOR + Zstandard) |
| `.dxf` | All languages | All languages | AutoCAD DXF (R12-R2024) |
| `.dwg` | All languages | -- | AutoCAD DWG (R2000/AC1015) |
| `.dgn` | All languages | -- | MicroStation DGN V7 (ISFF) |
| `.geojson` | Planned | Planned | GeoJSON geographic features |
| `.gml` | Planned | Planned | OGC Geography Markup Language |

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

### Package Publishing (Planned)

| Registry | Package Name | Language |
|----------|-------------|----------|
| **PyPI** | `pip install ifcx` | Python |
| **npm** | `npm install @ifcx/core` | TypeScript/JS |
| **crates.io** | `cargo add ifcx` | Rust |
| **NuGet** | `dotnet add package Ifcx` | C# |
| **vcpkg** | `vcpkg install ifcx` | C++ |
| **Shared lib** | `ifcx.dll` / `libifcx.so` | C/C++ FFI |

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

### Python (v2 Format)

```python
from ifcx.converters import DxfImporter, V2Converter

# Import DXF and convert to v2 node-based format
v1_doc = DxfImporter.from_file("drawing.dxf")
v2_doc = V2Converter.from_v1(v1_doc)

# v2 uses IFC5-style nodes with namespaced attributes
for node in v2_doc.data:
    print(f"  {node['path']}: {list(node['attributes'].keys())}")

# Save as v2 IFCX
with open("output-v2.ifcx", "w") as f:
    f.write(v2_doc.to_json())
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

### v1 Schema (`schema/ifcx.schema.json`)

Covers **all** DWG/DXF entity types:

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

### v2 Schema (`schema/ifcx-v2.schema.json`)

IFC5-compatible node-based architecture with namespaced attributes:

| Namespace | Purpose |
|-----------|---------|
| `ifcx::geom::*` | 2D geometry (line, polyline, circle, arc, ellipse, bspline, mesh) |
| `ifcx::annotation::*` | Text, dimensions, leaders, tolerances, tables, tags |
| `ifcx::sheet::*` | Paper layouts, viewports, title blocks, plot settings |
| `ifcx::hatch::*` | Hatching (pattern, solid, gradient, SVG, material-based) |
| `ifcx::style::*` | Curve styles, fill styles, text styles |
| `ifcx::svg::*` | SVG/CSS properties (Bonsai/BlenderBIM compatibility) |
| `ifcx::layer::*` | Layer assignments and properties |
| `ifcx::component::*` | Block definitions and reusable components |
| `ifcx::image::*` | Raster images and embedded media |
| `ifcx::geo::*` | GIS / CRS (EPSG, GeoJSON, map conversion) |
| `ifcx::revision::*` | Built-in versioning (GitDiff) |
| `ifcx::purpose` | Drawing / model / annotation / sheet separation |
| `bsi::ifc::*` | IFC5 classification, materials, properties (pass-through) |
| `usd::*` | USD geometry and transforms (IFC5 pass-through) |

## Versioning (GitDiff)

IFCX v2 includes optional built-in version tracking -- no external VCS required:

- **Revision metadata** -- author, timestamp, message, tags per revision
- **Semantic diffs** -- track changes per node and attribute (not text lines)
- **Branching and merging** -- parallel development with conflict resolution
- **Undo support** -- optional `previous` values for rollback
- **Compact storage** -- only changed attributes are stored per revision (~5-15 KB per 100 revisions)
- **Visual diff** -- viewer can show added (green), modified (orange), deleted (red) overlays

See [docs/versioning.md](docs/versioning.md) for the full specification.

## Drawing vs Model Separation

IFCX v2 introduces explicit separation between drawing and model data via the `ifcx::purpose` attribute:

| Purpose | Description | Source |
|---------|-------------|--------|
| `"drawing"` | Pure 2D/3D geometry -- lines, arcs, text. No semantic meaning. | DWG/DXF import |
| `"model"` | BIM objects with IFC classes, materials, properties. | IFC import |
| `"annotation"` | Dimensions, labels, tags that reference model objects. | Bonsai/Revit |
| `"sheet"` | Paper layouts with viewports and title blocks. | Paper space |

A single IFCX file can contain both drawing and model data. Viewers can filter by purpose.

See [docs/drawing-vs-model.md](docs/drawing-vs-model.md) for details.

## Integrations

| Tool | Type | Location |
|------|------|----------|
| **Web Viewer** | HTML5 Canvas 2D viewer | `viewer/` |
| **PyRevit** | Revit view export/import | `integrations/pyrevit/` |
| **FreeCAD** | Workbench (import/export) | `integrations/freecad/` |
| **Blender** | Addon with Bonsai bridge | `integrations/blender/` |
| **CLI** | Command-line converter | `cli/` |
| **Schema Helper** | Interactive schema browser | `tools/schema-helper.html` |
| **QGIS** | GIS integration (planned) | -- |

### Web Viewer

Open `viewer/index.html` in a browser. Drag-and-drop `.ifcx` or `.dxf` files. Supports pan, zoom, layer visibility, and entity inspection. No build step needed.

### PyRevit (Revit)

Copy `integrations/pyrevit/IFCX.extension/` to your PyRevit extensions directory. Adds toolbar buttons to export the active view to IFCXB or DXF, and import IFCX files as detail lines.

### FreeCAD

Copy `integrations/freecad/` to `~/.FreeCAD/Mod/IFCX/`. Registers as a workbench with import/export for `.ifcx`, `.ifcxb`, `.dxf`, and `.dgn`. Also available via FreeCAD Addon Manager.

### Blender

Install `integrations/blender/ifcx_addon/` as a Blender addon. Adds File > Import/Export menus for IFCX. Includes a Bonsai (BlenderBIM) bridge for IFC annotation export.

### Schema Helper

Open `tools/schema-helper.html` in a browser. Interactive tool for exploring the IFCX v1 and v2 schemas, browsing entity types, attribute namespaces, and generating example JSON.

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
├── schema/                    # IFCX JSON Schema definitions
│   ├── ifcx.schema.json       # v1 schema (entity-based, all DWG/DXF types)
│   ├── ifcx-v2.schema.json    # v2 schema (IFC5 node-based architecture)
│   ├── ifcxb.spec.md          # Binary format specification
│   └── attributes.md          # v2 attribute namespace reference
├── libraries/
│   ├── python/                # Python library (pip installable)
│   ├── typescript/            # TypeScript/JS library (npm)
│   ├── rust/                  # Rust library (crates.io)
│   ├── cpp/                   # C++ library (CMake)
│   └── csharp/                # C# library (.NET 8)
├── viewer/                    # HTML5 2D viewer
├── cli/                       # Command-line converter tool
├── tools/
│   └── schema-helper.html     # Interactive schema browser
├── integrations/
│   ├── pyrevit/               # Autodesk Revit integration
│   ├── freecad/               # FreeCAD workbench
│   └── blender/               # Blender addon + Bonsai bridge
├── docs/                      # Documentation
│   ├── ifc5-compatibility.md  # IFC5 extension architecture
│   ├── drawing-vs-model.md    # Drawing vs model separation
│   ├── versioning.md          # GitDiff / revision tracking
│   ├── connections-and-views.md
│   ├── schema-overview.html   # Visual schema overview
│   ├── schema-graph.html      # Schema relationship graph
│   └── ifcx-report.html       # 2-page project report
├── testdata/                  # Verification test suite
├── examples/                  # Example IFCX files
├── archives/                  # Previous Ifc-Factory code
├── ROADMAP.md                 # Development roadmap
└── README.md
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan. Current status:

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
| 11 | v2 schema migration (all languages) | In progress |
| 12 | Package publishing (pip, npm, crates.io, NuGet, vcpkg) | Planned |
| 13 | QGIS integration | Planned |
| 14 | GeoJSON/GML import/export | Planned |

## Design Principles

1. **Full DWG/DXF fidelity** -- every entity, style, and property has an IFCX representation
2. **IFC5 compatible** -- v2 schema is a superset of IFC5; every valid IFC5 file is valid IFCX
3. **Open and human-readable** -- JSON format, version-controllable, diffable
4. **Compact binary** -- IFCXB achieves DWG-comparable file sizes
5. **Lossless round-trip** -- IFCX <-> IFCXB is always lossless
6. **Multi-language** -- first-class libraries in Python, TypeScript, Rust, C++, C#
7. **Drawing + Model** -- explicit separation of drawing geometry and BIM model data
8. **Built-in versioning** -- optional GitDiff for revision tracking without external VCS
9. **No external dependencies** -- all parsers built from scratch
10. **No vendor lock-in** -- MIT licensed, no patents

## Contributing

Contributions welcome. Key areas:
- v2 schema migration for TypeScript, Rust, C++, C# libraries
- Additional DWG version support (R2004, R2007, R2010+)
- DGN V8 parser
- GeoJSON/GML import and export
- QGIS integration plugin
- Additional entity types and edge cases
- Package publishing (npm, PyPI, crates.io, NuGet, vcpkg)
- Documentation and examples

## Trademarks

This project is not affiliated with, endorsed by, or sponsored by Autodesk, Inc., Bentley Systems, Incorporated, or buildingSMART International Limited.

AutoCAD, Revit, DWG, and DXF are registered trademarks or trademarks of Autodesk, Inc. MicroStation is a registered trademark of Bentley Systems, Incorporated. IFC and buildingSMART are trademarks of buildingSMART International Limited. All other trademarks are the property of their respective owners.

This software reads and writes files in these formats for interoperability purposes only. See [NOTICE](NOTICE) for the full trademark attribution.

## License

MIT License. See [LICENSE](LICENSE) for details.
