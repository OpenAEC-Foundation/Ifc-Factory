import type { IfcQuantitySet } from './IfcQuantitySet.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcPhysicalQuantity } from './IfcPhysicalQuantity.js';

export interface IfcElementQuantity extends IfcQuantitySet {
  MethodOfMeasurement?: IfcLabel | null;
  Quantities: IfcPhysicalQuantity[];
}
