import type { IfcPhysicalSimpleQuantity } from './IfcPhysicalSimpleQuantity.js';
import type { IfcCountMeasure } from '../types/IfcCountMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcQuantityCount extends IfcPhysicalSimpleQuantity {
  CountValue: IfcCountMeasure;
  Formula?: IfcLabel | null;
}
