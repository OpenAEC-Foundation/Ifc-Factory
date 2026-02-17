import type { IfcObjectDefinition } from './IfcObjectDefinition.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcRepresentationContext } from './IfcRepresentationContext.js';
import type { IfcUnitAssignment } from './IfcUnitAssignment.js';

export interface IfcContext extends IfcObjectDefinition {
  ObjectType?: IfcLabel | null;
  LongName?: IfcLabel | null;
  Phase?: IfcLabel | null;
  RepresentationContexts?: IfcRepresentationContext[] | null;
  UnitsInContext?: IfcUnitAssignment | null;
}
