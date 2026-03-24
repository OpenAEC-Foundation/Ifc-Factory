import type { IfcRelAssigns } from './IfcRelAssigns.js';
import type { IfcGroup } from './IfcGroup.js';

export interface IfcRelAssignsToGroup extends IfcRelAssigns {
  RelatingGroup: IfcGroup;
}
