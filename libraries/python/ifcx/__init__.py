"""
ifcx - IFCX/IFCXB reader and writer
Open-source alternative to DWG/DXF
"""

from ifcx.document import IfcxDocument
from ifcx.reader import IfcxReader
from ifcx.writer import IfcxWriter
from ifcx.binary import IfcxbEncoder, IfcxbDecoder

__version__ = "0.1.0"
__all__ = [
    "IfcxDocument",
    "IfcxReader",
    "IfcxWriter",
    "IfcxbEncoder",
    "IfcxbDecoder",
]
