//! Core IFCX type definitions.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type Point2D = [f64; 2];
pub type Point3D = [f64; 3];
pub type Handle = String;
pub type EntityRef = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Color {
    Rgb { r: f64, g: f64, b: f64, a: Option<f64> },
    Index(i32),
    Named(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Header {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub application: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub units: Option<Units>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extents: Option<Extents3D>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limits: Option<Extents2D>,
    #[serde(rename = "currentLayer", skip_serializing_if = "Option::is_none")]
    pub current_layer: Option<String>,
    #[serde(rename = "linetypeScale", skip_serializing_if = "Option::is_none")]
    pub linetype_scale: Option<f64>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Units {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linear: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub measurement: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extents3D {
    pub min: Point3D,
    pub max: Point3D,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extents2D {
    pub min: Point2D,
    pub max: Point2D,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<Color>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linetype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lineweight: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frozen: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub off: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plot: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tables {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layers: Option<HashMap<String, Layer>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linetypes: Option<HashMap<String, serde_json::Value>>,
    #[serde(rename = "textStyles", skip_serializing_if = "Option::is_none")]
    pub text_styles: Option<HashMap<String, serde_json::Value>>,
    #[serde(rename = "dimStyles", skip_serializing_if = "Option::is_none")]
    pub dim_styles: Option<HashMap<String, serde_json::Value>>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// A generic entity. Uses serde_json::Value for flexibility.
/// Typed entity structs can be added as the schema stabilizes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    #[serde(rename = "type")]
    pub entity_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub handle: Option<Handle>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layer: Option<String>,
    #[serde(flatten)]
    pub properties: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockDefinition {
    pub name: String,
    #[serde(rename = "basePoint", skip_serializing_if = "Option::is_none")]
    pub base_point: Option<Point3D>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entities: Option<Vec<Entity>>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Top-level IFCX document structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IfcxFile {
    pub ifcx: String,
    pub header: Header,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tables: Option<Tables>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blocks: Option<HashMap<String, BlockDefinition>>,
    pub entities: Vec<Entity>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub objects: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<HashMap<String, serde_json::Value>>,
}
