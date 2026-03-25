/**
 * @ifcx/core - IFCX/IFCXB reader and writer
 * Open-source alternative to DWG/DXF
 */

export { IfcxDocument } from './document.js';
export { IfcxReader } from './reader.js';
export { IfcxWriter } from './writer.js';
export { IfcxbEncoder } from './binary/encoder.js';
export { IfcxbDecoder } from './binary/decoder.js';
// DXF converters
export { tokenize, type DxfValue, type DxfToken } from './converters/dxf-tokenizer.js';
export { DxfParser, type DxfFile } from './converters/dxf-parser.js';
export { DxfImporter } from './converters/dxf-import.js';
export { DxfExporter } from './converters/dxf-export.js';
export { DxfWriter } from './converters/dxf-writer.js';

// DWG converters
export { DwgBitReader } from './converters/dwg-bitreader.js';
export { DwgParser, type DwgFile, type DwgObject, type DwgClass } from './converters/dwg-parser.js';
export { DwgImporter } from './converters/dwg-import.js';

// DGN converters
export { DgnParser, type DgnFile, type DgnElement } from './converters/dgn-parser.js';
export { DgnImporter } from './converters/dgn-import.js';

// V2 converters
export { V2Converter } from './converters/v2-converter.js';
export type { V2Document, V2Node, V2Header, V2Import } from './converters/v2-converter.js';
export { V2Export } from './converters/v2-export.js';

export type * from './types.js';
