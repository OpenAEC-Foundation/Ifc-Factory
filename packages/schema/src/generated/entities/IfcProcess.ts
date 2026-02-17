import type { IfcObject } from './IfcObject.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcProcess extends IfcObject {
  Identification?: IfcIdentifier | null;
  LongDescription?: IfcText | null;
}
