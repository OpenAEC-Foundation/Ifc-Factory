import type { IfcPhysicalSimpleQuantity } from './IfcPhysicalSimpleQuantity.js';
import type { IfcMassMeasure } from '../types/IfcMassMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcQuantityWeight extends IfcPhysicalSimpleQuantity {
  WeightValue: IfcMassMeasure;
  Formula?: IfcLabel | null;
}
