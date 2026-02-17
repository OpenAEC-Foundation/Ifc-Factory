import type { IfcFlowFitting } from './IfcFlowFitting.js';
import type { IfcJunctionBoxTypeEnum } from '../enums/IfcJunctionBoxTypeEnum.js';

export interface IfcJunctionBox extends IfcFlowFitting {
  PredefinedType?: IfcJunctionBoxTypeEnum | null;
}
