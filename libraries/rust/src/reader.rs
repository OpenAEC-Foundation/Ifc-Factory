//! IFCX file reader.

use crate::{IfcxDocument, IfcxError};
use crate::types::IfcxFile;
use std::path::Path;

pub struct IfcxReader;

impl IfcxReader {
    /// Read from JSON string.
    pub fn from_str(json: &str) -> Result<IfcxDocument, IfcxError> {
        let file: IfcxFile = serde_json::from_str(json)?;
        Ok(IfcxDocument::from(file))
    }

    /// Read from file path.
    pub fn from_file(path: impl AsRef<Path>) -> Result<IfcxDocument, IfcxError> {
        let content = std::fs::read_to_string(path)?;
        Self::from_str(&content)
    }

    /// Read from bytes.
    pub fn from_bytes(data: &[u8]) -> Result<IfcxDocument, IfcxError> {
        let json = std::str::from_utf8(data)
            .map_err(|e| IfcxError::InvalidBinary(e.to_string()))?;
        Self::from_str(json)
    }
}
