import type { IfcPhysicalSimpleQuantity } from './IfcPhysicalSimpleQuantity.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcQuantityArea extends IfcPhysicalSimpleQuantity {
  AreaValue: IfcAreaMeasure;
  Formula?: IfcLabel | null;
}
