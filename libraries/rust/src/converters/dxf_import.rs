//! DXF to IFCX importer -- pure Rust.
//!
//! Uses the built-in `DxfParser` to read DXF ASCII files and converts
//! the parsed data into an `IfcxDocument`.

use std::collections::HashMap;
use std::path::Path;

use crate::types::*;
use crate::{IfcxDocument, IfcxError};
use super::dxf_parser::{DxfFile, DxfParser};
use super::dxf_tokenizer::DxfValue;

/// Imports DXF files into IFCX documents.
pub struct DxfImporter;

impl DxfImporter {
    /// Import DXF from a string.
    pub fn from_str(dxf: &str) -> Result<IfcxDocument, IfcxError> {
        let dxf_file = DxfParser::parse(dxf)?;
        Ok(Self::convert(&dxf_file))
    }

    /// Import DXF from a file.
    pub fn from_file(path: impl AsRef<Path>) -> Result<IfcxDocument, IfcxError> {
        let content = std::fs::read_to_string(path)?;
        Self::from_str(&content)
    }

    // ------------------------------------------------------------------
    // Conversion
    // ------------------------------------------------------------------

    fn convert(dxf_file: &DxfFile) -> IfcxDocument {
        let mut doc = IfcxDocument::new();

        doc.file.header = Self::convert_header(dxf_file);
        doc.file.tables = Some(Self::convert_tables(dxf_file));
        doc.file.blocks = Some(Self::convert_blocks(dxf_file));
        doc.file.entities = Self::convert_entities(dxf_file);
        doc.file.objects = Some(Self::convert_objects(dxf_file));

        doc
    }

    // ------------------------------------------------------------------
    // Header
    // ------------------------------------------------------------------

