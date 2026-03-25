//! Low-level DXF ASCII writer -- pure Rust, no external dependencies.
//!
//! Provides helpers for emitting group-code/value pairs, sections, tables,
//! entities, and 3D points in valid DXF format.

/// Builds a DXF ASCII string incrementally.
pub struct DxfWriter {
    lines: Vec<String>,
    handle_counter: u64,
}

impl DxfWriter {
    /// Create a new DXF writer.
    pub fn new() -> Self {
        Self {
            lines: Vec::new(),
            handle_counter: 1,
        }
    }

    // ------------------------------------------------------------------
    // Primitive writers
    // ------------------------------------------------------------------

    /// Write a single group-code / value pair.
    pub fn group_str(&mut self, code: i32, value: &str) {
        self.lines.push(format!("{:>3}", code));
        self.lines.push(value.to_string());
    }

    /// Write a group code with an integer value.
    pub fn group_int(&mut self, code: i32, value: i64) {
        self.lines.push(format!("{:>3}", code));
        self.lines.push(value.to_string());
    }

    /// Write a group code with a float value.
    pub fn group_float(&mut self, code: i32, value: f64) {
        self.lines.push(format!("{:>3}", code));
        self.lines.push(format!("{:.12}", value).trim_end_matches('0')
            .trim_end_matches('.')
            .to_string());
    }

    /// Write a group code with a formatted float value (12 significant digits).
    fn format_float(value: f64) -> String {
        if value == 0.0 {
            return "0".to_string();
        }
        let s = format!("{:.12}", value);
        let s = s.trim_end_matches('0');
        let s = s.trim_end_matches('.');
        s.to_string()
    }

    /// Write a 3D point using consecutive group codes.
    pub fn point(&mut self, x: f64, y: f64, z: f64, code_base: i32) {
        self.group_str(code_base, &Self::format_float(x));
        self.group_str(code_base + 10, &Self::format_float(y));
        self.group_str(code_base + 20, &Self::format_float(z));
    }

    /// Write a handle (group code 5).
    pub fn handle(&mut self, h: &str) {
        self.group_str(5, h);
    }

    /// Allocate and return the next handle as a hex string.
    pub fn next_handle(&mut self) -> String {
        let h = format!("{:X}", self.handle_counter);
        self.handle_counter += 1;
        h
    }

    /// Write the entity-type marker (group code 0).
    pub fn entity(&mut self, entity_type: &str) {
        self.group_str(0, entity_type);
    }

    // ------------------------------------------------------------------
    // Structural helpers
    // ------------------------------------------------------------------

    /// Begin a SECTION.
    pub fn begin_section(&mut self, name: &str) {
        self.group_str(0, "SECTION");
        self.group_str(2, name);
    }

    /// End a SECTION.
    pub fn end_section(&mut self) {
        self.group_str(0, "ENDSEC");
    }

    /// Begin a TABLE.
    pub fn begin_table(&mut self, name: &str, handle: &str, entries: i64) {
        self.group_str(0, "TABLE");
        self.group_str(2, name);
        self.handle(handle);
        self.group_str(100, "AcDbSymbolTable");
        self.group_int(70, entries);
    }

    /// End a TABLE.
    pub fn end_table(&mut self) {
        self.group_str(0, "ENDTAB");
    }

    // ------------------------------------------------------------------
    // Output
    // ------------------------------------------------------------------

    /// Return the complete DXF content as a string (LF line endings).
    pub fn to_string(&self) -> String {
        let mut s = self.lines.join("\n");
        s.push('\n');
        s
    }
}

impl Default for DxfWriter {
    fn default() -> Self {
        Self::new()
    }
}
