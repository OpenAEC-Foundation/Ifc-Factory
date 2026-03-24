# IFCX - Open Drawing Exchange Format

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Schema Version](https://img.shields.io/badge/Schema-1.0-green.svg)](schema/ifcx.schema.json)
[![Status](https://img.shields.io/badge/Status-Active_Development-orange.svg)](#roadmap)

An open-source alternative to DWG/DXF. IFCX extends the IFC schema with full 2D drawing capabilities, providing a modern, patent-free file format for CAD drawings.

---

## What is IFCX?

IFCX is a drawing exchange format that can store everything DWG and DXF store -- lines, arcs, text, dimensions, hatching, blocks, paper space layouts, 3D geometry, and more -- in two variants:

- **`.ifcx`** -- JSON-based, human-readable, git-diffable
- **`.ifcxb`** -- compact binary (GLB-style container + CBOR encoding + Zstandard compression), achieving DWG-comparable file sizes

IFCX is fully open-source with no patents, no proprietary dependencies, and no vendor lock-in. Licensed under MIT.

## Why IFCX?

| Problem | IFCX Solution |
|---------|---------------|
| **DWG is proprietary** -- controlled by a single vendor, reverse-engineered at best | Fully open schema, MIT licensed, community-governed |
| **DXF is verbose and fragile** -- text-based group codes, no formal schema, poor tooling | JSON with a strict JSON Schema, easy to parse in any language |
| **IFC lacks 2D drawing support** -- designed for BIM/3D, no dimensions, no hatching, no paper space | Extends IFC concepts to cover the full DWG/DXF entity set |
| **No compact open binary** -- DXF files are huge, IFC STEP files are huge | IFCXB binary format rivals DWG in file size |

## Key Features

- **Full DWG/DXF entity coverage** -- geometry, text, dimensions, hatching, blocks, layouts, viewports, 3D solids, and more
- **Dual format** -- human-readable JSON (`.ifcx`) and compact binary (`.ifcxb`) with lossless round-trip between them
- **Multi-language libraries** -- TypeScript, Python, Rust, and C++
- **Bidirectional DXF/DWG conversion** -- import from and export to DXF and DWG (via LibreDWG/ODA SDK)
- **2D viewer** -- web-based viewer with layer panel, measurement tools, and paper space support (planned)
- **Schema-validated** -- every IFCX file can be validated against `ifcx.schema.json`
- **IFC-compatible** -- extends rather than replaces IFC concepts

## File Formats

| Format | Extension | Encoding | Characteristics |
|--------|-----------|----------|-----------------|
| IFCX | `.ifcx` | JSON (UTF-8) | Human-readable, git-diffable, easy to inspect and edit |
| IFCXB | `.ifcxb` | GLB-style container + CBOR + Zstandard | Compact binary, DWG-comparable size, fast to parse |

The binary format specification is documented in [`schema/ifcxb.spec.md`](schema/ifcxb.spec.md).

## Quick Start

### TypeScript

```typescript
import { IfcxDocument } from "@ifcx/core";

const doc = new IfcxDocument();
doc.addLayer("Walls", { color: { r: 1, g: 0, b: 0 }, lineweight: 0.5 });

doc.addEntity({
  type: "LINE",
  layer: "Walls",
  start: [0, 0],
  end: [1000, 0],
});

await doc.writeIfcx("drawing.ifcx");
await doc.writeIfcxb("drawing.ifcxb");
```

### Python

```python
from ifcx import IfcxDocument

doc = IfcxDocument()
doc.add_layer("Walls", color=(1, 0, 0), lineweight=0.5)

doc.add_entity({
    "type": "LINE",
    "layer": "Walls",
    "start": [0, 0],
    "end": [1000, 0],
})

doc.write_ifcx("drawing.ifcx")
doc.write_ifcxb("drawing.ifcxb")
```

### Rust

```rust
use ifcx::IfcxDocument;

fn main() {
    let mut doc = IfcxDocument::new();
    doc.add_layer("Walls", LayerOptions { color: rgb(1.0, 0.0, 0.0), lineweight: 0.5 });

    doc.add_entity(Entity::Line {
        layer: "Walls".into(),
        start: [0.0, 0.0],
        end: [1000.0, 0.0],
    });

    doc.write_ifcx("drawing.ifcx").unwrap();
    doc.write_ifcxb("drawing.ifcxb").unwrap();
}
```

## Schema Overview

The IFCX schema covers the full range of DWG/DXF entity types:

| Category | Entity Types |
|----------|-------------|
| **Geometry** | LINE, ARC, CIRCLE, ELLIPSE, SPLINE, LWPOLYLINE, POLYLINE, POINT, RAY, XLINE, HELIX |
| **Text** | TEXT, MTEXT (with rich formatting, columns, wrapping) |
| **Dimensions** | LINEAR, ALIGNED, ANGULAR, RADIAL, DIAMETRIC, ORDINATE, ARC_LENGTH |
| **Annotations** | LEADER, MLEADER, MULTILEADER, TOLERANCE |
| **Hatching** | HATCH (patterns, solid fills, gradients, boundary detection) |
| **Blocks** | INSERT (block references), nested blocks, ATTRIB/ATTDEF (attributes) |
| **Layouts** | Paper space, model space, VIEWPORT, plot settings |
| **Tables** | TABLE (rows, columns, cell styles, merged cells) |
| **Images** | IMAGE, WIPEOUT, OLE objects |
| **3D Geometry** | 3DFACE, 3DSOLID, MESH, BODY, REGION, SURFACE |
| **Other** | REVISION_CLOUD, SECTION, UNDERLAY (PDF/DWF/DGN) |

Supporting table definitions: layers, linetypes, text styles, dimension styles, block definitions, UCS, and views.

## Project Structure

```
Ifc-Factory/
├── schema/
│   ├── ifcx.schema.json      # IFCX JSON Schema (entity types, validation rules)
│   └── ifcxb.spec.md         # IFCXB binary format specification
├── libraries/
│   ├── typescript/            # @ifcx/core - TypeScript library
│   ├── python/                # ifcx - Python library
│   ├── rust/                  # ifcx - Rust crate
│   └── cpp/                   # libifcx - C++ library (CMake)
├── examples/
│   └── simple-drawing.ifcx   # Example IFCX file
├── archives/                  # Previous IFC4x3 TypeScript library (archived)
├── docs/                      # Documentation
├── ROADMAP.md                 # Detailed roadmap with phases and test plan
└── README.md
```

The `archives/` directory contains a previous iteration of this project -- a TypeScript library for IFC4x3 schema generation. That work has been superseded by the IFCX format effort, but is preserved for reference.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full plan, test file inventory, and verification metrics.

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Foundation | Schema definition, binary spec, library skeletons | Done |
| 2. Core Libraries | Full reader/writer implementations in all four languages | In progress |
| 3. DXF Conversion | Bidirectional DXF import/export (R12 through R2024) | Planned |
| 4. DWG Conversion | DWG import/export via LibreDWG/ODA SDK | Planned |
| 5. Verification | Round-trip test suite with 30 real-world test files | Planned |
| 6. 2D Viewer | Web-based viewer with full entity rendering | Planned |
| 7. FreeCAD Integration | Import/export plugin for FreeCAD | Planned |
| 8. Blender Integration | Bonsai/BlenderBIM add-on, IfcOpenShell bridge | Planned |
| 9. Advanced Features | Dynamic blocks, constraints, annotation scaling | Planned |
| 10. Ecosystem | CLI tool, VS Code extension, package publishing | Planned |

## Verification

Format fidelity is verified through round-trip testing:

```
Original DXF/DWG
    |  import
    v
  IFCX (JSON)
    |  convert
    v
  IFCXB (binary)
    |  convert back
    v
  IFCX (JSON)        <-- must be identical to step 2
    |  export
    v
  DXF/DWG            <-- compare with original
    |
  Verification Report
```

Each round-trip test produces a report checking: entity count match, geometry delta (< 1e-10), property preservation (layers, colors, linetypes, lineweights), text fidelity, style completeness, block integrity, layout preservation, file size comparison, and conversion performance.

The test suite targets 30 files spanning AutoCAD versions R12 through R2018, entity type coverage, real-world complexity, and edge cases. See [ROADMAP.md](ROADMAP.md) for the full test file inventory.

## Contributing

Contributions are welcome. Areas where help is needed:

- Library implementations (especially C++ and Rust)
- DXF parser and writer
- Real-world test files (DXF/DWG drawings you can share under an open license)
- Viewer development
- Documentation and examples

Please open an issue to discuss significant changes before submitting a pull request.

## License

MIT License. See [LICENSE](LICENSE) for details.

No patents. No proprietary dependencies. No vendor lock-in.
