//! DGN V7 (ISFF) parser -- pure Rust, no external dependencies.
//!
//! Parses MicroStation DGN V7 binary files based on the Intergraph Standard
//! File Format. Implements middle-endian 32-bit integers, VAX D-Float to
//! IEEE 754 conversion, and element-type-specific decoding.

use std::collections::HashMap;

use crate::IfcxError;

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

/// Represents a single DGN element.
#[derive(Debug, Clone)]
pub struct DgnElement {
    pub elem_type: u8,
    pub type_name: String,
    pub level: u8,
    pub deleted: bool,
    pub complex: bool,
    pub offset: usize,
    pub size: usize,
    pub graphic_group: u16,
    pub properties: u16,
    pub color: u8,
    pub weight: u8,
    pub style: u8,
    pub data: HashMap<String, serde_json::Value>,
}

/// Represents a parsed DGN V7 file.
#[derive(Debug, Clone)]
pub struct DgnFile {
    pub version: String,
    pub elements: Vec<DgnElement>,
    pub is_3d: bool,
    pub uor_per_sub: i32,
    pub sub_per_master: i32,
    pub master_unit_name: String,
    pub sub_unit_name: String,
    pub global_origin: (f64, f64, f64),
    pub color_table: Vec<Option<(u8, u8, u8)>>,
}

impl Default for DgnFile {
    fn default() -> Self {
        Self {
            version: "V7".to_string(),
            elements: Vec::new(),
            is_3d: false,
            uor_per_sub: 1,
            sub_per_master: 1,
            master_unit_name: String::new(),
            sub_unit_name: String::new(),
            global_origin: (0.0, 0.0, 0.0),
            color_table: Vec::new(),
        }
    }
}

// ---------------------------------------------------------------------------
// Element type names
// ---------------------------------------------------------------------------
fn element_type_name(etype: u8) -> &'static str {
    match etype {
        1 => "CELL_LIBRARY", 2 => "CELL_HEADER", 3 => "LINE",
        4 => "LINE_STRING", 5 => "GROUP_DATA", 6 => "SHAPE",
        7 => "TEXT_NODE", 8 => "DIGITIZER_SETUP", 9 => "TCB",
        10 => "LEVEL_SYMBOLOGY", 11 => "CURVE",
        12 => "COMPLEX_CHAIN_HEADER", 14 => "COMPLEX_SHAPE_HEADER",
        15 => "ELLIPSE", 16 => "ARC", 17 => "TEXT",
        21 => "BSPLINE_POLE", 22 => "POINT_STRING",
        27 => "BSPLINE_CURVE_HEADER", 33 => "DIMENSION",
        34 => "SHARED_CELL_DEFN", 35 => "SHARED_CELL",
        37 => "TAG_VALUE", 66 => "APPLICATION",
        _ => "UNKNOWN",
    }
}

