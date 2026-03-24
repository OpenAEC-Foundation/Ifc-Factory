import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcFlowMeterTypeEnum } from '../enums/IfcFlowMeterTypeEnum.js';

export interface IfcFlowMeter extends IfcFlowController {
  PredefinedType?: IfcFlowMeterTypeEnum | null;
}
