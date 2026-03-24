import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcElectricTimeControlTypeEnum } from '../enums/IfcElectricTimeControlTypeEnum.js';

export interface IfcElectricTimeControl extends IfcFlowController {
  PredefinedType?: IfcElectricTimeControlTypeEnum | null;
}
