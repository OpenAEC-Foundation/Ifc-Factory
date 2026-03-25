//! Pure-Rust DWG binary file parser.
//!
//! Parses Autodesk DWG files from raw bytes without external libraries.
//! Currently supports R2000 (AC1015) with graceful degradation for other versions.

use std::collections::HashMap;

use crate::IfcxError;
use super::dwg_bitreader::DwgBitReader;

// ---------------------------------------------------------------------------
// Version constants
// ---------------------------------------------------------------------------
const VERSION_MAP: &[(&[u8], &str)] = &[
    (b"AC1012", "R13"),
    (b"AC1014", "R14"),
    (b"AC1015", "R2000"),
    (b"AC1018", "R2004"),
    (b"AC1021", "R2007"),
    (b"AC1024", "R2010"),
    (b"AC1027", "R2013"),
    (b"AC1032", "R2018"),
];

// Section record IDs (R2000)
const SECTION_HEADER: u8 = 0;
const SECTION_CLASSES: u8 = 1;
const SECTION_OBJECT_MAP: u8 = 2;

// Object type constants
fn obj_type_name(type_num: u16) -> Option<&'static str> {
    match type_num {
        0x01 => Some("TEXT"),
        0x02 => Some("ATTRIB"),
        0x03 => Some("ATTDEF"),
        0x04 => Some("BLOCK"),
        0x05 => Some("ENDBLK"),
        0x06 => Some("SEQEND"),
        0x07 => Some("INSERT"),
        0x08 => Some("MINSERT"),
        0x0A => Some("VERTEX_2D"),
        0x0B => Some("VERTEX_3D"),
        0x0F => Some("POLYLINE_2D"),
        0x10 => Some("POLYLINE_3D"),
        0x11 => Some("ARC"),
        0x12 => Some("CIRCLE"),
        0x13 => Some("LINE"),
        0x1B => Some("POINT"),
        0x1C => Some("3DFACE"),
        0x1F => Some("SOLID"),
        0x22 => Some("VIEWPORT"),
        0x23 => Some("ELLIPSE"),
        0x24 => Some("SPLINE"),
        0x28 => Some("RAY"),
        0x29 => Some("XLINE"),
        0x2A => Some("DICTIONARY"),
        0x2C => Some("MTEXT"),
        0x2D => Some("LEADER"),
        0x30 => Some("BLOCK_CONTROL"),
        0x31 => Some("BLOCK_HEADER"),
        0x32 => Some("LAYER_CONTROL"),
        0x33 => Some("LAYER"),
        0x34 => Some("STYLE_CONTROL"),
        0x35 => Some("STYLE"),
        0x38 => Some("LTYPE_CONTROL"),
        0x39 => Some("LTYPE"),
        0x4D => Some("LWPOLYLINE"),
        0x4E => Some("HATCH"),
        0x52 => Some("LAYOUT"),
        _ => None,
    }
}

fn is_entity_type(type_num: u16) -> bool {
    // TEXT(0x01) through XLINE(0x29), plus MTEXT, LEADER, LWPOLYLINE, HATCH
    // Exclude control objects and table entries
    let table_controls = [0x30u16, 0x32, 0x34, 0x38, 0x3C, 0x3E, 0x40, 0x42, 0x44, 0x46];
    let table_entries = [0x31u16, 0x33, 0x35, 0x39, 0x3D, 0x3F, 0x41, 0x43, 0x45, 0x47];
    let non_entities = [0x2Au16, 0x48, 0x49, 0x4F, 0x50, 0x51, 0x52];

    if table_controls.contains(&type_num) { return false; }
    if table_entries.contains(&type_num) { return false; }
    if non_entities.contains(&type_num) { return false; }

    (0x01..=0x29).contains(&type_num)
        || type_num == 0x2C  // MTEXT
        || type_num == 0x2D  // LEADER
        || type_num == 0x4D  // LWPOLYLINE
        || type_num == 0x4E  // HATCH
}

// Header sentinels (R2000)
const HEADER_SENTINEL_START: [u8; 16] = [
    0xCF, 0x7B, 0x1F, 0x23, 0xFD, 0xDE, 0x38, 0xA9,
    0x5F, 0x7C, 0x68, 0xB8, 0x4E, 0x6D, 0x33, 0x5F,
];

const CLASSES_SENTINEL_START: [u8; 16] = [
    0x8D, 0xA1, 0xC4, 0xB8, 0xC4, 0xA9, 0xF8, 0xC5,
    0xC0, 0xDC, 0xF4, 0x5F, 0xE7, 0xCF, 0xB6, 0x8A,
];

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

/// A DWG class definition.
#[derive(Debug, Clone, Default)]
pub struct DwgClass {
    pub class_number: i16,
    pub proxy_flags: i16,
    pub app_name: String,
    pub cpp_class_name: String,
    pub dxf_name: String,
    pub was_zombie: bool,
    pub item_class_id: i16,
}

