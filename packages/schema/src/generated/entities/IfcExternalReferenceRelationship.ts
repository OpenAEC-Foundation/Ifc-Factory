import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcExternalReference } from './IfcExternalReference.js';
import type { IfcResourceObjectSelect } from '../selects/IfcResourceObjectSelect.js';

export interface IfcExternalReferenceRelationship extends IfcResourceLevelRelationship {
  RelatingReference: IfcExternalReference;
  RelatedResourceObjects: IfcResourceObjectSelect[];
}
