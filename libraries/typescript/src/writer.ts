import { IfcxDocument } from './document.js';

/**
 * Writes IFCX (JSON) files
 */
export class IfcxWriter {
  /** Write to formatted JSON string */
  static toString(doc: IfcxDocument, indent = 2): string {
    return JSON.stringify(doc.toJSON(), null, indent);
  }

  /** Write to buffer (UTF-8 encoded JSON) */
  static toBuffer(doc: IfcxDocument, indent = 2): Uint8Array {
    const json = IfcxWriter.toString(doc, indent);
    const encoder = new TextEncoder();
    return encoder.encode(json);
  }

  /** Write compact JSON (no whitespace) */
  static toCompactString(doc: IfcxDocument): string {
    return JSON.stringify(doc.toJSON());
  }
}