/// A parsed DWG object or entity.
#[derive(Debug, Clone)]
pub struct DwgObject {
    pub handle: u32,
    pub type_num: u16,
    pub type_name: String,
    pub data: HashMap<String, serde_json::Value>,
    pub is_entity: bool,
}

/// Top-level container for parsed DWG data.
#[derive(Debug, Clone, Default)]
pub struct DwgFile {
    pub version: String,
    pub version_code: String,
    pub codepage: u16,
    pub header_vars: HashMap<String, serde_json::Value>,
    pub classes: Vec<DwgClass>,
    pub objects: Vec<DwgObject>,
    pub object_map: HashMap<u32, usize>,
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/// Parses DWG binary files.
pub struct DwgParser {
    class_map: HashMap<i16, DwgClass>,
}

impl DwgParser {
    pub fn new() -> Self {
        Self {
            class_map: HashMap::new(),
        }
    }

    /// Parse a DWG file from raw bytes.
    pub fn parse(&mut self, data: &[u8]) -> Result<DwgFile, IfcxError> {
        if data.len() < 25 {
            return Err(IfcxError::InvalidBinary("Data too short for DWG".into()));
        }

        let mut dwg = DwgFile::default();
        dwg.version_code = Self::detect_version(data);
        dwg.version = VERSION_MAP.iter()
            .find(|(code, _)| *code == dwg.version_code.as_bytes())
            .map(|(_, name)| name.to_string())
            .unwrap_or_else(|| dwg.version_code.clone());

        if dwg.version_code == "AC1015" {
            self.parse_r2000(data, &mut dwg)?;
        } else {
            return Err(IfcxError::InvalidBinary(format!(
                "Unsupported DWG version: {}. Save as R2000 for compatibility.",
                dwg.version_code
            )));
        }

        Ok(dwg)
    }

    fn detect_version(data: &[u8]) -> String {
        String::from_utf8_lossy(&data[..6]).to_string()
    }

    // ------------------------------------------------------------------
    // R2000 (AC1015) parsing
    // ------------------------------------------------------------------

    fn parse_r2000(&mut self, data: &[u8], dwg: &mut DwgFile) -> Result<(), IfcxError> {
        if data.len() < 21 {
            return Err(IfcxError::InvalidBinary("R2000 header too short".into()));
        }
        dwg.codepage = u16::from_le_bytes([data[19], data[20]]);
        let sections = self.parse_section_locators_r2000(data);

        if let Some(sec) = sections.get(&SECTION_CLASSES) {
            dwg.classes = self.parse_classes_r2000(data, sec.0, sec.1);
            for cls in &dwg.classes {
                self.class_map.insert(cls.class_number, cls.clone());
            }
        }

        if let Some(sec) = sections.get(&SECTION_HEADER) {
            dwg.header_vars = self.parse_header_vars_r2000(data, sec.0);
        }

        if let Some(sec) = sections.get(&SECTION_OBJECT_MAP) {
            dwg.object_map = self.parse_object_map_r2000(data, sec.0, sec.1);
        }

        if !dwg.object_map.is_empty() {
            dwg.objects = self.parse_objects_r2000(data, &dwg.object_map, &dwg.classes);
        }

        Ok(())
    }

    fn parse_section_locators_r2000(&self, data: &[u8]) -> HashMap<u8, (usize, usize)> {
        let num_records = i32::from_le_bytes([data[21], data[22], data[23], data[24]]);
        let mut sections = HashMap::new();

        for i in 0..num_records as usize {
            let off = 25 + i * 9;
            if off + 9 > data.len() { break; }
            let rec_num = data[off];
            let seeker = u32::from_le_bytes([data[off + 1], data[off + 2], data[off + 3], data[off + 4]]) as usize;
            let size = u32::from_le_bytes([data[off + 5], data[off + 6], data[off + 7], data[off + 8]]) as usize;
            if seeker > 0 || rec_num == 0 {
                sections.insert(rec_num, (seeker, size));
            }
        }

        sections
    }

    // ------------------------------------------------------------------
    // Header variables (R2000)
    // ------------------------------------------------------------------

