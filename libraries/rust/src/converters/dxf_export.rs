//! IFCX to DXF exporter -- pure Rust.
//!
//! Generates valid DXF ASCII output (AutoCAD 2018 / AC1032 by default).

use std::collections::HashMap;
use std::path::Path;

use crate::types::*;
use crate::{IfcxDocument, IfcxError};
use super::dxf_writer::DxfWriter;

/// Exports IFCX documents to DXF format.
pub struct DxfExporter;

impl DxfExporter {
    /// Export to DXF string.
    pub fn to_string(doc: &IfcxDocument, version: &str) -> Result<String, IfcxError> {
        let mut w = DxfWriter::new();

        Self::write_header(&mut w, doc, version);
        Self::write_tables(&mut w, doc);
        Self::write_blocks(&mut w, doc);
        Self::write_entities(&mut w, doc);
        Self::write_objects(&mut w, doc);

        w.group_str(0, "EOF");
        Ok(w.finish())
    }

    /// Export to DXF file.
    pub fn to_file(doc: &IfcxDocument, path: impl AsRef<Path>, version: &str) -> Result<(), IfcxError> {
        let dxf = Self::to_string(doc, version)?;
        std::fs::write(path, dxf)?;
        Ok(())
    }

    // ------------------------------------------------------------------
    // HEADER section
    // ------------------------------------------------------------------

    fn write_header(w: &mut DxfWriter, doc: &IfcxDocument, version: &str) {
        w.begin_section("HEADER");

        // $ACADVER
        w.group_str(9, "$ACADVER");
        w.group_str(1, version);

        // $HANDSEED
        w.group_str(9, "$HANDSEED");
        w.group_str(5, "FFFF");

        // $INSUNITS
        let units_linear = doc.file.header.units.as_ref()
            .and_then(|u| u.linear.as_deref())
            .unwrap_or("millimeters");

        let unit_code: i64 = match units_linear {
            "unitless" => 0, "inches" => 1, "feet" => 2, "miles" => 3,
            "millimeters" => 4, "centimeters" => 5, "meters" => 6, "kilometers" => 7,
            _ => 4,
        };
        w.group_str(9, "$INSUNITS");
        w.group_int(70, unit_code);

        // $MEASUREMENT
        let measurement = doc.file.header.units.as_ref()
            .and_then(|u| u.measurement.as_deref())
            .unwrap_or("metric");
        w.group_str(9, "$MEASUREMENT");
        w.group_int(70, if measurement == "metric" { 1 } else { 0 });

        // $CLAYER
        let clayer = doc.file.header.current_layer.as_deref().unwrap_or("0");
        w.group_str(9, "$CLAYER");
        w.group_str(8, clayer);

        // $LTSCALE
        let ltscale = doc.file.header.linetype_scale.unwrap_or(1.0);
        w.group_str(9, "$LTSCALE");
        w.group_float(40, ltscale);

        w.end_section();
    }

    // ------------------------------------------------------------------
    // TABLES section
    // ------------------------------------------------------------------

