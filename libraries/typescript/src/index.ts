/**
 * @ifcx/core - IFCX/IFCXB reader and writer
 * Open-source alternative to DWG/DXF
 */

export { IfcxDocument } from './document.js';
export { IfcxReader } from './reader.js';
export { IfcxWriter } from './writer.js';
export { IfcxbEncoder } from './binary/encoder.js';
export { IfcxbDecoder } from './binary/decoder.js';
export { DxfImporter } from './converters/dxf-import.js';
export { DxfExporter } from './converters/dxf-export.js';
export type * from './types.js';
