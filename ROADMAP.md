# IFCX Roadmap

Open-source alternative to DWG/DXF, based on an extended IFC schema.

## Phase 1: Foundation (Current)

- [x] IFCX JSON Schema definition (all DWG/DXF entity types)
- [x] IFCXB binary format specification (GLB-style + CBOR + Zstandard)
- [x] TypeScript library skeleton (reader/writer/document)
- [x] Python library skeleton (reader/writer/document)
- [x] Rust library skeleton (reader/writer/document)
- [ ] C++ library skeleton (reader/writer/document)

## Phase 2: Core Libraries

- [ ] **TypeScript**: Full IFCX JSON reader/writer implementation
- [ ] **Python**: Full IFCX JSON reader/writer implementation
- [ ] **Rust**: Full IFCX JSON reader/writer implementation
- [ ] **C++**: Full IFCX JSON reader/writer implementation
  - nlohmann/json for JSON parsing
  - tinycbor or libcbor for CBOR encoding
  - zstd (official C library) for compression
  - CMake build system
  - C API wrapper for FFI bindings (Python ctypes, Node.js N-API, etc.)
- [ ] IFCXB binary encoder/decoder (all four languages)
- [ ] Schema validation against `ifcx.schema.json`
- [ ] Unit tests with comprehensive coverage

## Phase 3: DXF Conversion

- [ ] **DXF Parser** (ASCII DXF, R12-R2024)
  - Group code/value pair tokenizer
  - Section parser (HEADER, TABLES, BLOCKS, ENTITIES, OBJECTS)
  - All entity types mapped to IFCX
- [ ] **DXF Writer** (target R2018/AC1032)
  - IFCX entities mapped back to DXF group codes
  - Header variables, tables, block definitions
- [ ] Round-trip validation: DXF -> IFCX -> DXF

## Phase 4: DWG Conversion

- [ ] **DWG Reader** via LibreDWG/ODA SDK integration
  - C++: Direct LibreDWG integration (native, fastest path)
  - Rust: FFI bindings to LibreDWG (C library)
  - Python: ctypes or CFFI bindings to LibreDWG
  - TypeScript: WASM build of LibreDWG or native addon
- [ ] **DWG Writer** (target R2018)
- [ ] Round-trip validation: DWG -> IFCX -> DWG
- [ ] Proxy entity preservation

## Phase 5: Verification Test Suite

Round-trip verification with real-world DXF/DWG files to prove format fidelity.

### Workflow per test file
```
Original DXF/DWG
    ↓ import
  IFCX (JSON)
    ↓ convert
  IFCXB (binary)
    ↓ convert back
  IFCX (JSON)        ← must be identical to step 2
    ↓ export
  DXF/DWG            ← compare with original
    ↓ diff
  Verification Report (entity counts, geometry deltas, missing features)
```

### Test Files (from open-source repositories)

#### Version Coverage (DXF)
| # | Source | File | Description |
|---|--------|------|-------------|
| 1 | ezdxf | `R12.dxf` | AutoCAD R12 (AC1009) - oldest widely-used version |
| 2 | ezdxf | `R2000.dxf` | AutoCAD R2000 (AC1015) - most common legacy |
| 3 | ezdxf | `R2004.dxf` | AutoCAD R2004 (AC1018) - extended entity data |
| 4 | ezdxf | `R2007.dxf` | AutoCAD R2007 (AC1021) - UTF-8 encoding |
| 5 | ezdxf | `R2010.dxf` | AutoCAD R2010 (AC1024) - modern entities |
| 6 | ezdxf | `R2018.dxf` | AutoCAD R2018 (AC1032) - latest format |

**Source:** `https://github.com/mozman/ezdxf/tree/master/integration_tests/test_files`

#### Version Coverage (DWG)
| # | Source | File | Description |
|---|--------|------|-------------|
| 7 | LibreDWG | `Drawing_2000.dwg` | DWG R2000 (AC1015) |
| 8 | LibreDWG | `Drawing_2004.dwg` | DWG R2004 (AC1018) - compressed sections |
| 9 | LibreDWG | `Drawing_2007.dwg` | DWG R2007 (AC1021) - page-map structure |
| 10 | LibreDWG | `Drawing_2010.dwg` | DWG R2010 (AC1024) |
| 11 | LibreDWG | `Drawing_2013.dwg` | DWG R2013 (AC1027) |
| 12 | LibreDWG | `Drawing_2018.dwg` | DWG R2018 (AC1032) - latest stable |
| 13 | LibreDWG | `r11/ACEB10.DWG` | DWG R11 - pre-R13 legacy format |

