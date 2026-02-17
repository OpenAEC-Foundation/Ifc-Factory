import type { IfcFlowFittingType } from './IfcFlowFittingType.js';
import type { IfcDuctFittingTypeEnum } from '../enums/IfcDuctFittingTypeEnum.js';

export interface IfcDuctFittingType extends IfcFlowFittingType {
  PredefinedType: IfcDuctFittingTypeEnum;
}
