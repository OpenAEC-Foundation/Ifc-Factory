import type { IfcPhysicalSimpleQuantity } from './IfcPhysicalSimpleQuantity.js';
import type { IfcTimeMeasure } from '../types/IfcTimeMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcQuantityTime extends IfcPhysicalSimpleQuantity {
  TimeValue: IfcTimeMeasure;
  Formula?: IfcLabel | null;
}
