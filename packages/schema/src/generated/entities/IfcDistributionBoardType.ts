import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcDistributionBoardTypeEnum } from '../enums/IfcDistributionBoardTypeEnum.js';

export interface IfcDistributionBoardType extends IfcFlowControllerType {
  PredefinedType: IfcDistributionBoardTypeEnum;
}
