//! V1 (DXF-style IfcxDocument) to V2 (IFC5 node-based) converter.
//!
//! Transforms the flat entity-list format produced by the DXF/DWG/DGN importers
//! into the IFC5-compatible node graph used by IfcX v2.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};

use serde_json::{json, Map, Value};

use crate::document::IfcxDocument;
use crate::types::{Color, Entity};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

static V2_IMPORTS: &[&str] = &[
    "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx",
    "https://ifcx.dev/@openusd.org/usd@v1.ifcx",
    "https://ifcx.openaec.org/schemas/geom@v1.ifcx",
    "https://ifcx.openaec.org/schemas/annotation@v1.ifcx",
    "https://ifcx.openaec.org/schemas/sheet@v1.ifcx",
];

/// Unit string normalisation (v1 linear unit name -> v2 length abbreviation).
fn unit_to_mm(unit: &str) -> &'static str {
    match unit {
        "millimeters" => "mm",
        "centimeters" => "cm",
        "meters" => "m",
        "kilometers" => "km",
        "inches" => "in",
        "feet" => "ft",
        "miles" => "mi",
        "unitless" | "scientific" | "decimal" => "mm",
        "engineering" | "architectural" | "fractional" => "in",
        _ => "mm",
    }
}

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

static COUNTER: AtomicU64 = AtomicU64::new(1);

fn uid() -> String {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{:012x}", id)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn ensure_3d(pt: &Value) -> Vec<f64> {
    match pt {
        Value::Array(arr) => {
            let mut result: Vec<f64> = arr
                .iter()
                .filter_map(|v| v.as_f64())
                .collect();
            while result.len() < 3 {
                result.push(0.0);
            }
            result.truncate(3);
            result
        }
        _ => vec![0.0, 0.0, 0.0],
    }
}

fn ensure_3d_from_slice(pt: &[f64]) -> Vec<f64> {
    let mut result = pt.to_vec();
    while result.len() < 3 {
        result.push(0.0);
    }
    result.truncate(3);
    result
}

fn build_insert_matrix(
    insert_pt: &[f64],
    x_scale: f64,
    y_scale: f64,
    z_scale: f64,
    rotation: f64,
) -> Value {
    let c = rotation.cos();
    let s = rotation.sin();
    let pt = ensure_3d_from_slice(insert_pt);
    let (tx, ty, tz) = (pt[0], pt[1], pt[2]);
    json!([
        [x_scale * c, x_scale * s, 0.0, 0.0],
        [-y_scale * s, y_scale * c, 0.0, 0.0],
        [0.0, 0.0, z_scale, 0.0],
        [tx, ty, tz, 1.0],
    ])
}

/// Convert an ACI colour index to a normalised RGB JSON object.
fn aci_to_rgb(aci: i64) -> Option<Value> {
    if aci < 1 {
        return None;
    }
    let rgb: (f64, f64, f64) = match aci {
        1 => (1.0, 0.0, 0.0),
        2 => (1.0, 1.0, 0.0),
        3 => (0.0, 1.0, 0.0),
        4 => (0.0, 1.0, 1.0),
        5 => (0.0, 0.0, 1.0),
        6 => (1.0, 0.0, 1.0),
        7 => (1.0, 1.0, 1.0),
        8 => (0.5, 0.5, 0.5),
        9 => (0.75, 0.75, 0.75),
        i if (1..=255).contains(&i) => {
            let v = (i as f64 / 255.0 * 1000.0).round() / 1000.0;
            (v, v, v)
        }
        _ => return None,
    };
    Some(json!({"r": rgb.0, "g": rgb.1, "b": rgb.2}))
}

/// Convert a `Color` enum to an ACI integer (best-effort).
fn color_to_aci(color: &Color) -> Option<i64> {
    match color {
        Color::Index(i) => Some(*i as i64),
        _ => None,
    }
}

/// Get a float from an entity's properties by key.
fn prop_f64(entity: &Entity, key: &str) -> Option<f64> {
    entity.properties.get(key).and_then(|v| v.as_f64())
}

/// Get a string from an entity's properties by key.
fn prop_str<'a>(entity: &'a Entity, key: &str) -> Option<&'a str> {
    entity.properties.get(key).and_then(|v| v.as_str())
}

/// Get a bool from an entity's properties by key.
fn prop_bool(entity: &Entity, key: &str) -> Option<bool> {
    entity.properties.get(key).and_then(|v| v.as_bool())
}

/// Get a Value from an entity's properties by key.
fn prop_val(entity: &Entity, key: &str) -> Option<&Value> {
    entity.properties.get(key)
}

/// Get a point (Value::Array) from an entity, ensure 3D.
fn prop_point3d(entity: &Entity, key: &str) -> Vec<f64> {
    entity
        .properties
        .get(key)
        .map(|v| ensure_3d(v))
        .unwrap_or_else(|| vec![0.0, 0.0, 0.0])
}

// ---------------------------------------------------------------------------
// V2Converter
// ---------------------------------------------------------------------------

