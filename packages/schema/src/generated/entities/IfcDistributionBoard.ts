import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcDistributionBoardTypeEnum } from '../enums/IfcDistributionBoardTypeEnum.js';

export interface IfcDistributionBoard extends IfcFlowController {
  PredefinedType?: IfcDistributionBoardTypeEnum | null;
}