    fn write_tables(w: &mut DxfWriter, doc: &IfcxDocument) {
        let tables = doc.file.tables.as_ref();
        let layers = tables
            .and_then(|t| t.layers.as_ref())
            .cloned()
            .unwrap_or_else(|| {
                let mut m = HashMap::new();
                m.insert("0".to_string(), Layer {
                    color: None, linetype: None, lineweight: None,
                    frozen: None, locked: None, off: None, plot: None,
                });
                m
            });

        w.begin_section("TABLES");

        // --- VPORT ---
        let vh = w.next_handle();
        w.begin_table("VPORT", &vh, 1);
        w.group_str(0, "VPORT");
        let h = w.next_handle();
        w.handle(&h);
        w.group_str(100, "AcDbSymbolTableRecord");
        w.group_str(100, "AcDbViewportTableRecord");
        w.group_str(2, "*Active");
        w.group_int(70, 0);
        w.point(0.0, 0.0, 0.0, 10);
        w.point(1.0, 1.0, 0.0, 11);
        w.point(0.0, 0.0, 1.0, 16);
        w.group_float(45, 1.0);
        w.end_table();

        // --- LTYPE ---
        let lth = w.next_handle();
        w.begin_table("LTYPE", &lth, 3);
        for lt_name in &["ByBlock", "ByLayer", "Continuous"] {
            w.group_str(0, "LTYPE");
            let h = w.next_handle();
            w.handle(&h);
            w.group_str(100, "AcDbSymbolTableRecord");
            w.group_str(100, "AcDbLinetypeTableRecord");
            w.group_str(2, lt_name);
            w.group_int(70, 0);
            w.group_str(3, "");
            w.group_int(72, 65);
            w.group_int(73, 0);
            w.group_float(40, 0.0);
        }
        w.end_table();

        // --- LAYER ---
        let layh = w.next_handle();
        w.begin_table("LAYER", &layh, layers.len() as i64);
        for (layer_name, layer_props) in &layers {
            w.group_str(0, "LAYER");
            let h = w.next_handle();
            w.handle(&h);
            w.group_str(100, "AcDbSymbolTableRecord");
            w.group_str(100, "AcDbLayerTableRecord");
            w.group_str(2, layer_name);
            let mut flags = 0i64;
            if layer_props.frozen == Some(true) { flags |= 1; }
            if layer_props.locked == Some(true) { flags |= 4; }
            w.group_int(70, flags);
            let mut color = match &layer_props.color {
                Some(Color::Index(c)) => *c as i64,
                _ => 7,
            };
            if layer_props.off == Some(true) {
                color = -color.abs();
            }
            w.group_int(62, color);
            let lt = layer_props.linetype.as_deref().unwrap_or("Continuous");
            w.group_str(6, lt);
            w.group_int(370, -3); // default lineweight
        }
        w.end_table();

        // --- STYLE ---
        let sth = w.next_handle();
        w.begin_table("STYLE", &sth, 1);
        w.group_str(0, "STYLE");
        let h = w.next_handle();
        w.handle(&h);
        w.group_str(100, "AcDbSymbolTableRecord");
        w.group_str(100, "AcDbTextStyleTableRecord");
        w.group_str(2, "Standard");
        w.group_int(70, 0);
        w.group_float(40, 0.0);
        w.group_float(41, 1.0);
        w.group_float(42, 2.5);
        w.group_str(3, "txt");
        w.group_str(4, "");
        w.end_table();

        // --- VIEW ---
        let viewh = w.next_handle();
        w.begin_table("VIEW", &viewh, 0);
        w.end_table();

        // --- UCS ---
        let ucsh = w.next_handle();
        w.begin_table("UCS", &ucsh, 0);
        w.end_table();

        // --- APPID ---
        let appidh = w.next_handle();
        w.begin_table("APPID", &appidh, 1);
        w.group_str(0, "APPID");
        let h = w.next_handle();
        w.handle(&h);
        w.group_str(100, "AcDbSymbolTableRecord");
        w.group_str(100, "AcDbRegAppTableRecord");
        w.group_str(2, "ACAD");
        w.group_int(70, 0);
        w.end_table();

        // --- DIMSTYLE ---
        let dsh = w.next_handle();
        w.begin_table("DIMSTYLE", &dsh, 1);
        w.group_str(0, "DIMSTYLE");
        let h = w.next_handle();
        w.handle(&h);
        w.group_str(100, "AcDbSymbolTableRecord");
        w.group_str(100, "AcDbDimStyleTableRecord");
        w.group_str(2, "Standard");
        w.group_int(70, 0);
        w.group_float(40, 1.0);
        w.group_float(41, 2.5);
        w.group_float(140, 2.5);
        w.end_table();

        // --- BLOCK_RECORD ---
        let block_names: Vec<String> = doc.file.blocks.as_ref()
            .map(|b| b.keys().cloned().collect())
            .unwrap_or_default();
        let br_count = 2 + block_names.len() as i64;
        let brh = w.next_handle();
        w.begin_table("BLOCK_RECORD", &brh, br_count);
        let mut all_block_names: Vec<String> = vec!["*Model_Space".to_string(), "*Paper_Space".to_string()];
        all_block_names.extend(block_names);
        for br_name in &all_block_names {
            w.group_str(0, "BLOCK_RECORD");
            let h = w.next_handle();
            w.handle(&h);
            w.group_str(100, "AcDbSymbolTableRecord");
            w.group_str(100, "AcDbBlockTableRecord");
            w.group_str(2, br_name);
        }
        w.end_table();

        w.end_section();
    }

