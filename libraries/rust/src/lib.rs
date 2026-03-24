//! # ifcx
//!
//! IFCX/IFCXB reader and writer - open-source DWG/DXF alternative.
//!
//! Provides types and I/O for the IFCX (JSON) and IFCXB (binary) formats.

pub mod types;
pub mod document;
pub mod reader;
pub mod writer;
pub mod binary;
pub mod converters;
pub mod error;

pub use document::IfcxDocument;
pub use reader::IfcxReader;
pub use writer::IfcxWriter;
pub use error::IfcxError;
pub use converters::dxf_import::DxfImporter;
pub use converters::dxf_export::DxfExporter;
