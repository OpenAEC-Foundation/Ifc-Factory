import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcElectricDistributionBoardTypeEnum } from '../enums/IfcElectricDistributionBoardTypeEnum.js';

export interface IfcElectricDistributionBoardType extends IfcFlowControllerType {
  PredefinedType: IfcElectricDistributionBoardTypeEnum;
}
