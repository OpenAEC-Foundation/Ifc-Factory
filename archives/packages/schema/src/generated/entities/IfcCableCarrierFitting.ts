import type { IfcFlowFitting } from './IfcFlowFitting.js';
import type { IfcCableCarrierFittingTypeEnum } from '../enums/IfcCableCarrierFittingTypeEnum.js';

export interface IfcCableCarrierFitting extends IfcFlowFitting {
  PredefinedType?: IfcCableCarrierFittingTypeEnum | null;
}
