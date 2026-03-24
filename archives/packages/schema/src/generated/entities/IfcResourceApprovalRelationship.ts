import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcResourceObjectSelect } from '../selects/IfcResourceObjectSelect.js';
import type { IfcApproval } from './IfcApproval.js';

export interface IfcResourceApprovalRelationship extends IfcResourceLevelRelationship {
  RelatedResourceObjects: IfcResourceObjectSelect[];
  RelatingApproval: IfcApproval;
}
