import type { IfcSimpleProperty } from './IfcSimpleProperty.js';
import type { IfcValue } from '../selects/IfcValue.js';
import type { IfcPropertyEnumeration } from './IfcPropertyEnumeration.js';

export interface IfcPropertyEnumeratedValue extends IfcSimpleProperty {
  EnumerationValues?: IfcValue[] | null;
  EnumerationReference?: IfcPropertyEnumeration | null;
}
