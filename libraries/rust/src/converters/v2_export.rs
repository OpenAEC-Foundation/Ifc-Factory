//! V2 (IFC5 node-based) to V1 (DXF-style IfcxDocument) converter.
//!
//! Converts the v2 node graph back into the flat entity-list format that the
//! existing DXF exporter (`DxfExporter`) understands.

use std::collections::HashMap;

use serde_json::{json, Map, Value};

use crate::document::IfcxDocument;
use crate::error::IfcxError;
use crate::types::{
    BlockDefinition, Color, Entity, Header, Layer, Units,
};

// ---------------------------------------------------------------------------
// V2Export
// ---------------------------------------------------------------------------

/// Converts a v2 IFC5-node JSON value back to a v1 `IfcxDocument`.
pub struct V2Export {
    nodes_by_path: HashMap<String, Value>,
    layer_name_by_path: HashMap<String, String>,
    styles: HashMap<String, Value>,
    definitions: HashMap<String, Value>,
    media: Map<String, Value>,
}

impl V2Export {
    /// Convert a v2 JSON value to a v1 `IfcxDocument`.
    pub fn to_v1(v2_data: &Value) -> Result<IfcxDocument, IfcxError> {
        let mut conv = V2Export {
            nodes_by_path: HashMap::new(),
            layer_name_by_path: HashMap::new(),
            styles: HashMap::new(),
            definitions: HashMap::new(),
            media: v2_data
                .get("media")
                .and_then(|m| m.as_object())
                .cloned()
                .unwrap_or_default(),
        };
        conv.convert(v2_data)
    }

    // -----------------------------------------------------------------------
    // Main orchestrator
    // -----------------------------------------------------------------------

