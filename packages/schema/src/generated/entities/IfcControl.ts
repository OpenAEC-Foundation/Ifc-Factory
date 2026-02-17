import type { IfcObject } from './IfcObject.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcControl extends IfcObject {
  Identification?: IfcIdentifier | null;
}
