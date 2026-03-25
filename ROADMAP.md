# IFCX Roadmap

Open-source alternative to DWG/DXF, based on an extended IFC schema.

## Phase 1: Foundation (Done)

- [x] IFCX JSON Schema definition (all DWG/DXF entity types)
- [x] IFCXB binary format specification (GLB-style + CBOR + Zstandard)
- [x] TypeScript library skeleton (reader/writer/document)
- [x] Python library skeleton (reader/writer/document)
- [x] Rust library skeleton (reader/writer/document)
- [x] C++ library skeleton (reader/writer/document)
- [x] C# library (.NET 8, reader/writer/document)
- [x] Python DXF parser (from scratch, all entity types, round-trip tested)
- [x] Python DWG R2000 parser (from scratch, bit-level, 223 entities parsed)
- [x] Python DGN V7 parser (from scratch, ISFF/VAX D-Float, 896 elements parsed)
- [x] Python IFCXB encoder/decoder (CBOR + Zstandard, 94% smaller than DXF)
- [x] Web-based 2D viewer (HTML5 Canvas, opens .ifcx and .dxf)
- [x] PyRevit integration (export view to IFCXB/DXF, import IFCX)

## Phase 2: Core Libraries (Done - Python; In Progress - Other Languages)

- [x] **Python**: Full DXF/DWG/DGN parsers + IFCXB (from scratch, tested)
- [ ] **TypeScript**: Full DXF/DWG/DGN parsers + IFCXB (in progress)
- [ ] **Rust**: Full DXF/DWG/DGN parsers + IFCXB (in progress)
- [ ] **C++**: Full DXF/DWG/DGN parsers + IFCXB (in progress)
- [ ] **C#**: Full DXF/DWG/DGN parsers + IFCXB (.NET 8, in progress)
- [ ] Schema validation against `ifcx.schema.json`
- [ ] Unit tests with comprehensive coverage per language

## Phase 3: DXF Conversion (Done)

- [x] **DXF Parser** (ASCII DXF, R12-R2024)
  - Group code/value pair tokenizer
  - Section parser (HEADER, TABLES, BLOCKS, ENTITIES, OBJECTS)
  - All entity types mapped to IFCX
- [x] **DXF Writer** (target R2018/AC1032)
  - IFCX entities mapped back to DXF group codes
  - Header variables, tables, block definitions
- [x] Round-trip validation: DXF -> IFCX -> DXF

## Phase 4: DWG Conversion (Done - R2000)

- [x] **DWG Reader** (from-scratch, bit-level parser)
  - R2000/AC1015 fully supported (223 entities verified)
  - All object types: LINE, ARC, CIRCLE, POLYLINE, TEXT, MTEXT, DIMENSION, INSERT, etc.
- [ ] **DWG Reader** - additional versions
  - R2004 (AC1018) - compressed sections
  - R2007 (AC1021) - page-map structure
  - R2010+ (AC1024/AC1027/AC1032)
- [ ] **DWG Writer** (target R2018)
- [ ] Round-trip validation: DWG -> IFCX -> DWG
- [ ] Proxy entity preservation

## Phase 5: Verification Test Suite (Done)

Round-trip verification with real-world DXF/DWG files to prove format fidelity.

