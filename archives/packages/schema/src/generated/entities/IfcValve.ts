import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcValveTypeEnum } from '../enums/IfcValveTypeEnum.js';

export interface IfcValve extends IfcFlowController {
  PredefinedType?: IfcValveTypeEnum | null;
}
