import type { IfcSimpleProperty } from './IfcSimpleProperty.js';
import type { IfcValue } from '../selects/IfcValue.js';
import type { IfcUnit } from '../selects/IfcUnit.js';

export interface IfcPropertyBoundedValue extends IfcSimpleProperty {
  UpperBoundValue?: IfcValue | null;
  LowerBoundValue?: IfcValue | null;
  Unit?: IfcUnit | null;
  SetPointValue?: IfcValue | null;
}
