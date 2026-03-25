"""IFCX Workbench -- Init.py

Called at FreeCAD startup (before GUI). Registers IFCX/IFCXB/DXF
file type handlers with the FreeCAD import/export system.
"""

import FreeCAD

# Register import handlers
FreeCAD.addImportType("IFCX Drawing (*.ifcx)", "IFCX_Import")
FreeCAD.addImportType("IFCX Binary (*.ifcxb)", "IFCX_Import")

# Register export handlers
FreeCAD.addExportType("IFCX Drawing (*.ifcx)", "IFCX_Export")
FreeCAD.addExportType("IFCX Binary (*.ifcxb)", "IFCX_Export")
FreeCAD.addExportType("DXF Drawing (*.dxf)", "IFCX_Export")

FreeCAD.Console.PrintLog("IFCX Workbench: file type handlers registered.\n")
