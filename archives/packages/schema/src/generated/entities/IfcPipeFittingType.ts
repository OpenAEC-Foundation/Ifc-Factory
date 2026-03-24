import type { IfcFlowFittingType } from './IfcFlowFittingType.js';
import type { IfcPipeFittingTypeEnum } from '../enums/IfcPipeFittingTypeEnum.js';

export interface IfcPipeFittingType extends IfcFlowFittingType {
  PredefinedType: IfcPipeFittingTypeEnum;
}
