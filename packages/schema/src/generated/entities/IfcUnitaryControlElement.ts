import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcUnitaryControlElementTypeEnum } from '../enums/IfcUnitaryControlElementTypeEnum.js';

export interface IfcUnitaryControlElement extends IfcDistributionControlElement {
  PredefinedType?: IfcUnitaryControlElementTypeEnum | null;
}
