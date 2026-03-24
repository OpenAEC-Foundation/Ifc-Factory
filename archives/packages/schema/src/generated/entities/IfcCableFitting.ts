import type { IfcFlowFitting } from './IfcFlowFitting.js';
import type { IfcCableFittingTypeEnum } from '../enums/IfcCableFittingTypeEnum.js';

export interface IfcCableFitting extends IfcFlowFitting {
  PredefinedType?: IfcCableFittingTypeEnum | null;
}