    fn parse_header_vars_r2000(&self, data: &[u8], offset: usize) -> HashMap<String, serde_json::Value> {
        let mut header = HashMap::new();
        header.insert("$ACADVER".into(), serde_json::json!("AC1015"));

        if offset + 20 > data.len() { return header; }

        // Check sentinel
        let sentinel = &data[offset..offset + 16];
        if sentinel != HEADER_SENTINEL_START { return header; }

        let mut reader = DwgBitReader::new(data, offset + 20);

        // Read header variables in R2000 order
        let read_result: Result<(), IfcxError> = (|| {
            // Skip unknown values
            for _ in 0..4 { reader.read_bd()?; }
            for _ in 0..4 { reader.read_t(false)?; }
            for _ in 0..2 { reader.read_bl()?; }

            // Bit flags
            let bit_vars = [
                "$DIMASO", "$DIMSHO", "$PLINEGEN", "$ORTHOMODE", "$REGENMODE",
                "$FILLMODE", "$QTEXTMODE", "$PSLTSCALE", "$LIMCHECK", "$USRTIMER",
                "$SKPOLY", "$ANGDIR", "$SPLFRAME", "$MIRRTEXT", "$WORLDVIEW",
                "$TILEMODE", "$PLIMCHECK", "$VISRETAIN", "$DISPSILH", "$PELLIPSE",
            ];
            for name in &bit_vars {
                header.insert(name.to_string(), serde_json::json!(reader.read_bit()?));
            }

            // BS vars
            let bs_vars = [
                "$PROXYGRAPHICS", "$TREEDEPTH", "$LUNITS", "$LUPREC",
                "$AUNITS", "$AUPREC", "$OSMODE", "$ATTMODE", "$COORDS",
                "$PDMODE", "$PICKSTYLE",
                "$USERI1", "$USERI2", "$USERI3", "$USERI4", "$USERI5",
                "$SPLINESEGS", "$SURFU", "$SURFV", "$SURFTYPE",
                "$SURFTAB1", "$SURFTAB2", "$SPLINETYPE",
                "$SHADEDGE", "$SHADEDIF", "$UNITMODE", "$MAXACTVP",
                "$ISOLINES", "$CMLJUST", "$TEXTQLTY",
            ];
            for name in &bs_vars {
                header.insert(name.to_string(), serde_json::json!(reader.read_bs()?));
            }

            // BD vars
            let bd_vars = [
                "$LTSCALE", "$TEXTSIZE", "$TRACEWID", "$SKETCHINC",
                "$FILLETRAD", "$THICKNESS", "$ANGBASE", "$PDSIZE",
                "$PLINEWID", "$USERR1", "$USERR2", "$USERR3",
                "$USERR4", "$USERR5", "$CMLSCALE",
            ];
            for name in &bd_vars {
                header.insert(name.to_string(), serde_json::json!(reader.read_bd()?));
            }

            header.insert("$CEPSNTYPE".into(), serde_json::json!(reader.read_bs()?));

            Ok(())
        })();

        if read_result.is_err() {
            // Partial parse is ok
        }

        header
    }

    // ------------------------------------------------------------------
    // Classes (R2000)
    // ------------------------------------------------------------------

    fn parse_classes_r2000(&self, data: &[u8], offset: usize, _size: usize) -> Vec<DwgClass> {
        let mut classes = Vec::new();

        if offset + 20 > data.len() { return classes; }

        let sentinel = &data[offset..offset + 16];
        if sentinel != CLASSES_SENTINEL_START { return classes; }

        let cls_data_size = u32::from_le_bytes([
            data[offset + 16], data[offset + 17],
            data[offset + 18], data[offset + 19],
        ]) as usize;

        let mut reader = DwgBitReader::new(data, offset + 20);
        let end_byte = offset + 20 + cls_data_size;

        while reader.tell_byte() < end_byte {
            let result: Result<DwgClass, IfcxError> = (|| {
                let mut cls = DwgClass::default();
                cls.class_number = reader.read_bs()?;
                cls.proxy_flags = reader.read_bs()?;
                cls.app_name = reader.read_t(false)?;
                cls.cpp_class_name = reader.read_t(false)?;
                cls.dxf_name = reader.read_t(false)?;
                cls.was_zombie = reader.read_bit()? != 0;
                cls.item_class_id = reader.read_bs()?;
                Ok(cls)
            })();

            match result {
                Ok(cls) => classes.push(cls),
                Err(_) => break,
            }
        }

        classes
    }

    // ------------------------------------------------------------------
    // Object map (R2000)
    // ------------------------------------------------------------------

    fn parse_object_map_r2000(
        &self,
        data: &[u8],
        offset: usize,
        size: usize,
    ) -> HashMap<u32, usize> {
        let mut object_map = HashMap::new();
        let mut pos = offset;
        let end = offset + size;

        let mut last_handle = 0i32;
        let mut last_loc = 0i32;

        while pos < end {
            if pos + 2 > data.len() { break; }
            let section_size = u16::from_be_bytes([data[pos], data[pos + 1]]) as usize;
            if section_size <= 2 { break; }

            let body_start = pos + 2;
            let body_end = body_start + section_size - 2;
            let mut rpos = body_start;

            while rpos < body_end {
                let (handle_delta, new_pos) = match DwgBitReader::read_modular_char(data, rpos) {
                    Ok(v) => v,
                    Err(_) => break,
                };
                rpos = new_pos;

                let (loc_delta, new_pos) = match DwgBitReader::read_modular_char(data, rpos) {
                    Ok(v) => v,
                    Err(_) => break,
                };
                rpos = new_pos;

                last_handle += handle_delta;
                last_loc += loc_delta;

                if last_handle > 0 {
                    object_map.insert(last_handle as u32, last_loc as usize);
                }
            }

            pos += 2 + section_size;
        }

        object_map
    }