    // ------------------------------------------------------------------
    // BLOCKS section
    // ------------------------------------------------------------------

    fn write_blocks(w: &mut DxfWriter, doc: &IfcxDocument) {
        w.begin_section("BLOCKS");

        // *Model_Space
        Self::write_block_wrapper(w, "*Model_Space", "0", &[], &[0.0, 0.0, 0.0]);
        // *Paper_Space
        Self::write_block_wrapper(w, "*Paper_Space", "0", &[], &[0.0, 0.0, 0.0]);

        // User blocks
        if let Some(ref blocks) = doc.file.blocks {
            for (block_name, block_data) in blocks {
                let bp = block_data.base_point.unwrap_or([0.0, 0.0, 0.0]);
                let entities = block_data.entities.as_deref().unwrap_or(&[]);
                Self::write_block_wrapper(w, block_name, "0", entities, &bp);
            }
        }

        w.end_section();
    }

    fn write_block_wrapper(
        w: &mut DxfWriter,
        name: &str,
        layer: &str,
        entities: &[Entity],
        base_point: &[f64],
    ) {
        let bp = [
            base_point.first().copied().unwrap_or(0.0),
            base_point.get(1).copied().unwrap_or(0.0),
            base_point.get(2).copied().unwrap_or(0.0),
        ];
        w.group_str(0, "BLOCK");
        let h = w.next_handle();
        w.handle(&h);
        w.group_str(100, "AcDbEntity");
        w.group_str(8, layer);
        w.group_str(100, "AcDbBlockBegin");
        w.group_str(2, name);
        w.group_int(70, 0);
        w.point(bp[0], bp[1], bp[2], 10);
        w.group_str(3, name);
        w.group_str(1, "");

        for ent in entities {
            Self::write_entity(w, ent);
        }

        w.group_str(0, "ENDBLK");
        let h = w.next_handle();
        w.handle(&h);
        w.group_str(100, "AcDbEntity");
        w.group_str(8, layer);
        w.group_str(100, "AcDbBlockEnd");
    }

    // ------------------------------------------------------------------
    // ENTITIES section
    // ------------------------------------------------------------------

    fn write_entities(w: &mut DxfWriter, doc: &IfcxDocument) {
        w.begin_section("ENTITIES");
        for ent in &doc.file.entities {
            Self::write_entity(w, ent);
        }
        w.end_section();
    }

    fn write_entity(w: &mut DxfWriter, ent: &Entity) {
        match ent.entity_type.as_str() {
            "LINE" => Self::write_line(w, ent),
            "POINT" => Self::write_point_entity(w, ent),
            "CIRCLE" => Self::write_circle(w, ent),
            "ARC" => Self::write_arc(w, ent),
            "ELLIPSE" => Self::write_ellipse(w, ent),
            "SPLINE" => Self::write_spline(w, ent),
            "LWPOLYLINE" => Self::write_lwpolyline(w, ent),
            "TEXT" => Self::write_text(w, ent),
            "MTEXT" => Self::write_mtext(w, ent),
            "INSERT" => Self::write_insert(w, ent),
            "DIMENSION" | "DIMENSION_LINEAR" | "DIMENSION_ALIGNED"
            | "DIMENSION_ANGULAR" | "DIMENSION_DIAMETER"
            | "DIMENSION_RADIUS" | "DIMENSION_ORDINATE" => Self::write_dimension(w, ent),
            "LEADER" => Self::write_leader(w, ent),
            "HATCH" => Self::write_hatch(w, ent),
            "SOLID" | "TRACE" => Self::write_solid_trace(w, ent),
            "3DFACE" => Self::write_3dface(w, ent),
            "VIEWPORT" => Self::write_viewport(w, ent),
            "XLINE" | "RAY" => Self::write_xline_ray(w, ent),
            _ => {} // silently skip unsupported
        }
    }