/// Converts a v1 `IfcxDocument` to the v2 IFC5-node JSON format.
pub struct V2Converter {
    nodes: Vec<Value>,
    layer_paths: HashMap<String, String>,
    style_paths: HashMap<String, String>,
    block_paths: HashMap<String, String>,
    media: Map<String, Value>,
}

impl V2Converter {
    /// Convert a v1 `IfcxDocument` to a v2 JSON `Value`.
    ///
    /// Returns a JSON object with keys `header`, `imports`, `data`, `media`.
    pub fn from_v1(doc: &IfcxDocument) -> Value {
        let mut conv = V2Converter {
            nodes: Vec::new(),
            layer_paths: HashMap::new(),
            style_paths: HashMap::new(),
            block_paths: HashMap::new(),
            media: Map::new(),
        };
        conv.convert(doc);
        conv.build_result(doc)
    }

    // -----------------------------------------------------------------------
    // Main orchestrator
    // -----------------------------------------------------------------------

    fn convert(&mut self, doc: &IfcxDocument) {
        // Structural root nodes
        let project_path = "project".to_string();
        let drawings_path = "drawings".to_string();
        let definitions_path = "definitions".to_string();
        let styles_path = "styles".to_string();

        let project_node = json!({
            "path": project_path,
            "children": {
                "drawings": &drawings_path,
                "definitions": &definitions_path,
                "styles": &styles_path,
            },
            "attributes": {
                "ifcx::purpose": "drawing",
            },
        });
        self.nodes.push(project_node);

        // Mutable container nodes - we build children maps and append later
        let mut styles_children = Map::new();
        let mut definitions_children = Map::new();
        let mut drawings_children = Map::new();

        // 1. Convert layers
        self.convert_layers(doc, &mut styles_children);

        // 2. Convert text styles, dim styles, linetypes
        self.convert_text_styles(doc, &mut styles_children);
        self.convert_dim_styles(doc, &mut styles_children);
        self.convert_linetypes(doc, &mut styles_children);

        // 3. Convert blocks -> definitions
        self.convert_blocks(doc, &mut definitions_children);

        // 4. Convert entities under a default view
        let view_path = "view-main".to_string();
        let mut view_children = Map::new();
        self.convert_entities(doc, &mut view_children);

        drawings_children.insert("main".to_string(), json!(view_path));

        // Append structural nodes
        self.nodes.push(json!({
            "path": styles_path,
            "children": Value::Object(styles_children),
            "attributes": {"ifcx::purpose": "drawing"},
        }));
        self.nodes.push(json!({
            "path": definitions_path,
            "children": Value::Object(definitions_children),
            "attributes": {"ifcx::purpose": "definition"},
        }));
        self.nodes.push(json!({
            "path": drawings_path,
            "children": Value::Object(drawings_children),
            "attributes": {"ifcx::purpose": "drawing"},
        }));
        self.nodes.push(json!({
            "path": view_path,
            "children": Value::Object(view_children),
            "attributes": {
                "ifcx::purpose": "drawing",
                "ifcx::view::name": "Main",
                "ifcx::view::scale": 1,
            },
        }));
    }

    fn build_result(&self, doc: &IfcxDocument) -> Value {
        // Determine length unit
        let length_unit = doc
            .file
            .header
            .units
            .as_ref()
            .and_then(|u| u.linear.as_deref())
            .map(unit_to_mm)
            .unwrap_or("mm");

        let header = json!({
            "ifcxVersion": "2.0",
            "id": uid(),
            "timestamp": chrono_iso8601_now(),
            "units": {"length": length_unit, "angle": "rad"},
        });

        let imports: Vec<Value> = V2_IMPORTS
            .iter()
            .map(|uri| json!({"uri": uri}))
            .collect();

        json!({
            "header": header,
            "imports": imports,
            "data": self.nodes,
            "media": Value::Object(self.media.clone()),
        })
    }

    // -----------------------------------------------------------------------
    // Layers
    // -----------------------------------------------------------------------

    fn convert_layers(&mut self, doc: &IfcxDocument, styles_children: &mut Map<String, Value>) {
        let layers = match doc.file.tables.as_ref().and_then(|t| t.layers.as_ref()) {
            Some(l) => l,
            None => return,
        };

        for (name, props) in layers {
            let path = format!("layer-{}", uid());
            self.layer_paths.insert(name.clone(), path.clone());

            let mut style_val = Map::new();

            if let Some(ref color) = props.color {
                if let Some(aci) = color_to_aci(color) {
                    if let Some(rgb) = aci_to_rgb(aci) {
                        style_val.insert("colour".to_string(), rgb);
                    }
                }
            }
            if let Some(lw) = props.lineweight {
                let weight = if lw > 10.0 { lw / 100.0 } else { lw };
                style_val.insert("lineWeight".to_string(), json!(weight));
            }
            if let Some(frozen) = props.frozen {
                style_val.insert("frozen".to_string(), json!(frozen));
            }
            if let Some(locked) = props.locked {
                style_val.insert("locked".to_string(), json!(locked));
            }
            if let Some(off) = props.off {
                style_val.insert("visible".to_string(), json!(!off));
            }
            if let Some(plot) = props.plot {
                style_val.insert("plot".to_string(), json!(plot));
            }

            let node = json!({
                "path": path,
                "attributes": {
                    "ifcx::purpose": "drawing",
                    "ifcx::layer::style": Value::Object(style_val),
                    "ifcx::layer::assignment": {"name": name},
                },
            });
            self.nodes.push(node);
            styles_children.insert(format!("layer-{}", name), json!(path));
        }
    }

