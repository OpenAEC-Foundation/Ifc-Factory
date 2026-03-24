import type { IfcRelAssociates } from './IfcRelAssociates.js';
import type { IfcApproval } from './IfcApproval.js';

export interface IfcRelAssociatesApproval extends IfcRelAssociates {
  RelatingApproval: IfcApproval;
}