    // ------------------------------------------------------------------
    // Object/entity parsing (R2000)
    // ------------------------------------------------------------------

    fn parse_objects_r2000(
        &self,
        data: &[u8],
        object_map: &HashMap<u32, usize>,
        _classes: &[DwgClass],
    ) -> Vec<DwgObject> {
        let mut objects = Vec::new();

        let mut sorted: Vec<_> = object_map.iter().collect();
        sorted.sort_by_key(|&(h, _)| *h);

        for (&handle, &file_offset) in &sorted {
            if let Ok(obj) = self.parse_single_object_r2000(data, handle, file_offset) {
                objects.push(obj);
            }
        }

        objects
    }

    fn parse_single_object_r2000(
        &self,
        data: &[u8],
        handle: u32,
        file_offset: usize,
    ) -> Result<DwgObject, IfcxError> {
        if file_offset >= data.len() {
            return Err(IfcxError::InvalidBinary("Invalid offset".into()));
        }

        let (obj_size, bit_start) = DwgBitReader::read_modular_short(data, file_offset)?;
        if obj_size <= 0 {
            return Err(IfcxError::InvalidBinary("Zero object size".into()));
        }

        let mut reader = DwgBitReader::new(data, bit_start);

        // Object type (BS)
        let type_num = reader.read_bs()? as u16;

        // Determine type name
        let type_name = obj_type_name(type_num)
            .map(|s| s.to_string())
            .or_else(|| {
                if type_num >= 500 {
                    self.class_map.get(&(type_num as i16))
                        .map(|cls| {
                            if !cls.dxf_name.is_empty() { cls.dxf_name.clone() }
                            else { cls.cpp_class_name.clone() }
                        })
                } else {
                    None
                }
            })
            .unwrap_or_else(|| format!("UNKNOWN_{}", type_num));

        let is_entity = is_entity_type(type_num) || {
            if type_num >= 500 {
                self.class_map.get(&(type_num as i16))
                    .map(|cls| cls.item_class_id == 0x1F2 as i16)
                    .unwrap_or(false)
            } else {
                false
            }
        };

        // Read bitsize
        let _bitsize = reader.read_raw_long().ok();

        // Read handle
        let _ = reader.read_h().ok();

        // Skip EED
        let _ = self.skip_eed(&mut reader);

        // Parse type-specific data
        let mut obj_data = if is_entity {
            self.parse_entity_data(&mut reader, type_num, &type_name)
        } else {
            self.parse_table_object(&mut reader, type_num, &type_name)
        };

        obj_data.insert("type".into(), serde_json::json!(type_name));
        obj_data.insert("handle".into(), serde_json::json!(handle));

        Ok(DwgObject {
            handle,
            type_num,
            type_name,
            data: obj_data,
            is_entity,
        })
    }

    fn skip_eed(&self, reader: &mut DwgBitReader) -> Result<(), IfcxError> {
        loop {
            let eed_size = reader.read_bs()?;
            if eed_size == 0 { break; }
            reader.read_h()?;
            for _ in 0..eed_size {
                reader.read_byte()?;
            }
        }
        Ok(())
    }

    // ------------------------------------------------------------------
    // Entity common data (R2000)
    // ------------------------------------------------------------------

    fn parse_entity_common(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();

        let _ = (|| -> Result<(), IfcxError> {
            // Preview/graphic present
            let preview_exists = reader.read_bit()?;
            if preview_exists != 0 {
                let preview_size = reader.read_raw_long()? as usize;
                if preview_size > 0 && preview_size < 5_000_000 {
                    for _ in 0..preview_size {
                        reader.read_byte()?;
                    }
                }
            }

            // Entity mode
            result.insert("entity_mode".into(), serde_json::json!(reader.read_bb()?));

            // Number of reactors
            let _num_reactors = reader.read_bl()?;

            // nolinks
            let _nolinks = reader.read_bit()?;

            // Color
            result.insert("color".into(), serde_json::json!(reader.read_cmc()?));

            // Linetype scale
            result.insert("linetype_scale".into(), serde_json::json!(reader.read_bd()?));

            // Linetype flags
            let _ltype_flags = reader.read_bb()?;

            // Plotstyle flags
            let _plotstyle_flags = reader.read_bb()?;

            // Invisibility
            let invisibility = reader.read_bs()?;
            result.insert("invisible".into(), serde_json::json!(invisibility != 0));

            // Lineweight
            result.insert("lineweight".into(), serde_json::json!(reader.read_byte()?));

            Ok(())
        })();

        result
    }

