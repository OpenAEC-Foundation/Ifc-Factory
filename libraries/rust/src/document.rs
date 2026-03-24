//! In-memory IFCX document.

use crate::types::*;
use std::collections::HashMap;

/// In-memory representation of an IFCX document.
pub struct IfcxDocument {
    pub file: IfcxFile,
    next_handle: u64,
}

impl IfcxDocument {
    /// Create a new empty document.
    pub fn new() -> Self {
        Self {
            file: IfcxFile {
                ifcx: "1.0".to_string(),
                header: Header {
                    version: None,
                    author: None,
                    organization: None,
                    application: None,
                    units: Some(Units {
                        linear: Some("millimeters".to_string()),
                        measurement: Some("metric".to_string()),
                        extra: HashMap::new(),
                    }),
                    extents: None,
                    limits: None,
                    current_layer: Some("0".to_string()),
                    linetype_scale: None,
                    extra: HashMap::new(),
                },
                tables: Some(Tables {
                    layers: Some(HashMap::from([("0".to_string(), Layer {
                        color: None, linetype: None, lineweight: None,
                        frozen: None, locked: None, off: None, plot: None,
                    })])),
                    linetypes: Some(HashMap::new()),
                    text_styles: Some(HashMap::new()),
                    dim_styles: Some(HashMap::new()),
                    extra: HashMap::new(),
                }),
                blocks: Some(HashMap::new()),
                entities: Vec::new(),
                objects: None,
                extensions: None,
            },
            next_handle: 1,
        }
    }

    /// Generate a unique hex handle.
    pub fn alloc_handle(&mut self) -> String {
        let handle = format!("{:X}", self.next_handle);
        self.next_handle += 1;
        handle
    }

    /// Add an entity and auto-assign handle.
    pub fn add_entity(&mut self, mut entity: Entity) -> String {
        let handle = self.alloc_handle();
        entity.handle = Some(handle.clone());
        self.file.entities.push(entity);
        handle
    }

    /// Find entities by type.
    pub fn find_by_type(&self, entity_type: &str) -> Vec<&Entity> {
        self.file.entities.iter()
            .filter(|e| e.entity_type == entity_type)
            .collect()
    }

    /// Find entities on a layer.
    pub fn find_by_layer(&self, layer: &str) -> Vec<&Entity> {
        self.file.entities.iter()
            .filter(|e| e.layer.as_deref() == Some(layer))
            .collect()
    }
}

impl Default for IfcxDocument {
    fn default() -> Self {
        Self::new()
    }
}

impl From<IfcxFile> for IfcxDocument {
    fn from(file: IfcxFile) -> Self {
        Self { file, next_handle: 1 }
    }
}
