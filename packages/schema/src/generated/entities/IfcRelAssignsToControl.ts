import type { IfcRelAssigns } from './IfcRelAssigns.js';
import type { IfcControl } from './IfcControl.js';

export interface IfcRelAssignsToControl extends IfcRelAssigns {
  RelatingControl: IfcControl;
}
