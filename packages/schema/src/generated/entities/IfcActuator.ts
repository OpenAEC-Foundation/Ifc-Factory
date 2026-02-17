import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcActuatorTypeEnum } from '../enums/IfcActuatorTypeEnum.js';

export interface IfcActuator extends IfcDistributionControlElement {
  PredefinedType?: IfcActuatorTypeEnum | null;
}
