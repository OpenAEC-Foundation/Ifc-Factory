//! DXF section-level parser -- pure Rust, no external dependencies.
//!
//! Parses tokenised DXF group-code/value pairs into a structured `DxfFile`.

use std::collections::HashMap;

use crate::IfcxError;
use super::dxf_tokenizer::{tokenize, DxfValue, TokenStream};

/// In-memory representation of a parsed DXF file.
#[derive(Debug, Clone, Default)]
pub struct DxfFile {
    pub header: HashMap<String, DxfValue>,
    pub tables: HashMap<String, Vec<HashMap<String, DxfValue>>>,
    pub blocks: HashMap<String, DxfBlock>,
    pub entities: Vec<HashMap<String, DxfValue>>,
    pub objects: Vec<HashMap<String, DxfValue>>,
}

/// A parsed DXF block definition.
#[derive(Debug, Clone, Default)]
pub struct DxfBlock {
    pub name: String,
    pub handle: Option<String>,
    pub layer: Option<String>,
    pub base_point: [f64; 3],
    pub flags: i64,
    pub entities: Vec<HashMap<String, DxfValue>>,
}

/// Parses DXF ASCII content into a `DxfFile`.
pub struct DxfParser;

impl DxfParser {
    /// Parse a full DXF string and return a `DxfFile`.
    pub fn parse(content: &str) -> Result<DxfFile, IfcxError> {
        let tokens = tokenize(content);
        let mut stream = TokenStream::new(tokens);
        let mut result = DxfFile::default();

        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, ref value) = tok;
            if code == 0 && value.as_str_value() == "EOF" {
                break;
            }
            if code == 0 && value.as_str_value() == "SECTION" {
                let name_tok = match stream.next_token() {
                    Some(t) => t.clone(),
                    None => break,
                };
                let section_name = name_tok.1.as_str_value().to_uppercase();

                match section_name.as_str() {
                    "HEADER" => result.header = Self::parse_header(&mut stream),
                    "TABLES" => result.tables = Self::parse_tables(&mut stream),
                    "BLOCKS" => result.blocks = Self::parse_blocks(&mut stream),
                    "ENTITIES" => result.entities = Self::parse_entities(&mut stream),
                    "OBJECTS" => result.objects = Self::parse_objects(&mut stream),
                    _ => Self::skip_section(&mut stream),
                }
            }
        }

        Ok(result)
    }

    // ---------------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------------

    fn parse_header(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut header = HashMap::new();
        let mut current_var: Option<String> = None;
        let mut current_values: Vec<(i32, DxfValue)> = Vec::new();

        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;

            if code == 0 && value.as_str_value() == "ENDSEC" {
                break;
            }

            if code == 9 {
                if let Some(var_name) = current_var.take() {
                    header.insert(var_name, Self::collapse_header_var(&current_values));
                }
                current_var = Some(value.as_str_value());
                current_values.clear();
            } else {
                current_values.push((code, value));
            }
        }

        if let Some(var_name) = current_var {
            header.insert(var_name, Self::collapse_header_var(&current_values));
        }

        header
    }

    fn collapse_header_var(pairs: &[(i32, DxfValue)]) -> DxfValue {
        if pairs.is_empty() {
            return DxfValue::Str(String::new());
        }
        if pairs.len() == 1 {
            return pairs[0].1.clone();
        }
        // If coordinate codes present, return first value (simplified)
        pairs[0].1.clone()
    }

    // ---------------------------------------------------------------
    // TABLES
    // ---------------------------------------------------------------

    fn parse_tables(stream: &mut TokenStream) -> HashMap<String, Vec<HashMap<String, DxfValue>>> {
        let mut tables: HashMap<String, Vec<HashMap<String, DxfValue>>> = HashMap::new();

        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;

            if code == 0 && value.as_str_value() == "ENDSEC" {
                break;
            }
            if code == 0 && value.as_str_value() == "TABLE" {
                let name_tok = match stream.next_token() {
                    Some(t) => t.clone(),
                    None => break,
                };
                let table_name = name_tok.1.as_str_value().to_uppercase();
                let entries = Self::parse_table_entries(stream, &table_name);
                tables.insert(table_name, entries);
            }
        }

        tables
    }

    fn parse_table_entries(
        stream: &mut TokenStream,
        table_name: &str,
    ) -> Vec<HashMap<String, DxfValue>> {
        let mut entries = Vec::new();

        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;

            if code == 0 && value.as_str_value() == "ENDTAB" {
                break;
            }
            if code == 0 {
                let entry_type = value.as_str_value();
                let entry = Self::parse_table_entry(stream, &entry_type, table_name);
                entries.push(entry);
            }
        }

        entries
    }

    fn parse_table_entry(
        stream: &mut TokenStream,
        _entry_type: &str,
        table_name: &str,
    ) -> HashMap<String, DxfValue> {
        let mut entry = HashMap::new();
        let mut pattern_elements: Vec<f64> = Vec::new();

        loop {
            if let Some(tok) = stream.peek() {
                if tok.0 == 0 {
                    break;
                }
            } else {
                break;
            }
            let tok = stream.next_token().cloned();
            let (code, value) = match tok {
                Some(t) => t,
                None => break,
            };

            match table_name {
                "LAYER" => Self::apply_layer_code(&mut entry, code, &value),
                "LTYPE" => Self::apply_ltype_code(&mut entry, code, &value, &mut pattern_elements),
                "STYLE" => Self::apply_style_code(&mut entry, code, &value),
                "DIMSTYLE" => Self::apply_dimstyle_code(&mut entry, code, &value),
                _ => Self::apply_generic_table_code(&mut entry, code, &value),
            }
        }

        if !pattern_elements.is_empty() {
            entry.insert(
                "pattern".to_string(),
                DxfValue::Str(
                    pattern_elements
                        .iter()
                        .map(|v| v.to_string())
                        .collect::<Vec<_>>()
                        .join(","),
                ),
            );
        }

        entry
    }

    fn apply_layer_code(entry: &mut HashMap<String, DxfValue>, code: i32, value: &DxfValue) {
        match code {
            2 => { entry.insert("name".into(), DxfValue::Str(value.as_str_value())); }
            5 => { entry.insert("handle".into(), DxfValue::Str(value.as_str_value())); }
            6 => { entry.insert("linetype".into(), DxfValue::Str(value.as_str_value())); }
            62 => {
                let color = value.as_i64();
                entry.insert("color".into(), DxfValue::Int(color.abs()));
                if color < 0 {
                    entry.insert("off".into(), DxfValue::Bool(true));
                }
            }
            70 => {
                let flags = value.as_i64();
                entry.insert("flags".into(), DxfValue::Int(flags));
                entry.insert("frozen".into(), DxfValue::Bool(flags & 1 != 0));
                entry.insert("locked".into(), DxfValue::Bool(flags & 4 != 0));
            }
            290 => { entry.insert("plot".into(), value.clone()); }
            370 => { entry.insert("lineweight".into(), DxfValue::Int(value.as_i64())); }
            100 | 330 | 390 | 420 => {} // subclass markers etc.
            _ => {}
        }
    }

    fn apply_ltype_code(
        entry: &mut HashMap<String, DxfValue>,
        code: i32,
        value: &DxfValue,
        elements: &mut Vec<f64>,
    ) {
        match code {
            2 => { entry.insert("name".into(), DxfValue::Str(value.as_str_value())); }
            5 => { entry.insert("handle".into(), DxfValue::Str(value.as_str_value())); }
            3 => { entry.insert("description".into(), DxfValue::Str(value.as_str_value())); }
            73 => { entry.insert("elementCount".into(), DxfValue::Int(value.as_i64())); }
            40 => { entry.insert("totalLength".into(), DxfValue::Float(value.as_f64())); }
            49 => { elements.push(value.as_f64()); }
            _ => {}
        }
    }

    fn apply_style_code(entry: &mut HashMap<String, DxfValue>, code: i32, value: &DxfValue) {
        match code {
            2 => { entry.insert("name".into(), DxfValue::Str(value.as_str_value())); }
            5 => { entry.insert("handle".into(), DxfValue::Str(value.as_str_value())); }
            3 => { entry.insert("font".into(), DxfValue::Str(value.as_str_value())); }
            4 => { entry.insert("bigFont".into(), DxfValue::Str(value.as_str_value())); }
            40 => { entry.insert("height".into(), DxfValue::Float(value.as_f64())); }
            41 => { entry.insert("widthFactor".into(), DxfValue::Float(value.as_f64())); }
            42 => { entry.insert("lastHeight".into(), DxfValue::Float(value.as_f64())); }
            50 => { entry.insert("obliqueAngle".into(), DxfValue::Float(value.as_f64())); }
            70 => { entry.insert("flags".into(), DxfValue::Int(value.as_i64())); }
            _ => {}
        }
    }

    fn apply_dimstyle_code(entry: &mut HashMap<String, DxfValue>, code: i32, value: &DxfValue) {
        match code {
            2 => { entry.insert("name".into(), DxfValue::Str(value.as_str_value())); }
            5 => { entry.insert("handle".into(), DxfValue::Str(value.as_str_value())); }
            40 => { entry.insert("DIMSCALE".into(), DxfValue::Float(value.as_f64())); }
            41 => { entry.insert("DIMASZ".into(), DxfValue::Float(value.as_f64())); }
            42 => { entry.insert("DIMEXO".into(), DxfValue::Float(value.as_f64())); }
            43 => { entry.insert("DIMDLI".into(), DxfValue::Float(value.as_f64())); }
            44 => { entry.insert("DIMEXE".into(), DxfValue::Float(value.as_f64())); }
            140 => { entry.insert("DIMTXT".into(), DxfValue::Float(value.as_f64())); }
            147 => { entry.insert("DIMGAP".into(), DxfValue::Float(value.as_f64())); }
            77 => { entry.insert("DIMTAD".into(), DxfValue::Int(value.as_i64())); }
            271 => { entry.insert("DIMDEC".into(), DxfValue::Int(value.as_i64())); }
            _ => {}
        }
    }

    fn apply_generic_table_code(entry: &mut HashMap<String, DxfValue>, code: i32, value: &DxfValue) {
        match code {
            2 => { entry.insert("name".into(), DxfValue::Str(value.as_str_value())); }
            5 => { entry.insert("handle".into(), DxfValue::Str(value.as_str_value())); }
            70 => { entry.insert("flags".into(), DxfValue::Int(value.as_i64())); }
            100 => {}
            _ => { entry.insert(format!("_{}", code), value.clone()); }
        }
    }

    // ---------------------------------------------------------------
    // BLOCKS
    // ---------------------------------------------------------------

    fn parse_blocks(stream: &mut TokenStream) -> HashMap<String, DxfBlock> {
        let mut blocks = HashMap::new();

        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;

            if code == 0 && value.as_str_value() == "ENDSEC" {
                break;
            }
            if code == 0 && value.as_str_value() == "BLOCK" {
                let block = Self::parse_block(stream);
                let name = block.name.clone();
                blocks.insert(name, block);
            }
        }

        blocks
    }

    fn parse_block(stream: &mut TokenStream) -> DxfBlock {
        let mut block = DxfBlock::default();

        // Read block header fields
        loop {
            if let Some(tok) = stream.peek() {
                if tok.0 == 0 {
                    break;
                }
            } else {
                break;
            }
            let tok = stream.next_token().cloned();
            let (code, value) = match tok {
                Some(t) => t,
                None => break,
            };

            match code {
                2 => block.name = value.as_str_value(),
                5 => block.handle = Some(value.as_str_value()),
                8 => block.layer = Some(value.as_str_value()),
                10 => block.base_point[0] = value.as_f64(),
                20 => block.base_point[1] = value.as_f64(),
                30 => block.base_point[2] = value.as_f64(),
                70 => block.flags = value.as_i64(),
                _ => {}
            }
        }

        // Read entities inside block until ENDBLK
        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;

            if code == 0 && value.as_str_value() == "ENDBLK" {
                Self::skip_to_next_entity(stream);
                break;
            }
            if code == 0 {
                let entity_type = value.as_str_value();
                let entity = Self::parse_entity(&entity_type, stream);
                block.entities.push(entity);
            }
        }

        block
    }

    // ---------------------------------------------------------------
    // ENTITIES
    // ---------------------------------------------------------------

    fn parse_entities(stream: &mut TokenStream) -> Vec<HashMap<String, DxfValue>> {
        let mut entities = Vec::new();

        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;

            if code == 0 && value.as_str_value() == "ENDSEC" {
                break;
            }
            if code == 0 {
                let entity_type = value.as_str_value();
                let entity = Self::parse_entity(&entity_type, stream);
                entities.push(entity);
            }
        }

        entities
    }

    // ---------------------------------------------------------------
    // OBJECTS
    // ---------------------------------------------------------------

    fn parse_objects(stream: &mut TokenStream) -> Vec<HashMap<String, DxfValue>> {
        let mut objects = Vec::new();

        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;

            if code == 0 && value.as_str_value() == "ENDSEC" {
                break;
            }
            if code == 0 {
                let obj_type = value.as_str_value();
                let obj = Self::parse_generic_object(&obj_type, stream);
                objects.push(obj);
            }
        }

        objects
    }

    fn parse_generic_object(
        obj_type: &str,
        stream: &mut TokenStream,
    ) -> HashMap<String, DxfValue> {
        let mut obj = HashMap::new();
        obj.insert("type".into(), DxfValue::Str(obj_type.to_string()));

        loop {
            if let Some(tok) = stream.peek() {
                if tok.0 == 0 {
                    break;
                }
            } else {
                break;
            }
            let tok = stream.next_token().cloned();
            let (code, value) = match tok {
                Some(t) => t,
                None => break,
            };

            match code {
                5 => { obj.insert("handle".into(), DxfValue::Str(value.as_str_value())); }
                2 => { obj.insert("name".into(), DxfValue::Str(value.as_str_value())); }
                330 => { obj.insert("ownerHandle".into(), DxfValue::Str(value.as_str_value())); }
                100 => {}
                3 => { obj.insert(format!("entry_{}", code), value); }
                350 => { obj.insert(format!("entryHandle_{}", code), value); }
                _ => { obj.insert(format!("_{}", code), value); }
            }
        }

        obj
    }

    // ---------------------------------------------------------------
    // Single entity parser
    // ---------------------------------------------------------------

    fn parse_entity(entity_type: &str, stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let entity = match entity_type {
            "LINE" => Self::parse_line(stream),
            "POINT" => Self::parse_point_entity(stream),
            "CIRCLE" => Self::parse_circle(stream),
            "ARC" => Self::parse_arc(stream),
            "ELLIPSE" => Self::parse_ellipse(stream),
            "SPLINE" => Self::parse_spline(stream),
            "LWPOLYLINE" => Self::parse_lwpolyline(stream),
            "POLYLINE" => Self::parse_polyline(stream),
            "TEXT" => Self::parse_text(stream),
            "MTEXT" => Self::parse_mtext(stream),
            "DIMENSION" => Self::parse_dimension(stream),
            "LEADER" => Self::parse_leader(stream),
            "HATCH" => Self::parse_hatch(stream),
            "INSERT" => Self::parse_insert(stream),
            "ATTDEF" => Self::parse_attdef(stream),
            "ATTRIB" => Self::parse_attrib(stream),
            "SOLID" | "TRACE" => Self::parse_solid_trace(stream),
            "3DFACE" => Self::parse_3dface(stream),
            "VIEWPORT" => Self::parse_viewport(stream),
            "XLINE" | "RAY" => Self::parse_xline_ray(stream),
            "IMAGE" => Self::parse_image(stream),
            "WIPEOUT" => Self::parse_wipeout(stream),
            "3DSOLID" | "BODY" | "REGION" | "SURFACE" => Self::parse_acis(stream),
            "MESH" => Self::parse_mesh(stream),
            _ => Self::parse_generic_entity(stream),
        };
        let mut result = entity;
        result.insert("type".into(), DxfValue::Str(entity_type.to_string()));
        result
    }

    // ---------------------------------------------------------------
    // Common property extraction
    // ---------------------------------------------------------------

    fn apply_common(entity: &mut HashMap<String, DxfValue>, code: i32, value: &DxfValue) -> bool {
        match code {
            5 => { entity.insert("handle".into(), DxfValue::Str(value.as_str_value())); true }
            8 => { entity.insert("layer".into(), DxfValue::Str(value.as_str_value())); true }
            6 => { entity.insert("linetype".into(), DxfValue::Str(value.as_str_value())); true }
            62 => { entity.insert("color".into(), DxfValue::Int(value.as_i64())); true }
            370 => { entity.insert("lineweight".into(), DxfValue::Int(value.as_i64())); true }
            420 => { entity.insert("trueColor".into(), DxfValue::Int(value.as_i64())); true }
            440 => { entity.insert("transparency".into(), DxfValue::Int(value.as_i64())); true }
            60 => { entity.insert("visibility".into(), DxfValue::Int(value.as_i64())); true }
            67 => { entity.insert("paperSpace".into(), DxfValue::Int(value.as_i64())); true }
            210 => {
                entity.entry("extrusion_x".into()).or_insert(DxfValue::Float(0.0));
                entity.insert("extrusion_x".into(), DxfValue::Float(value.as_f64()));
                true
            }
            220 => { entity.insert("extrusion_y".into(), DxfValue::Float(value.as_f64())); true }
            230 => { entity.insert("extrusion_z".into(), DxfValue::Float(value.as_f64())); true }
            100 | 330 | 102 => true,
            _ => false,
        }
    }

    fn collect_codes(stream: &mut TokenStream) -> Vec<(i32, DxfValue)> {
        let mut pairs = Vec::new();
        loop {
            if let Some(tok) = stream.peek() {
                if tok.0 == 0 {
                    break;
                }
            } else {
                break;
            }
            let tok = stream.next_token().cloned();
            if let Some(t) = tok {
                pairs.push(t);
            }
        }
        pairs
    }

    // ---------------------------------------------------------------
    // Entity parsers
    // ---------------------------------------------------------------

    fn parse_line(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut sx, mut sy, mut sz) = (0.0f64, 0.0f64, 0.0f64);
        let (mut ex, mut ey, mut ez) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => sx = value.as_f64(),
                20 => sy = value.as_f64(),
                30 => sz = value.as_f64(),
                11 => ex = value.as_f64(),
                21 => ey = value.as_f64(),
                31 => ez = value.as_f64(),
                _ => {}
            }
        }

        e.insert("start_x".into(), DxfValue::Float(sx));
        e.insert("start_y".into(), DxfValue::Float(sy));
        e.insert("start_z".into(), DxfValue::Float(sz));
        e.insert("end_x".into(), DxfValue::Float(ex));
        e.insert("end_y".into(), DxfValue::Float(ey));
        e.insert("end_z".into(), DxfValue::Float(ez));
        e
    }

    fn parse_point_entity(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut px, mut py, mut pz) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => px = value.as_f64(),
                20 => py = value.as_f64(),
                30 => pz = value.as_f64(),
                _ => {}
            }
        }

        e.insert("position_x".into(), DxfValue::Float(px));
        e.insert("position_y".into(), DxfValue::Float(py));
        e.insert("position_z".into(), DxfValue::Float(pz));
        e
    }

    fn parse_circle(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut cx, mut cy, mut cz) = (0.0f64, 0.0f64, 0.0f64);
        let mut r = 0.0f64;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => cx = value.as_f64(),
                20 => cy = value.as_f64(),
                30 => cz = value.as_f64(),
                40 => r = value.as_f64(),
                _ => {}
            }
        }

        e.insert("center_x".into(), DxfValue::Float(cx));
        e.insert("center_y".into(), DxfValue::Float(cy));
        e.insert("center_z".into(), DxfValue::Float(cz));
        e.insert("radius".into(), DxfValue::Float(r));
        e
    }

    fn parse_arc(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut cx, mut cy, mut cz) = (0.0f64, 0.0f64, 0.0f64);
        let mut r = 0.0f64;
        let (mut sa, mut ea) = (0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => cx = value.as_f64(),
                20 => cy = value.as_f64(),
                30 => cz = value.as_f64(),
                40 => r = value.as_f64(),
                50 => sa = value.as_f64(),
                51 => ea = value.as_f64(),
                _ => {}
            }
        }

        e.insert("center_x".into(), DxfValue::Float(cx));
        e.insert("center_y".into(), DxfValue::Float(cy));
        e.insert("center_z".into(), DxfValue::Float(cz));
        e.insert("radius".into(), DxfValue::Float(r));
        e.insert("startAngle".into(), DxfValue::Float(sa));
        e.insert("endAngle".into(), DxfValue::Float(ea));
        e
    }

    fn parse_ellipse(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut cx, mut cy, mut cz) = (0.0f64, 0.0f64, 0.0f64);
        let (mut mx, mut my, mut mz) = (0.0f64, 0.0f64, 0.0f64);
        let mut ratio = 1.0f64;
        let mut sp = 0.0f64;
        let mut ep = std::f64::consts::TAU;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => cx = value.as_f64(),
                20 => cy = value.as_f64(),
                30 => cz = value.as_f64(),
                11 => mx = value.as_f64(),
                21 => my = value.as_f64(),
                31 => mz = value.as_f64(),
                40 => ratio = value.as_f64(),
                41 => sp = value.as_f64(),
                42 => ep = value.as_f64(),
                _ => {}
            }
        }

        e.insert("center_x".into(), DxfValue::Float(cx));
        e.insert("center_y".into(), DxfValue::Float(cy));
        e.insert("center_z".into(), DxfValue::Float(cz));
        e.insert("majorAxis_x".into(), DxfValue::Float(mx));
        e.insert("majorAxis_y".into(), DxfValue::Float(my));
        e.insert("majorAxis_z".into(), DxfValue::Float(mz));
        e.insert("minorAxisRatio".into(), DxfValue::Float(ratio));
        e.insert("startParam".into(), DxfValue::Float(sp));
        e.insert("endParam".into(), DxfValue::Float(ep));
        e
    }

    fn parse_spline(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let mut degree = 3i64;
        let mut flags = 0i64;
        let mut knots: Vec<f64> = Vec::new();
        let mut ctrl_pts: Vec<[f64; 3]> = Vec::new();
        let mut fit_pts: Vec<[f64; 3]> = Vec::new();
        let mut weights: Vec<f64> = Vec::new();

        let (mut cx, mut cy, mut cz) = (0.0f64, 0.0f64, 0.0f64);
        let (mut fx, mut fy, mut fz) = (0.0f64, 0.0f64, 0.0f64);
        let mut in_ctrl = false;
        let mut in_fit = false;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                70 => flags = value.as_i64(),
                71 => degree = value.as_i64(),
                72 | 73 | 74 => {} // counts
                40 => knots.push(value.as_f64()),
                41 => weights.push(value.as_f64()),
                10 => {
                    if in_ctrl {
                        ctrl_pts.push([cx, cy, cz]);
                    }
                    cx = value.as_f64();
                    cy = 0.0; cz = 0.0;
                    in_ctrl = true;
                    in_fit = false;
                }
                20 if in_ctrl => cy = value.as_f64(),
                30 if in_ctrl => cz = value.as_f64(),
                11 => {
                    if in_fit {
                        fit_pts.push([fx, fy, fz]);
                    }
                    fx = value.as_f64();
                    fy = 0.0; fz = 0.0;
                    in_fit = true;
                    in_ctrl = false;
                }
                21 if in_fit => fy = value.as_f64(),
                31 if in_fit => fz = value.as_f64(),
                _ => {}
            }
        }

        if in_ctrl { ctrl_pts.push([cx, cy, cz]); }
        if in_fit { fit_pts.push([fx, fy, fz]); }

        e.insert("degree".into(), DxfValue::Int(degree));
        e.insert("closed".into(), DxfValue::Bool(flags & 1 != 0));
        e.insert("_knot_count".into(), DxfValue::Int(knots.len() as i64));
        e.insert("_ctrl_count".into(), DxfValue::Int(ctrl_pts.len() as i64));
        e.insert("_fit_count".into(), DxfValue::Int(fit_pts.len() as i64));

        // Store as serialized JSON arrays
        e.insert("knots".into(), DxfValue::Str(
            serde_json::to_string(&knots).unwrap_or_default()
        ));
        e.insert("controlPoints".into(), DxfValue::Str(
            serde_json::to_string(&ctrl_pts).unwrap_or_default()
        ));
        if !fit_pts.is_empty() {
            e.insert("fitPoints".into(), DxfValue::Str(
                serde_json::to_string(&fit_pts).unwrap_or_default()
            ));
        }
        if !weights.is_empty() && weights.iter().any(|w| (*w - 1.0).abs() > f64::EPSILON) {
            e.insert("weights".into(), DxfValue::Str(
                serde_json::to_string(&weights).unwrap_or_default()
            ));
            e.insert("rational".into(), DxfValue::Bool(true));
        }

        e
    }

    fn parse_lwpolyline(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let mut vertices: Vec<serde_json::Value> = Vec::new();
        let mut current_x = 0.0f64;
        let mut current_y = 0.0f64;
        let mut current_bulge = 0.0f64;
        let mut have_vertex = false;
        let mut elevation = 0.0f64;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                90 => {} // vertex count
                70 => {
                    let flags = value.as_i64();
                    e.insert("closed".into(), DxfValue::Bool(flags & 1 != 0));
                }
                38 => elevation = value.as_f64(),
                10 => {
                    if have_vertex {
                        let mut v = serde_json::json!({"x": current_x, "y": current_y});
                        if current_bulge != 0.0 {
                            v["bulge"] = serde_json::json!(current_bulge);
                        }
                        vertices.push(v);
                    }
                    current_x = value.as_f64();
                    current_y = 0.0;
                    current_bulge = 0.0;
                    have_vertex = true;
                }
                20 => current_y = value.as_f64(),
                42 => current_bulge = value.as_f64(),
                _ => {}
            }
        }

        if have_vertex {
            let mut v = serde_json::json!({"x": current_x, "y": current_y});
            if current_bulge != 0.0 {
                v["bulge"] = serde_json::json!(current_bulge);
            }
            vertices.push(v);
        }

        e.insert("vertices".into(), DxfValue::Str(
            serde_json::to_string(&vertices).unwrap_or_default()
        ));
        if elevation != 0.0 {
            e.insert("elevation".into(), DxfValue::Float(elevation));
        }
        e
    }

    fn parse_polyline(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let mut flags = 0i64;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            if code == 70 { flags = value.as_i64(); }
        }

        let is_3d = (flags & 8 != 0) || (flags & 16 != 0);
        e.insert("closed".into(), DxfValue::Bool(flags & 1 != 0));
        e.insert("flags".into(), DxfValue::Int(flags));

        // Read VERTEX entities until SEQEND
        let mut vertices: Vec<serde_json::Value> = Vec::new();
        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            let (code, value) = tok;
            if code == 0 && value.as_str_value() == "SEQEND" {
                Self::skip_to_next_entity(stream);
                break;
            }
            if code == 0 && value.as_str_value() == "VERTEX" {
                let vtx = Self::parse_vertex(stream);
                vertices.push(vtx);
            }
        }

        if is_3d {
            e.insert("type".into(), DxfValue::Str("POLYLINE3D".into()));
        } else {
            e.insert("type".into(), DxfValue::Str("POLYLINE2D".into()));
        }
        e.insert("vertices".into(), DxfValue::Str(
            serde_json::to_string(&vertices).unwrap_or_default()
        ));
        e
    }

    fn parse_vertex(stream: &mut TokenStream) -> serde_json::Value {
        let (mut x, mut y, mut z) = (0.0f64, 0.0f64, 0.0f64);
        let mut bulge = 0.0f64;

        for (code, value) in Self::collect_codes(stream) {
            match code {
                10 => x = value.as_f64(),
                20 => y = value.as_f64(),
                30 => z = value.as_f64(),
                42 => bulge = value.as_f64(),
                _ => {}
            }
        }

        let mut v = serde_json::json!({"x": x, "y": y, "z": z});
        if bulge != 0.0 {
            v["bulge"] = serde_json::json!(bulge);
        }
        v
    }

    fn parse_text(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);
        let (mut ax, mut ay, mut az) = (0.0f64, 0.0f64, 0.0f64);
        let mut has_align = false;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                1 => { e.insert("text".into(), DxfValue::Str(value.as_str_value())); }
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                11 => { ax = value.as_f64(); has_align = true; }
                21 => ay = value.as_f64(),
                31 => az = value.as_f64(),
                40 => { e.insert("height".into(), DxfValue::Float(value.as_f64())); }
                50 => { e.insert("rotation".into(), DxfValue::Float(value.as_f64())); }
                7 => { e.insert("style".into(), DxfValue::Str(value.as_str_value())); }
                72 => { e.insert("horizontalAlignment".into(), DxfValue::Int(value.as_i64())); }
                73 => { e.insert("verticalAlignment".into(), DxfValue::Int(value.as_i64())); }
                41 => { e.insert("widthFactor".into(), DxfValue::Float(value.as_f64())); }
                51 => { e.insert("obliqueAngle".into(), DxfValue::Float(value.as_f64())); }
                71 => { e.insert("textGenerationFlags".into(), DxfValue::Int(value.as_i64())); }
                _ => {}
            }
        }

        e.insert("insertionPoint_x".into(), DxfValue::Float(ix));
        e.insert("insertionPoint_y".into(), DxfValue::Float(iy));
        e.insert("insertionPoint_z".into(), DxfValue::Float(iz));
        if has_align {
            e.insert("alignmentPoint_x".into(), DxfValue::Float(ax));
            e.insert("alignmentPoint_y".into(), DxfValue::Float(ay));
            e.insert("alignmentPoint_z".into(), DxfValue::Float(az));
        }
        e
    }

    fn parse_mtext(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);
        let mut text_parts: Vec<String> = Vec::new();

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                1 | 3 => text_parts.push(value.as_str_value()),
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                40 => { e.insert("height".into(), DxfValue::Float(value.as_f64())); }
                41 => { e.insert("width".into(), DxfValue::Float(value.as_f64())); }
                50 => { e.insert("rotation".into(), DxfValue::Float(value.as_f64())); }
                7 => { e.insert("style".into(), DxfValue::Str(value.as_str_value())); }
                71 => { e.insert("attachment".into(), DxfValue::Int(value.as_i64())); }
                72 => { e.insert("drawingDirection".into(), DxfValue::Int(value.as_i64())); }
                44 => { e.insert("lineSpacingFactor".into(), DxfValue::Float(value.as_f64())); }
                73 => { e.insert("lineSpacingStyle".into(), DxfValue::Int(value.as_i64())); }
                _ => {}
            }
        }

        e.insert("insertionPoint_x".into(), DxfValue::Float(ix));
        e.insert("insertionPoint_y".into(), DxfValue::Float(iy));
        e.insert("insertionPoint_z".into(), DxfValue::Float(iz));
        e.insert("text".into(), DxfValue::Str(text_parts.join("")));
        e
    }

    fn parse_dimension(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut dp_x, mut dp_y, mut dp_z) = (0.0f64, 0.0f64, 0.0f64);
        let (mut mp_x, mut mp_y, mut mp_z) = (0.0f64, 0.0f64, 0.0f64);
        let (mut d1_x, mut d1_y, mut d1_z) = (0.0f64, 0.0f64, 0.0f64);
        let (mut d2_x, mut d2_y, mut d2_z) = (0.0f64, 0.0f64, 0.0f64);
        let (mut d3_x, mut d3_y, mut d3_z) = (0.0f64, 0.0f64, 0.0f64);
        let mut dimtype = 0i64;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                2 => { e.insert("blockName".into(), DxfValue::Str(value.as_str_value())); }
                3 => { e.insert("dimStyle".into(), DxfValue::Str(value.as_str_value())); }
                1 => { e.insert("overrideText".into(), DxfValue::Str(value.as_str_value())); }
                70 => dimtype = value.as_i64(),
                53 => { e.insert("rotationAngle".into(), DxfValue::Float(value.as_f64())); }
                10 => dp_x = value.as_f64(),
                20 => dp_y = value.as_f64(),
                30 => dp_z = value.as_f64(),
                11 => mp_x = value.as_f64(),
                21 => mp_y = value.as_f64(),
                31 => mp_z = value.as_f64(),
                13 => d1_x = value.as_f64(),
                23 => d1_y = value.as_f64(),
                33 => d1_z = value.as_f64(),
                14 => d2_x = value.as_f64(),
                24 => d2_y = value.as_f64(),
                34 => d2_z = value.as_f64(),
                15 => d3_x = value.as_f64(),
                25 => d3_y = value.as_f64(),
                35 => d3_z = value.as_f64(),
                _ => {}
            }
        }

        let subtype = dimtype & 0x0F;
        let type_name = match subtype {
            0 => "DIMENSION_LINEAR",
            1 => "DIMENSION_ALIGNED",
            2 => "DIMENSION_ANGULAR",
            3 => "DIMENSION_DIAMETER",
            4 => "DIMENSION_RADIUS",
            5 => "DIMENSION_ANGULAR3P",
            6 => "DIMENSION_ORDINATE",
            _ => "DIMENSION_LINEAR",
        };
        e.insert("dimType".into(), DxfValue::Str(type_name.into()));
        e.insert("dimTypeRaw".into(), DxfValue::Int(dimtype));
        e.insert("dimLinePoint_x".into(), DxfValue::Float(dp_x));
        e.insert("dimLinePoint_y".into(), DxfValue::Float(dp_y));
        e.insert("dimLinePoint_z".into(), DxfValue::Float(dp_z));
        e.insert("textPosition_x".into(), DxfValue::Float(mp_x));
        e.insert("textPosition_y".into(), DxfValue::Float(mp_y));
        e.insert("textPosition_z".into(), DxfValue::Float(mp_z));
        e.insert("defPoint1_x".into(), DxfValue::Float(d1_x));
        e.insert("defPoint1_y".into(), DxfValue::Float(d1_y));
        e.insert("defPoint1_z".into(), DxfValue::Float(d1_z));
        e.insert("defPoint2_x".into(), DxfValue::Float(d2_x));
        e.insert("defPoint2_y".into(), DxfValue::Float(d2_y));
        e.insert("defPoint2_z".into(), DxfValue::Float(d2_z));
        if subtype == 2 || subtype == 5 {
            e.insert("defPoint3_x".into(), DxfValue::Float(d3_x));
            e.insert("defPoint3_y".into(), DxfValue::Float(d3_y));
            e.insert("defPoint3_z".into(), DxfValue::Float(d3_z));
        }
        e
    }

    fn parse_leader(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let mut vertices: Vec<[f64; 3]> = Vec::new();
        let (mut vx, mut vy, mut vz) = (0.0f64, 0.0f64, 0.0f64);
        let mut have_vertex = false;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                76 => {} // num vertices
                71 => { e.insert("hasArrowhead".into(), DxfValue::Bool(value.as_i64() != 0)); }
                72 => {
                    let pt = if value.as_i64() == 1 { "spline" } else { "straight" };
                    e.insert("pathType".into(), DxfValue::Str(pt.into()));
                }
                10 => {
                    if have_vertex { vertices.push([vx, vy, vz]); }
                    vx = value.as_f64();
                    vy = 0.0; vz = 0.0;
                    have_vertex = true;
                }
                20 => vy = value.as_f64(),
                30 => vz = value.as_f64(),
                _ => {}
            }
        }
        if have_vertex { vertices.push([vx, vy, vz]); }

        e.insert("vertices".into(), DxfValue::Str(
            serde_json::to_string(&vertices).unwrap_or_default()
        ));
        e
    }

    fn parse_hatch(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                2 => { e.insert("patternName".into(), DxfValue::Str(value.as_str_value())); }
                70 => { e.insert("solid".into(), DxfValue::Bool(value.as_i64() == 1)); }
                71 => { e.insert("associative".into(), DxfValue::Bool(value.as_i64() == 1)); }
                75 => { e.insert("hatchStyle".into(), DxfValue::Int(value.as_i64())); }
                76 => { e.insert("patternType".into(), DxfValue::Int(value.as_i64())); }
                52 => { e.insert("patternAngle".into(), DxfValue::Float(value.as_f64())); }
                41 => { e.insert("patternScale".into(), DxfValue::Float(value.as_f64())); }
                _ => {}
            }
        }
        e
    }

    fn parse_insert(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);
        let mut has_attribs = false;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                2 => { e.insert("blockName".into(), DxfValue::Str(value.as_str_value())); }
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                41 => { e.insert("scaleX".into(), DxfValue::Float(value.as_f64())); }
                42 => { e.insert("scaleY".into(), DxfValue::Float(value.as_f64())); }
                43 => { e.insert("scaleZ".into(), DxfValue::Float(value.as_f64())); }
                50 => { e.insert("rotation".into(), DxfValue::Float(value.as_f64())); }
                66 => has_attribs = value.as_i64() != 0,
                70 => { e.insert("columnCount".into(), DxfValue::Int(value.as_i64())); }
                71 => { e.insert("rowCount".into(), DxfValue::Int(value.as_i64())); }
                44 => { e.insert("columnSpacing".into(), DxfValue::Float(value.as_f64())); }
                45 => { e.insert("rowSpacing".into(), DxfValue::Float(value.as_f64())); }
                _ => {}
            }
        }

        e.insert("insertionPoint_x".into(), DxfValue::Float(ix));
        e.insert("insertionPoint_y".into(), DxfValue::Float(iy));
        e.insert("insertionPoint_z".into(), DxfValue::Float(iz));

        // Read ATTRIBs if present
        if has_attribs {
            let mut attribs: Vec<serde_json::Value> = Vec::new();
            loop {
                let tok = match stream.next_token() {
                    Some(t) => t.clone(),
                    None => break,
                };
                let (code, value) = tok;
                if code == 0 && value.as_str_value() == "SEQEND" {
                    Self::skip_to_next_entity(stream);
                    break;
                }
                if code == 0 && value.as_str_value() == "ATTRIB" {
                    let attr = Self::parse_attrib_data(stream);
                    attribs.push(attr);
                }
            }
            if !attribs.is_empty() {
                e.insert("attributes".into(), DxfValue::Str(
                    serde_json::to_string(&attribs).unwrap_or_default()
                ));
            }
        }

        e
    }

    fn parse_attrib_data(stream: &mut TokenStream) -> serde_json::Value {
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);
        let mut tag = String::new();
        let mut val = String::new();
        let mut height = 2.5f64;
        let mut flags = 0i64;

        for (code, value) in Self::collect_codes(stream) {
            match code {
                1 => val = value.as_str_value(),
                2 => tag = value.as_str_value(),
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                40 => height = value.as_f64(),
                70 => flags = value.as_i64(),
                _ => {}
            }
        }

        serde_json::json!({
            "tag": tag,
            "value": val,
            "insertionPoint": [ix, iy, iz],
            "height": height,
            "flags": flags,
        })
    }

    fn parse_attdef(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                1 => { e.insert("defaultValue".into(), DxfValue::Str(value.as_str_value())); }
                2 => { e.insert("tag".into(), DxfValue::Str(value.as_str_value())); }
                3 => { e.insert("prompt".into(), DxfValue::Str(value.as_str_value())); }
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                40 => { e.insert("height".into(), DxfValue::Float(value.as_f64())); }
                50 => { e.insert("rotation".into(), DxfValue::Float(value.as_f64())); }
                7 => { e.insert("style".into(), DxfValue::Str(value.as_str_value())); }
                70 => { e.insert("flags".into(), DxfValue::Int(value.as_i64())); }
                _ => {}
            }
        }

        e.insert("insertionPoint_x".into(), DxfValue::Float(ix));
        e.insert("insertionPoint_y".into(), DxfValue::Float(iy));
        e.insert("insertionPoint_z".into(), DxfValue::Float(iz));
        e
    }

    fn parse_attrib(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                1 => { e.insert("value".into(), DxfValue::Str(value.as_str_value())); }
                2 => { e.insert("tag".into(), DxfValue::Str(value.as_str_value())); }
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                40 => { e.insert("height".into(), DxfValue::Float(value.as_f64())); }
                50 => { e.insert("rotation".into(), DxfValue::Float(value.as_f64())); }
                70 => { e.insert("flags".into(), DxfValue::Int(value.as_i64())); }
                _ => {}
            }
        }

        e.insert("insertionPoint_x".into(), DxfValue::Float(ix));
        e.insert("insertionPoint_y".into(), DxfValue::Float(iy));
        e.insert("insertionPoint_z".into(), DxfValue::Float(iz));
        e
    }

    fn parse_solid_trace(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let mut pts = [[0.0f64; 3]; 4];

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => pts[0][0] = value.as_f64(),
                20 => pts[0][1] = value.as_f64(),
                30 => pts[0][2] = value.as_f64(),
                11 => pts[1][0] = value.as_f64(),
                21 => pts[1][1] = value.as_f64(),
                31 => pts[1][2] = value.as_f64(),
                12 => pts[2][0] = value.as_f64(),
                22 => pts[2][1] = value.as_f64(),
                32 => pts[2][2] = value.as_f64(),
                13 => pts[3][0] = value.as_f64(),
                23 => pts[3][1] = value.as_f64(),
                33 => pts[3][2] = value.as_f64(),
                _ => {}
            }
        }

        for i in 0..4 {
            e.insert(format!("point{}_x", i + 1), DxfValue::Float(pts[i][0]));
            e.insert(format!("point{}_y", i + 1), DxfValue::Float(pts[i][1]));
            e.insert(format!("point{}_z", i + 1), DxfValue::Float(pts[i][2]));
        }
        e
    }

    fn parse_3dface(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = Self::parse_solid_trace(stream);
        // 3DFACE also has invisible edges flag
        // Already parsed in solid_trace via collect_codes; just check for code 70
        e
    }

    fn parse_viewport(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut cx, mut cy, mut cz) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => cx = value.as_f64(),
                20 => cy = value.as_f64(),
                30 => cz = value.as_f64(),
                40 => { e.insert("width".into(), DxfValue::Float(value.as_f64())); }
                41 => { e.insert("height".into(), DxfValue::Float(value.as_f64())); }
                69 => { e.insert("id".into(), DxfValue::Int(value.as_i64())); }
                45 => { e.insert("viewHeight".into(), DxfValue::Float(value.as_f64())); }
                90 => { e.insert("statusFlags".into(), DxfValue::Int(value.as_i64())); }
                _ => {}
            }
        }

        e.insert("center_x".into(), DxfValue::Float(cx));
        e.insert("center_y".into(), DxfValue::Float(cy));
        e.insert("center_z".into(), DxfValue::Float(cz));
        e
    }

    fn parse_xline_ray(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ox, mut oy, mut oz) = (0.0f64, 0.0f64, 0.0f64);
        let (mut dx, mut dy, mut dz) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => ox = value.as_f64(),
                20 => oy = value.as_f64(),
                30 => oz = value.as_f64(),
                11 => dx = value.as_f64(),
                21 => dy = value.as_f64(),
                31 => dz = value.as_f64(),
                _ => {}
            }
        }

        e.insert("origin_x".into(), DxfValue::Float(ox));
        e.insert("origin_y".into(), DxfValue::Float(oy));
        e.insert("origin_z".into(), DxfValue::Float(oz));
        e.insert("direction_x".into(), DxfValue::Float(dx));
        e.insert("direction_y".into(), DxfValue::Float(dy));
        e.insert("direction_z".into(), DxfValue::Float(dz));
        e
    }

    fn parse_image(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                340 => { e.insert("imageDefHandle".into(), DxfValue::Str(value.as_str_value())); }
                70 => { e.insert("displayFlags".into(), DxfValue::Int(value.as_i64())); }
                280 => { e.insert("clippingState".into(), DxfValue::Int(value.as_i64())); }
                281 => { e.insert("brightness".into(), DxfValue::Int(value.as_i64())); }
                282 => { e.insert("contrast".into(), DxfValue::Int(value.as_i64())); }
                283 => { e.insert("fade".into(), DxfValue::Int(value.as_i64())); }
                _ => {}
            }
        }

        e.insert("insertionPoint_x".into(), DxfValue::Float(ix));
        e.insert("insertionPoint_y".into(), DxfValue::Float(iy));
        e.insert("insertionPoint_z".into(), DxfValue::Float(iz));
        e
    }

    fn parse_wipeout(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let (mut ix, mut iy, mut iz) = (0.0f64, 0.0f64, 0.0f64);

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                10 => ix = value.as_f64(),
                20 => iy = value.as_f64(),
                30 => iz = value.as_f64(),
                _ => {}
            }
        }

        e.insert("insertionPoint_x".into(), DxfValue::Float(ix));
        e.insert("insertionPoint_y".into(), DxfValue::Float(iy));
        e.insert("insertionPoint_z".into(), DxfValue::Float(iz));
        e
    }

    fn parse_acis(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let mut acis_lines: Vec<String> = Vec::new();

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                1 | 3 => acis_lines.push(value.as_str_value()),
                70 => { e.insert("modelerVersion".into(), DxfValue::Int(value.as_i64())); }
                _ => {}
            }
        }

        if !acis_lines.is_empty() {
            e.insert("acisData".into(), DxfValue::Str(acis_lines.join("\n")));
        }
        e
    }

    fn parse_mesh(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        let mut vertices: Vec<[f64; 3]> = Vec::new();
        let mut face_data: Vec<i64> = Vec::new();
        let (mut vx, mut vy, mut vz) = (0.0f64, 0.0f64, 0.0f64);
        let mut have_v = false;
        let mut reading_vertices = false;
        let mut reading_faces = false;

        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            match code {
                71 => { e.insert("version".into(), DxfValue::Int(value.as_i64())); }
                72 => { e.insert("subdivisionLevel".into(), DxfValue::Int(value.as_i64())); }
                92 => { reading_vertices = true; reading_faces = false; }
                93 => { reading_faces = true; reading_vertices = false; }
                10 if reading_vertices => {
                    if have_v { vertices.push([vx, vy, vz]); }
                    vx = value.as_f64(); vy = 0.0; vz = 0.0;
                    have_v = true;
                }
                20 if reading_vertices => vy = value.as_f64(),
                30 if reading_vertices => vz = value.as_f64(),
                90 if reading_faces => face_data.push(value.as_i64()),
                _ => {}
            }
        }

        if have_v { vertices.push([vx, vy, vz]); }

        e.insert("vertices".into(), DxfValue::Str(
            serde_json::to_string(&vertices).unwrap_or_default()
        ));
        e.insert("faces".into(), DxfValue::Str(
            serde_json::to_string(&face_data).unwrap_or_default()
        ));
        e
    }

    fn parse_generic_entity(stream: &mut TokenStream) -> HashMap<String, DxfValue> {
        let mut e = HashMap::new();
        for (code, value) in Self::collect_codes(stream) {
            if Self::apply_common(&mut e, code, &value) { continue; }
            e.insert(format!("_{}", code), value);
        }
        e
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    fn skip_section(stream: &mut TokenStream) {
        loop {
            let tok = match stream.next_token() {
                Some(t) => t.clone(),
                None => break,
            };
            if tok.0 == 0 && tok.1.as_str_value() == "ENDSEC" {
                break;
            }
        }
    }

    fn skip_to_next_entity(stream: &mut TokenStream) {
        loop {
            if let Some(tok) = stream.peek() {
                if tok.0 == 0 {
                    break;
                }
            } else {
                break;
            }
            stream.next_token();
        }
    }
}
