# IFCX Format - Blender Addon

A Blender addon for importing and exporting IFCX, IFCXB, DXF, and DGN files. Self-contained with no external Python dependencies.

## Supported Formats

| Format | Import | Export | Description |
|--------|--------|--------|-------------|
| `.ifcx` | Yes | Yes | IFCX JSON text format |
| `.ifcxb` | Yes | Yes | IFCX binary container (CBOR + gzip) |
| `.dxf` | Yes | Yes | AutoCAD Drawing Exchange Format |
| `.dgn` | Yes | No | MicroStation Design (V7 only) |

## Installation

### Method 1: Install from ZIP

1. Download or create a ZIP of the `ifcx_addon/` folder
2. Open Blender
3. Go to **Edit > Preferences > Add-ons**
4. Click **Install...** and select the ZIP file
5. Enable **"IFCX Format"** in the addon list

### Method 2: Copy to Addons Directory

Copy the `ifcx_addon/` folder to your Blender addons directory:

- **Windows:** `%APPDATA%\Blender Foundation\Blender\<version>\scripts\addons\`
- **macOS:** `~/Library/Application Support/Blender/<version>/scripts/addons/`
- **Linux:** `~/.config/blender/<version>/scripts/addons/`

Then enable "IFCX Format" in **Edit > Preferences > Add-ons**.

### Blender 4.2+ Extensions

For Blender 4.2 and later, the addon includes a `blender_manifest.toml` for the new extensions system. Install it the same way as above, or drag-and-drop the ZIP file onto Blender.

## Usage

### Import

**File > Import > IFCX / IFCXB / DXF / DGN**

Options:
- **Import As**: Choose between Mesh, Curve, or Grease Pencil representation
- **Collection Per Layer**: Create a separate Blender collection for each drawing layer
- **Scale**: Scale factor (default 0.001 converts millimeters to meters)

### Export

**File > Export > IFCX / IFCXB / DXF**

Options:
- **Format**: IFCX (JSON), IFCXB (binary), or DXF
- **Selected Only**: Export only selected objects
- **Apply Modifiers**: Evaluate modifiers before export
- **Scale**: Scale factor (default 1000 converts meters to millimeters)

## Entity Mapping

### Import (IFCX/DXF -> Blender)

| IFCX Entity | Blender Object |
|-------------|---------------|
| LINE | Curve (POLY) or Mesh edge |
| CIRCLE | Curve (POLY circle) or Mesh edges |
| ARC | Curve (POLY arc) or Mesh edges |
| ELLIPSE | Curve (POLY approximation) |
| LWPOLYLINE | Curve (POLY) or Mesh edges |
| SPLINE | Curve (NURBS) |
| TEXT | Font object |
| MTEXT | Font object |
| POINT | Mesh vertex |
| SOLID / 3DFACE | Mesh face |
| HATCH | Mesh edges (boundary) |
| INSERT | Collection instance |
| MESH | Mesh |

### Export (Blender -> IFCX/DXF)

| Blender Type | IFCX Entity |
|-------------|-------------|
| Mesh faces | 3DFACE |
| Mesh loose edges | LINE |
| Curve (POLY) | LWPOLYLINE |
| Curve (NURBS) | SPLINE |
| Curve (BEZIER) | LWPOLYLINE (approximated) |
| Font | TEXT |
| Empty | POINT |
| Collection instance | INSERT |
| Grease Pencil strokes | LINE / LWPOLYLINE |

## Bonsai (BlenderBIM) Integration

If the [Bonsai](https://bonsaibim.org/) addon is installed, additional menu items are available:

- **Export Annotations to IFCX**: Extract IFC annotation entities and save as IFCX
- **Export Sheets to IFCX**: Export documentation sheet references to IFCX

## File Structure

```
ifcx_addon/
  __init__.py           # Addon registration, menu items
  import_ifcx.py        # Import operator
  export_ifcx.py        # Export operator
  ifcx_core.py          # Self-contained IFCX/IFCXB/DXF/DGN library
  bonsai_bridge.py      # Bonsai (BlenderBIM) integration
  blender_manifest.toml # Blender 4.2+ extension manifest
```

## Compatibility

- Blender 3.6 or later
- No external Python packages required
- Works on Windows, macOS, and Linux
