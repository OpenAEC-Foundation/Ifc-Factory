import type { IfcRelAssigns } from './IfcRelAssigns.js';
import type { IfcProcessSelect } from '../selects/IfcProcessSelect.js';
import type { IfcMeasureWithUnit } from './IfcMeasureWithUnit.js';

export interface IfcRelAssignsToProcess extends IfcRelAssigns {
  RelatingProcess: IfcProcessSelect;
  QuantityInProcess?: IfcMeasureWithUnit | null;
}