    fn convert(&mut self, v2: &Value) -> Result<IfcxDocument, IfcxError> {
        let mut doc = IfcxDocument::new();

        // Index all nodes by path
        let data = v2
            .get("data")
            .and_then(|d| d.as_array())
            .cloned()
            .unwrap_or_default();

        for node in &data {
            if let Some(path) = node.get("path").and_then(|p| p.as_str()) {
                self.nodes_by_path.insert(path.to_string(), node.clone());
            }
        }

        // Reconstruct header
        self.convert_header(v2, &mut doc);

        // First pass: extract layers, styles, definitions
        for node in &data {
            let attrs = node.get("attributes").cloned().unwrap_or(json!({}));
            let path = node
                .get("path")
                .and_then(|p| p.as_str())
                .unwrap_or("")
                .to_string();

            // Layers
            if let Some(assignment) = attrs.get("ifcx::layer::assignment") {
                let name = assignment
                    .get("name")
                    .and_then(|n| n.as_str())
                    .unwrap_or(&path)
                    .to_string();
                self.layer_name_by_path.insert(path.clone(), name.clone());

                let mut layer = Layer {
                    color: None,
                    linetype: None,
                    lineweight: None,
                    frozen: None,
                    locked: None,
                    off: None,
                    plot: None,
                };

                if let Some(ls) = attrs.get("ifcx::layer::style") {
                    if let Some(colour) = ls.get("colour") {
                        layer.color = Some(Color::Index(rgb_to_aci(colour)));
                    }
                    if let Some(lw) = ls.get("lineWeight").and_then(|v| v.as_f64()) {
                        layer.lineweight = Some(lw * 100.0);
                    }
                    if let Some(frozen) = ls.get("frozen").and_then(|v| v.as_bool()) {
                        layer.frozen = Some(frozen);
                    }
                    if let Some(locked) = ls.get("locked").and_then(|v| v.as_bool()) {
                        layer.locked = Some(locked);
                    }
                    if let Some(visible) = ls.get("visible").and_then(|v| v.as_bool()) {
                        layer.off = Some(!visible);
                    }
                    if let Some(plot) = ls.get("plot").and_then(|v| v.as_bool()) {
                        layer.plot = Some(plot);
                    }
                }

                if let Some(tables) = doc.file.tables.as_mut() {
                    if let Some(layers) = tables.layers.as_mut() {
                        layers.insert(name.clone(), layer);
                    }
                }
            }

            // Text styles
            if let Some(ts) = attrs.get("ifcx::style::textStyle") {
                self.styles.insert(path.clone(), ts.clone());

                if ts.get("font").is_some() {
                    let style_name = if path.contains('-') {
                        path.splitn(2, '-').nth(1).unwrap_or(&path).to_string()
                    } else {
                        path.clone()
                    };
                    let mut text_style = Map::new();
                    if let Some(font) = ts.get("font") {
                        text_style.insert("fontFamily".to_string(), font.clone());
                    }
                    if let Some(size) = ts.get("size") {
                        text_style.insert("height".to_string(), size.clone());
                    }
                    if let Some(wf) = ts.get("widthFactor") {
                        text_style.insert("widthFactor".to_string(), wf.clone());
                    }
                    if let Some(tables) = doc.file.tables.as_mut() {
                        if let Some(text_styles) = tables.text_styles.as_mut() {
                            text_styles.insert(style_name, Value::Object(text_style));
                        }
                    }
                }
            }

            // Curve styles
            if let Some(cs) = attrs.get("ifcx::style::curveStyle") {
                self.styles.insert(path.clone(), cs.clone());
            }

            // Definitions (blocks)
            if attrs.get("ifcx::component::definition").is_some() {
                self.definitions.insert(path.clone(), node.clone());
            }
        }

        // Convert blocks (definitions)
        let definitions = self.definitions.clone();
        for (path, def_node) in &definitions {
            let comp = def_node
                .get("attributes")
                .and_then(|a| a.get("ifcx::component::definition"))
                .cloned()
                .unwrap_or(json!({}));
            let name = comp
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or(path)
                .to_string();
            let base_point = comp
                .get("basePoint")
                .and_then(|bp| {
                    bp.as_array().map(|arr| {
                        let vals: Vec<f64> = arr.iter().filter_map(|v| v.as_f64()).collect();
                        if vals.len() >= 3 {
                            [vals[0], vals[1], vals[2]]
                        } else {
                            [0.0, 0.0, 0.0]
                        }
                    })
                });

            let mut block_entities = Vec::new();
            if let Some(children) = def_node.get("children").and_then(|c| c.as_object()) {
                for (_key, child_path_val) in children {
                    if let Some(child_path) = child_path_val.as_str() {
                        if let Some(child_node) = self.nodes_by_path.get(child_path) {
                            if let Some(ent) = self.node_to_entity(child_node, &self.nodes_by_path.clone()) {
                                block_entities.push(ent);
                            }
                        }
                    }
                }
            }

            let block = BlockDefinition {
                name: name.clone(),
                base_point,
                entities: if block_entities.is_empty() {
                    None
                } else {
                    Some(block_entities)
                },
                extra: HashMap::new(),
            };

            if let Some(blocks) = doc.file.blocks.as_mut() {
                blocks.insert(name, block);
            }
        }

        // Convert entity nodes -- walk views and collect elements
        let mut found_view = false;
        for node in &data {
            let attrs = node.get("attributes").cloned().unwrap_or(json!({}));
            if attrs.get("ifcx::view::name").is_some() {
                found_view = true;
                if let Some(children) = node.get("children").and_then(|c| c.as_object()) {
                    for (_key, child_path_val) in children {
                        if let Some(child_path) = child_path_val.as_str() {
                            if let Some(child_node) = self.nodes_by_path.get(child_path) {
                                if let Some(ent) =
                                    self.node_to_entity(child_node, &self.nodes_by_path.clone())
                                {
                                    doc.add_entity(ent);
                                }
                            }
                        }
                    }
                }
            }
        }

        // If no views found, scan all data nodes for geometry
        if !found_view || doc.file.entities.is_empty() {
            let nodes_snapshot = self.nodes_by_path.clone();
            for node in &data {
                if let Some(ent) = self.node_to_entity(node, &nodes_snapshot) {
                    doc.add_entity(ent);
                }
            }
        }

        Ok(doc)
    }

    // -----------------------------------------------------------------------
    // Header
    // -----------------------------------------------------------------------

