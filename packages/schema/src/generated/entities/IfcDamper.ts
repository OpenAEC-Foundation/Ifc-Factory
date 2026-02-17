import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcDamperTypeEnum } from '../enums/IfcDamperTypeEnum.js';

export interface IfcDamper extends IfcFlowController {
  PredefinedType?: IfcDamperTypeEnum | null;
}