    fn write_common(w: &mut DxfWriter, ent: &Entity, subclass: &str) {
        let h = match &ent.handle {
            Some(handle) => handle.clone(),
            None => w.next_handle(),
        };
        w.handle(&h);
        w.group_str(100, "AcDbEntity");
        let layer = ent.layer.as_deref().unwrap_or("0");
        w.group_str(8, layer);

        if let Some(serde_json::Value::String(lt)) = ent.properties.get("linetype") {
            w.group_str(6, lt);
        }
        if let Some(serde_json::Value::Number(n)) = ent.properties.get("color") {
            if let Some(c) = n.as_i64() {
                w.group_int(62, c);
            }
        }
        if let Some(serde_json::Value::Number(n)) = ent.properties.get("lineweight") {
            if let Some(lw) = n.as_i64() {
                w.group_int(370, lw);
            }
        }
        w.group_str(100, subclass);
    }

    fn get_point(ent: &Entity, key: &str) -> [f64; 3] {
        if let Some(serde_json::Value::Array(arr)) = ent.properties.get(key) {
            let x = arr.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
            let y = arr.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
            let z = arr.get(2).and_then(|v| v.as_f64()).unwrap_or(0.0);
            [x, y, z]
        } else {
            [0.0, 0.0, 0.0]
        }
    }

    fn get_f64(ent: &Entity, key: &str, default: f64) -> f64 {
        ent.properties.get(key)
            .and_then(|v| v.as_f64())
            .unwrap_or(default)
    }

    fn get_i64(ent: &Entity, key: &str, default: i64) -> i64 {
        ent.properties.get(key)
            .and_then(|v| v.as_i64())
            .unwrap_or(default)
    }

    fn get_str(ent: &Entity, key: &str, default: &str) -> String {
        ent.properties.get(key)
            .and_then(|v| v.as_str())
            .unwrap_or(default)
            .to_string()
    }

    // --- LINE ---
    fn write_line(w: &mut DxfWriter, ent: &Entity) {
        w.entity("LINE");
        Self::write_common(w, ent, "AcDbLine");
        let s = Self::get_point(ent, "start");
        let e = Self::get_point(ent, "end");
        w.point(s[0], s[1], s[2], 10);
        w.point(e[0], e[1], e[2], 11);
    }

    // --- POINT ---
    fn write_point_entity(w: &mut DxfWriter, ent: &Entity) {
        w.entity("POINT");
        Self::write_common(w, ent, "AcDbPoint");
        let p = Self::get_point(ent, "position");
        w.point(p[0], p[1], p[2], 10);
    }

    // --- CIRCLE ---
    fn write_circle(w: &mut DxfWriter, ent: &Entity) {
        w.entity("CIRCLE");
        Self::write_common(w, ent, "AcDbCircle");
        let c = Self::get_point(ent, "center");
        w.point(c[0], c[1], c[2], 10);
        w.group_float(40, Self::get_f64(ent, "radius", 0.0));
    }

