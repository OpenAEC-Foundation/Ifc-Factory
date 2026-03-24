//! IFCX to DXF exporter.

use crate::{IfcxDocument, IfcxError};
use std::path::Path;

pub struct DxfExporter;

impl DxfExporter {
    /// Export to DXF string.
    pub fn to_string(_doc: &IfcxDocument, _version: &str) -> Result<String, IfcxError> {
        // TODO: Implement DXF writer
        // 1. Write HEADER section
        // 2. Write TABLES (layers, linetypes, styles, dimstyles)
        // 3. Write BLOCKS
        // 4. Write ENTITIES
        // 5. Write OBJECTS
        // 6. Write EOF
        Err(IfcxError::NotImplemented("DXF export".to_string()))
    }

    /// Export to DXF file.
    pub fn to_file(doc: &IfcxDocument, path: impl AsRef<Path>, version: &str) -> Result<(), IfcxError> {
        let dxf = Self::to_string(doc, version)?;
        std::fs::write(path, dxf)?;
        Ok(())
    }
}
