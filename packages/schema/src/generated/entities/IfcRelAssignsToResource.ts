import type { IfcRelAssigns } from './IfcRelAssigns.js';
import type { IfcResourceSelect } from '../selects/IfcResourceSelect.js';

export interface IfcRelAssignsToResource extends IfcRelAssigns {
  RelatingResource: IfcResourceSelect;
}