/// Element types that do NOT have a display header.
fn no_disp_hdr(etype: u8) -> bool {
    matches!(etype, 0 | 1 | 9 | 10 | 32 | 44 | 48 | 49 | 50 | 51 | 57 | 60 | 61 | 62 | 63)
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/// Parses DGN V7 binary files.
pub struct DgnParser {
    dimension: usize,
    scale: f64,
    origin_x: f64,
    origin_y: f64,
    origin_z: f64,
    got_tcb: bool,
}

impl DgnParser {
    pub fn new() -> Self {
        Self {
            dimension: 2,
            scale: 1.0,
            origin_x: 0.0,
            origin_y: 0.0,
            origin_z: 0.0,
            got_tcb: false,
        }
    }

    /// Parse a DGN V7 file from raw bytes.
    pub fn parse(&mut self, data: &[u8]) -> Result<DgnFile, IfcxError> {
        let mut dgn = DgnFile::default();

        if data.len() < 4 {
            return Ok(dgn);
        }

        // Quick 2D/3D check from first byte
        if data[0] == 0xC8 {
            self.dimension = 3;
            dgn.is_3d = true;
        } else {
            self.dimension = 2;
            dgn.is_3d = false;
        }

        let mut offset = 0;
        while offset < data.len().saturating_sub(3) {
            // EOF marker
            if data[offset] == 0xFF && data[offset + 1] == 0xFF {
                break;
            }

            match self.read_element(data, offset, &mut dgn) {
                Some(elem) => {
                    let elem_size = elem.size;
                    dgn.elements.push(elem);
                    offset += elem_size;
                }
                None => break,
            }
        }

        Ok(dgn)
    }

    // ------------------------------------------------------------------
    // Low-level binary helpers
    // ------------------------------------------------------------------

    fn read_uint16_le(data: &[u8], offset: usize) -> u16 {
        if offset + 1 >= data.len() { return 0; }
        data[offset] as u16 + (data[offset + 1] as u16) * 256
    }

    fn read_int32_me(data: &[u8], offset: usize) -> u32 {
        if offset + 3 >= data.len() { return 0; }
        (data[offset + 2] as u32)
            + (data[offset + 3] as u32) * 256
            + (data[offset + 1] as u32) * 256 * 65536
            + (data[offset] as u32) * 65536
    }

    fn read_int32_me_signed(data: &[u8], offset: usize) -> i32 {
        let v = Self::read_int32_me(data, offset);
        if v >= 0x80000000 {
            v as i32
        } else {
            v as i32
        }
    }

    fn vax_to_ieee(data: &[u8], offset: usize) -> f64 {
        if offset + 8 > data.len() { return 0.0; }
        let src = &data[offset..offset + 8];

        let mut dest = [0u8; 8];
        dest[2] = src[0]; dest[3] = src[1];
        dest[0] = src[2]; dest[1] = src[3];
        dest[6] = src[4]; dest[7] = src[5];
        dest[4] = src[6]; dest[5] = src[7];

        let dt_hi = u32::from_le_bytes([dest[0], dest[1], dest[2], dest[3]]);
        let dt_lo = u32::from_le_bytes([dest[4], dest[5], dest[6], dest[7]]);

        let sign = dt_hi & 0x80000000;
        let mut exponent = (dt_hi >> 23) & 0xFF;
        if exponent != 0 {
            exponent = exponent.wrapping_sub(129).wrapping_add(1023);
        }

        let rndbits = dt_lo & 0x00000007;
        let mut lo = dt_lo >> 3;
        lo = (lo & 0x1FFFFFFF) | (dt_hi.wrapping_shl(29));
        if rndbits != 0 { lo |= 0x00000001; }

        let mut hi = dt_hi >> 3;
        hi &= 0x000FFFFF;
        hi |= exponent.wrapping_shl(20) | sign;

        let ieee_bytes = [
            (lo & 0xFF) as u8, ((lo >> 8) & 0xFF) as u8,
            ((lo >> 16) & 0xFF) as u8, ((lo >> 24) & 0xFF) as u8,
            (hi & 0xFF) as u8, ((hi >> 8) & 0xFF) as u8,
            ((hi >> 16) & 0xFF) as u8, ((hi >> 24) & 0xFF) as u8,
        ];
        f64::from_le_bytes(ieee_bytes)
    }

    // ------------------------------------------------------------------
    // Element reading
    // ------------------------------------------------------------------

    fn read_element(&mut self, data: &[u8], offset: usize, dgn: &mut DgnFile) -> Option<DgnElement> {
        if offset + 4 > data.len() { return None; }

        let b0 = data[offset];
        let b1 = data[offset + 1];

        let level = b0 & 0x3F;
        let complex_flag = b0 & 0x80 != 0;
        let etype = b1 & 0x7F;
        let deleted = b1 & 0x80 != 0;

        let n_words = Self::read_uint16_le(data, offset + 2) as usize;
        let elem_size = n_words * 2 + 4;

        if elem_size < 4 || offset + elem_size > data.len() { return None; }

        let tname = element_type_name(etype);
        let type_name = if tname == "UNKNOWN" {
            format!("UNKNOWN_{}", etype)
        } else {
            tname.to_string()
        };

        let mut elem = DgnElement {
            elem_type: etype,
            type_name,
            level,
            deleted,
            complex: complex_flag,
            offset,
            size: elem_size,
            graphic_group: 0,
            properties: 0,
            color: 0,
            weight: 0,
            style: 0,
            data: HashMap::new(),
        };

        // Parse display header for graphic types
        if !no_disp_hdr(etype) && elem_size >= 36 {
            elem.graphic_group = Self::read_uint16_le(data, offset + 28);
            elem.properties = Self::read_uint16_le(data, offset + 32);
            elem.style = data[offset + 34] & 0x07;
            elem.weight = (data[offset + 34] & 0xF8) >> 3;
            elem.color = data[offset + 35];
        }

        let raw = &data[offset..offset + elem_size];

        // Parse element-specific data
        match etype {
            9 => { self.parse_tcb(raw, dgn); }
            5 if level == 1 => { self.parse_color_table(raw, dgn); }
            3 => { elem.data = self.parse_line(raw); }
            4 | 6 | 11 | 21 => { elem.data = self.parse_multipoint(raw, etype); }
            15 => { elem.data = self.parse_ellipse(raw); }
            16 => { elem.data = self.parse_arc(raw); }
            17 => { elem.data = self.parse_text(raw); }
            7 => { elem.data = self.parse_text_node(raw); }
            2 => { elem.data = self.parse_cell_header(raw); }
            12 | 14 | 18 | 19 => { elem.data = self.parse_complex_header(raw); }
            37 => { elem.data = self.parse_tag_value(raw); }
            _ => {}
        }

        Some(elem)
    }

    // ------------------------------------------------------------------
    // TCB (type 9)
    // ------------------------------------------------------------------

    fn parse_tcb(&mut self, raw: &[u8], dgn: &mut DgnFile) {
        if raw.len() < 1264 || self.got_tcb { return; }

        if raw.len() > 1214 && raw[1214] & 0x40 != 0 {
            self.dimension = 3;
            dgn.is_3d = true;
        } else {
            self.dimension = 2;
            dgn.is_3d = false;
        }

        let sub_per_master = Self::read_int32_me(raw, 1112) as i32;
        let uor_per_sub = Self::read_int32_me(raw, 1116) as i32;

        dgn.sub_per_master = if sub_per_master != 0 { sub_per_master } else { 1 };
        dgn.uor_per_sub = if uor_per_sub != 0 { uor_per_sub } else { 1 };

        // Unit names
        if raw.len() > 1123 {
            dgn.master_unit_name = format!("{}{}",
                (raw[1120] as char), (raw[1121] as char))
                .trim_end_matches('\0').trim().to_string();
            dgn.sub_unit_name = format!("{}{}",
                (raw[1122] as char), (raw[1123] as char))
                .trim_end_matches('\0').trim().to_string();
        }

        if uor_per_sub != 0 && sub_per_master != 0 {
            self.scale = 1.0 / (uor_per_sub as f64 * sub_per_master as f64);
        } else {
            self.scale = 1.0;
        }

        // Global origin
        if raw.len() >= 1264 {
            let mut ox = Self::vax_to_ieee(raw, 1240);
            let mut oy = Self::vax_to_ieee(raw, 1248);
            let mut oz = Self::vax_to_ieee(raw, 1256);

            if uor_per_sub != 0 && sub_per_master != 0 {
                let s = uor_per_sub as f64 * sub_per_master as f64;
                ox /= s; oy /= s; oz /= s;
            }

            self.origin_x = ox;
            self.origin_y = oy;
            self.origin_z = oz;
            dgn.global_origin = (ox, oy, oz);
        }

        self.got_tcb = true;
    }

    // ------------------------------------------------------------------
    // Color table
    // ------------------------------------------------------------------

    fn parse_color_table(&self, raw: &[u8], dgn: &mut DgnFile) {
        if raw.len() < 806 { return; }
        let mut colors: Vec<Option<(u8, u8, u8)>> = vec![None; 256];
        colors[255] = Some((raw[38], raw[39], raw[40]));
        for i in 0..255 {
            let base = 41 + i * 3;
            if base + 2 < raw.len() {
                colors[i] = Some((raw[base], raw[base + 1], raw[base + 2]));
            }
        }
        dgn.color_table = colors;
    }

    // ------------------------------------------------------------------
    // Coordinate helpers
    // ------------------------------------------------------------------

    fn transform_point(&self, x: f64, y: f64, z: f64) -> (f64, f64, f64) {
        (
            x * self.scale - self.origin_x,
            y * self.scale - self.origin_y,
            z * self.scale - self.origin_z,
        )
    }

    fn read_point_int(&self, raw: &[u8], offset: usize) -> (f64, f64, f64) {
        let x = Self::read_int32_me_signed(raw, offset) as f64;
        let y = Self::read_int32_me_signed(raw, offset + 4) as f64;
        let z = if self.dimension == 3 {
            Self::read_int32_me_signed(raw, offset + 8) as f64
        } else { 0.0 };
        self.transform_point(x, y, z)
    }

    // ------------------------------------------------------------------
    // LINE (type 3)
    // ------------------------------------------------------------------

    fn parse_line(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let pntsize = self.dimension * 4;
        let p0 = self.read_point_int(raw, 36);
        let p1 = self.read_point_int(raw, 36 + pntsize);
        let mut data = HashMap::new();
        data.insert("vertices".into(), serde_json::json!([[p0.0, p0.1, p0.2], [p1.0, p1.1, p1.2]]));
        data
    }

    // ------------------------------------------------------------------
    // Multipoint (types 4, 6, 11, 21)
    // ------------------------------------------------------------------

    fn parse_multipoint(&self, raw: &[u8], etype: u8) -> HashMap<String, serde_json::Value> {
        let pntsize = self.dimension * 4;
        if raw.len() < 38 { return HashMap::new(); }
        let count = Self::read_uint16_le(raw, 36) as usize;
        let max_count = (raw.len() - 38) / pntsize;
        let count = count.min(max_count);

        let mut vertices = Vec::new();
        for i in 0..count {
            let pt = self.read_point_int(raw, 38 + i * pntsize);
            vertices.push(serde_json::json!([pt.0, pt.1, pt.2]));
        }

        let mut data = HashMap::new();
        data.insert("vertices".into(), serde_json::json!(vertices));
        if etype == 6 {
            data.insert("closed".into(), serde_json::json!(true));
        }
        data
    }

    // ------------------------------------------------------------------
    // ELLIPSE (type 15)
    // ------------------------------------------------------------------

    fn parse_ellipse(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let mut data = HashMap::new();
        if raw.len() < 72 { return data; }

        let primary = Self::vax_to_ieee(raw, 36) * self.scale;
        let secondary = Self::vax_to_ieee(raw, 44) * self.scale;

        let (rotation, origin) = if self.dimension == 2 {
            let rot = Self::read_int32_me_signed(raw, 52) as f64 / 360000.0;
            let ox = Self::vax_to_ieee(raw, 56);
            let oy = Self::vax_to_ieee(raw, 64);
            (rot, self.transform_point(ox, oy, 0.0))
        } else {
            if raw.len() < 92 { return data; }
            let ox = Self::vax_to_ieee(raw, 68);
            let oy = Self::vax_to_ieee(raw, 76);
            let oz = Self::vax_to_ieee(raw, 84);
            (0.0, self.transform_point(ox, oy, oz))
        };

        data.insert("primary_axis".into(), serde_json::json!(primary));
        data.insert("secondary_axis".into(), serde_json::json!(secondary));
        data.insert("rotation".into(), serde_json::json!(rotation));
        data.insert("origin".into(), serde_json::json!([origin.0, origin.1, origin.2]));
        data.insert("start_angle".into(), serde_json::json!(0.0));
        data.insert("sweep_angle".into(), serde_json::json!(360.0));
        data
    }

    // ------------------------------------------------------------------
    // ARC (type 16)
    // ------------------------------------------------------------------

    fn parse_arc(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let mut data = HashMap::new();
        if raw.len() < 80 { return data; }

        let start_ang = Self::read_int32_me_signed(raw, 36) as f64 / 360000.0;

        let sweep_negative = raw[41] & 0x80 != 0;
        let mut raw_mut = raw.to_vec();
        raw_mut[41] &= 0x7F;
        let mut sweep_val = Self::read_int32_me_signed(&raw_mut, 40) as f64;
        if sweep_negative { sweep_val = -sweep_val; }
        let sweep_ang = if sweep_val == 0.0 { 360.0 } else { sweep_val / 360000.0 };

        let primary = Self::vax_to_ieee(raw, 44) * self.scale;
        let secondary = Self::vax_to_ieee(raw, 52) * self.scale;

        let (rotation, origin) = if self.dimension == 2 {
            let rot = Self::read_int32_me_signed(raw, 60) as f64 / 360000.0;
            let ox = Self::vax_to_ieee(raw, 64);
            let oy = Self::vax_to_ieee(raw, 72);
            (rot, self.transform_point(ox, oy, 0.0))
        } else {
            if raw.len() < 100 { return data; }
            let ox = Self::vax_to_ieee(raw, 76);
            let oy = Self::vax_to_ieee(raw, 84);
            let oz = Self::vax_to_ieee(raw, 92);
            (0.0, self.transform_point(ox, oy, oz))
        };

        data.insert("primary_axis".into(), serde_json::json!(primary));
        data.insert("secondary_axis".into(), serde_json::json!(secondary));
        data.insert("rotation".into(), serde_json::json!(rotation));
        data.insert("origin".into(), serde_json::json!([origin.0, origin.1, origin.2]));
        data.insert("start_angle".into(), serde_json::json!(start_ang));
        data.insert("sweep_angle".into(), serde_json::json!(sweep_ang));
        data
    }

    // ------------------------------------------------------------------
    // TEXT (type 17)
    // ------------------------------------------------------------------

    fn parse_text(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let mut data = HashMap::new();
        if raw.len() < 60 { return data; }

        let font_id = raw[36];
        let justification = raw[37];
        let length_mult = Self::read_int32_me_signed(raw, 38) as f64 * self.scale * 6.0 / 1000.0;
        let height_mult = Self::read_int32_me_signed(raw, 42) as f64 * self.scale * 6.0 / 1000.0;

        let (rotation, origin, text_off, num_chars) = if self.dimension == 2 {
            let rot = Self::read_int32_me_signed(raw, 46) as f64 / 360000.0;
            let ox = Self::read_int32_me_signed(raw, 50) as f64;
            let oy = Self::read_int32_me_signed(raw, 54) as f64;
            let origin = self.transform_point(ox, oy, 0.0);
            let nc = if raw.len() > 58 { raw[58] as usize } else { 0 };
            (rot, origin, 60, nc)
        } else {
            if raw.len() < 76 { return data; }
            let ox = Self::read_int32_me_signed(raw, 62) as f64;
            let oy = Self::read_int32_me_signed(raw, 66) as f64;
            let oz = Self::read_int32_me_signed(raw, 70) as f64;
            let origin = self.transform_point(ox, oy, oz);
            let nc = if raw.len() > 74 { raw[74] as usize } else { 0 };
            (0.0, origin, 76, nc)
        };

        // Extract text string
        let text = if text_off + num_chars <= raw.len() {
            let bytes = &raw[text_off..text_off + num_chars];
            String::from_utf8_lossy(bytes).trim_end_matches('\0').to_string()
        } else {
            String::new()
        };

        data.insert("text".into(), serde_json::json!(text));
        data.insert("font_id".into(), serde_json::json!(font_id));
        data.insert("justification".into(), serde_json::json!(justification));
        data.insert("height".into(), serde_json::json!(height_mult));
        data.insert("width".into(), serde_json::json!(length_mult));
        data.insert("rotation".into(), serde_json::json!(rotation));
        data.insert("origin".into(), serde_json::json!([origin.0, origin.1, origin.2]));
        data
    }

    // ------------------------------------------------------------------
    // TEXT_NODE (type 7)
    // ------------------------------------------------------------------

    fn parse_text_node(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let mut data = HashMap::new();
        if raw.len() < 70 { return data; }

        let numelems = Self::read_uint16_le(raw, 38);
        let font_id = raw[44];
        let justification = raw[45];
        let height_mult = Self::read_int32_me_signed(raw, 54) as f64 * self.scale * 6.0 / 1000.0;

        let (rotation, origin) = if self.dimension == 2 {
            let rot = Self::read_int32_me_signed(raw, 58) as f64 / 360000.0;
            let ox = Self::read_int32_me_signed(raw, 62) as f64;
            let oy = Self::read_int32_me_signed(raw, 66) as f64;
            (rot, self.transform_point(ox, oy, 0.0))
        } else {
            if raw.len() < 86 { return data; }
            let ox = Self::read_int32_me_signed(raw, 74) as f64;
            let oy = Self::read_int32_me_signed(raw, 78) as f64;
            let oz = Self::read_int32_me_signed(raw, 82) as f64;
            (0.0, self.transform_point(ox, oy, oz))
        };

        data.insert("numelems".into(), serde_json::json!(numelems));
        data.insert("font_id".into(), serde_json::json!(font_id));
        data.insert("justification".into(), serde_json::json!(justification));
        data.insert("height".into(), serde_json::json!(height_mult));
        data.insert("rotation".into(), serde_json::json!(rotation));
        data.insert("origin".into(), serde_json::json!([origin.0, origin.1, origin.2]));
        data
    }

    // ------------------------------------------------------------------
    // CELL_HEADER (type 2)
    // ------------------------------------------------------------------

    fn parse_cell_header(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let mut data = HashMap::new();
        if raw.len() < 92 { return data; }

        // Cell name from Radix-50
        let w1 = Self::read_uint16_le(raw, 38);
        let w2 = Self::read_uint16_le(raw, 40);
        let name = format!("{}{}", Self::rad50_to_ascii(w1), Self::rad50_to_ascii(w2))
            .trim().to_string();

        let (origin, rotation) = if self.dimension == 2 {
            let a = Self::read_int32_me_signed(raw, 68) as f64;
            let c = Self::read_int32_me_signed(raw, 76) as f64;
            let ox = Self::read_int32_me_signed(raw, 84) as f64;
            let oy = Self::read_int32_me_signed(raw, 88) as f64;
            let origin = self.transform_point(ox, oy, 0.0);
            let a2 = a * a;
            let c2 = c * c;
            let rot = if a2 + c2 > 0.0 {
                let val = (a / (a2 + c2).sqrt()).clamp(-1.0, 1.0);
                val.acos().to_degrees()
            } else { 0.0 };
            (origin, rot)
        } else {
            if raw.len() < 124 { return data; }
            let ox = Self::read_int32_me_signed(raw, 112) as f64;
            let oy = Self::read_int32_me_signed(raw, 116) as f64;
            let oz = Self::read_int32_me_signed(raw, 120) as f64;
            (self.transform_point(ox, oy, oz), 0.0)
        };

        data.insert("name".into(), serde_json::json!(name));
        data.insert("origin".into(), serde_json::json!([origin.0, origin.1, origin.2]));
        data.insert("rotation".into(), serde_json::json!(rotation));
        data
    }

    // ------------------------------------------------------------------
    // Complex headers (types 12, 14, 18, 19)
    // ------------------------------------------------------------------

    fn parse_complex_header(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let mut data = HashMap::new();
        if raw.len() < 40 { return data; }
        let totlength = Self::read_uint16_le(raw, 36);
        let numelems = Self::read_uint16_le(raw, 38);
        data.insert("totlength".into(), serde_json::json!(totlength));
        data.insert("numelems".into(), serde_json::json!(numelems));
        data
    }

    // ------------------------------------------------------------------
    // TAG_VALUE (type 37)
    // ------------------------------------------------------------------

    fn parse_tag_value(&self, raw: &[u8]) -> HashMap<String, serde_json::Value> {
        let mut data = HashMap::new();
        if raw.len() < 156 { return data; }

        let tag_type = Self::read_uint16_le(raw, 74);
        let tag_index = Self::read_uint16_le(raw, 72);
        let tag_length = Self::read_uint16_le(raw, 150);

        data.insert("tag_type".into(), serde_json::json!(tag_type));
        data.insert("tag_index".into(), serde_json::json!(tag_index));
        data.insert("tag_length".into(), serde_json::json!(tag_length));

        if tag_type == 1 && raw.len() > 154 {
            let end = raw[154..].iter().position(|&b| b == 0)
                .map(|p| 154 + p).unwrap_or(raw.len());
            let text = String::from_utf8_lossy(&raw[154..end]).to_string();
            data.insert("value".into(), serde_json::json!(text));
        } else if tag_type == 3 && raw.len() >= 158 {
            let val = i32::from_le_bytes([raw[154], raw[155], raw[156], raw[157]]);
            data.insert("value".into(), serde_json::json!(val));
        } else if tag_type == 4 && raw.len() >= 162 {
            let val = Self::vax_to_ieee(raw, 154);
            data.insert("value".into(), serde_json::json!(val));
        }

        data
    }

    // ------------------------------------------------------------------
    // Radix-50 decoding
    // ------------------------------------------------------------------

    fn rad50_to_ascii(value: u16) -> String {
        const R50: &[u8] = b" ABCDEFGHIJKLMNOPQRSTUVWXYZ$.%0123456789";
        let mut chars = Vec::new();
        let mut v = value;
        for _ in 0..3 {
            let idx = (v % 40) as usize;
            let ch = if idx < R50.len() { R50[idx] as char } else { ' ' };
            chars.push(ch);
            v /= 40;
        }
        chars.reverse();
        chars.into_iter().collect()
    }
}

impl Default for DgnParser {
    fn default() -> Self {
        Self::new()
    }
}