    // -----------------------------------------------------------------------
    // Text styles
    // -----------------------------------------------------------------------

    fn convert_text_styles(
        &mut self,
        doc: &IfcxDocument,
        styles_children: &mut Map<String, Value>,
    ) {
        let text_styles = match doc
            .file
            .tables
            .as_ref()
            .and_then(|t| t.text_styles.as_ref())
        {
            Some(ts) => ts,
            None => return,
        };

        for (name, props) in text_styles {
            let path = format!("textstyle-{}", uid());
            self.style_paths
                .insert(format!("text:{}", name), path.clone());

            let mut style_val = Map::new();
            if let Some(font) = props.get("fontFamily").and_then(|v| v.as_str()) {
                style_val.insert("font".to_string(), json!(font));
            }
            if let Some(height) = props.get("height").and_then(|v| v.as_f64()) {
                style_val.insert("size".to_string(), json!(height));
            }
            if let Some(wf) = props.get("widthFactor").and_then(|v| v.as_f64()) {
                style_val.insert("widthFactor".to_string(), json!(wf));
            }

            let node = json!({
                "path": path,
                "attributes": {
                    "ifcx::purpose": "drawing",
                    "ifcx::style::textStyle": Value::Object(style_val),
                },
            });
            self.nodes.push(node);
            styles_children.insert(format!("textstyle-{}", name), json!(path));
        }
    }

    // -----------------------------------------------------------------------
    // Dim styles
    // -----------------------------------------------------------------------

    fn convert_dim_styles(
        &mut self,
        doc: &IfcxDocument,
        styles_children: &mut Map<String, Value>,
    ) {
        let dim_styles = match doc
            .file
            .tables
            .as_ref()
            .and_then(|t| t.dim_styles.as_ref())
        {
            Some(ds) => ds,
            None => return,
        };

        for (name, props) in dim_styles {
            let path = format!("dimstyle-{}", uid());
            self.style_paths
                .insert(format!("dim:{}", name), path.clone());

            let node = json!({
                "path": path,
                "attributes": {
                    "ifcx::purpose": "drawing",
                    "ifcx::style::dimensionStyle": props,
                },
            });
            self.nodes.push(node);
            styles_children.insert(format!("dimstyle-{}", name), json!(path));
        }
    }

    // -----------------------------------------------------------------------
    // Linetypes
    // -----------------------------------------------------------------------

    fn convert_linetypes(
        &mut self,
        doc: &IfcxDocument,
        styles_children: &mut Map<String, Value>,
    ) {
        let linetypes = match doc
            .file
            .tables
            .as_ref()
            .and_then(|t| t.linetypes.as_ref())
        {
            Some(lt) => lt,
            None => return,
        };

        for (name, props) in linetypes {
            let path = format!("linetype-{}", uid());
            self.style_paths
                .insert(format!("lt:{}", name), path.clone());

            let mut style_val = Map::new();
            if let Some(desc) = props.get("description").and_then(|v| v.as_str()) {
                style_val.insert("description".to_string(), json!(desc));
            }
            if let Some(pattern) = props.get("pattern") {
                style_val.insert("dashPattern".to_string(), pattern.clone());
            }

            let node = json!({
                "path": path,
                "attributes": {
                    "ifcx::purpose": "drawing",
                    "ifcx::style::curveStyle": Value::Object(style_val),
                },
            });
            self.nodes.push(node);
            styles_children.insert(format!("linetype-{}", name), json!(path));
        }
    }

    // -----------------------------------------------------------------------
    // Blocks -> definitions
    // -----------------------------------------------------------------------

    fn convert_blocks(
        &mut self,
        doc: &IfcxDocument,
        definitions_children: &mut Map<String, Value>,
    ) {
        let blocks = match doc.file.blocks.as_ref() {
            Some(b) => b,
            None => return,
        };

        for (name, block) in blocks {
            let path = format!("def-{}", uid());
            self.block_paths.insert(name.clone(), path.clone());

            let base_pt = block
                .base_point
                .map(|p| ensure_3d_from_slice(&p))
                .unwrap_or_else(|| vec![0.0, 0.0, 0.0]);

            let mut children = Map::new();
            if let Some(ref entities) = block.entities {
                for ent in entities {
                    let ent_path = format!("e-{}", uid());
                    if let Some(ent_node) = self.entity_to_node(ent, &ent_path) {
                        self.nodes.push(ent_node);
                        let child_key = ent
                            .handle
                            .as_deref()
                            .unwrap_or_else(|| &ent_path)
                            .to_string();
                        children.insert(child_key, json!(ent_path));
                    }
                }
            }

            let node = json!({
                "path": path,
                "children": Value::Object(children),
                "attributes": {
                    "ifcx::purpose": "definition",
                    "ifcx::component::definition": {
                        "name": name,
                        "basePoint": base_pt,
                    },
                },
            });
            self.nodes.push(node);
            definitions_children.insert(name.clone(), json!(path));
        }
    }

