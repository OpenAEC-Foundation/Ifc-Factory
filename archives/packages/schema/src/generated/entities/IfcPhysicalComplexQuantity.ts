import type { IfcPhysicalQuantity } from './IfcPhysicalQuantity.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcPhysicalComplexQuantity extends IfcPhysicalQuantity {
  HasQuantities: IfcPhysicalQuantity[];
  Discrimination: IfcLabel;
  Quality?: IfcLabel | null;
  Usage?: IfcLabel | null;
}
