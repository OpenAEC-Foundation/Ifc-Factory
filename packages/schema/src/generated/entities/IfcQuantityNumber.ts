import type { IfcPhysicalSimpleQuantity } from './IfcPhysicalSimpleQuantity.js';
import type { IfcNumericMeasure } from '../types/IfcNumericMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcQuantityNumber extends IfcPhysicalSimpleQuantity {
  NumberValue: IfcNumericMeasure;
  Formula?: IfcLabel | null;
}
