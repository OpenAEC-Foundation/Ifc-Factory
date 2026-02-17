import type { IfcPropertyAbstraction } from './IfcPropertyAbstraction.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcProperty } from './IfcProperty.js';

export interface IfcExtendedProperties extends IfcPropertyAbstraction {
  Name?: IfcIdentifier | null;
  Description?: IfcText | null;
  Properties: IfcProperty[];
}
