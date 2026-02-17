import type { IfcPhysicalQuantity } from './IfcPhysicalQuantity.js';
import type { IfcNamedUnit } from './IfcNamedUnit.js';

export interface IfcPhysicalSimpleQuantity extends IfcPhysicalQuantity {
  Unit?: IfcNamedUnit | null;
}
