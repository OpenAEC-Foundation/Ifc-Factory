# IFCX PyRevit Extension

PyRevit extension for exporting and importing IFCX/IFCXB files in Autodesk Revit.

## Features

- **Export to IFCXB** - Export the active view's 2D geometry to IFCX binary format
- **Export to DXF** - Export the active view to DXF format via the IFCX pipeline
- **Import IFCX** - Import IFCX/IFCXB files into Revit as detail lines, text, and filled regions

## Requirements

- Autodesk Revit 2020 or later
- PyRevit 4.8 or later

## Installation

### Option 1: Copy to PyRevit Extensions Directory

Copy the `IFCX.extension` folder to your PyRevit extensions directory:

```
%APPDATA%\pyRevit-Master\extensions\
```

Or the default extensions path:

```
C:\Users\<username>\AppData\Roaming\pyRevit-Master\extensions\IFCX.extension\
```

### Option 2: Add as Custom Extension Path

1. Open PyRevit Settings (PyRevit tab > Settings)
2. Under "Custom Extension Directories", click "Add Folder"
3. Browse to the directory containing `IFCX.extension` (this `pyrevit` folder)
4. Click "Save Settings and Reload"

## Usage

After installation and reloading PyRevit, an **IFCX** tab will appear in the Revit ribbon with:

### Export Panel
- **Export to IFCXB** - Click while a plan, section, elevation, or detail view is active. Collects all visible geometry and saves as `.ifcxb`.
- **Export to DXF** - Same as above but outputs `.dxf` format.

### Import Panel
- **Import IFCX** - Click to open a file browser. Select a `.ifcx` or `.ifcxb` file. Entities are created as detail lines, text notes, and filled regions in the active view.

## Supported Element Types

### Export
| Revit Element | IFCX Entity |
|---|---|
| Lines, DetailLines, ModelLines | LINE |
| Arcs, DetailArcs | ARC / CIRCLE |
| Ellipses | ELLIPSE |
| NurbSplines | SPLINE |
| TextNotes | TEXT / MTEXT |
| Dimensions | DIMENSION_LINEAR / DIMENSION_RADIUS |
| FilledRegions | HATCH |
| Grids | LINE + TEXT (center linetype) |
| Levels | LINE + TEXT (dashed linetype) |
| Annotation FamilyInstances | INSERT |
| IndependentTags | TEXT |
| Walls, Floors, etc. | LINE (edge extraction) |

### Import
| IFCX Entity | Revit Element |
|---|---|
| LINE | DetailLine |
| ARC | DetailArc |
| CIRCLE | DetailArc (full circle) |
| ELLIPSE | DetailCurve (Ellipse) |
| SPLINE | DetailCurve (NurbSpline) |
| LWPOLYLINE | DetailLine segments |
| TEXT / MTEXT | TextNote |
| HATCH | FilledRegion |
| DIMENSION_LINEAR | DetailLine (simplified) |
| LEADER | DetailLine segments |

## File Formats

- **`.ifcx`** - IFCX JSON format (human-readable)
- **`.ifcxb`** - IFCX Binary format (CBOR + gzip compressed, smaller file size)

## Notes

- Revit uses feet internally; all coordinates are converted to/from millimeters for IFCX
- The IFCXB encoder is self-contained with no external dependencies (works in IronPython)
- Block definitions (INSERT entities) are exported as references but not fully round-tripped on import
- Dimension import creates simplified line+text representations rather than native Revit dimensions

## Bundle Structure

```
IFCX.extension/
  IFCX.tab/
    Export.panel/
      ExportView.pushbutton/
        script.py          # Main IFCXB export script
        bundle.yaml        # Button metadata
        ifcx_encoder.py    # IFCXB binary encoder/decoder
      ExportDXF.pushbutton/
        script.py          # DXF export script
        bundle.yaml
    Import.panel/
      ImportIFCX.pushbutton/
        script.py          # IFCX/IFCXB import script
        bundle.yaml
```
