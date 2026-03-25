//! DGN V7 to IFCX importer -- pure Rust.
//!
//! Uses the built-in `DgnParser` to read DGN V7 binary files and converts
//! the parsed data into an `IfcxDocument`.

use std::collections::HashMap;
use std::path::Path;

use crate::types::*;
use crate::{IfcxDocument, IfcxError};
use super::dgn_parser::{DgnFile, DgnParser};

/// Imports DGN V7 files into IFCX documents.
pub struct DgnImporter;

impl DgnImporter {
    /// Import DGN from a file path.
    pub fn from_file(path: impl AsRef<Path>) -> Result<IfcxDocument, IfcxError> {
        let data = std::fs::read(path)?;
        Self::from_bytes(&data)
    }

    /// Import DGN from raw bytes.
    pub fn from_bytes(data: &[u8]) -> Result<IfcxDocument, IfcxError> {
        let mut parser = DgnParser::new();
        let dgn = parser.parse(data)?;
        Ok(Self::convert(&dgn))
    }

    // ------------------------------------------------------------------
    // Conversion
    // ------------------------------------------------------------------

    fn convert(dgn: &DgnFile) -> IfcxDocument {
        let mut doc = IfcxDocument::new();

        doc.file.header = Self::convert_header(dgn);
        doc.file.tables = Some(Self::convert_tables(dgn));
        doc.file.blocks = Some(HashMap::new());
        doc.file.entities = Self::convert_entities(dgn);
        doc.file.objects = Some(Vec::new());

        doc
    }

    // ------------------------------------------------------------------
    // Header
    // ------------------------------------------------------------------

    fn convert_header(dgn: &DgnFile) -> Header {
        let mut extra = HashMap::new();
        extra.insert("is3d".into(), serde_json::json!(dgn.is_3d));
        if !dgn.master_unit_name.is_empty() {
            extra.insert("masterUnits".into(), serde_json::json!(dgn.master_unit_name));
        }
        if !dgn.sub_unit_name.is_empty() {
            extra.insert("subUnits".into(), serde_json::json!(dgn.sub_unit_name));
        }
        if dgn.global_origin.0 != 0.0 || dgn.global_origin.1 != 0.0 || dgn.global_origin.2 != 0.0 {
            extra.insert("globalOrigin".into(), serde_json::json!([
                dgn.global_origin.0, dgn.global_origin.1, dgn.global_origin.2
            ]));
        }

        let mut units_extra = HashMap::new();
        units_extra.insert("uorPerSub".into(), serde_json::json!(dgn.uor_per_sub));
        units_extra.insert("subPerMaster".into(), serde_json::json!(dgn.sub_per_master));

        Header {
            version: Some(dgn.version.clone()),
            author: None,
            organization: None,
            application: None,
            units: Some(Units {
                linear: None,
                measurement: None,
                extra: units_extra,
            }),
            extents: None,
            limits: None,
            current_layer: None,
            linetype_scale: None,
            extra,
        }
    }

    // ------------------------------------------------------------------
    // Tables
    // ------------------------------------------------------------------

    fn convert_tables(dgn: &DgnFile) -> Tables {
        let mut layers: HashMap<String, Layer> = HashMap::new();

        // Collect levels from elements
        let mut levels_used = std::collections::BTreeSet::new();
        for elem in &dgn.elements {
            if !elem.deleted && elem.level > 0 {
                levels_used.insert(elem.level);
            }
        }

        for lvl in &levels_used {
            layers.insert(lvl.to_string(), Layer {
                color: None, linetype: None, lineweight: None,
                frozen: None, locked: None, off: None, plot: None,
            });
        }

        layers.entry("0".to_string()).or_insert_with(|| Layer {
            color: None, linetype: None, lineweight: None,
            frozen: None, locked: None, off: None, plot: None,
        });

        Tables {
            layers: Some(layers),
            linetypes: Some(HashMap::new()),
            text_styles: Some(HashMap::new()),
            dim_styles: Some(HashMap::new()),
            extra: HashMap::new(),
        }
    }

    // ------------------------------------------------------------------
    // Entities
    // ------------------------------------------------------------------

    fn convert_entities(dgn: &DgnFile) -> Vec<Entity> {
        dgn.elements.iter()
            .filter(|elem| !elem.deleted && !matches!(elem.elem_type, 0 | 9 | 10 | 8))
            .filter_map(|elem| Self::convert_entity(elem, dgn))
            .collect()
    }