    // --- ARC ---
    fn write_arc(w: &mut DxfWriter, ent: &Entity) {
        w.entity("ARC");
        Self::write_common(w, ent, "AcDbCircle");
        let c = Self::get_point(ent, "center");
        w.point(c[0], c[1], c[2], 10);
        w.group_float(40, Self::get_f64(ent, "radius", 0.0));
        w.group_str(100, "AcDbArc");
        w.group_float(50, Self::get_f64(ent, "startAngle", 0.0));
        w.group_float(51, Self::get_f64(ent, "endAngle", 360.0));
    }

    // --- ELLIPSE ---
    fn write_ellipse(w: &mut DxfWriter, ent: &Entity) {
        w.entity("ELLIPSE");
        Self::write_common(w, ent, "AcDbEllipse");
        let c = Self::get_point(ent, "center");
        w.point(c[0], c[1], c[2], 10);
        let ma = Self::get_point(ent, "majorAxisEndpoint");
        w.point(ma[0], ma[1], ma[2], 11);
        w.group_float(40, Self::get_f64(ent, "minorAxisRatio", 0.5));
        w.group_float(41, Self::get_f64(ent, "startParam", 0.0));
        w.group_float(42, Self::get_f64(ent, "endParam", std::f64::consts::TAU));
    }

    // --- SPLINE ---
    fn write_spline(w: &mut DxfWriter, ent: &Entity) {
        w.entity("SPLINE");
        Self::write_common(w, ent, "AcDbSpline");
        let mut flags = 0i64;
        if ent.properties.get("closed").and_then(|v| v.as_bool()).unwrap_or(false) {
            flags |= 1;
        }
        if ent.properties.get("rational").and_then(|v| v.as_bool()).unwrap_or(false) {
            flags |= 4;
        }
        w.group_int(70, flags);
        w.group_int(71, Self::get_i64(ent, "degree", 3));

        // Write knots and control points count
        if let Some(serde_json::Value::Array(knots)) = ent.properties.get("knots") {
            w.group_int(72, knots.len() as i64);
            if let Some(serde_json::Value::Array(cpts)) = ent.properties.get("controlPoints") {
                w.group_int(73, cpts.len() as i64);
            }
            w.group_int(74, 0);
            for k in knots {
                if let Some(v) = k.as_f64() {
                    w.group_float(40, v);
                }
            }
        }
        if let Some(serde_json::Value::Array(cpts)) = ent.properties.get("controlPoints") {
            for cp in cpts {
                if let Some(arr) = cp.as_array() {
                    let x = arr.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let y = arr.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let z = arr.get(2).and_then(|v| v.as_f64()).unwrap_or(0.0);
                    w.point(x, y, z, 10);
                }
            }
        }
    }

    // --- LWPOLYLINE ---
    fn write_lwpolyline(w: &mut DxfWriter, ent: &Entity) {
        w.entity("LWPOLYLINE");
        Self::write_common(w, ent, "AcDbPolyline");

        if let Some(serde_json::Value::Array(verts)) = ent.properties.get("vertices") {
            w.group_int(90, verts.len() as i64);
            let mut flags = 0i64;
            if ent.properties.get("closed").and_then(|v| v.as_bool()).unwrap_or(false) {
                flags |= 1;
            }
            w.group_int(70, flags);

            for v in verts {
                let x = v.get("x").and_then(|val| val.as_f64()).unwrap_or(0.0);
                let y = v.get("y").and_then(|val| val.as_f64()).unwrap_or(0.0);
                w.group_float(10, x);
                w.group_float(20, y);
                if let Some(b) = v.get("bulge").and_then(|val| val.as_f64()) {
                    if b != 0.0 {
                        w.group_float(42, b);
                    }
                }
            }
        }
    }

