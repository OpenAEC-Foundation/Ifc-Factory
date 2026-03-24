#!/bin/bash
# Download test DXF/DWG files from open-source repositories
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCES_DIR="$SCRIPT_DIR/sources"
CUSTOM_DIR="$SCRIPT_DIR/custom"

mkdir -p "$SOURCES_DIR" "$CUSTOM_DIR"

echo "=== Downloading IFCX verification test data ==="

# 1. ezdxf (MIT) - DXF files across versions R12-R2018
if [ ! -d "$SOURCES_DIR/ezdxf" ]; then
  echo "[1/4] Cloning ezdxf..."
  git clone --depth 1 https://github.com/mozman/ezdxf.git "$SOURCES_DIR/ezdxf"
else
  echo "[1/4] ezdxf already present, skipping"
fi

# 2. LibreDWG (GPL-3.0) - DWG files across versions R11-R2018
if [ ! -d "$SOURCES_DIR/libredwg" ]; then
  echo "[2/4] Cloning LibreDWG..."
  git clone --depth 1 https://github.com/LibreDWG/libredwg.git "$SOURCES_DIR/libredwg"
else
  echo "[2/4] LibreDWG already present, skipping"
fi

# 3. IxMilia/dxf (.NET, MIT) - Edge case DXF test files
if [ ! -d "$SOURCES_DIR/ixmilia-dxf" ]; then
  echo "[3/4] Cloning IxMilia/dxf..."
  git clone --depth 1 https://github.com/IxMilia/dxf.git "$SOURCES_DIR/ixmilia-dxf"
else
  echo "[3/4] IxMilia/dxf already present, skipping"
fi

# 4. dxf-parser (JS, MIT) - Simple baseline DXF files
if [ ! -d "$SOURCES_DIR/dxf-parser" ]; then
  echo "[4/4] Cloning dxf-parser..."
  git clone --depth 1 https://github.com/gdsestimating/dxf-parser.git "$SOURCES_DIR/dxf-parser"
else
  echo "[4/4] dxf-parser already present, skipping"
fi

echo ""
echo "=== Locating test files ==="

# List found DXF files
echo "DXF files found:"
find "$SOURCES_DIR" -name "*.dxf" -o -name "*.DXF" | head -30
echo ""

# List found DWG files
echo "DWG files found:"
find "$SOURCES_DIR" -name "*.dwg" -o -name "*.DWG" | head -30
echo ""

echo "=== Done ==="
echo "Test files are in: $SOURCES_DIR"
echo "Add custom test files to: $CUSTOM_DIR"
