import type { IfcProperty } from './IfcProperty.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcComplexProperty extends IfcProperty {
  UsageName: IfcIdentifier;
  HasProperties: IfcProperty[];
}
