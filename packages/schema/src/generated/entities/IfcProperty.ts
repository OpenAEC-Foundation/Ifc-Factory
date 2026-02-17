import type { IfcPropertyAbstraction } from './IfcPropertyAbstraction.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcProperty extends IfcPropertyAbstraction {
  Name: IfcIdentifier;
  Specification?: IfcText | null;
}
