import { IfcxDocument } from '../document.js';

const MAGIC = new Uint8Array([0x49, 0x46, 0x43, 0x58]); // "IFCX"
const VERSION = 0x00010000;

/**
 * Encodes an IfcxDocument to IFCXB binary format.
 *
 * Layout: Header (16) + META chunk + DATA chunk + GEOM chunk
 */
export class IfcxbEncoder {
  /** Encode document to IFCXB binary buffer */
  static encode(doc: IfcxDocument): Uint8Array {
    // TODO: Implement full IFCXB encoding
    // Phase 1: CBOR encode the entire document as a single chunk
    // Phase 2: Split into META/DATA/GEOM chunks with string table
    // Phase 3: Add Zstandard compression

    throw new Error('IFCXB encoding not yet implemented. Use IfcxWriter for JSON output.');
  }

  /** Build deduplicated string table from document */
  static buildStringTable(doc: IfcxDocument): string[] {
    const strings = new Set<string>();

    // Collect entity type names
    for (const entity of doc.entities) {
      strings.add(entity.type);
      if (entity.layer) strings.add(entity.layer);
      if (entity.linetype) strings.add(entity.linetype);
    }

    // Collect layer/style names
    if (doc.tables?.layers) {
      for (const name of Object.keys(doc.tables.layers)) strings.add(name);
    }
    if (doc.tables?.textStyles) {
      for (const name of Object.keys(doc.tables.textStyles)) strings.add(name);
    }
    if (doc.tables?.dimStyles) {
      for (const name of Object.keys(doc.tables.dimStyles)) strings.add(name);
    }
    if (doc.tables?.linetypes) {
      for (const name of Object.keys(doc.tables.linetypes)) strings.add(name);
    }

    return Array.from(strings).sort();
  }
}
