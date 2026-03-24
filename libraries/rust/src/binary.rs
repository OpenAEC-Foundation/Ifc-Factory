//! IFCXB binary format encoder/decoder.

use crate::{IfcxDocument, IfcxError};

const MAGIC: &[u8; 4] = b"IFCX";

pub struct IfcxbEncoder;
pub struct IfcxbDecoder;

impl IfcxbEncoder {
    /// Encode document to IFCXB binary.
    pub fn encode(_doc: &IfcxDocument) -> Result<Vec<u8>, IfcxError> {
        // TODO: Implement IFCXB encoding
        Err(IfcxError::NotImplemented("IFCXB encoding".to_string()))
    }
}

impl IfcxbDecoder {
    /// Decode IFCXB binary to document.
    pub fn decode(data: &[u8]) -> Result<IfcxDocument, IfcxError> {
        if data.len() < 16 {
            return Err(IfcxError::InvalidBinary("file too short".to_string()));
        }
        if &data[0..4] != MAGIC {
            return Err(IfcxError::InvalidBinary("bad magic bytes".to_string()));
        }
        // TODO: Implement IFCXB decoding
        Err(IfcxError::NotImplemented("IFCXB decoding".to_string()))
    }
}
