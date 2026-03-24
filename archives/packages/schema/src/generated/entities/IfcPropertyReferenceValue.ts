import type { IfcSimpleProperty } from './IfcSimpleProperty.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcObjectReferenceSelect } from '../selects/IfcObjectReferenceSelect.js';

export interface IfcPropertyReferenceValue extends IfcSimpleProperty {
  UsageName?: IfcText | null;
  PropertyReference?: IfcObjectReferenceSelect | null;
}
