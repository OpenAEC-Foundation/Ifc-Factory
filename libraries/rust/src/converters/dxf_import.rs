//! DXF to IFCX importer.

use crate::{IfcxDocument, IfcxError};
use std::path::Path;

pub struct DxfImporter;

impl DxfImporter {
    /// Import DXF from string.
    pub fn from_str(_dxf: &str) -> Result<IfcxDocument, IfcxError> {
        // TODO: Implement DXF parser
        // 1. Tokenize group code / value pairs
        // 2. Parse HEADER, TABLES, BLOCKS, ENTITIES, OBJECTS sections
        // 3. Map each DXF entity type to IFCX Entity
        Err(IfcxError::NotImplemented("DXF import".to_string()))
    }

    /// Import DXF from file.
    pub fn from_file(path: impl AsRef<Path>) -> Result<IfcxDocument, IfcxError> {
        let content = std::fs::read_to_string(path)?;
        Self::from_str(&content)
    }
}