    fn convert_entity(elem: &super::dgn_parser::DgnElement, dgn: &DgnFile) -> Option<Entity> {
        let mut properties = HashMap::new();
        let layer = Some(elem.level.to_string());

        // Common symbology
        if elem.color > 0 {
            properties.insert("color".into(), serde_json::json!(elem.color));
            if !dgn.color_table.is_empty() {
                if let Some(Some(ct)) = dgn.color_table.get(elem.color as usize) {
                    properties.insert("colorRGB".into(), serde_json::json!([ct.0, ct.1, ct.2]));
                }
            }
        }
        if elem.weight > 0 {
            properties.insert("lineweight".into(), serde_json::json!(elem.weight));
        }
        if elem.style > 0 {
            properties.insert("linetype".into(), serde_json::json!(elem.style));
        }

        let data = &elem.data;
        let etype = elem.elem_type;

        let entity_type = match etype {
            3 => {
                // LINE
                if let Some(verts) = data.get("vertices").and_then(|v| v.as_array()) {
                    if verts.len() >= 2 {
                        properties.insert("start".into(), verts[0].clone());
                        properties.insert("end".into(), verts[1].clone());
                        "LINE"
                    } else { return None; }
                } else { return None; }
            }
            4 => {
                // LINE_STRING -> LWPOLYLINE
                properties.insert("closed".into(), serde_json::json!(false));
                if let Some(v) = data.get("vertices") {
                    properties.insert("vertices".into(), v.clone());
                }
                "LWPOLYLINE"
            }
            6 => {
                // SHAPE -> LWPOLYLINE (closed)
                properties.insert("closed".into(), serde_json::json!(true));
                if let Some(v) = data.get("vertices") {
                    properties.insert("vertices".into(), v.clone());
                }
                "LWPOLYLINE"
            }
            11 => {
                // CURVE -> SPLINE
                if let Some(v) = data.get("vertices") {
                    properties.insert("vertices".into(), v.clone());
                }
                "SPLINE"
            }
            15 => {
                // ELLIPSE
                if let Some(c) = data.get("origin") {
                    properties.insert("center".into(), c.clone());
                }
                if let Some(v) = data.get("primary_axis") {
                    properties.insert("majorAxis".into(), v.clone());
                }
                if let Some(v) = data.get("secondary_axis") {
                    properties.insert("minorAxis".into(), v.clone());
                }
                if let Some(v) = data.get("rotation") {
                    if let Some(r) = v.as_f64() {
                        properties.insert("rotation".into(), serde_json::json!(r.to_radians()));
                    }
                }
                "ELLIPSE"
            }
            16 => {
                // ARC
                let start = data.get("start_angle").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let sweep = data.get("sweep_angle").and_then(|v| v.as_f64()).unwrap_or(360.0);

                if let Some(c) = data.get("origin") {
                    properties.insert("center".into(), c.clone());
                }
                if let Some(v) = data.get("primary_axis") {
                    properties.insert("majorAxis".into(), v.clone());
                }
                if let Some(v) = data.get("secondary_axis") {
                    properties.insert("minorAxis".into(), v.clone());
                }
                if let Some(v) = data.get("rotation") {
                    if let Some(r) = v.as_f64() {
                        properties.insert("rotation".into(), serde_json::json!(r.to_radians()));
                    }
                }

                if sweep.abs() >= 360.0 {
                    "ELLIPSE"
                } else {
                    properties.insert("startAngle".into(), serde_json::json!(start.to_radians()));
                    properties.insert("endAngle".into(), serde_json::json!((start + sweep).to_radians()));
                    "ARC"
                }
            }
            17 => {
                // TEXT
                if let Some(v) = data.get("text") {
                    properties.insert("text".into(), v.clone());
                }
                if let Some(c) = data.get("origin") {
                    properties.insert("insertionPoint".into(), c.clone());
                }
                if let Some(v) = data.get("height") {
                    properties.insert("height".into(), v.clone());
                }
                if let Some(v) = data.get("rotation") {
                    if let Some(r) = v.as_f64() {
                        properties.insert("rotation".into(), serde_json::json!(r.to_radians()));
                    }
                }
                if let Some(v) = data.get("font_id") {
                    properties.insert("fontIndex".into(), v.clone());
                }
                "TEXT"
            }
            7 => {
                // TEXT_NODE
                if let Some(c) = data.get("origin") {
                    properties.insert("origin".into(), c.clone());
                }
                if let Some(v) = data.get("height") {
                    properties.insert("height".into(), v.clone());
                }
                if let Some(v) = data.get("rotation") {
                    if let Some(r) = v.as_f64() {
                        properties.insert("rotation".into(), serde_json::json!(r.to_radians()));
                    }
                }
                if let Some(v) = data.get("numelems") {
                    properties.insert("numelems".into(), v.clone());
                }
                "TEXT_NODE"
            }
            2 => {
                // CELL_HEADER -> INSERT
                if let Some(v) = data.get("name") {
                    properties.insert("name".into(), v.clone());
                }
                if let Some(c) = data.get("origin") {
                    properties.insert("insertionPoint".into(), c.clone());
                }
                if let Some(v) = data.get("rotation") {
                    if let Some(r) = v.as_f64() {
                        properties.insert("rotation".into(), serde_json::json!(r.to_radians()));
                    }
                }
                "INSERT"
            }
            12 | 14 => {
                let ctype = if etype == 12 { "COMPLEX_CHAIN" } else { "COMPLEX_SHAPE" };
                if let Some(v) = data.get("numelems") {
                    properties.insert("numelems".into(), v.clone());
                }
                if let Some(v) = data.get("totlength") {
                    properties.insert("totlength".into(), v.clone());
                }
                ctype
            }
            18 | 19 => {
                let stype = if etype == 18 { "3DSURFACE" } else { "3DSOLID" };
                if let Some(v) = data.get("numelems") {
                    properties.insert("numelems".into(), v.clone());
                }
                stype
            }
            37 => {
                // TAG_VALUE
                if let Some(v) = data.get("tag_index") {
                    properties.insert("tagIndex".into(), v.clone());
                }
                if let Some(v) = data.get("value") {
                    properties.insert("value".into(), v.clone());
                }
                "TAG_VALUE"
            }
            21 => {
                // BSPLINE_POLE
                if let Some(v) = data.get("vertices") {
                    properties.insert("vertices".into(), v.clone());
                }
                "BSPLINE_POLE"
            }
            _ => {
                properties.insert("rawType".into(), serde_json::json!(etype));
                &elem.type_name
            }
        };

        Some(Entity {
            entity_type: entity_type.to_string(),
            handle: None,
            layer,
            properties,
        })
    }
}
