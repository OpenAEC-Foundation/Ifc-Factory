import type { IfcDistributionControlElementType } from './IfcDistributionControlElementType.js';
import type { IfcActuatorTypeEnum } from '../enums/IfcActuatorTypeEnum.js';

export interface IfcActuatorType extends IfcDistributionControlElementType {
  PredefinedType: IfcActuatorTypeEnum;
}
