"""
IFCX Format - Blender Import/Export Addon

Supports IFCX (JSON), IFCXB (binary), DXF, and DGN file formats
for exchanging 2D/3D CAD and BIM drawing data.
"""

bl_info = {
    "name": "IFCX Format",
    "author": "IFCX Project",
    "version": (0, 1, 0),
    "blender": (3, 6, 0),
    "location": "File > Import/Export",
    "description": "Import/Export IFCX, IFCXB, DXF, and DGN files",
    "doc_url": "https://github.com/nicholasdejong/Ifc-Factory",
    "tracker_url": "https://github.com/nicholasdejong/Ifc-Factory/issues",
    "category": "Import-Export",
}

# Support live reloading during development
if "bpy" in locals():
    import importlib
    if "ifcx_core" in locals():
        importlib.reload(ifcx_core)
    if "import_ifcx" in locals():
        importlib.reload(import_ifcx)
    if "export_ifcx" in locals():
        importlib.reload(export_ifcx)
    if "bonsai_bridge" in locals():
        importlib.reload(bonsai_bridge)

import bpy
from bpy.props import StringProperty

from . import ifcx_core
from . import import_ifcx
from . import export_ifcx
from . import bonsai_bridge


# ============================================================================
# Menu draw functions
# ============================================================================

def menu_func_import(self, context):
    self.layout.operator(
        import_ifcx.IMPORT_OT_ifcx.bl_idname,
        text="IFCX / IFCXB / DXF / DGN (.ifcx, .ifcxb, .dxf, .dgn)",
    )


def menu_func_export(self, context):
    self.layout.operator(
        export_ifcx.EXPORT_OT_ifcx.bl_idname,
        text="IFCX / IFCXB / DXF (.ifcx, .ifcxb, .dxf)",
    )


# ============================================================================
# Registration
# ============================================================================

_classes = (
    import_ifcx.IMPORT_OT_ifcx,
    export_ifcx.EXPORT_OT_ifcx,
)


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)

    bpy.types.TOPBAR_MT_file_import.append(menu_func_import)
    bpy.types.TOPBAR_MT_file_export.append(menu_func_export)

    # Register Bonsai bridge if available
    bonsai_bridge.register()


def unregister():
    bonsai_bridge.unregister()

    bpy.types.TOPBAR_MT_file_export.remove(menu_func_export)
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)

    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
