# IFCX Workbench for FreeCAD

Import and export **IFCX** (`.ifcx`), **IFCXB** (`.ifcxb`), and **DXF** (`.dxf`) drawing files in FreeCAD.

IFCX is an open-source alternative to DWG/DXF for 2D/3D CAD drawing interchange.

## Installation

### Option A: Copy to FreeCAD Mod directory

Copy the entire `freecad/` folder into your FreeCAD `Mod` directory:

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\FreeCAD\Mod\IFCX\` |
| macOS    | `~/Library/Application Support/FreeCAD/Mod/IFCX/` |
| Linux    | `~/.local/share/FreeCAD/Mod/IFCX/` |

### Option B: Symlink (for development)

```bash
# Linux / macOS
ln -s /path/to/Ifc-Factory/integrations/freecad ~/.local/share/FreeCAD/Mod/IFCX

# Windows (PowerShell as admin)
New-Item -ItemType SymbolicLink -Path "$env:APPDATA\FreeCAD\Mod\IFCX" -Target "C:\path\to\Ifc-Factory\integrations\freecad"
```

### Option C: FreeCAD Addon Manager

Once this addon is published, it can be installed directly from **Edit > Preferences > Addon Manager**.

## Usage

### Import

- **File > Import** and select `.ifcx` or `.ifcxb` files
- Or use the **IFCX** workbench toolbar button "Import IFCX..."

### Export

- **File > Export** and choose IFCX, IFCXB, or DXF format
- Or use the workbench toolbar buttons:
  - **Export IFCX...** -- JSON-based `.ifcx` format
  - **Export IFCXB...** -- Binary `.ifcxb` format (smaller files)
  - **Export DXF...** -- Standard DXF format

## Supported Entity Types

### Import (IFCX to FreeCAD)

| IFCX Type | FreeCAD Object |
|-----------|---------------|
| LINE | Part::Feature (wire) |
| CIRCLE | Part::Feature (wire) |
| ARC | Part::Feature (wire) |
| ELLIPSE | Part::Feature (wire) |
| SPLINE | Part::Feature (BSplineCurve) |
| LWPOLYLINE | Part::Feature (wire with arcs) |
| POINT | Draft::Point |
| TEXT | Draft::Text |
| MTEXT | Draft::Text |
| DIMENSION_LINEAR | Draft::LinearDimension |
| DIMENSION_ALIGNED | Draft::LinearDimension |
| DIMENSION_RADIUS | Part::Feature (line) |
| DIMENSION_DIAMETER | Part::Feature (line) |
| DIMENSION_ANGULAR | Part::Feature (wire) |
| DIMENSION_ORDINATE | Part::Feature (line) |
| LEADER | Part::Feature (wire) |
| HATCH | Part::Feature (face) |
| SOLID | Part::Feature (face) |
| 3DFACE | Part::Feature (face) |
| INSERT | App::Part (group) |
| MESH | Mesh::Feature |
| VIEWPORT | Part::Feature (rectangle) |
| TABLE | App::DocumentObjectGroup |

### Export (FreeCAD to IFCX)

| FreeCAD Object | IFCX Type |
|---------------|-----------|
| Part::Feature edges | LINE, ARC, CIRCLE, ELLIPSE, SPLINE |
| Draft::Wire | LWPOLYLINE |
| Draft::Circle | CIRCLE |
| Draft::Text | TEXT / MTEXT |
| Draft::Dimension | DIMENSION_LINEAR |
| Draft::Point | POINT |
| Draft::BSpline | SPLINE |
| App::Part | Block + INSERT |
| Sketcher geometry | LINE, ARC, CIRCLE, SPLINE |

## Dependencies

- **FreeCAD 0.20+** (uses Part, Draft modules)
- No external Python packages required
- Optional: `cbor2` and `zstandard` for optimized IFCXB binary support (falls back to JSON + gzip)

## License

MIT License. See the project root LICENSE file.