    // --- TEXT ---
    fn write_text(w: &mut DxfWriter, ent: &Entity) {
        w.entity("TEXT");
        Self::write_common(w, ent, "AcDbText");
        let ip = Self::get_point(ent, "insertionPoint");
        w.point(ip[0], ip[1], ip[2], 10);
        w.group_float(40, Self::get_f64(ent, "height", 2.5));
        w.group_str(1, &Self::get_str(ent, "text", ""));
        if ent.properties.contains_key("rotation") {
            w.group_float(50, Self::get_f64(ent, "rotation", 0.0));
        }
        if let Some(serde_json::Value::String(s)) = ent.properties.get("style") {
            w.group_str(7, s);
        }
        w.group_str(100, "AcDbText");
    }

    // --- MTEXT ---
    fn write_mtext(w: &mut DxfWriter, ent: &Entity) {
        w.entity("MTEXT");
        Self::write_common(w, ent, "AcDbMText");
        let ip = Self::get_point(ent, "insertionPoint");
        w.point(ip[0], ip[1], ip[2], 10);
        w.group_float(40, Self::get_f64(ent, "height", 2.5));
        if ent.properties.contains_key("width") {
            w.group_float(41, Self::get_f64(ent, "width", 0.0));
        }
        w.group_int(71, Self::get_i64(ent, "attachment", 1));
        let text = Self::get_str(ent, "text", "");
        w.group_str(1, &text);
    }

    // --- INSERT ---
    fn write_insert(w: &mut DxfWriter, ent: &Entity) {
        w.entity("INSERT");
        Self::write_common(w, ent, "AcDbBlockReference");
        w.group_str(2, &Self::get_str(ent, "blockName", ""));
        let ip = Self::get_point(ent, "insertionPoint");
        w.point(ip[0], ip[1], ip[2], 10);
        if ent.properties.contains_key("scaleX") {
            w.group_float(41, Self::get_f64(ent, "scaleX", 1.0));
        }
        if ent.properties.contains_key("scaleY") {
            w.group_float(42, Self::get_f64(ent, "scaleY", 1.0));
        }
        if ent.properties.contains_key("scaleZ") {
            w.group_float(43, Self::get_f64(ent, "scaleZ", 1.0));
        }
        if ent.properties.contains_key("rotation") {
            w.group_float(50, Self::get_f64(ent, "rotation", 0.0));
        }
    }

    // --- DIMENSION ---
    fn write_dimension(w: &mut DxfWriter, ent: &Entity) {
        w.entity("DIMENSION");
        Self::write_common(w, ent, "AcDbDimension");

        if let Some(serde_json::Value::String(bn)) = ent.properties.get("blockName") {
            w.group_str(2, bn);
        }
        let dp = Self::get_point(ent, "dimLinePoint");
        w.point(dp[0], dp[1], dp[2], 10);
        let mp = Self::get_point(ent, "textPosition");
        w.point(mp[0], mp[1], mp[2], 11);

        let dimtype = Self::get_i64(ent, "dimTypeRaw", 0);
        w.group_int(70, dimtype);

        let subtype = dimtype & 0x0F;
        if subtype == 0 || subtype == 1 {
            w.group_str(100, "AcDbAlignedDimension");
            let d1 = Self::get_point(ent, "defPoint1");
            w.point(d1[0], d1[1], d1[2], 13);
            let d2 = Self::get_point(ent, "defPoint2");
            w.point(d2[0], d2[1], d2[2], 14);
            if subtype == 0 {
                w.group_str(100, "AcDbRotatedDimension");
            }
        }
    }

    // --- LEADER ---
    fn write_leader(w: &mut DxfWriter, ent: &Entity) {
        w.entity("LEADER");
        Self::write_common(w, ent, "AcDbLeader");
        let has_arrowhead = ent.properties.get("hasArrowhead")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        w.group_int(71, if has_arrowhead { 1 } else { 0 });
        let path = Self::get_str(ent, "pathType", "straight");
        w.group_int(72, if path == "spline" { 1 } else { 0 });

        if let Some(serde_json::Value::Array(verts)) = ent.properties.get("vertices") {
            w.group_int(76, verts.len() as i64);
            for v in verts {
                if let Some(arr) = v.as_array() {
                    let x = arr.first().and_then(|val| val.as_f64()).unwrap_or(0.0);
                    let y = arr.get(1).and_then(|val| val.as_f64()).unwrap_or(0.0);
                    let z = arr.get(2).and_then(|val| val.as_f64()).unwrap_or(0.0);
                    w.point(x, y, z, 10);
                }
            }
        }
    }

