import type { IfcFlowFitting } from './IfcFlowFitting.js';
import type { IfcPipeFittingTypeEnum } from '../enums/IfcPipeFittingTypeEnum.js';

export interface IfcPipeFitting extends IfcFlowFitting {
  PredefinedType?: IfcPipeFittingTypeEnum | null;
}
