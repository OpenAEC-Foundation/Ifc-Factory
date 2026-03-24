import type { IfcDistributionControlElementType } from './IfcDistributionControlElementType.js';
import type { IfcUnitaryControlElementTypeEnum } from '../enums/IfcUnitaryControlElementTypeEnum.js';

export interface IfcUnitaryControlElementType extends IfcDistributionControlElementType {
  PredefinedType: IfcUnitaryControlElementTypeEnum;
}
