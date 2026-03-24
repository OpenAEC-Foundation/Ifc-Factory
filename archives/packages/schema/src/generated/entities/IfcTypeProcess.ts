import type { IfcTypeObject } from './IfcTypeObject.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcTypeProcess extends IfcTypeObject {
  Identification?: IfcIdentifier | null;
  LongDescription?: IfcText | null;
  ProcessType?: IfcLabel | null;
}