    // --- HATCH ---
    fn write_hatch(w: &mut DxfWriter, ent: &Entity) {
        w.entity("HATCH");
        Self::write_common(w, ent, "AcDbHatch");
        w.point(0.0, 0.0, 0.0, 10);
        w.group_float(210, 0.0);
        w.group_float(220, 0.0);
        w.group_float(230, 1.0);
        w.group_str(2, &Self::get_str(ent, "patternName", "SOLID"));
        let is_solid = ent.properties.get("solid").and_then(|v| v.as_bool()).unwrap_or(true);
        w.group_int(70, if is_solid { 1 } else { 0 });
        w.group_int(71, 0);
        w.group_int(91, 0); // no boundaries for simplified output
        w.group_int(75, Self::get_i64(ent, "hatchStyle", 0));
        w.group_int(76, Self::get_i64(ent, "patternType", 1));
        w.group_int(98, 0);
    }

    // --- SOLID / TRACE ---
    fn write_solid_trace(w: &mut DxfWriter, ent: &Entity) {
        w.entity(&ent.entity_type);
        Self::write_common(w, ent, "AcDbTrace");
        for (i, base) in [10, 11, 12, 13].iter().enumerate() {
            let key = format!("point{}", i + 1);
            let pt = Self::get_point(ent, &key);
            w.point(pt[0], pt[1], pt[2], *base);
        }
    }

    // --- 3DFACE ---
    fn write_3dface(w: &mut DxfWriter, ent: &Entity) {
        w.entity("3DFACE");
        Self::write_common(w, ent, "AcDbFace");
        for (i, base) in [10, 11, 12, 13].iter().enumerate() {
            let key = format!("point{}", i + 1);
            let pt = Self::get_point(ent, &key);
            w.point(pt[0], pt[1], pt[2], *base);
        }
    }

    // --- VIEWPORT ---
    fn write_viewport(w: &mut DxfWriter, ent: &Entity) {
        w.entity("VIEWPORT");
        Self::write_common(w, ent, "AcDbViewport");
        let c = Self::get_point(ent, "center");
        w.point(c[0], c[1], c[2], 10);
        w.group_float(40, Self::get_f64(ent, "width", 297.0));
        w.group_float(41, Self::get_f64(ent, "height", 210.0));
    }

    // --- XLINE / RAY ---
    fn write_xline_ray(w: &mut DxfWriter, ent: &Entity) {
        w.entity(&ent.entity_type);
        let subclass = if ent.entity_type == "XLINE" { "AcDbXline" } else { "AcDbRay" };
        Self::write_common(w, ent, subclass);
        let o = Self::get_point(ent, "origin");
        w.point(o[0], o[1], o[2], 10);
        let d = Self::get_point(ent, "direction");
        w.point(d[0], d[1], d[2], 11);
    }

    // ------------------------------------------------------------------
    // OBJECTS section
    // ------------------------------------------------------------------

    fn write_objects(w: &mut DxfWriter, _doc: &IfcxDocument) {
        w.begin_section("OBJECTS");

        // Root dictionary
        let root_handle = w.next_handle();
        w.entity("DICTIONARY");
        w.handle(&root_handle);
        w.group_str(100, "AcDbDictionary");
        w.group_int(281, 1);

        let group_dict_handle = w.next_handle();
        w.group_str(3, "ACAD_GROUP");
        w.group_str(350, &group_dict_handle);

        w.entity("DICTIONARY");
        w.handle(&group_dict_handle);
        w.group_str(100, "AcDbDictionary");
        w.group_int(281, 1);

        w.end_section();
    }
}
