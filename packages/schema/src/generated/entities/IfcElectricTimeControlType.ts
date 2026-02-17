import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcElectricTimeControlTypeEnum } from '../enums/IfcElectricTimeControlTypeEnum.js';

export interface IfcElectricTimeControlType extends IfcFlowControllerType {
  PredefinedType: IfcElectricTimeControlTypeEnum;
}
