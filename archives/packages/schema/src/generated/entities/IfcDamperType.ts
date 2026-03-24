import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcDamperTypeEnum } from '../enums/IfcDamperTypeEnum.js';

export interface IfcDamperType extends IfcFlowControllerType {
  PredefinedType: IfcDamperTypeEnum;
}