### Workflow per test file
```
Original DXF/DWG
    | import
  IFCX (JSON)
    | convert
  IFCXB (binary)
    | convert back
  IFCX (JSON)        <- must be identical to step 2
    | export
  DXF/DWG            <- compare with original
    | diff
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

## Phase 6: 2D Viewer (Done)

- [x] **Web-based 2D IFCX Viewer**
  - HTML5 Canvas rendering engine
  - TypeScript, uses `@ifcx/core` library directly
  - Entity rendering for all 2D types (lines, arcs, circles, text, dimensions, hatching, blocks)
  - Navigation: pan, zoom, scroll, fit-to-extents
  - Layer panel: visibility toggle, color display
  - Drag-and-drop file opening (.ifcx, .dxf)
- [ ] **Desktop viewer** (Electron or Tauri wrapper)
  - File association for .ifcx and .ifcxb
  - Drag-and-drop file opening
  - Recent files list
  - DXF/DWG import via built-in converter

## Phase 7: FreeCAD Integration (Done)

- [x] **FreeCAD IFCX Importer**
  - Python module using the `ifcx` Python library
  - Map IFCX entities to FreeCAD Part/Draft/Arch objects
  - Layer support, block insertion, text styles
- [x] **FreeCAD IFCX Exporter**
  - Export FreeCAD drawings to IFCX/IFCXB
  - Draft objects -> IFCX 2D entities
- [x] **FreeCAD Workbench**
  - Dedicated IFCX workbench with toolbar
  - Direct file association (.ifcx, .ifcxb)
  - Available via FreeCAD Addon Manager

## Phase 8: Blender / Bonsai Integration (Done)

- [x] **Blender IFCX/IFCXB Export**
  - Bonsai/BlenderBIM add-on integration
  - Export IFC models with 2D annotation to IFCXB
  - IfcAnnotation entities -> IFCX dimensions, leaders, text
- [x] **Blender IFCX Import**
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

## Phase 10: Ecosystem (In Progress)

- [x] **CLI tool** (`ifcx convert`, `ifcx validate`, `ifcx info`, `ifcx diff`)
- [x] **Schema helper tool** (`tools/schema-helper.html` - interactive schema browser)
- [ ] **VS Code extension** (syntax highlighting, preview for .ifcx)
- [ ] **Documentation site** with schema reference and API docs
- [ ] **Conformance test suite** (standard test files for all entity types)
- [ ] **Community** - contribution guidelines, issue templates

## Phase 11: v2 Schema Migration (In Progress)

Migrate all libraries from v1 (entity-based) to v2 (IFC5 node-based) schema.

- [x] **v2 schema definition** (`schema/ifcx-v2.schema.json`)
- [x] **IFC5 compatibility design** (`docs/ifc5-compatibility.md`)
- [x] **Drawing vs Model separation** (`docs/drawing-vs-model.md`)
- [x] **GitDiff versioning spec** (`docs/versioning.md`)
- [x] **Attribute namespace reference** (`schema/attributes.md`)
- [ ] **Python**: v2 document model + v1-to-v2 converter
- [ ] **TypeScript**: v2 document model + v1-to-v2 converter
- [ ] **Rust**: v2 document model + v1-to-v2 converter
- [ ] **C++**: v2 document model + v1-to-v2 converter
- [ ] **C#**: v2 document model + v1-to-v2 converter
- [ ] **Viewer**: v2 format rendering support
- [ ] **CLI**: v2 conversion commands (`ifcx convert --schema v2`)

## Phase 12: Package Publishing

Publish IFCX libraries to official package registries.

- [ ] **Python**: `pip install ifcx` (PyPI)
- [ ] **TypeScript/JS**: `npm install @ifcx/core` (npm)
- [ ] **Rust**: `cargo add ifcx` (crates.io)
- [ ] **C#**: `dotnet add package Ifcx` (NuGet)
- [ ] **C++**: `vcpkg install ifcx` (vcpkg)
- [ ] **Shared library**: `ifcx.dll` / `libifcx.so` (C/C++ FFI, downloadable binaries)
- [ ] CI/CD pipeline for automated builds and releases
- [ ] Semantic versioning and changelog management
- [ ] API documentation per package

## Phase 13: QGIS Integration

- [ ] **QGIS Plugin** for IFCX import/export
  - Read `.ifcx` and `.ifcxb` files as vector layers
  - Map `ifcx::geo::crs` to QGIS CRS
  - Layer support (IFCX layers -> QGIS layers)
  - Attribute table mapping from IFCX node attributes
  - Export QGIS vector layers to IFCX with GIS metadata
- [ ] **GIS-aware coordinate handling**
  - EPSG code and WKT coordinate system support
  - Map conversion (local coordinates <-> CRS)
  - Integration with `ifcx::geo::*` namespace

## Phase 14: GeoJSON / GML Import/Export

- [ ] **GeoJSON importer**
  - Parse GeoJSON FeatureCollections
  - Map GeoJSON geometry types to `ifcx::geom::*` and `ifcx::geo::feature`
  - Preserve GeoJSON properties as node attributes
  - CRS handling (RFC 7946 WGS84 default + custom CRS)
- [ ] **GeoJSON exporter**
  - Export IFCX nodes with `ifcx::geo::feature` as GeoJSON
  - Convert `ifcx::geom::*` geometry to GeoJSON geometry types
  - Include selected attributes as GeoJSON properties
- [ ] **GML importer**
  - Parse OGC GML geometry and features
  - Map GML geometry types to IFCX equivalents
  - Handle GML CRS definitions
- [ ] **GML exporter**
  - Export IFCX data as valid GML
  - Support for GML profiles (Simple Features, GML 3.2)

## Design Principles

1. **Full DWG/DXF fidelity** - Every entity, style, and property in DWG/DXF has a corresponding IFCX representation
2. **IFC5 compatible** - v2 schema is a superset of IFC5; every valid IFC5 file is valid IFCX
3. **Open and human-readable** - IFCX is JSON, version-controllable, diffable
4. **Compact binary option** - IFCXB achieves DWG-comparable file sizes
5. **Lossless round-trip** - IFCX <-> IFCXB is always lossless; DXF/DWG conversion preserves all supported entities
6. **Multi-language** - First-class libraries in TypeScript, Python, Rust, C++, and C#
7. **Drawing + Model** - Explicit separation of drawing geometry and BIM model data
8. **Built-in versioning** - Optional GitDiff for revision tracking without external VCS
9. **No vendor lock-in** - MIT licensed, no patents, no trademarks
10. **Verify everything** - Every conversion is validated against real-world test files
