import type { IfcTypeObject } from './IfcTypeObject.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcTypeResource extends IfcTypeObject {
  Identification?: IfcIdentifier | null;
  LongDescription?: IfcText | null;
  ResourceType?: IfcLabel | null;
}
