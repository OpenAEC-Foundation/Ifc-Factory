import type { IfcFlowFittingType } from './IfcFlowFittingType.js';
import type { IfcCableCarrierFittingTypeEnum } from '../enums/IfcCableCarrierFittingTypeEnum.js';

export interface IfcCableCarrierFittingType extends IfcFlowFittingType {
  PredefinedType: IfcCableCarrierFittingTypeEnum;
}
