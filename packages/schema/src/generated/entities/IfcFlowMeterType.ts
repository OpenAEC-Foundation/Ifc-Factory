import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcFlowMeterTypeEnum } from '../enums/IfcFlowMeterTypeEnum.js';

export interface IfcFlowMeterType extends IfcFlowControllerType {
  PredefinedType: IfcFlowMeterTypeEnum;
}
