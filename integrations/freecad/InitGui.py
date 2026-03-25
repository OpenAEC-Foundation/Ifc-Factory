"""IFCX Workbench -- InitGui.py

Called when the FreeCAD GUI is available. Registers the IFCX workbench,
toolbar commands, and menu items.
"""

import os
import FreeCAD
import FreeCADGui

# Path to this workbench directory
_IFCX_DIR = os.path.dirname(os.path.abspath(__file__))
_ICON_DIR = os.path.join(_IFCX_DIR, "resources", "icons")


def _icon(name):
    """Return full path for an icon file, or empty string if not found."""
    path = os.path.join(_ICON_DIR, name)
    return path if os.path.isfile(path) else ""


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

class CommandImportIFCX:
    """Import an IFCX/IFCXB file into the active document."""

    def GetResources(self):
        return {
            "Pixmap": _icon("ifcx_import.svg"),
            "MenuText": "Import IFCX...",
            "ToolTip": "Import an IFCX or IFCXB drawing file",
        }

    def Activated(self):
        from PySide import QtGui  # noqa: F811
        filters = "IFCX files (*.ifcx *.ifcxb);;All files (*.*)"
        fname, _ = QtGui.QFileDialog.getOpenFileName(
            None, "Import IFCX", "", filters
        )
        if fname:
            import IFCX_Import
            IFCX_Import.insert(fname, FreeCAD.ActiveDocument.Name if FreeCAD.ActiveDocument else None)

    def IsActive(self):
        return True


class CommandExportIFCX:
    """Export the active document to IFCX format."""

    def GetResources(self):
        return {
            "Pixmap": _icon("ifcx_export.svg"),
            "MenuText": "Export IFCX...",
            "ToolTip": "Export to IFCX drawing format (.ifcx)",
        }

    def Activated(self):
        from PySide import QtGui
        filters = "IFCX files (*.ifcx);;All files (*.*)"
        fname, _ = QtGui.QFileDialog.getSaveFileName(
            None, "Export IFCX", "", filters
        )
        if fname:
            import IFCX_Export
            IFCX_Export.export([], fname)

    def IsActive(self):
        return FreeCAD.ActiveDocument is not None


class CommandExportIFCXB:
    """Export the active document to IFCXB binary format."""

    def GetResources(self):
        return {
            "Pixmap": _icon("ifcx_export.svg"),
            "MenuText": "Export IFCXB...",
            "ToolTip": "Export to IFCXB binary drawing format (.ifcxb)",
        }

    def Activated(self):
        from PySide import QtGui
        filters = "IFCXB files (*.ifcxb);;All files (*.*)"
        fname, _ = QtGui.QFileDialog.getSaveFileName(
            None, "Export IFCXB", "", filters
        )
        if fname:
            import IFCX_Export
            IFCX_Export.export([], fname)

    def IsActive(self):
        return FreeCAD.ActiveDocument is not None


class CommandExportDXF:
    """Export the active document to DXF format via IFCX."""

    def GetResources(self):
        return {
            "Pixmap": _icon("ifcx_export.svg"),
            "MenuText": "Export DXF...",
            "ToolTip": "Export to DXF drawing format (.dxf)",
        }

    def Activated(self):
        from PySide import QtGui
        filters = "DXF files (*.dxf);;All files (*.*)"
        fname, _ = QtGui.QFileDialog.getSaveFileName(
            None, "Export DXF", "", filters
        )
        if fname:
            import IFCX_Export
            IFCX_Export.export([], fname)

    def IsActive(self):
        return FreeCAD.ActiveDocument is not None


# ---------------------------------------------------------------------------
# Register commands
# ---------------------------------------------------------------------------

FreeCADGui.addCommand("IFCX_Import", CommandImportIFCX())
FreeCADGui.addCommand("IFCX_Export", CommandExportIFCX())
FreeCADGui.addCommand("IFCX_ExportBinary", CommandExportIFCXB())
FreeCADGui.addCommand("IFCX_ExportDXF", CommandExportDXF())


# ---------------------------------------------------------------------------
# Workbench class
# ---------------------------------------------------------------------------

class IFCXWorkbench(FreeCADGui.Workbench):
    """IFCX Workbench -- import/export IFCX, IFCXB, and DXF files."""

    MenuText = "IFCX"
    ToolTip = "Import and export IFCX / IFCXB / DXF drawing files"
    Icon = _icon("ifcx_workbench.svg")

    def Initialize(self):
        """Called when the workbench is first activated."""
        cmd_list = [
            "IFCX_Import",
            "IFCX_Export",
            "IFCX_ExportBinary",
            "IFCX_ExportDXF",
        ]
        self.appendToolbar("IFCX", cmd_list)
        self.appendMenu("IFCX", cmd_list)
        FreeCAD.Console.PrintLog("IFCX Workbench initialized.\n")

    def Activated(self):
        """Called when the workbench is selected."""
        FreeCAD.Console.PrintLog("IFCX Workbench activated.\n")

    def Deactivated(self):
        """Called when another workbench is selected."""
        pass

    def GetClassName(self):
        return "Gui::PythonWorkbench"


FreeCADGui.addWorkbench(IFCXWorkbench())