    fn convert_header(&self, v2: &Value, doc: &mut IfcxDocument) {
        let length = v2
            .get("header")
            .and_then(|h| h.get("units"))
            .and_then(|u| u.get("length"))
            .and_then(|l| l.as_str())
            .unwrap_or("mm");

        let linear = match length {
            "mm" => "millimeters",
            "cm" => "centimeters",
            "m" => "meters",
            "km" => "kilometers",
            "in" => "inches",
            "ft" => "feet",
            "mi" => "miles",
            _ => "millimeters",
        };

        doc.file.header = Header {
            version: None,
            author: None,
            organization: None,
            application: None,
            units: Some(Units {
                linear: Some(linear.to_string()),
                measurement: Some("metric".to_string()),
                extra: HashMap::new(),
            }),
            extents: None,
            limits: None,
            current_layer: None,
            linetype_scale: None,
            extra: HashMap::new(),
        };
    }

    // -----------------------------------------------------------------------
    // Node -> Entity
    // -----------------------------------------------------------------------

    fn node_to_entity(
        &self,
        node: &Value,
        nodes_by_path: &HashMap<String, Value>,
    ) -> Option<Entity> {
        let attrs = node.get("attributes")?;
        let mut props = HashMap::<String, Value>::new();

        // Resolve layer from connection
        if let Some(layer_ref) = attrs
            .get("ifcx::connects::layer")
            .and_then(|c| c.get("ref"))
            .and_then(|r| r.as_str())
        {
            if let Some(layer_name) = self.layer_name_by_path.get(layer_ref) {
                // layer is set on Entity directly, not in properties
                // We'll set it below
                props.insert("_layer".to_string(), json!(layer_name));
            }
        }

        // Entity-level curve style
        if let Some(cs) = attrs.get("ifcx::style::curveStyle").and_then(|v| v.as_object()) {
            if let Some(colour) = cs.get("colour") {
                props.insert("color".to_string(), json!(rgb_to_aci(colour)));
            }
            if let Some(width) = cs.get("width") {
                props.insert("lineweight".to_string(), width.clone());
            }
            if let Some(pattern) = cs.get("pattern").and_then(|p| p.as_str()) {
                props.insert("linetype".to_string(), json!(pattern));
            }
        }

        let entity_type: String;

        // --- Geometry attributes -> entity type ---

        if let Some(g) = attrs.get("ifcx::geom::line") {
            entity_type = "LINE".to_string();
            if let Some(pts) = g.get("points").and_then(|p| p.as_array()) {
                if pts.len() >= 2 {
                    props.insert("start".to_string(), pts[0].clone());
                    props.insert("end".to_string(), pts[1].clone());
                }
            }
        } else if let Some(g) = attrs.get("ifcx::geom::circle") {
            entity_type = "CIRCLE".to_string();
            if let Some(center) = g.get("center") {
                props.insert("center".to_string(), center.clone());
            }
            if let Some(radius) = g.get("radius") {
                props.insert("radius".to_string(), radius.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::trimmedCurve") {
            entity_type = "ARC".to_string();
            if let Some(center) = g.get("center") {
                props.insert("center".to_string(), center.clone());
            }
            if let Some(radius) = g.get("radius") {
                props.insert("radius".to_string(), radius.clone());
            }
            if let Some(sa) = g.get("startAngle") {
                props.insert("startAngle".to_string(), sa.clone());
            }
            if let Some(ea) = g.get("endAngle") {
                props.insert("endAngle".to_string(), ea.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::ellipse") {
            entity_type = "ELLIPSE".to_string();
            if let Some(center) = g.get("center") {
                props.insert("center".to_string(), center.clone());
            }
            if let Some(s1) = g.get("semiAxis1") {
                props.insert("semiAxis1".to_string(), s1.clone());
            }
            if let Some(s2) = g.get("semiAxis2") {
                props.insert("semiAxis2".to_string(), s2.clone());
            }
            if let Some(rot) = g.get("rotation") {
                props.insert("rotation".to_string(), rot.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::bspline") {
            entity_type = "SPLINE".to_string();
            if let Some(deg) = g.get("degree") {
                props.insert("degree".to_string(), deg.clone());
            }
            if let Some(cp) = g.get("controlPoints") {
                props.insert("controlPoints".to_string(), cp.clone());
            }
            if let Some(knots) = g.get("knots") {
                props.insert("knots".to_string(), knots.clone());
            }
            if let Some(weights) = g.get("weights") {
                props.insert("weights".to_string(), weights.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::compositeCurve") {
            entity_type = "LWPOLYLINE".to_string();
            props.insert(
                "closed".to_string(),
                json!(g.get("closed").and_then(|v| v.as_bool()).unwrap_or(false)),
            );
            let segments = g
                .get("segments")
                .and_then(|s| s.as_array())
                .cloned()
                .unwrap_or_default();
            let (verts, bulges) = segments_to_lwpoly(&segments);
            props.insert("vertices".to_string(), json!(verts));
            if bulges.iter().any(|b| *b != 0.0) {
                props.insert("bulges".to_string(), json!(bulges));
            }
        } else if let Some(g) = attrs.get("ifcx::geom::polyline") {
            entity_type = "LWPOLYLINE".to_string();
            props.insert(
                "closed".to_string(),
                json!(g.get("closed").and_then(|v| v.as_bool()).unwrap_or(false)),
            );
            if let Some(points) = g.get("points") {
                props.insert("vertices".to_string(), points.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::polygon") {
            let pts = g.get("points").and_then(|p| p.as_array());
            let len = pts.map(|p| p.len()).unwrap_or(0);
            entity_type = if len <= 4 {
                "SOLID".to_string()
            } else {
                "3DFACE".to_string()
            };
            if let Some(pts) = pts {
                for (i, p) in pts.iter().take(4).enumerate() {
                    props.insert(format!("p{}", i + 1), p.clone());
                }
            }
        } else if let Some(g) = attrs.get("ifcx::geom::point") {
            entity_type = "POINT".to_string();
            if let Some(pos) = g.get("position") {
                props.insert("position".to_string(), pos.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::ray") {
            entity_type = "RAY".to_string();
            if let Some(origin) = g.get("origin") {
                props.insert("origin".to_string(), origin.clone());
            }
            if let Some(dir) = g.get("direction") {
                props.insert("direction".to_string(), dir.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::constructionLine") {
            entity_type = "XLINE".to_string();
            if let Some(origin) = g.get("origin") {
                props.insert("origin".to_string(), origin.clone());
            }
            if let Some(dir) = g.get("direction") {
                props.insert("direction".to_string(), dir.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::solid") {
            entity_type = "3DSOLID".to_string();
            if let Some(data) = g.get("data") {
                props.insert("acisData".to_string(), data.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::geom::mesh") {
            entity_type = "MESH".to_string();
            if let Some(points) = g.get("points") {
                props.insert("vertices".to_string(), points.clone());
            }
            if let Some(faces) = g.get("faceVertexIndices") {
                props.insert("faces".to_string(), faces.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::annotation::text") {
            let has_width = g.get("width").is_some();
            entity_type = if has_width {
                "MTEXT".to_string()
            } else {
                "TEXT".to_string()
            };
            if let Some(val) = g.get("value") {
                props.insert("text".to_string(), val.clone());
            }
            if let Some(placement) = g.get("placement") {
                props.insert("insertionPoint".to_string(), placement.clone());
            }
            if let Some(height) = g.get("height") {
                props.insert("height".to_string(), height.clone());
            }
            if let Some(width) = g.get("width") {
                props.insert("width".to_string(), width.clone());
            }
            if let Some(att) = g.get("attachment") {
                props.insert("attachment".to_string(), att.clone());
            }
            if let Some(align) = g.get("alignment") {
                props.insert("horizontalAlignment".to_string(), align.clone());
            }
            if let Some(style) = g.get("style").and_then(|s| s.as_object()) {
                if let Some(rot) = style.get("rotation") {
                    props.insert("rotation".to_string(), rot.clone());
                }
            }
        } else if let Some(g) = attrs.get("ifcx::annotation::dimension") {
            let subtype = g
                .get("subtype")
                .and_then(|s| s.as_str())
                .unwrap_or("linear");
            entity_type = match subtype {
                "linear" => "DIMENSION_LINEAR",
                "aligned" => "DIMENSION_ALIGNED",
                "angular" => "DIMENSION_ANGULAR",
                "diameter" => "DIMENSION_DIAMETER",
                "radius" => "DIMENSION_RADIUS",
                "ordinate" => "DIMENSION_ORDINATE",
                _ => "DIMENSION_LINEAR",
            }
            .to_string();

            if let Some(pts) = g.get("measurePoints").and_then(|p| p.as_array()) {
                if !pts.is_empty() {
                    props.insert("defPoint1".to_string(), pts[0].clone());
                }
                if pts.len() >= 2 {
                    props.insert("defPoint2".to_string(), pts[1].clone());
                }
            }
            if let Some(dl) = g.get("dimensionLine") {
                props.insert("dimLine".to_string(), dl.clone());
            }
            if let Some(txt) = g.get("text") {
                props.insert("text".to_string(), txt.clone());
            }
            if let Some(val) = g.get("value") {
                props.insert("measurement".to_string(), val.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::annotation::leader") {
            entity_type = "LEADER".to_string();
            if let Some(path) = g.get("path") {
                props.insert("vertices".to_string(), path.clone());
            }
            props.insert(
                "hasArrowhead".to_string(),
                json!(g.get("arrowhead").and_then(|a| a.as_bool()).unwrap_or(true)),
            );
        } else if attrs.get("ifcx::hatch::solid").is_some()
            || attrs.get("ifcx::hatch::pattern").is_some()
        {
            entity_type = "HATCH".to_string();
            if let Some(s) = attrs.get("ifcx::hatch::solid") {
                props.insert("solid".to_string(), json!(true));
                if let Some(colour) = s.get("colour") {
                    props.insert("color".to_string(), json!(rgb_to_aci(colour)));
                }
            } else if let Some(p) = attrs.get("ifcx::hatch::pattern") {
                props.insert("solid".to_string(), json!(false));
                if let Some(name) = p.get("name") {
                    props.insert("patternName".to_string(), name.clone());
                }
                if let Some(angle) = p.get("angle") {
                    props.insert("patternAngle".to_string(), angle.clone());
                }
                if let Some(scale) = p.get("scale") {
                    props.insert("patternScale".to_string(), scale.clone());
                }
            }
            if let Some(boundary) = attrs.get("ifcx::hatch::boundary") {
                props.insert("boundary".to_string(), boundary.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::sheet::viewport") {
            entity_type = "VIEWPORT".to_string();
            if let Some(center) = g.get("center") {
                props.insert("center".to_string(), center.clone());
            }
            if let Some(w) = g.get("width") {
                props.insert("width".to_string(), w.clone());
            }
            if let Some(h) = g.get("height") {
                props.insert("height".to_string(), h.clone());
            }
            if let Some(vt) = g.get("viewTarget") {
                props.insert("viewTarget".to_string(), vt.clone());
            }
            if let Some(vs) = g.get("viewScale") {
                props.insert("viewScale".to_string(), vs.clone());
            }
        } else if let Some(g) = attrs.get("ifcx::image::raster") {
            entity_type = "IMAGE".to_string();
            if let Some(ip) = g.get("insertionPoint") {
                props.insert("insertionPoint".to_string(), ip.clone());
            }
            // Resolve media path from the v2 media map
            if let Some(mid) = g.get("mediaId").and_then(|m| m.as_str()) {
                if let Some(media_entry) = self.media.get(mid) {
                    if let Some(media_path) = media_entry.get("path").and_then(|p| p.as_str()) {
                        props.insert("imagePath".to_string(), json!(media_path));
                    }
                }
            }
        } else if let Some(g) = attrs.get("ifcx::image::wipeout") {
            entity_type = "WIPEOUT".to_string();
            if let Some(boundary) = g.get("boundary") {
                props.insert("boundary".to_string(), boundary.clone());
            }
        } else if let Some(inherits_val) = node.get("inherits") {
            // INSERT via inherits
            if inherits_val.as_array().map(|a| !a.is_empty()).unwrap_or(false)
                && attrs.get("ifcx::xform::matrix").is_some()
            {
                entity_type = "INSERT".to_string();
                let def_path = inherits_val
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let def_node = nodes_by_path.get(def_path);
                let block_name = def_node
                    .and_then(|n| n.get("attributes"))
                    .and_then(|a| a.get("ifcx::component::definition"))
                    .and_then(|c| c.get("name"))
                    .and_then(|n| n.as_str())
                    .unwrap_or(def_path);
                props.insert("name".to_string(), json!(block_name));

                if let Some(matrix) = attrs
                    .get("ifcx::xform::matrix")
                    .and_then(|m| m.as_array())
                {
                    if matrix.len() >= 4 {
                        // Extract translation from row 3 (index 3)
                        let row3 = &matrix[3];
                        if let Some(row3_arr) = row3.as_array() {
                            if row3_arr.len() >= 3 {
                                let tx = row3_arr[0].as_f64().unwrap_or(0.0);
                                let ty = row3_arr[1].as_f64().unwrap_or(0.0);
                                let tz = row3_arr[2].as_f64().unwrap_or(0.0);
                                props.insert("insertionPoint".to_string(), json!([tx, ty, tz]));
                            }
                        }

                        // Extract scale and rotation
                        let m00 = matrix
                            .first()
                            .and_then(|r| r.as_array())
                            .and_then(|r| r.first())
                            .and_then(|v| v.as_f64())
                            .unwrap_or(1.0);
                        let m01 = matrix
                            .first()
                            .and_then(|r| r.as_array())
                            .and_then(|r| r.get(1))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0);
                        let m10 = matrix
                            .get(1)
                            .and_then(|r| r.as_array())
                            .and_then(|r| r.first())
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0);
                        let m11 = matrix
                            .get(1)
                            .and_then(|r| r.as_array())
                            .and_then(|r| r.get(1))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(1.0);
                        let m22 = matrix
                            .get(2)
                            .and_then(|r| r.as_array())
                            .and_then(|r| r.get(2))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(1.0);

                        let sx = (m00 * m00 + m01 * m01).sqrt();
                        let sy = (m10 * m10 + m11 * m11).sqrt();
                        let rotation = m01.atan2(m00);

                        props.insert("xScale".to_string(), json!(sx));
                        props.insert("yScale".to_string(), json!(sy));
                        props.insert("zScale".to_string(), json!(m22));
                        props.insert("rotation".to_string(), json!(rotation));
                    }
                }
            } else {
                return None;
            }
        } else if let Some(g) = attrs.get("ifcx::unknown::entity") {
            entity_type = g
                .get("originalType")
                .and_then(|t| t.as_str())
                .unwrap_or("UNKNOWN")
                .to_string();
            if let Some(data) = g.get("data").and_then(|d| d.as_object()) {
                for (k, v) in data {
                    props.insert(k.clone(), v.clone());
                }
            }
        } else {
            // Not a convertible geometry/annotation node
            return None;
        }

        // Extract layer from _layer helper prop
        let layer = props
            .remove("_layer")
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        Some(Entity {
            entity_type,
            handle: None,
            layer,
            properties: props,
        })
    }
}

// ---------------------------------------------------------------------------
// Segments -> LWPOLYLINE vertices + bulges
// ---------------------------------------------------------------------------

fn segments_to_lwpoly(segments: &[Value]) -> (Vec<Vec<f64>>, Vec<f64>) {
    let mut verts: Vec<Vec<f64>> = Vec::new();
    let mut bulges: Vec<f64> = Vec::new();

    for seg in segments {
        let stype = seg
            .get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("line");

        match stype {
            "line" => {
                let pts = seg
                    .get("points")
                    .and_then(|p| p.as_array())
                    .cloned()
                    .unwrap_or_default();
                if !pts.is_empty() {
                    if verts.is_empty() {
                        verts.push(value_to_f64_vec(&pts[0]));
                        bulges.push(0.0);
                    }
                    if pts.len() > 1 {
                        verts.push(value_to_f64_vec(pts.last().unwrap_or(&json!([0, 0, 0]))));
                        if let Some(last) = bulges.last_mut() {
                            *last = 0.0;
                        }
                        bulges.push(0.0);
                    }
                }
            }
            "arc" => {
                let center = seg
                    .get("center")
                    .map(|c| value_to_f64_vec(c))
                    .unwrap_or_else(|| vec![0.0, 0.0, 0.0]);
                let radius = seg
                    .get("radius")
                    .and_then(|r| r.as_f64())
                    .unwrap_or(0.0);
                let sa = seg
                    .get("startAngle")
                    .and_then(|a| a.as_f64())
                    .unwrap_or(0.0);
                let ea = seg
                    .get("endAngle")
                    .and_then(|a| a.as_f64())
                    .unwrap_or(0.0);

                let p1 = vec![
                    center[0] + radius * sa.cos(),
                    center[1] + radius * sa.sin(),
                    0.0,
                ];
                let p2 = vec![
                    center[0] + radius * ea.cos(),
                    center[1] + radius * ea.sin(),
                    0.0,
                ];

                let mut angle = ea - sa;
                if angle < 0.0 {
                    angle += 2.0 * std::f64::consts::PI;
                }
                let bulge = (angle / 4.0).tan();

                if verts.is_empty() {
                    verts.push(p1);
                    bulges.push(bulge);
                } else {
                    if let Some(last) = bulges.last_mut() {
                        *last = bulge;
                    }
                }
                verts.push(p2);
                bulges.push(0.0);
            }
            _ => {}
        }
    }

    (verts, bulges)
}

fn value_to_f64_vec(val: &Value) -> Vec<f64> {
    val.as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_f64()).collect())
        .unwrap_or_else(|| vec![0.0, 0.0, 0.0])
}

// ---------------------------------------------------------------------------
// RGB -> ACI
// ---------------------------------------------------------------------------

fn rgb_to_aci(rgb: &Value) -> i32 {
    let r = rgb.get("r").and_then(|v| v.as_f64()).unwrap_or(1.0);
    let g = rgb.get("g").and_then(|v| v.as_f64()).unwrap_or(1.0);
    let b = rgb.get("b").and_then(|v| v.as_f64()).unwrap_or(1.0);

    let table: [(i32, f64, f64, f64); 9] = [
        (1, 1.0, 0.0, 0.0),
        (2, 1.0, 1.0, 0.0),
        (3, 0.0, 1.0, 0.0),
        (4, 0.0, 1.0, 1.0),
        (5, 0.0, 0.0, 1.0),
        (6, 1.0, 0.0, 1.0),
        (7, 1.0, 1.0, 1.0),
        (8, 0.5, 0.5, 0.5),
        (9, 0.75, 0.75, 0.75),
    ];

    let mut best_aci = 7;
    let mut best_dist = f64::INFINITY;
    for (aci, cr, cg, cb) in &table {
        let d = (r - cr).powi(2) + (g - cg).powi(2) + (b - cb).powi(2);
        if d < best_dist {
            best_dist = d;
            best_aci = *aci;
        }
    }
    best_aci
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roundtrip_line() {
        let v2 = json!({
            "header": {
                "ifcxVersion": "2.0",
                "units": {"length": "mm", "angle": "rad"},
            },
            "imports": [],
            "data": [
                {
                    "path": "view-main",
                    "children": {"e1": "e-001"},
                    "attributes": {
                        "ifcx::purpose": "drawing",
                        "ifcx::view::name": "Main",
                    },
                },
                {
                    "path": "e-001",
                    "attributes": {
                        "ifcx::purpose": "drawing",
                        "ifcx::geom::line": {
                            "points": [[0.0, 0.0, 0.0], [10.0, 10.0, 0.0]],
                        },
                    },
                },
            ],
            "media": {},
        });

        let doc = V2Export::to_v1(&v2).expect("conversion should succeed");
        assert_eq!(doc.file.entities.len(), 1);
        assert_eq!(doc.file.entities[0].entity_type, "LINE");
    }

    #[test]
    fn test_rgb_to_aci_red() {
        let rgb = json!({"r": 1.0, "g": 0.0, "b": 0.0});
        assert_eq!(rgb_to_aci(&rgb), 1);
    }

    #[test]
    fn test_rgb_to_aci_white() {
        let rgb = json!({"r": 1.0, "g": 1.0, "b": 1.0});
        assert_eq!(rgb_to_aci(&rgb), 7);
    }
}
