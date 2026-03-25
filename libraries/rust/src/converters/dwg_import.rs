//! DWG to IFCX importer -- pure Rust.
//!
//! Uses the built-in `DwgParser` to read DWG binary files and converts
//! the parsed data into an `IfcxDocument`.

use std::collections::HashMap;
use std::path::Path;

use crate::types::*;
use crate::{IfcxDocument, IfcxError};
use super::dwg_parser::{DwgFile, DwgParser};

/// Imports DWG binary files into IFCX documents.
pub struct DwgImporter;

impl DwgImporter {
    /// Import DWG from a file path.
    pub fn from_file(path: impl AsRef<Path>) -> Result<IfcxDocument, IfcxError> {
        let data = std::fs::read(path)?;
        Self::from_bytes(&data)
    }

    /// Import DWG from raw bytes.
    pub fn from_bytes(data: &[u8]) -> Result<IfcxDocument, IfcxError> {
        let mut parser = DwgParser::new();
        let dwg = parser.parse(data)?;
        Ok(Self::convert(&dwg))
    }

    // ------------------------------------------------------------------
    // Conversion
    // ------------------------------------------------------------------

    fn convert(dwg: &DwgFile) -> IfcxDocument {
        let mut doc = IfcxDocument::new();

        doc.file.header = Self::convert_header(dwg);
        doc.file.tables = Some(Self::convert_tables(dwg));
        doc.file.blocks = Some(Self::convert_blocks(dwg));
        doc.file.entities = Self::convert_entities(dwg);
        doc.file.objects = Some(Self::convert_objects(dwg));

        doc
    }

    // ------------------------------------------------------------------
    // Header
    // ------------------------------------------------------------------

    fn convert_header(dwg: &DwgFile) -> Header {
        let version = dwg.header_vars.get("$ACADVER")
            .and_then(|v| v.as_str())
            .unwrap_or(&dwg.version_code)
            .to_string();

        let lunits = dwg.header_vars.get("$LUNITS")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        let unit_map: HashMap<i64, &str> = [
            (0, "unitless"), (1, "scientific"), (2, "decimal"),
            (3, "engineering"), (4, "architectural"), (5, "fractional"),
        ].iter().cloned().collect();

        let measurement = dwg.header_vars.get("$MEASUREMENT")
            .and_then(|v| v.as_i64())
            .unwrap_or(1);

        let linear = unit_map.get(&lunits).unwrap_or(&"unitless").to_string();
        let meas_str = if measurement == 1 { "metric" } else { "imperial" };

        let linetype_scale = dwg.header_vars.get("$LTSCALE")
            .and_then(|v| v.as_f64());

        Header {
            version: Some(version),
            author: None,
            organization: None,
            application: None,
            units: Some(Units {
                linear: Some(linear),
                measurement: Some(meas_str.to_string()),
                extra: HashMap::new(),
            }),
            extents: None,
            limits: None,
            current_layer: None,
            linetype_scale,
            extra: HashMap::new(),
        }
    }

    // ------------------------------------------------------------------
    // Tables
    // ------------------------------------------------------------------

    fn convert_tables(dwg: &DwgFile) -> Tables {
        let mut layers: HashMap<String, Layer> = HashMap::new();
        let mut linetypes: HashMap<String, serde_json::Value> = HashMap::new();
        let mut text_styles: HashMap<String, serde_json::Value> = HashMap::new();

        for obj in &dwg.objects {
            match obj.type_name.as_str() {
                "LAYER" => {
                    let name = obj.data.get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    if name.is_empty() { continue; }

                    let color = obj.data.get("color")
                        .and_then(|v| v.as_i64())
                        .map(|c| Color::Index(c as i32));
                    let frozen = obj.data.get("frozen").and_then(|v| v.as_bool());
                    let off = obj.data.get("off").and_then(|v| v.as_bool());
                    let locked = obj.data.get("locked").and_then(|v| v.as_bool());

                    layers.insert(name, Layer {
                        color, linetype: None, lineweight: None,
                        frozen, locked, off, plot: None,
                    });
                }
                "STYLE" => {
                    let name = obj.data.get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    if name.is_empty() { continue; }

                    let mut props = serde_json::Map::new();
                    if let Some(font) = obj.data.get("fontName").and_then(|v| v.as_str()) {
                        props.insert("fontFamily".into(), serde_json::json!(font));
                    }
                    if let Some(h) = obj.data.get("fixedHeight").and_then(|v| v.as_f64()) {
                        if h > 0.0 {
                            props.insert("height".into(), serde_json::json!(h));
                        }
                    }
                    text_styles.insert(name, serde_json::Value::Object(props));
                }
                "LTYPE" => {
                    let name = obj.data.get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    if name.is_empty() || name == "ByBlock" || name == "ByLayer" || name == "Continuous" {
                        continue;
                    }

                    let mut props = serde_json::Map::new();
                    if let Some(desc) = obj.data.get("description").and_then(|v| v.as_str()) {
                        props.insert("description".into(), serde_json::json!(desc));
                    }
                    linetypes.insert(name, serde_json::Value::Object(props));
                }
                _ => {}
            }
        }

        // Ensure layer "0" exists
        layers.entry("0".to_string()).or_insert_with(|| Layer {
            color: None, linetype: None, lineweight: None,
            frozen: None, locked: None, off: None, plot: None,
        });

        Tables {
            layers: Some(layers),
            linetypes: Some(linetypes),
            text_styles: Some(text_styles),
            dim_styles: Some(HashMap::new()),
            extra: HashMap::new(),
        }
    }

