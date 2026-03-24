import type { IfcSimpleProperty } from './IfcSimpleProperty.js';
import type { IfcValue } from '../selects/IfcValue.js';
import type { IfcUnit } from '../selects/IfcUnit.js';

export interface IfcPropertyListValue extends IfcSimpleProperty {
  ListValues?: IfcValue[] | null;
  Unit?: IfcUnit | null;
}
