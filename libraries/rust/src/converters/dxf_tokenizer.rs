//! DXF ASCII tokenizer -- pure Rust, no external dependencies.
//!
//! Reads a DXF text (ASCII) file and yields `(group_code, DxfValue)` pairs.

use std::fmt;

/// A typed DXF value.
#[derive(Debug, Clone, PartialEq)]
pub enum DxfValue {
    Str(String),
    Int(i64),
    Float(f64),
    Bool(bool),
}

impl DxfValue {
    /// Interpret as string, converting other types.
    pub fn as_str_value(&self) -> String {
        match self {
            DxfValue::Str(s) => s.clone(),
            DxfValue::Int(i) => i.to_string(),
            DxfValue::Float(f) => format!("{}", f),
            DxfValue::Bool(b) => if *b { "1".to_string() } else { "0".to_string() },
        }
    }

    /// Interpret as f64. Returns 0.0 if not numeric.
    pub fn as_f64(&self) -> f64 {
        match self {
            DxfValue::Float(f) => *f,
            DxfValue::Int(i) => *i as f64,
            DxfValue::Bool(b) => if *b { 1.0 } else { 0.0 },
            DxfValue::Str(s) => s.parse::<f64>().unwrap_or(0.0),
        }
    }

    /// Interpret as i64. Returns 0 if not numeric.
    pub fn as_i64(&self) -> i64 {
        match self {
            DxfValue::Int(i) => *i,
            DxfValue::Float(f) => *f as i64,
            DxfValue::Bool(b) => if *b { 1 } else { 0 },
            DxfValue::Str(s) => s.parse::<i64>().unwrap_or(0),
        }
    }

    /// Interpret as bool.
    pub fn as_bool(&self) -> bool {
        match self {
            DxfValue::Bool(b) => *b,
            DxfValue::Int(i) => *i != 0,
            DxfValue::Float(f) => *f != 0.0,
            DxfValue::Str(s) => s.parse::<i64>().map(|i| i != 0).unwrap_or(false),
        }
    }

    /// Convert to serde_json::Value for use in Entity properties.
    pub fn to_json(&self) -> serde_json::Value {
        match self {
            DxfValue::Str(s) => serde_json::Value::String(s.clone()),
            DxfValue::Int(i) => serde_json::json!(*i),
            DxfValue::Float(f) => serde_json::json!(*f),
            DxfValue::Bool(b) => serde_json::Value::Bool(*b),
        }
    }
}

impl fmt::Display for DxfValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DxfValue::Str(s) => write!(f, "{}", s),
            DxfValue::Int(i) => write!(f, "{}", i),
            DxfValue::Float(v) => write!(f, "{}", v),
            DxfValue::Bool(b) => write!(f, "{}", if *b { 1 } else { 0 }),
        }
    }
}

/// Determine the expected value type for a DXF group code.
fn value_type_for_code(code: i32) -> &'static str {
    match code {
        0..=9 => "str",
        10..=39 => "float",
        40..=59 => "float",
        60..=79 => "int",
        90..=99 => "int",
        100 => "str",
        102 => "str",
        105 => "str",
        110..=149 => "float",
        160..=169 => "int",
        170..=179 => "int",
        210..=239 => "float",
        270..=289 => "int",
        290..=299 => "bool",
        300..=309 => "str",
        310..=319 => "str",
        320..=369 => "str",
        370..=379 => "int",
        380..=389 => "int",
        390..=399 => "str",
        410..=419 => "str",
        420..=429 => "int",
        430..=439 => "str",
        440..=449 => "int",
        999 => "str",
        1000..=1009 => "str",
        1010..=1059 => "float",
        1060..=1071 => "int",
        _ => "str",
    }
}

/// Cast a raw string value to the appropriate `DxfValue` based on group code.
fn cast_value(code: i32, raw: &str) -> DxfValue {
    match value_type_for_code(code) {
        "float" => DxfValue::Float(raw.parse::<f64>().unwrap_or(0.0)),
        "int" => DxfValue::Int(raw.parse::<i64>().unwrap_or(0)),
        "bool" => DxfValue::Bool(raw.parse::<i64>().map(|i| i != 0).unwrap_or(false)),
        _ => DxfValue::Str(raw.to_string()),
    }
}

/// A single DXF token: `(group_code, typed_value)`.
pub type DxfToken = (i32, DxfValue);

/// Tokenize DXF ASCII content into group-code/value pairs.
pub fn tokenize(content: &str) -> Vec<DxfToken> {
    let normalized = content.replace("\r\n", "\n").replace('\r', "\n");
    let lines: Vec<&str> = normalized.split('\n').collect();
    let mut tokens = Vec::new();
    let mut idx = 0;
    let length = lines.len();

    while idx + 1 < length {
        let code_str = lines[idx].trim();
        let val_str = lines[idx + 1].trim();
        idx += 2;

        if code_str.is_empty() {
            continue;
        }

        let code = match code_str.parse::<i32>() {
            Ok(c) => c,
            Err(_) => continue,
        };

        tokens.push((code, cast_value(code, val_str)));
    }

    tokens
}

/// Peekable token stream for the parser.
pub struct TokenStream {
    tokens: Vec<DxfToken>,
    pos: usize,
}

impl TokenStream {
    /// Create a new token stream from a vector of tokens.
    pub fn new(tokens: Vec<DxfToken>) -> Self {
        Self { tokens, pos: 0 }
    }

    /// Peek at the current token without consuming it.
    pub fn peek(&self) -> Option<&DxfToken> {
        self.tokens.get(self.pos)
    }

    /// Consume and return the current token.
    pub fn next_token(&mut self) -> Option<&DxfToken> {
        if self.pos < self.tokens.len() {
            let tok = &self.tokens[self.pos];
            self.pos += 1;
            Some(tok)
        } else {
            None
        }
    }

    /// Push back one position (un-consume the last token).
    pub fn push_back(&mut self) {
        if self.pos > 0 {
            self.pos -= 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_simple() {
        let content = "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nEOF\n";
        let tokens = tokenize(content);
        assert_eq!(tokens.len(), 4);
        assert_eq!(tokens[0], (0, DxfValue::Str("SECTION".to_string())));
        assert_eq!(tokens[1], (2, DxfValue::Str("HEADER".to_string())));
    }

    #[test]
    fn test_value_types() {
        assert_eq!(cast_value(10, "1.5"), DxfValue::Float(1.5));
        assert_eq!(cast_value(70, "42"), DxfValue::Int(42));
        assert_eq!(cast_value(290, "1"), DxfValue::Bool(true));
        assert_eq!(cast_value(1, "hello"), DxfValue::Str("hello".to_string()));
    }
}
