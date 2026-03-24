import type { IfcPhysicalSimpleQuantity } from './IfcPhysicalSimpleQuantity.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcQuantityLength extends IfcPhysicalSimpleQuantity {
  LengthValue: IfcLengthMeasure;
  Formula?: IfcLabel | null;
}
