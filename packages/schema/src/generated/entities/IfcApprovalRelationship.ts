import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcApproval } from './IfcApproval.js';

export interface IfcApprovalRelationship extends IfcResourceLevelRelationship {
  RelatingApproval: IfcApproval;
  RelatedApprovals: IfcApproval[];
}
