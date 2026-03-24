# IFCX Verification Test Data

This directory contains test DXF/DWG files for round-trip verification.

## Download Test Files

Run the download script to fetch all test files from open-source repositories:

```bash
# Bash / Linux / macOS
./download-testdata.sh

# Or manually clone the sources:
git clone --depth 1 https://github.com/mozman/ezdxf.git sources/ezdxf
git clone --depth 1 https://github.com/LibreDWG/libredwg.git sources/libredwg
git clone --depth 1 https://github.com/IxMilia/dxf.git sources/ixmilia-dxf
git clone --depth 1 https://github.com/gdsestimating/dxf-parser.git sources/dxf-parser
```

## Directory Structure

```
testdata/
  sources/           # Cloned repos (gitignored)
  downloads/         # Downloaded individual files (gitignored)
  custom/            # Hand-crafted test files (committed)
  results/           # Verification reports (generated)
```

## Test File Sources

| Source | License | URL |
|--------|---------|-----|
| ezdxf | MIT | https://github.com/mozman/ezdxf |
| LibreDWG | GPL-3.0 | https://github.com/LibreDWG/libredwg |
| IxMilia/dxf | MIT | https://github.com/IxMilia/dxf |
| dxf-parser | MIT | https://github.com/gdsestimating/dxf-parser |
| LibreCAD | GPL-2.0 | https://github.com/LibreCAD/LibreCAD |
| FreeCAD | LGPL-2.1 | https://github.com/FreeCAD/FreeCAD |
| Caltrans | Public Domain | https://dot.ca.gov/programs/design/cad-library |
| CAD Forum | Free | https://www.cadforum.cz/en/free-cad-blocks.php |
| GrabCAD | Free | https://grabcad.com/library |
