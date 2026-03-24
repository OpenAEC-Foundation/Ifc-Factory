import type { IfcDistributionControlElementType } from './IfcDistributionControlElementType.js';
import type { IfcControllerTypeEnum } from '../enums/IfcControllerTypeEnum.js';

export interface IfcControllerType extends IfcDistributionControlElementType {
  PredefinedType: IfcControllerTypeEnum;
}
