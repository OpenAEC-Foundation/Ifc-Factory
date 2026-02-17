import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcConstraint } from './IfcConstraint.js';
import type { IfcResourceObjectSelect } from '../selects/IfcResourceObjectSelect.js';

export interface IfcResourceConstraintRelationship extends IfcResourceLevelRelationship {
  RelatingConstraint: IfcConstraint;
  RelatedResourceObjects: IfcResourceObjectSelect[];
}
