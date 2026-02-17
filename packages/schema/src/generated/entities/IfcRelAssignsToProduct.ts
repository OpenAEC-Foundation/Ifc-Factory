import type { IfcRelAssigns } from './IfcRelAssigns.js';
import type { IfcProductSelect } from '../selects/IfcProductSelect.js';

export interface IfcRelAssignsToProduct extends IfcRelAssigns {
  RelatingProduct: IfcProductSelect;
}
