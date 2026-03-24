import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcElectricDistributionBoardTypeEnum } from '../enums/IfcElectricDistributionBoardTypeEnum.js';

export interface IfcElectricDistributionBoard extends IfcFlowController {
  PredefinedType?: IfcElectricDistributionBoardTypeEnum | null;
}
