//! IFCX file writer.

use crate::{IfcxDocument, IfcxError};
use std::path::Path;

pub struct IfcxWriter;

impl IfcxWriter {
    /// Write to formatted JSON string.
    pub fn to_string(doc: &IfcxDocument) -> Result<String, IfcxError> {
        Ok(serde_json::to_string_pretty(&doc.file)?)
    }

    /// Write compact JSON string.
    pub fn to_compact_string(doc: &IfcxDocument) -> Result<String, IfcxError> {
        Ok(serde_json::to_string(&doc.file)?)
    }

    /// Write to file.
    pub fn to_file(doc: &IfcxDocument, path: impl AsRef<Path>) -> Result<(), IfcxError> {
        let json = Self::to_string(doc)?;
        std::fs::write(path, json)?;
        Ok(())
    }
}
