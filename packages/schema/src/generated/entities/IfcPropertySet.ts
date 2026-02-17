import type { IfcPropertySetDefinition } from './IfcPropertySetDefinition.js';
import type { IfcProperty } from './IfcProperty.js';

export interface IfcPropertySet extends IfcPropertySetDefinition {
  HasProperties: IfcProperty[];
}
