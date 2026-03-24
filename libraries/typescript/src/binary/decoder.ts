import { IfcxDocument } from '../document.js';

const MAGIC = new Uint8Array([0x49, 0x46, 0x43, 0x58]); // "IFCX"

/**
 * Decodes IFCXB binary format to IfcxDocument.
 */
export class IfcxbDecoder {
  /** Decode IFCXB buffer to document */
  static decode(buffer: Uint8Array): IfcxDocument {
    // Validate magic bytes
    if (buffer.length < 16) {
      throw new Error('Invalid IFCXB file: too short');
    }

    for (let i = 0; i < 4; i++) {
      if (buffer[i] !== MAGIC[i]) {
        throw new Error('Invalid IFCXB file: bad magic bytes');
      }
    }

    // TODO: Implement full IFCXB decoding
    // 1. Read header (version, flags, total length)
    // 2. Read META chunk -> decode CBOR -> extract string table + entity index
    // 3. Read DATA chunk -> decode CBOR -> reconstruct entities using string table
    // 4. Read GEOM chunk -> extract binary geometry data
    // 5. Decompress chunks (Zstandard)

    throw new Error('IFCXB decoding not yet implemented. Use IfcxReader for JSON input.');
  }
}
