import { IfcxDocument } from './document.js';
import type { IfcxDocument as IIfcxDocument } from './types.js';

/**
 * Reads IFCX (JSON) files
 */
export class IfcxReader {
  /** Read from JSON string */
  static fromString(json: string): IfcxDocument {
    const data = JSON.parse(json) as IIfcxDocument;
    return IfcxDocument.fromJSON(data);
  }

  /** Read from buffer (UTF-8 encoded JSON) */
  static fromBuffer(buffer: Uint8Array): IfcxDocument {
    const decoder = new TextDecoder('utf-8');
    const json = decoder.decode(buffer);
    return IfcxReader.fromString(json);
  }
}
