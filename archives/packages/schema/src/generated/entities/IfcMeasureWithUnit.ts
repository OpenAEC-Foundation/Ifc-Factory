import type { IfcValue } from '../selects/IfcValue.js';
import type { IfcUnit } from '../selects/IfcUnit.js';

export interface IfcMeasureWithUnit {
  readonly type: string;
  ValueComponent: IfcValue;
  UnitComponent: IfcUnit;
}
