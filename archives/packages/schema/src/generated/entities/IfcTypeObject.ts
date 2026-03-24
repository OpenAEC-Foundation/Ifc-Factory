import type { IfcObjectDefinition } from './IfcObjectDefinition.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcPropertySetDefinition } from './IfcPropertySetDefinition.js';

export interface IfcTypeObject extends IfcObjectDefinition {
  ApplicableOccurrence?: IfcIdentifier | null;
  HasPropertySets?: IfcPropertySetDefinition[] | null;
}