**Source:** `https://github.com/LibreDWG/libredwg/tree/master/test/test-data`

#### Entity Type Coverage
| # | Source | File | Entity Types Tested |
|---|--------|------|---------------------|
| 14 | ezdxf | `hatch_pattern.dxf` | HATCH (patterns, boundaries, gradients) |
| 15 | IxMilia/dxf | test files | TEXT, MTEXT formatting, edge cases |
| 16 | dxf-parser | test files | LINE, ARC, CIRCLE, POLYLINE baselines |
| 17 | CAD Forum | architectural plan | INSERT, nested blocks, ATTRIB/ATTDEF, layers |
| 18 | CAD Forum | electrical schematic | Block attributes, symbol libraries |
| 19 | CAD Forum | mechanical part | DIMENSION (linear, angular, radial), LEADER |
| 20 | LibreCAD | sample drawings | LWPOLYLINE, SPLINE, ELLIPSE |

**Sources:**
- `https://github.com/IxMilia/dxf` (MIT license)
- `https://github.com/gdsestimating/dxf-parser` (MIT license)
- `https://www.cadforum.cz/en/free-cad-blocks.php`
- `https://github.com/LibreCAD/LibreCAD`

#### Real-World Complexity
| # | Source | File | Description |
|---|--------|------|-------------|
| 21 | GrabCAD | 3D mechanical DWG | 3DSOLID, 3DFACE, MESH, BODY |
| 22 | GrabCAD | civil site plan DWG | 1000+ LWPOLYLINE, large coordinates |
| 23 | Caltrans | highway standard drawing | Paper space, viewports, MLEADER, MULTILEADER |
| 24 | USGS/NPS | facility floor plan | Many layers, complex layouts, real-world scale |
| 25 | FreeCAD | exported test DXF | SPLINE, ELLIPSE, non-standard DXF quirks |

**Sources:**
- `https://grabcad.com/library` (free community files)
- `https://dot.ca.gov/programs/design/cad-library` (public domain)
- `https://apps.nationalmap.gov/downloader/` (public domain)
- `https://github.com/FreeCAD/FreeCAD`

#### Edge Cases & Stress Tests
| # | Source | File | Description |
|---|--------|------|-------------|
| 26 | Custom | empty-drawing.dxf | Minimal valid DXF (header + empty entities) |
| 27 | Custom | all-entity-types.dxf | One instance of every supported entity type |
| 28 | Custom | unicode-text.dxf | CJK, Arabic, emoji in TEXT/MTEXT |
| 29 | Custom | 10k-entities.dxf | Performance test (10,000+ entities) |
| 30 | Custom | nested-blocks-deep.dxf | 10 levels of nested block inserts |

### Verification Metrics

For each test file, the verification report includes:

1. **Entity count match** - Same number and types of entities after round-trip
2. **Geometry delta** - Maximum coordinate deviation (must be < 1e-10)
3. **Property preservation** - Layers, colors, linetypes, lineweights all match
4. **Text fidelity** - All text content and formatting preserved
5. **Style completeness** - DimStyles, TextStyles, Linetypes all present
6. **Block integrity** - Block definitions, nested blocks, attributes intact
7. **Layout preservation** - Paper space, viewports, plot settings match
8. **File size comparison** - IFCX, IFCXB, DXF, DWG sizes side by side
9. **Missing features log** - Any entities/properties that could not be converted
10. **Performance** - Import/export time in milliseconds

## Phase 6: 2D Viewer