    // -----------------------------------------------------------------------
    // Entities
    // -----------------------------------------------------------------------

    fn convert_entities(&mut self, doc: &IfcxDocument, view_children: &mut Map<String, Value>) {
        for ent in &doc.file.entities {
            let path = format!("e-{}", uid());
            if let Some(node) = self.entity_to_node(ent, &path) {
                let child_key = ent
                    .handle
                    .as_deref()
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| path.clone());
                self.nodes.push(node);
                view_children.insert(child_key, json!(path));
            }
        }
    }

    fn entity_to_node(&mut self, ent: &Entity, path: &str) -> Option<Value> {
        let etype = ent.entity_type.as_str();
        let mut attrs = Map::new();
        attrs.insert("ifcx::purpose".to_string(), json!("drawing"));
        let mut inherits: Option<Vec<String>> = None;

        // -- geometry mapping ------------------------------------------------
        match etype {
            "LINE" => {
                let start = prop_point3d(ent, "start");
                let end = prop_point3d(ent, "end");
                attrs.insert("ifcx::geom::line".to_string(), json!({"points": [start, end]}));
            }
            "CIRCLE" => {
                attrs.insert(
                    "ifcx::geom::circle".to_string(),
                    json!({
                        "center": prop_point3d(ent, "center"),
                        "radius": prop_f64(ent, "radius").unwrap_or(0.0),
                    }),
                );
            }
            "ARC" => {
                attrs.insert(
                    "ifcx::geom::trimmedCurve".to_string(),
                    json!({
                        "center": prop_point3d(ent, "center"),
                        "radius": prop_f64(ent, "radius").unwrap_or(0.0),
                        "startAngle": prop_f64(ent, "startAngle").unwrap_or(0.0),
                        "endAngle": prop_f64(ent, "endAngle").unwrap_or(0.0),
                    }),
                );
            }
            "ELLIPSE" => {
                let semi1 = prop_f64(ent, "semiAxis1")
                    .or_else(|| prop_f64(ent, "majorAxis"))
                    .unwrap_or(0.0);
                let semi2 = prop_f64(ent, "semiAxis2")
                    .or_else(|| prop_f64(ent, "minorAxis"))
                    .unwrap_or(0.0);
                attrs.insert(
                    "ifcx::geom::ellipse".to_string(),
                    json!({
                        "center": prop_point3d(ent, "center"),
                        "semiAxis1": semi1,
                        "semiAxis2": semi2,
                        "rotation": prop_f64(ent, "rotation").unwrap_or(0.0),
                    }),
                );
            }
            "SPLINE" => {
                let mut bspline = Map::new();
                if let Some(deg) = prop_val(ent, "degree") {
                    bspline.insert("degree".to_string(), deg.clone());
                }
                let cp_key = if ent.properties.contains_key("controlPoints") {
                    "controlPoints"
                } else {
                    "vertices"
                };
                if let Some(Value::Array(pts)) = prop_val(ent, cp_key) {
                    let pts3d: Vec<Value> = pts.iter().map(|p| json!(ensure_3d(p))).collect();
                    bspline.insert("controlPoints".to_string(), json!(pts3d));
                }
                if let Some(knots) = prop_val(ent, "knots") {
                    bspline.insert("knots".to_string(), knots.clone());
                }
                if let Some(weights) = prop_val(ent, "weights") {
                    bspline.insert("weights".to_string(), weights.clone());
                }
                attrs.insert("ifcx::geom::bspline".to_string(), Value::Object(bspline));
            }
            "LWPOLYLINE" => {
                let closed = prop_bool(ent, "closed").unwrap_or(false);
                let verts = prop_val(ent, "vertices")
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                let bulges = prop_val(ent, "bulges")
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                let has_bulge = bulges.iter().any(|b| {
                    b.as_f64().map(|f| f.abs() > 1e-10).unwrap_or(false)
                });

                if has_bulge {
                    let segments = Self::lwpoly_to_segments(&verts, &bulges, closed);
                    attrs.insert(
                        "ifcx::geom::compositeCurve".to_string(),
                        json!({"segments": segments, "closed": closed}),
                    );
                } else {
                    let pts3d: Vec<Value> = verts.iter().map(|v| json!(ensure_3d(v))).collect();
                    attrs.insert(
                        "ifcx::geom::polyline".to_string(),
                        json!({"points": pts3d, "closed": closed}),
                    );
                }
            }
            "POLYLINE2D" | "POLYLINE3D" => {
                let closed = prop_bool(ent, "closed").unwrap_or(false);
                let verts = prop_val(ent, "vertices")
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                let pts3d: Vec<Value> = verts.iter().map(|v| json!(ensure_3d(v))).collect();
                attrs.insert(
                    "ifcx::geom::polyline".to_string(),
                    json!({"points": pts3d, "closed": closed}),
                );
            }
            "TEXT" => {
                let mut text_val = Map::new();
                text_val.insert(
                    "value".to_string(),
                    json!(prop_str(ent, "text").unwrap_or("")),
                );
                if let Some(ip) = prop_val(ent, "insertionPoint") {
                    text_val.insert("placement".to_string(), json!(ensure_3d(ip)));
                }
                if let Some(h) = prop_f64(ent, "height") {
                    text_val.insert("height".to_string(), json!(h));
                }
                if let Some(rot) = prop_f64(ent, "rotation") {
                    text_val.insert("style".to_string(), json!({"rotation": rot}));
                }
                if let Some(ha) = prop_str(ent, "horizontalAlignment") {
                    text_val.insert("alignment".to_string(), json!(ha));
                }
                if let Some(ts) = prop_str(ent, "style") {
                    let key = format!("text:{}", ts);
                    if let Some(ref_path) = self.style_paths.get(&key) {
                        attrs.insert(
                            "ifcx::connects::style".to_string(),
                            json!({"ref": ref_path}),
                        );
                    }
                }
                attrs.insert(
                    "ifcx::annotation::text".to_string(),
                    Value::Object(text_val),
                );
            }
            "MTEXT" => {
                let mut text_val = Map::new();
                text_val.insert(
                    "value".to_string(),
                    json!(prop_str(ent, "text").unwrap_or("")),
                );
                if let Some(ip) = prop_val(ent, "insertionPoint") {
                    text_val.insert("placement".to_string(), json!(ensure_3d(ip)));
                }
                if let Some(h) = prop_f64(ent, "height") {
                    text_val.insert("height".to_string(), json!(h));
                }
                if let Some(w) = prop_f64(ent, "width") {
                    text_val.insert("width".to_string(), json!(w));
                }
                if let Some(att) = prop_str(ent, "attachment") {
                    text_val.insert("attachment".to_string(), json!(att));
                }
                if let Some(ts) = prop_str(ent, "style") {
                    let key = format!("text:{}", ts);
                    if let Some(ref_path) = self.style_paths.get(&key) {
                        attrs.insert(
                            "ifcx::connects::style".to_string(),
                            json!({"ref": ref_path}),
                        );
                    }
                }
                attrs.insert(
                    "ifcx::annotation::text".to_string(),
                    Value::Object(text_val),
                );
            }
            t if t.starts_with("DIMENSION") => {
                let mut dim_val = Map::new();
                let subtype = match etype {
                    "DIMENSION_LINEAR" => "linear",
                    "DIMENSION_ALIGNED" => "aligned",
                    "DIMENSION_ANGULAR" | "DIMENSION_ANGULAR3P" => "angular",
                    "DIMENSION_DIAMETER" => "diameter",
                    "DIMENSION_RADIUS" => "radius",
                    "DIMENSION_ORDINATE" => "ordinate",
                    _ => "linear",
                };
                dim_val.insert("subtype".to_string(), json!(subtype));

                let mut measure_pts = Vec::new();
                if let Some(p1) = prop_val(ent, "defPoint1") {
                    measure_pts.push(json!(ensure_3d(p1)));
                }
                if let Some(p2) = prop_val(ent, "defPoint2") {
                    measure_pts.push(json!(ensure_3d(p2)));
                }
                if !measure_pts.is_empty() {
                    dim_val.insert("measurePoints".to_string(), json!(measure_pts));
                }
                if let Some(dl) = prop_val(ent, "dimLine") {
                    dim_val.insert("dimensionLine".to_string(), json!(ensure_3d(dl)));
                }
                if let Some(txt) = prop_str(ent, "text") {
                    dim_val.insert("text".to_string(), json!(txt));
                }
                if let Some(meas) = prop_f64(ent, "measurement") {
                    dim_val.insert("value".to_string(), json!(meas));
                }

                if let Some(ds) = prop_str(ent, "dimStyle") {
                    let key = format!("dim:{}", ds);
                    if let Some(ref_path) = self.style_paths.get(&key) {
                        attrs.insert(
                            "ifcx::connects::style".to_string(),
                            json!({"ref": ref_path}),
                        );
                    }
                }
                attrs.insert(
                    "ifcx::annotation::dimension".to_string(),
                    Value::Object(dim_val),
                );
            }
            "LEADER" => {
                let mut leader_val = Map::new();
                if let Some(Value::Array(verts)) = prop_val(ent, "vertices") {
                    let pts3d: Vec<Value> = verts.iter().map(|v| json!(ensure_3d(v))).collect();
                    leader_val.insert("path".to_string(), json!(pts3d));
                }
                leader_val.insert(
                    "arrowhead".to_string(),
                    json!(prop_bool(ent, "hasArrowhead").unwrap_or(true)),
                );
                attrs.insert(
                    "ifcx::annotation::leader".to_string(),
                    Value::Object(leader_val),
                );
            }
            "HATCH" => {
                let is_solid = prop_bool(ent, "solid").unwrap_or(false)
                    || prop_str(ent, "patternType") == Some("SOLID");
                if is_solid {
                    let mut fill = Map::new();
                    if let Some(color) = prop_val(ent, "color").and_then(|v| v.as_i64()) {
                        if let Some(rgb) = aci_to_rgb(color) {
                            fill.insert("colour".to_string(), rgb);
                        }
                    }
                    attrs.insert("ifcx::hatch::solid".to_string(), Value::Object(fill));
                } else {
                    let mut pattern = Map::new();
                    if let Some(name) = prop_str(ent, "patternName") {
                        pattern.insert("name".to_string(), json!(name));
                    }
                    if let Some(angle) = prop_f64(ent, "patternAngle") {
                        pattern.insert("angle".to_string(), json!(angle));
                    }
                    if let Some(scale) = prop_f64(ent, "patternScale") {
                        pattern.insert("scale".to_string(), json!(scale));
                    }
                    attrs.insert("ifcx::hatch::pattern".to_string(), Value::Object(pattern));
                }
                if let Some(boundary) = prop_val(ent, "boundary") {
                    attrs.insert("ifcx::hatch::boundary".to_string(), boundary.clone());
                }
            }
            "INSERT" => {
                let block_name = prop_str(ent, "name")
                    .or_else(|| prop_str(ent, "blockName"))
                    .unwrap_or("");
                if !block_name.is_empty() {
                    if let Some(block_path) = self.block_paths.get(block_name) {
                        inherits = Some(vec![block_path.clone()]);
                    }
                }
                let insert_pt = prop_point3d(ent, "insertionPoint");
                let x_scale = prop_f64(ent, "xScale")
                    .or_else(|| prop_f64(ent, "scaleX"))
                    .unwrap_or(1.0);
                let y_scale = prop_f64(ent, "yScale")
                    .or_else(|| prop_f64(ent, "scaleY"))
                    .unwrap_or(1.0);
                let z_scale = prop_f64(ent, "zScale")
                    .or_else(|| prop_f64(ent, "scaleZ"))
                    .unwrap_or(1.0);
                let rotation = prop_f64(ent, "rotation").unwrap_or(0.0);
                let matrix = build_insert_matrix(&insert_pt, x_scale, y_scale, z_scale, rotation);
                attrs.insert("ifcx::xform::matrix".to_string(), matrix);
            }
            "SOLID" | "TRACE" => {
                let mut points = Vec::new();
                for key in &["p1", "p2", "p3", "p4"] {
                    if let Some(p) = prop_val(ent, key) {
                        points.push(json!(ensure_3d(p)));
                    }
                }
                if points.is_empty() {
                    if let Some(Value::Array(verts)) = prop_val(ent, "vertices") {
                        points = verts.iter().map(|v| json!(ensure_3d(v))).collect();
                    }
                }
                attrs.insert("ifcx::geom::polygon".to_string(), json!({"points": points}));
            }
            "3DFACE" => {
                let mut points = Vec::new();
                for key in &["p1", "p2", "p3", "p4"] {
                    if let Some(p) = prop_val(ent, key) {
                        points.push(json!(ensure_3d(p)));
                    }
                }
                if points.is_empty() {
                    if let Some(Value::Array(verts)) = prop_val(ent, "vertices") {
                        points = verts.iter().map(|v| json!(ensure_3d(v))).collect();
                    }
                }
                attrs.insert("ifcx::geom::polygon".to_string(), json!({"points": points}));
            }
            "VIEWPORT" => {
                let mut vp = Map::new();
                if let Some(c) = prop_val(ent, "center") {
                    let c3 = ensure_3d(c);
                    vp.insert("center".to_string(), json!([c3[0], c3[1]]));
                }
                if let Some(w) = prop_f64(ent, "width") {
                    vp.insert("width".to_string(), json!(w));
                }
                if let Some(h) = prop_f64(ent, "height") {
                    vp.insert("height".to_string(), json!(h));
                }
                if let Some(vt) = prop_val(ent, "viewTarget") {
                    vp.insert("viewTarget".to_string(), json!(ensure_3d(vt)));
                }
                let vs = prop_f64(ent, "viewScale").or_else(|| prop_f64(ent, "customScale"));
                if let Some(scale) = vs {
                    vp.insert("viewScale".to_string(), json!(scale));
                }
                attrs.insert("ifcx::sheet::viewport".to_string(), Value::Object(vp));
            }
            "POINT" => {
                let pos = if ent.properties.contains_key("position") {
                    prop_point3d(ent, "position")
                } else {
                    prop_point3d(ent, "insertionPoint")
                };
                attrs.insert("ifcx::geom::point".to_string(), json!({"position": pos}));
            }
            "RAY" => {
                let origin = if ent.properties.contains_key("origin") {
                    prop_point3d(ent, "origin")
                } else {
                    prop_point3d(ent, "start")
                };
                let direction = prop_val(ent, "direction")
                    .map(|v| ensure_3d(v))
                    .unwrap_or_else(|| vec![1.0, 0.0, 0.0]);
                attrs.insert(
                    "ifcx::geom::ray".to_string(),
                    json!({"origin": origin, "direction": direction}),
                );
            }
            "XLINE" => {
                let origin = if ent.properties.contains_key("origin") {
                    prop_point3d(ent, "origin")
                } else {
                    prop_point3d(ent, "start")
                };
                let direction = prop_val(ent, "direction")
                    .map(|v| ensure_3d(v))
                    .unwrap_or_else(|| vec![1.0, 0.0, 0.0]);
                attrs.insert(
                    "ifcx::geom::constructionLine".to_string(),
                    json!({"origin": origin, "direction": direction}),
                );
            }
            "3DSOLID" | "BODY" | "REGION" => {
                let data = prop_str(ent, "acisData")
                    .or_else(|| prop_str(ent, "data"))
                    .unwrap_or("");
                attrs.insert("ifcx::geom::solid".to_string(), json!({"data": data}));
            }
            "MESH" => {
                let mut mesh_val = Map::new();
                if let Some(Value::Array(verts)) = prop_val(ent, "vertices") {
                    let pts: Vec<Value> = verts.iter().map(|v| json!(ensure_3d(v))).collect();
                    mesh_val.insert("points".to_string(), json!(pts));
                }
                if let Some(faces) = prop_val(ent, "faces") {
                    mesh_val.insert("faceVertexIndices".to_string(), faces.clone());
                }
                attrs.insert("ifcx::geom::mesh".to_string(), Value::Object(mesh_val));
            }
            "IMAGE" => {
                let mut img = Map::new();
                if let Some(ip) = prop_val(ent, "insertionPoint") {
                    img.insert("insertionPoint".to_string(), json!(ensure_3d(ip)));
                }
                if let Some(size) = prop_val(ent, "imageSize") {
                    img.insert("imageSize".to_string(), size.clone());
                }
                if let Some(ipath) = prop_str(ent, "imagePath") {
                    let media_id = uid();
                    img.insert("mediaId".to_string(), json!(&media_id));
                    self.media
                        .insert(media_id, json!({"path": ipath}));
                }
                attrs.insert("ifcx::image::raster".to_string(), Value::Object(img));
            }
            "WIPEOUT" => {
                let boundary = if let Some(Value::Array(pts)) = prop_val(ent, "boundary") {
                    pts.iter().map(|p| json!(ensure_3d(p))).collect::<Vec<_>>()
                } else if let Some(Value::Array(pts)) = prop_val(ent, "vertices") {
                    pts.iter().map(|p| json!(ensure_3d(p))).collect::<Vec<_>>()
                } else {
                    Vec::new()
                };
                attrs.insert(
                    "ifcx::image::wipeout".to_string(),
                    json!({"boundary": boundary}),
                );
            }
            "TEXT_NODE" => {
                let mut text_val = Map::new();
                text_val.insert("value".to_string(), json!(""));
                if let Some(origin) = prop_val(ent, "origin") {
                    text_val.insert("placement".to_string(), json!(ensure_3d(origin)));
                }
                if let Some(h) = prop_f64(ent, "height") {
                    text_val.insert("height".to_string(), json!(h));
                }
                attrs.insert(
                    "ifcx::annotation::text".to_string(),
                    Value::Object(text_val),
                );
            }
            "COMPLEX_CHAIN" | "COMPLEX_SHAPE" => {
                attrs.insert(
                    "ifcx::geom::compositeCurve".to_string(),
                    json!({"segments": [], "closed": etype == "COMPLEX_SHAPE"}),
                );
            }
            "3DSURFACE" => {
                attrs.insert("ifcx::geom::solid".to_string(), json!({"data": ""}));
            }
            "BSPLINE_CURVE" => {
                attrs.insert("ifcx::geom::bspline".to_string(), json!({}));
            }
            "BSPLINE_POLE" => {
                let verts = prop_val(ent, "vertices")
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                let pts: Vec<Value> = verts.iter().map(|v| json!(ensure_3d(v))).collect();
                attrs.insert(
                    "ifcx::geom::bspline".to_string(),
                    json!({"controlPoints": pts}),
                );
            }
            _ => {
                // Unknown entity -- store raw type for round-tripping
                let mut data = Map::new();
                for (k, v) in &ent.properties {
                    match k.as_str() {
                        "handle" | "layer" | "color" | "linetype" | "lineweight" | "style" => {}
                        _ => {
                            data.insert(k.clone(), v.clone());
                        }
                    }
                }
                attrs.insert(
                    "ifcx::unknown::entity".to_string(),
                    json!({"originalType": etype, "data": Value::Object(data)}),
                );
            }
        }

        // -- connections (layer, style) --------------------------------------
        let layer_name = ent.layer.as_deref().unwrap_or("0");
        if let Some(layer_path) = self.layer_paths.get(layer_name) {
            attrs.insert(
                "ifcx::connects::layer".to_string(),
                json!({"ref": layer_path}),
            );
        }

        // Curve style from entity-level overrides
        let mut curve_style = Map::new();
        if let Some(color) = prop_val(ent, "color").and_then(|v| v.as_i64()) {
            if let Some(rgb) = aci_to_rgb(color) {
                curve_style.insert("colour".to_string(), rgb);
            }
        }
        if let Some(lw) = prop_val(ent, "lineweight") {
            curve_style.insert("width".to_string(), lw.clone());
        }
        if let Some(lt) = prop_str(ent, "linetype") {
            if !lt.is_empty() {
                let key = format!("lt:{}", lt);
                if let Some(ref_path) = self.style_paths.get(&key) {
                    attrs
                        .entry("ifcx::connects::style".to_string())
                        .or_insert_with(|| json!({}));
                    if let Some(obj) = attrs.get_mut("ifcx::connects::style") {
                        if let Some(map) = obj.as_object_mut() {
                            map.insert("ref".to_string(), json!(ref_path));
                        }
                    }
                } else {
                    curve_style.insert("pattern".to_string(), json!(lt));
                }
            }
        }
        if !curve_style.is_empty() {
            attrs.insert("ifcx::style::curveStyle".to_string(), Value::Object(curve_style));
        }

        // Build node
        let mut node = json!({"path": path, "attributes": Value::Object(attrs)});
        if let Some(inh) = inherits {
            node.as_object_mut()
                .map(|m| m.insert("inherits".to_string(), json!(inh)));
        }
        Some(node)
    }

    // -----------------------------------------------------------------------
    // LWPOLYLINE bulge -> segments
    // -----------------------------------------------------------------------

    fn lwpoly_to_segments(verts: &[Value], bulges: &[Value], closed: bool) -> Vec<Value> {
        let n = verts.len();
        if n == 0 {
            return Vec::new();
        }

        // Pad bulges to match verts
        let bulges_f64: Vec<f64> = (0..n)
            .map(|i| {
                bulges
                    .get(i)
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0)
            })
            .collect();

        let count = if closed { n } else { n.saturating_sub(1) };
        let mut segments = Vec::new();

        for i in 0..count {
            let p1 = ensure_3d(&verts[i]);
            let p2 = ensure_3d(&verts[(i + 1) % n]);
            let bulge = bulges_f64[i];

            if bulge.abs() < 1e-10 {
                segments.push(json!({"type": "line", "points": [p1, p2]}));
            } else {
                let dx = p2[0] - p1[0];
                let dy = p2[1] - p1[1];
                let chord = dx.hypot(dy);
                if chord < 1e-12 {
                    segments.push(json!({"type": "line", "points": [p1, p2]}));
                    continue;
                }
                let sagitta = bulge.abs() * chord / 2.0;
                let radius = (chord * chord / 4.0 + sagitta * sagitta) / (2.0 * sagitta);

                let mx = (p1[0] + p2[0]) / 2.0;
                let my = (p1[1] + p2[1]) / 2.0;
                let nx = -dy / chord;
                let ny = dx / chord;
                let d = radius - sagitta;
                let sign = if bulge > 0.0 { 1.0 } else { -1.0 };
                let cx = mx + sign * d * nx;
                let cy = my + sign * d * ny;

                let start_angle = (p1[1] - cy).atan2(p1[0] - cx);
                let end_angle = (p2[1] - cy).atan2(p2[0] - cx);

                segments.push(json!({
                    "type": "arc",
                    "center": [cx, cy, 0.0],
                    "radius": radius,
                    "startAngle": start_angle,
                    "endAngle": end_angle,
                }));
            }
        }

        segments
    }
}

/// Simple ISO 8601 timestamp (no chrono dependency).
fn chrono_iso8601_now() -> String {
    // Use a placeholder since we avoid adding dependencies.
    // In production, consider using the `chrono` or `time` crate.
    "2026-01-01T00:00:00Z".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::document::IfcxDocument;
    use crate::types::Entity;
    use std::collections::HashMap;

    #[test]
    fn test_basic_conversion() {
        let mut doc = IfcxDocument::new();
        doc.add_entity(Entity {
            entity_type: "LINE".to_string(),
            handle: None,
            layer: Some("0".to_string()),
            properties: HashMap::from([
                ("start".to_string(), json!([0.0, 0.0, 0.0])),
                ("end".to_string(), json!([10.0, 10.0, 0.0])),
            ]),
        });

        let result = V2Converter::from_v1(&doc);
        assert!(result.get("header").is_some());
        assert!(result.get("imports").is_some());
        assert!(result.get("data").is_some());

        let data = result["data"].as_array().expect("data should be an array");
        // Should have project, styles, definitions, drawings, view, layer-0, and entity nodes
        assert!(data.len() >= 5);
    }
}