    fn convert_header(dxf: &DxfFile) -> Header {
        let version = dxf.header.get("$ACADVER")
            .map(|v| v.as_str_value())
            .unwrap_or_else(|| "AC1032".to_string());

        let insunits = dxf.header.get("$INSUNITS")
            .map(|v| v.as_i64())
            .unwrap_or(0);

        let unit_map: HashMap<i64, &str> = [
            (0, "unitless"), (1, "inches"), (2, "feet"), (3, "miles"),
            (4, "millimeters"), (5, "centimeters"), (6, "meters"), (7, "kilometers"),
        ].iter().cloned().collect();

        let measurement = dxf.header.get("$MEASUREMENT")
            .map(|v| v.as_i64())
            .unwrap_or(1);

        let linear = unit_map.get(&insunits)
            .unwrap_or(&"unitless")
            .to_string();

        let meas_str = if measurement == 1 { "metric" } else { "imperial" };

        let current_layer = dxf.header.get("$CLAYER")
            .map(|v| v.as_str_value());

        let linetype_scale = dxf.header.get("$LTSCALE")
            .map(|v| v.as_f64());

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
            current_layer,
            linetype_scale,
            extra: HashMap::new(),
        }
    }

    // ------------------------------------------------------------------
    // Tables
    // ------------------------------------------------------------------

    fn convert_tables(dxf: &DxfFile) -> Tables {
        let mut layers: HashMap<String, Layer> = HashMap::new();
        let mut linetypes: HashMap<String, serde_json::Value> = HashMap::new();
        let mut text_styles: HashMap<String, serde_json::Value> = HashMap::new();
        let mut dim_styles: HashMap<String, serde_json::Value> = HashMap::new();

        // Layers
        if let Some(layer_entries) = dxf.tables.get("LAYER") {
            for entry in layer_entries {
                let name = match entry.get("name") {
                    Some(v) => v.as_str_value(),
                    None => continue,
                };
                if name.is_empty() { continue; }

                let color = entry.get("color").map(|v| {
                    Color::Index(v.as_i64() as i32)
                });
                let linetype = entry.get("linetype").map(|v| v.as_str_value());
                let lineweight = entry.get("lineweight").map(|v| v.as_f64());
                let frozen = entry.get("frozen").map(|v| v.as_bool());
                let locked = entry.get("locked").map(|v| v.as_bool());
                let off = entry.get("off").map(|v| v.as_bool());
                let plot = entry.get("plot").map(|v| v.as_bool());

                layers.insert(name, Layer {
                    color, linetype, lineweight, frozen, locked, off, plot,
                });
            }
        }

        // Ensure layer "0" exists
        layers.entry("0".to_string()).or_insert_with(|| Layer {
            color: None, linetype: None, lineweight: None,
            frozen: None, locked: None, off: None, plot: None,
        });

        // Linetypes
        if let Some(ltype_entries) = dxf.tables.get("LTYPE") {
            for entry in ltype_entries {
                let name = match entry.get("name") {
                    Some(v) => v.as_str_value(),
                    None => continue,
                };
                if name.is_empty() || name == "ByBlock" || name == "ByLayer" || name == "Continuous" {
                    continue;
                }
                let mut props = serde_json::Map::new();
                if let Some(desc) = entry.get("description") {
                    props.insert("description".into(), serde_json::Value::String(desc.as_str_value()));
                }
                linetypes.insert(name, serde_json::Value::Object(props));
            }
        }

        // Text styles
        if let Some(style_entries) = dxf.tables.get("STYLE") {
            for entry in style_entries {
                let name = match entry.get("name") {
                    Some(v) => v.as_str_value(),
                    None => continue,
                };
                if name.is_empty() { continue; }
                let mut props = serde_json::Map::new();
                if let Some(font) = entry.get("font") {
                    props.insert("fontFamily".into(), serde_json::Value::String(font.as_str_value()));
                }
                if let Some(h) = entry.get("height") {
                    let hv = h.as_f64();
                    if hv > 0.0 {
                        props.insert("height".into(), serde_json::json!(hv));
                    }
                }
                if let Some(wf) = entry.get("widthFactor") {
                    props.insert("widthFactor".into(), serde_json::json!(wf.as_f64()));
                }
                text_styles.insert(name, serde_json::Value::Object(props));
            }
        }

        // Dim styles
        if let Some(ds_entries) = dxf.tables.get("DIMSTYLE") {
            for entry in ds_entries {
                let name = match entry.get("name") {
                    Some(v) => v.as_str_value(),
                    None => continue,
                };
                if name.is_empty() { continue; }
                let mut props = serde_json::Map::new();
                if let Some(v) = entry.get("DIMTXT") {
                    props.insert("textHeight".into(), serde_json::json!(v.as_f64()));
                }
                if let Some(v) = entry.get("DIMASZ") {
                    props.insert("arrowSize".into(), serde_json::json!(v.as_f64()));
                }
                if let Some(v) = entry.get("DIMSCALE") {
                    props.insert("overallScale".into(), serde_json::json!(v.as_f64()));
                }
                dim_styles.insert(name, serde_json::Value::Object(props));
            }
        }

        Tables {
            layers: Some(layers),
            linetypes: Some(linetypes),
            text_styles: Some(text_styles),
            dim_styles: Some(dim_styles),
            extra: HashMap::new(),
        }
    }

    // ------------------------------------------------------------------
    // Blocks
    // ------------------------------------------------------------------

    fn convert_blocks(dxf: &DxfFile) -> HashMap<String, BlockDefinition> {
        let mut blocks = HashMap::new();
        for (name, block_data) in &dxf.blocks {
            if name.starts_with("*Model_Space") || name.starts_with("*Paper_Space") {
                continue;
            }
            let entities: Vec<Entity> = block_data.entities.iter()
                .filter_map(|e| Self::convert_entity(e))
                .collect();

            blocks.insert(name.clone(), BlockDefinition {
                name: name.clone(),
                base_point: Some(block_data.base_point),
                entities: Some(entities),
                extra: HashMap::new(),
            });
        }
        blocks
    }

    // ------------------------------------------------------------------
    // Entities
    // ------------------------------------------------------------------

    fn convert_entities(dxf: &DxfFile) -> Vec<Entity> {
        dxf.entities.iter()
            .filter_map(|e| Self::convert_entity(e))
            .collect()
    }

    fn convert_entity(ent: &HashMap<String, DxfValue>) -> Option<Entity> {
        let entity_type = ent.get("type")?.as_str_value();
        let handle = ent.get("handle").map(|v| v.as_str_value());
        let layer = ent.get("layer").map(|v| v.as_str_value());

        let mut properties = HashMap::new();

        // Copy all properties except internal ones
        for (key, value) in ent {
            if key == "type" || key == "handle" || key == "layer" {
                continue;
            }
            if key.starts_with('_') {
                continue;
            }
            // Convert point components to JSON arrays where applicable
            properties.insert(key.clone(), value.to_json());
        }

        // Normalize lineweight: convert from DXF units (1/100 mm) to mm
        let lw_action = properties.get("lineweight")
            .and_then(|v| v.as_f64())
            .map(|lw| if lw >= 0.0 { Some(lw / 100.0) } else { None });
        match lw_action {
            Some(Some(new_lw)) => { properties.insert("lineweight".to_string(), serde_json::json!(new_lw)); }
            Some(None) => { properties.remove("lineweight"); }
            None => {}
        }

        // Remove BYLAYER color (256)
        let remove_color = properties.get("color")
            .and_then(|v| v.as_i64())
            .map(|c| c == 256)
            .unwrap_or(false);
        if remove_color {
            properties.remove("color");
        }

        // Remove BYLAYER linetype
        let remove_lt = properties.get("linetype")
            .and_then(|v| v.as_str())
            .map(|s| s == "BYLAYER")
            .unwrap_or(false);
        if remove_lt {
            properties.remove("linetype");
        }

        // Consolidate point components into arrays for common patterns
        Self::consolidate_point(&mut properties, "start", &["start_x", "start_y", "start_z"]);
        Self::consolidate_point(&mut properties, "end", &["end_x", "end_y", "end_z"]);
        Self::consolidate_point(&mut properties, "center", &["center_x", "center_y", "center_z"]);
        Self::consolidate_point(&mut properties, "position", &["position_x", "position_y", "position_z"]);
        Self::consolidate_point(&mut properties, "insertionPoint", &["insertionPoint_x", "insertionPoint_y", "insertionPoint_z"]);
        Self::consolidate_point(&mut properties, "majorAxisEndpoint", &["majorAxis_x", "majorAxis_y", "majorAxis_z"]);
        Self::consolidate_point(&mut properties, "origin", &["origin_x", "origin_y", "origin_z"]);
        Self::consolidate_point(&mut properties, "direction", &["direction_x", "direction_y", "direction_z"]);
        Self::consolidate_point(&mut properties, "dimLinePoint", &["dimLinePoint_x", "dimLinePoint_y", "dimLinePoint_z"]);
        Self::consolidate_point(&mut properties, "textPosition", &["textPosition_x", "textPosition_y", "textPosition_z"]);
        Self::consolidate_point(&mut properties, "defPoint1", &["defPoint1_x", "defPoint1_y", "defPoint1_z"]);
        Self::consolidate_point(&mut properties, "defPoint2", &["defPoint2_x", "defPoint2_y", "defPoint2_z"]);
        Self::consolidate_point(&mut properties, "defPoint3", &["defPoint3_x", "defPoint3_y", "defPoint3_z"]);
        Self::consolidate_point(&mut properties, "alignmentPoint", &["alignmentPoint_x", "alignmentPoint_y", "alignmentPoint_z"]);

        // Consolidate 4-point entities
        for i in 1..=4 {
            let name = format!("point{}", i);
            let kx = format!("point{}_x", i);
            let ky = format!("point{}_y", i);
            let kz = format!("point{}_z", i);
            Self::consolidate_point(&mut properties, &name, &[&kx, &ky, &kz]);
        }

        // Parse JSON-encoded arrays back into proper JSON values
        Self::parse_json_field(&mut properties, "vertices");
        Self::parse_json_field(&mut properties, "knots");
        Self::parse_json_field(&mut properties, "controlPoints");
        Self::parse_json_field(&mut properties, "fitPoints");
        Self::parse_json_field(&mut properties, "weights");
        Self::parse_json_field(&mut properties, "faces");
        Self::parse_json_field(&mut properties, "attributes");

        // Apply entity-specific normalization
        match entity_type.as_str() {
            "ARC" => {
                // Convert angles from degrees to radians
                let sa = properties.get("startAngle").and_then(|v| v.as_f64());
                if let Some(a) = sa {
                    properties.insert("startAngle".to_string(), serde_json::json!(a.to_radians()));
                }
                let ea = properties.get("endAngle").and_then(|v| v.as_f64());
                if let Some(a) = ea {
                    properties.insert("endAngle".to_string(), serde_json::json!(a.to_radians()));
                }
            }
            "TEXT" => {
                let rot = properties.get("rotation").and_then(|v| v.as_f64());
                if let Some(a) = rot {
                    properties.insert("rotation".to_string(), serde_json::json!(a.to_radians()));
                }
                let halign = properties.get("horizontalAlignment").and_then(|v| v.as_i64());
                if let Some(h) = halign {
                    let h_str = match h {
                        0 => "left", 1 => "center", 2 => "right",
                        3 => "aligned", 4 => "middle", 5 => "fit",
                        _ => "left",
                    };
                    properties.insert("horizontalAlignment".to_string(), serde_json::json!(h_str));
                }
            }
            "MTEXT" => {
                let att = properties.get("attachment").and_then(|v| v.as_i64());
                if let Some(a) = att {
                    let att_str = match a {
                        1 => "top_left", 2 => "top_center", 3 => "top_right",
                        4 => "middle_left", 5 => "middle_center", 6 => "middle_right",
                        7 => "bottom_left", 8 => "bottom_center", 9 => "bottom_right",
                        _ => "top_left",
                    };
                    properties.insert("attachment".to_string(), serde_json::json!(att_str));
                }
            }
            "INSERT" => {
                let rot = properties.get("rotation").and_then(|v| v.as_f64());
                if let Some(a) = rot {
                    properties.insert("rotation".to_string(), serde_json::json!(a.to_radians()));
                }
            }
            "LEADER" => {
                properties.entry("hasArrowhead".to_string()).or_insert(serde_json::json!(true));
                properties.entry("pathType".to_string()).or_insert(serde_json::json!("straight"));
            }
            _ => {}
        }

        Some(Entity {
            entity_type,
            handle,
            layer,
            properties,
        })
    }

    /// Consolidate x/y/z component keys into a single JSON array.
    fn consolidate_point(
        properties: &mut HashMap<String, serde_json::Value>,
        name: &str,
        keys: &[&str],
    ) {
        if keys.len() < 3 { return; }
        let x = properties.get(keys[0]).and_then(|v| v.as_f64());
        let y = properties.get(keys[1]).and_then(|v| v.as_f64());
        let z = properties.get(keys[2]).and_then(|v| v.as_f64());

        if x.is_some() || y.is_some() || z.is_some() {
            let point = serde_json::json!([
                x.unwrap_or(0.0),
                y.unwrap_or(0.0),
                z.unwrap_or(0.0),
            ]);
            properties.insert(name.to_string(), point);
            for key in keys {
                properties.remove(*key);
            }
        }
    }

    /// Parse a JSON-encoded string field back into a proper JSON value.
    fn parse_json_field(properties: &mut HashMap<String, serde_json::Value>, key: &str) {
        if let Some(serde_json::Value::String(s)) = properties.get(key) {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(s) {
                properties.insert(key.to_string(), parsed);
            }
        }
    }

    // ------------------------------------------------------------------
    // Objects
    // ------------------------------------------------------------------

    fn convert_objects(dxf: &DxfFile) -> Vec<serde_json::Value> {
        let mut objects = Vec::new();
        for obj in &dxf.objects {
            let obj_type = match obj.get("type") {
                Some(v) => v.as_str_value(),
                None => continue,
            };
            match obj_type.as_str() {
                "LAYOUT" => {
                    let name = obj.get("name").map(|v| v.as_str_value()).unwrap_or_default();
                    objects.push(serde_json::json!({
                        "objectType": "LAYOUT",
                        "name": name,
                        "isModelSpace": name == "Model",
                    }));
                }
                "DICTIONARY" => {
                    let handle = obj.get("handle").map(|v| v.as_str_value()).unwrap_or_default();
                    objects.push(serde_json::json!({
                        "objectType": "DICTIONARY",
                        "handle": handle,
                    }));
                }
                _ => {}
            }
        }
        objects
    }
}