- [ ] **Web-based 2D IFCX Viewer**
  - HTML5 Canvas / WebGL rendering engine
  - TypeScript, uses `@ifcx/core` library directly
  - Entity rendering for all 2D types:
    - Lines, arcs, circles, ellipses, splines, polylines
    - Text (single-line and multi-line with formatting)
    - Dimensions (all types with proper arrow/text layout)
    - Hatching (pattern and solid fills)
    - Block inserts (recursive rendering)
    - Tables
    - Images and wipeouts
  - Navigation: pan, zoom, scroll, fit-to-extents
  - Layer panel: visibility toggle, color display, freeze/thaw
  - Model space / paper space switching
  - Layout tabs (paper space layouts)
  - Viewport rendering (paper space viewports into model space)
  - Entity selection and property inspector
  - Measurement tools (distance, area, angle)
  - Print / export to PDF and SVG
  - Dark/light theme
  - IFCXB direct loading (decode in browser via WASM zstd)
- [ ] **Desktop viewer** (Electron or Tauri wrapper)
  - File association for .ifcx and .ifcxb
  - Drag-and-drop file opening
  - Recent files list
  - DXF/DWG import via built-in converter

## Phase 7: FreeCAD Integration

- [ ] **FreeCAD IFCX Importer**
  - Python module using the `ifcx` Python library
  - Map IFCX entities to FreeCAD Part/Draft/Arch objects
  - Layer support, block insertion, text styles
  - Paper space layouts mapped to TechDraw pages
- [ ] **FreeCAD IFCX Exporter**
  - Export FreeCAD drawings to IFCX/IFCXB
  - TechDraw pages -> IFCX layouts with viewports
  - Draft objects -> IFCX 2D entities
  - Part objects -> IFCX 3D entities
- [ ] **FreeCAD Workbench** (optional)
  - Dedicated IFCX workbench with toolbar
  - Direct file association (.ifcx, .ifcxb)
  - Preference panel for IFCX settings

## Phase 8: Blender / IFC OpenShell Integration

- [ ] **Blender IFCX/IFCXB Export**
  - Bonsai/BlenderBIM add-on integration
  - Export IFC models with 2D annotation to IFCXB
  - IfcAnnotation entities -> IFCX dimensions, leaders, text
  - Sheet layouts -> IFCX paper space + viewports
- [ ] **Blender IFCX Import**
  - Load IFCX/IFCXB files as Blender scenes
  - 2D entities -> Grease Pencil or mesh objects
  - 3D entities -> Blender mesh/curve objects
- [ ] **IFC OpenShell bridge**
  - Convert between IFC (STEP) and IFCX
  - Preserve IFC semantic data in IFCX extensions
  - Round-trip: IFC -> IFCX -> IFC

## Phase 9: Advanced Features

- [ ] **Associative dimensions** (dimensions linked to geometry)
- [ ] **Dynamic blocks** (parametric block instances)
- [ ] **Annotation scaling** (scale-dependent representation)
- [ ] **Plot style tables** (CTB/STB equivalent)
- [ ] **Fields** (auto-updating text: date, filename, properties)
- [ ] **Constraints** (geometric and dimensional constraints)
- [ ] **Revision clouds** and markup tools
- [ ] **Point cloud** support (LAS/LAZ integration)

## Phase 10: Ecosystem

- [ ] **CLI tool** (`ifcx convert`, `ifcx validate`, `ifcx info`, `ifcx diff`)
- [ ] **VS Code extension** (syntax highlighting, preview for .ifcx)
- [ ] **npm/PyPI/crates.io/vcpkg** package publishing
- [ ] **Documentation site** with schema reference and API docs
- [ ] **Conformance test suite** (standard test files for all entity types)
- [ ] **Community** - contribution guidelines, issue templates

## Design Principles

1. **Full DWG/DXF fidelity** - Every entity, style, and property in DWG/DXF has a corresponding IFCX representation
2. **Open and human-readable** - IFCX is JSON, version-controllable, diffable
3. **Compact binary option** - IFCXB achieves DWG-comparable file sizes
4. **Lossless round-trip** - IFCX <-> IFCXB is always lossless; DXF/DWG conversion preserves all supported entities
5. **Multi-language** - First-class libraries in TypeScript, Python, Rust, and C++
6. **IFC-compatible** - Extends (not replaces) IFC concepts where applicable
7. **No vendor lock-in** - MIT licensed, no patents, no trademarks
8. **Verify everything** - Every conversion is validated against real-world test files
