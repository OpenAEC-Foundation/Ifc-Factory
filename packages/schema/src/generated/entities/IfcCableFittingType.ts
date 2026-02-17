import type { IfcFlowFittingType } from './IfcFlowFittingType.js';
import type { IfcCableFittingTypeEnum } from '../enums/IfcCableFittingTypeEnum.js';

export interface IfcCableFittingType extends IfcFlowFittingType {
  PredefinedType: IfcCableFittingTypeEnum;
}
