import type { IfcFlowFitting } from './IfcFlowFitting.js';
import type { IfcDuctFittingTypeEnum } from '../enums/IfcDuctFittingTypeEnum.js';

export interface IfcDuctFitting extends IfcFlowFitting {
  PredefinedType?: IfcDuctFittingTypeEnum | null;
}