    // ------------------------------------------------------------------
    // Blocks
    // ------------------------------------------------------------------

    fn convert_blocks(dwg: &DwgFile) -> HashMap<String, BlockDefinition> {
        let mut blocks = HashMap::new();
        for obj in &dwg.objects {
            if obj.type_name == "BLOCK_HEADER" {
                let name = obj.data.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if name.is_empty() { continue; }
                if name.starts_with("*Model_Space") || name.starts_with("*Paper_Space") {
                    continue;
                }
                blocks.insert(name.clone(), BlockDefinition {
                    name,
                    base_point: Some([0.0, 0.0, 0.0]),
                    entities: Some(Vec::new()),
                    extra: HashMap::new(),
                });
            }
        }
        blocks
    }

    // ------------------------------------------------------------------
    // Entities
    // ------------------------------------------------------------------

    fn convert_entities(dwg: &DwgFile) -> Vec<Entity> {
        dwg.objects.iter()
            .filter(|obj| obj.is_entity)
            .filter_map(|obj| Self::convert_entity(obj))
            .collect()
    }

    fn convert_entity(obj: &super::dwg_parser::DwgObject) -> Option<Entity> {
        let mut properties: HashMap<String, serde_json::Value> = HashMap::new();

        for (key, value) in &obj.data {
            if key == "type" || key == "handle" { continue; }
            if key.starts_with('_') { continue; }
            properties.insert(key.clone(), value.clone());
        }

        // Handle normalization
        let handle = Some(format!("{:X}", obj.handle));

        // Normalize: remove color 0/256 (BYLAYER/BYBLOCK)
        if let Some(serde_json::Value::Number(n)) = properties.get("color") {
            if n.as_i64() == Some(0) || n.as_i64() == Some(256) {
                properties.remove("color");
            }
        }

        // Remove zero thickness
        if let Some(serde_json::Value::Number(n)) = properties.get("thickness") {
            if n.as_f64() == Some(0.0) {
                properties.remove("thickness");
            }
        }

        // Remove default extrusion [0,0,1]
        if let Some(serde_json::Value::Array(arr)) = properties.get("extrusion") {
            if arr.len() == 3
                && arr[0].as_f64() == Some(0.0)
                && arr[1].as_f64() == Some(0.0)
                && arr[2].as_f64() == Some(1.0)
            {
                properties.remove("extrusion");
            }
        }

        // Remove internal fields
        properties.remove("entity_mode");
        properties.remove("linetype_scale");
        properties.remove("invisible");
        if let Some(serde_json::Value::Number(n)) = properties.get("lineweight") {
            let lw = n.as_i64().unwrap_or(0);
            if lw == 29 || lw < 0 {
                properties.remove("lineweight");
            }
        }

        Some(Entity {
            entity_type: obj.type_name.clone(),
            handle,
            layer: None,
            properties,
        })
    }

    // ------------------------------------------------------------------
    // Objects
    // ------------------------------------------------------------------

    fn convert_objects(dwg: &DwgFile) -> Vec<serde_json::Value> {
        let mut objects = Vec::new();
        for obj in &dwg.objects {
            if obj.type_name == "DICTIONARY" {
                let handle = format!("{:X}", obj.handle);
                let mut converted = serde_json::json!({
                    "objectType": "DICTIONARY",
                    "handle": handle,
                });
                if let Some(entries) = obj.data.get("entries") {
                    converted["entries"] = entries.clone();
                }
                objects.push(converted);
            }
        }
        objects
    }
}