    // ------------------------------------------------------------------
    // Entity data dispatch
    // ------------------------------------------------------------------

    fn parse_entity_data(
        &self,
        reader: &mut DwgBitReader,
        type_num: u16,
        _type_name: &str,
    ) -> HashMap<String, serde_json::Value> {
        let common = self.parse_entity_common(reader);

        let specific = match type_num {
            0x13 => self.parse_line(reader),
            0x12 => self.parse_circle(reader),
            0x11 => self.parse_arc(reader),
            0x1B => self.parse_point(reader),
            0x4D => self.parse_lwpolyline(reader),
            0x01 => self.parse_text(reader),
            0x2C => self.parse_mtext(reader),
            0x07 => self.parse_insert(reader),
            0x23 => self.parse_ellipse(reader),
            0x24 => self.parse_spline(reader),
            0x1F => self.parse_solid(reader),
            0x28 => self.parse_ray(reader),
            0x29 => self.parse_xline(reader),
            _ => HashMap::new(),
        };

        let mut merged = common;
        merged.extend(specific);
        merged
    }

    // ------------------------------------------------------------------
    // Geometric entity parsers (R2000 format)
    // ------------------------------------------------------------------

    fn parse_line(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let z_is_zero = reader.read_bit()?;
            let start_x = reader.read_double()?;
            let end_x = reader.read_dd(start_x)?;
            let start_y = reader.read_double()?;
            let end_y = reader.read_dd(start_y)?;
            let (start_z, end_z) = if z_is_zero != 0 {
                (0.0, 0.0)
            } else {
                let sz = reader.read_double()?;
                let ez = reader.read_dd(sz)?;
                (sz, ez)
            };
            let thickness = reader.read_bt()?;
            let extrusion = reader.read_be()?;

            result.insert("start".into(), serde_json::json!([start_x, start_y, start_z]));
            result.insert("end".into(), serde_json::json!([end_x, end_y, end_z]));
            result.insert("thickness".into(), serde_json::json!(thickness));
            result.insert("extrusion".into(), serde_json::json!([extrusion.0, extrusion.1, extrusion.2]));
            Ok(())
        })();
        result
    }

    fn parse_circle(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let center = reader.read_3bd()?;
            let radius = reader.read_bd()?;
            let thickness = reader.read_bt()?;
            let extrusion = reader.read_be()?;

            result.insert("center".into(), serde_json::json!([center.0, center.1, center.2]));
            result.insert("radius".into(), serde_json::json!(radius));
            result.insert("thickness".into(), serde_json::json!(thickness));
            result.insert("extrusion".into(), serde_json::json!([extrusion.0, extrusion.1, extrusion.2]));
            Ok(())
        })();
        result
    }

    fn parse_arc(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let center = reader.read_3bd()?;
            let radius = reader.read_bd()?;
            let thickness = reader.read_bt()?;
            let extrusion = reader.read_be()?;
            let start_angle = reader.read_bd()?;
            let end_angle = reader.read_bd()?;

            result.insert("center".into(), serde_json::json!([center.0, center.1, center.2]));
            result.insert("radius".into(), serde_json::json!(radius));
            result.insert("thickness".into(), serde_json::json!(thickness));
            result.insert("extrusion".into(), serde_json::json!([extrusion.0, extrusion.1, extrusion.2]));
            result.insert("startAngle".into(), serde_json::json!(start_angle));
            result.insert("endAngle".into(), serde_json::json!(end_angle));
            Ok(())
        })();
        result
    }

    fn parse_point(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let x = reader.read_bd()?;
            let y = reader.read_bd()?;
            let z = reader.read_bd()?;
            let thickness = reader.read_bt()?;
            let extrusion = reader.read_be()?;
            let x_ang = reader.read_bd()?;

            result.insert("position".into(), serde_json::json!([x, y, z]));
            result.insert("thickness".into(), serde_json::json!(thickness));
            result.insert("extrusion".into(), serde_json::json!([extrusion.0, extrusion.1, extrusion.2]));
            result.insert("xAxisAngle".into(), serde_json::json!(x_ang));
            Ok(())
        })();
        result
    }

    fn parse_ellipse(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let center = reader.read_3bd()?;
            let sm_axis = reader.read_3bd()?;
            let extrusion = reader.read_3bd()?;
            let axis_ratio = reader.read_bd()?;
            let start_angle = reader.read_bd()?;
            let end_angle = reader.read_bd()?;

            result.insert("center".into(), serde_json::json!([center.0, center.1, center.2]));
            result.insert("majorAxis".into(), serde_json::json!([sm_axis.0, sm_axis.1, sm_axis.2]));
            result.insert("extrusion".into(), serde_json::json!([extrusion.0, extrusion.1, extrusion.2]));
            result.insert("axisRatio".into(), serde_json::json!(axis_ratio));
            result.insert("startAngle".into(), serde_json::json!(start_angle));
            result.insert("endAngle".into(), serde_json::json!(end_angle));
            Ok(())
        })();
        result
    }

    fn parse_text(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let dataflags = reader.read_byte()?;

            let elevation = if dataflags & 0x01 == 0 { reader.read_double()? } else { 0.0 };
            let insertion = reader.read_2rd()?;

            let alignment = if dataflags & 0x02 == 0 {
                let ax = reader.read_dd(insertion.0)?;
                let ay = reader.read_dd(insertion.1)?;
                (ax, ay)
            } else { (0.0, 0.0) };

            let _extrusion = reader.read_be()?;
            let _thickness = reader.read_bt()?;
            let _oblique = if dataflags & 0x04 == 0 { reader.read_double()? } else { 0.0 };
            let rotation = if dataflags & 0x08 == 0 { reader.read_double()? } else { 0.0 };
            let height = reader.read_double()?;
            let _width_factor = if dataflags & 0x10 == 0 { reader.read_double()? } else { 1.0 };
            let text_value = reader.read_t(false)?;

            result.insert("elevation".into(), serde_json::json!(elevation));
            result.insert("insertionPoint".into(), serde_json::json!([insertion.0, insertion.1, elevation]));
            result.insert("alignmentPoint".into(), serde_json::json!([alignment.0, alignment.1, elevation]));
            result.insert("rotation".into(), serde_json::json!(rotation));
            result.insert("height".into(), serde_json::json!(height));
            result.insert("text".into(), serde_json::json!(text_value));
            Ok(())
        })();
        result
    }

    fn parse_mtext(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let insertion = reader.read_3bd()?;
            let _extrusion = reader.read_3bd()?;
            let _x_axis_dir = reader.read_3bd()?;
            let _rect_width = reader.read_bd()?;
            let text_height = reader.read_bd()?;
            let attachment = reader.read_bs()?;
            let _flow_dir = reader.read_bs()?;
            let _ext_h = reader.read_bd()?;
            let _ext_w = reader.read_bd()?;
            let text = reader.read_t(false)?;

            result.insert("insertionPoint".into(), serde_json::json!([insertion.0, insertion.1, insertion.2]));
            result.insert("height".into(), serde_json::json!(text_height));
            result.insert("attachment".into(), serde_json::json!(attachment));
            result.insert("text".into(), serde_json::json!(text));
            Ok(())
        })();
        result
    }

    fn parse_insert(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let insertion = reader.read_3bd()?;
            let scale_flag = reader.read_bb()?;
            let (sx, sy, sz) = match scale_flag {
                3 => (1.0, 1.0, 1.0),
                1 => {
                    let sy = reader.read_dd(1.0)?;
                    let sz = reader.read_dd(1.0)?;
                    (1.0, sy, sz)
                }
                2 => {
                    let sx = reader.read_double()?;
                    (sx, sx, sx)
                }
                _ => {
                    let sx = reader.read_double()?;
                    let sy = reader.read_dd(sx)?;
                    let sz = reader.read_dd(sx)?;
                    (sx, sy, sz)
                }
            };
            let rotation = reader.read_bd()?;
            let _extrusion = reader.read_3bd()?;
            let _has_attribs = reader.read_bit()?;

            result.insert("insertionPoint".into(), serde_json::json!([insertion.0, insertion.1, insertion.2]));
            result.insert("scaleX".into(), serde_json::json!(sx));
            result.insert("scaleY".into(), serde_json::json!(sy));
            result.insert("scaleZ".into(), serde_json::json!(sz));
            result.insert("rotation".into(), serde_json::json!(rotation));
            Ok(())
        })();
        result
    }

    fn parse_lwpolyline(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let flag = reader.read_bs()? as u16;

            if flag & 4 != 0 { reader.read_bd()?; }
            if flag & 8 != 0 { reader.read_bd()?; }
            if flag & 2 != 0 { reader.read_bd()?; }
            if flag & 1 != 0 { reader.read_3bd()?; }

            let num_points = reader.read_bl()? as usize;
            let num_bulges = if flag & 16 != 0 { reader.read_bl()? as usize } else { 0 };
            let num_widths = if flag & 32 != 0 { reader.read_bl()? as usize } else { 0 };

            let mut points = Vec::new();
            if num_points > 0 && num_points < 100_000 {
                let first = reader.read_2rd()?;
                points.push(vec![first.0, first.1]);
                for i in 1..num_points {
                    let px = reader.read_dd(points[i - 1][0])?;
                    let py = reader.read_dd(points[i - 1][1])?;
                    points.push(vec![px, py]);
                }
            }

            let mut bulges = Vec::new();
            for _ in 0..num_bulges {
                bulges.push(reader.read_bd()?);
            }

            // Convert to vertex objects
            let mut vertices: Vec<serde_json::Value> = Vec::new();
            for (i, pt) in points.iter().enumerate() {
                let mut v = serde_json::json!({"x": pt[0], "y": pt[1]});
                if i < bulges.len() && bulges[i] != 0.0 {
                    v["bulge"] = serde_json::json!(bulges[i]);
                }
                vertices.push(v);
            }

            result.insert("vertices".into(), serde_json::json!(vertices));
            result.insert("closed".into(), serde_json::json!(flag & 512 != 0));

            // Skip widths
            for _ in 0..num_widths {
                reader.read_bd()?;
                reader.read_bd()?;
            }

            Ok(())
        })();
        result
    }

    fn parse_spline(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let scenario = reader.read_bl()?;
            result.insert("scenario".into(), serde_json::json!(scenario));

            if scenario == 2 {
                let degree = reader.read_bl()?;
                result.insert("degree".into(), serde_json::json!(degree));
                let num_knots = reader.read_bl()? as usize;
                let num_ctrl = reader.read_bl()? as usize;
                let weighted = reader.read_bit()?;

                let mut knots = Vec::new();
                for _ in 0..num_knots {
                    knots.push(reader.read_bd()?);
                }

                let mut ctrl_pts = Vec::new();
                for _ in 0..num_ctrl {
                    let pt = reader.read_3bd()?;
                    let w = if weighted != 0 { reader.read_bd()? } else { 1.0 };
                    ctrl_pts.push(serde_json::json!({"point": [pt.0, pt.1, pt.2], "weight": w}));
                }

                result.insert("knots".into(), serde_json::json!(knots));
                result.insert("controlPoints".into(), serde_json::json!(ctrl_pts));
            } else if scenario == 1 {
                let degree = reader.read_bl()?;
                result.insert("degree".into(), serde_json::json!(degree));
                let _knot_param = reader.read_bd()?;
                let num_fit = reader.read_bl()? as usize;
                let mut fit_pts = Vec::new();
                for _ in 0..num_fit {
                    let pt = reader.read_3bd()?;
                    fit_pts.push(serde_json::json!([pt.0, pt.1, pt.2]));
                }
                result.insert("fitPoints".into(), serde_json::json!(fit_pts));
            }

            Ok(())
        })();
        result
    }

    fn parse_solid(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let thickness = reader.read_bt()?;
            let elevation = reader.read_bd()?;
            let c1 = reader.read_2rd()?;
            let c2 = reader.read_2rd()?;
            let c3 = reader.read_2rd()?;
            let c4 = reader.read_2rd()?;
            let extrusion = reader.read_be()?;

            result.insert("thickness".into(), serde_json::json!(thickness));
            result.insert("elevation".into(), serde_json::json!(elevation));
            result.insert("point1".into(), serde_json::json!([c1.0, c1.1, elevation]));
            result.insert("point2".into(), serde_json::json!([c2.0, c2.1, elevation]));
            result.insert("point3".into(), serde_json::json!([c3.0, c3.1, elevation]));
            result.insert("point4".into(), serde_json::json!([c4.0, c4.1, elevation]));
            result.insert("extrusion".into(), serde_json::json!([extrusion.0, extrusion.1, extrusion.2]));
            Ok(())
        })();
        result
    }

    fn parse_ray(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();
        let _ = (|| -> Result<(), IfcxError> {
            let point = reader.read_3bd()?;
            let vector = reader.read_3bd()?;
            result.insert("origin".into(), serde_json::json!([point.0, point.1, point.2]));
            result.insert("direction".into(), serde_json::json!([vector.0, vector.1, vector.2]));
            Ok(())
        })();
        result
    }

    fn parse_xline(&self, reader: &mut DwgBitReader) -> HashMap<String, serde_json::Value> {
        self.parse_ray(reader)
    }

    // ------------------------------------------------------------------
    // Table / non-entity object parsers
    // ------------------------------------------------------------------

    fn parse_table_object(
        &self,
        reader: &mut DwgBitReader,
        type_num: u16,
        _type_name: &str,
    ) -> HashMap<String, serde_json::Value> {
        let mut result = HashMap::new();

        let _ = match type_num {
            0x33 => self.parse_layer_obj(reader, &mut result),
            0x31 => self.parse_block_header_obj(reader, &mut result),
            0x35 => self.parse_style_obj(reader, &mut result),
            0x39 => self.parse_ltype_obj(reader, &mut result),
            0x2A => self.parse_dictionary_obj(reader, &mut result),
            _ => Ok(()),
        };

        result
    }

    fn parse_layer_obj(
        &self,
        reader: &mut DwgBitReader,
        result: &mut HashMap<String, serde_json::Value>,
    ) -> Result<(), IfcxError> {
        let _num_reactors = reader.read_bl()?;
        let name = reader.read_t(false)?;
        let _bit64 = reader.read_bit()?;
        let _xref_index = reader.read_bs()?;
        let _xdep = reader.read_bit()?;
        let flags = reader.read_bs()?;
        let color = reader.read_cmc()?;

        result.insert("name".into(), serde_json::json!(name));
        result.insert("flags".into(), serde_json::json!(flags));
        result.insert("color".into(), serde_json::json!(color));
        result.insert("frozen".into(), serde_json::json!(flags & 1 != 0));
        result.insert("off".into(), serde_json::json!(color < 0));
        result.insert("locked".into(), serde_json::json!(flags & 4 != 0));
        Ok(())
    }

    fn parse_block_header_obj(
        &self,
        reader: &mut DwgBitReader,
        result: &mut HashMap<String, serde_json::Value>,
    ) -> Result<(), IfcxError> {
        let _num_reactors = reader.read_bl()?;
        let name = reader.read_t(false)?;
        let _bit64 = reader.read_bit()?;
        let _xref_index = reader.read_bs()?;
        let _xdep = reader.read_bit()?;
        let anonymous = reader.read_bit()?;
        let has_attribs = reader.read_bit()?;
        let blk_is_xref = reader.read_bit()?;

        result.insert("name".into(), serde_json::json!(name));
        result.insert("anonymous".into(), serde_json::json!(anonymous != 0));
        result.insert("hasAttribs".into(), serde_json::json!(has_attribs != 0));
        result.insert("isXref".into(), serde_json::json!(blk_is_xref != 0));
        Ok(())
    }

    fn parse_style_obj(
        &self,
        reader: &mut DwgBitReader,
        result: &mut HashMap<String, serde_json::Value>,
    ) -> Result<(), IfcxError> {
        let _num_reactors = reader.read_bl()?;
        let name = reader.read_t(false)?;
        let _bit64 = reader.read_bit()?;
        let _xref_index = reader.read_bs()?;
        let _xdep = reader.read_bit()?;
        let _is_vertical = reader.read_bit()?;
        let _is_shape_file = reader.read_bit()?;
        let fixed_height = reader.read_bd()?;
        let width_factor = reader.read_bd()?;
        let _oblique_angle = reader.read_bd()?;
        let _generation = reader.read_byte()?;
        let _last_height = reader.read_bd()?;
        let font_name = reader.read_t(false)?;

        result.insert("name".into(), serde_json::json!(name));
        result.insert("fixedHeight".into(), serde_json::json!(fixed_height));
        result.insert("widthFactor".into(), serde_json::json!(width_factor));
        result.insert("fontName".into(), serde_json::json!(font_name));
        Ok(())
    }

    fn parse_ltype_obj(
        &self,
        reader: &mut DwgBitReader,
        result: &mut HashMap<String, serde_json::Value>,
    ) -> Result<(), IfcxError> {
        let _num_reactors = reader.read_bl()?;
        let name = reader.read_t(false)?;
        let _bit64 = reader.read_bit()?;
        let _xref_index = reader.read_bs()?;
        let _xdep = reader.read_bit()?;
        let description = reader.read_t(false)?;
        let pattern_length = reader.read_bd()?;

        result.insert("name".into(), serde_json::json!(name));
        result.insert("description".into(), serde_json::json!(description));
        result.insert("patternLength".into(), serde_json::json!(pattern_length));
        Ok(())
    }

    fn parse_dictionary_obj(
        &self,
        reader: &mut DwgBitReader,
        result: &mut HashMap<String, serde_json::Value>,
    ) -> Result<(), IfcxError> {
        let _num_reactors = reader.read_bl()?;
        let num_items = reader.read_bl()?;
        let _cloning_flag = reader.read_bs()?;
        let _hard_owner = reader.read_byte()?;

        let mut entries = serde_json::Map::new();
        for _ in 0..num_items {
            match reader.read_t(false) {
                Ok(name) => {
                    match reader.read_h() {
                        Ok((_, handle_val)) => {
                            entries.insert(name, serde_json::json!(format!("{:X}", handle_val)));
                        }
                        Err(_) => break,
                    }
                }
                Err(_) => break,
            }
        }

        result.insert("numItems".into(), serde_json::json!(num_items));
        result.insert("entries".into(), serde_json::Value::Object(entries));
        Ok(())
    }
}

impl Default for DwgParser {
    fn default() -> Self {
        Self::new()
    }
}
