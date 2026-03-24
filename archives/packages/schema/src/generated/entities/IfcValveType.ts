import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcValveTypeEnum } from '../enums/IfcValveTypeEnum.js';

export interface IfcValveType extends IfcFlowControllerType {
  PredefinedType: IfcValveTypeEnum;
}
