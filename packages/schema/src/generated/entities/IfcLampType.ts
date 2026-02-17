import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcLampTypeEnum } from '../enums/IfcLampTypeEnum.js';

export interface IfcLampType extends IfcFlowTerminalType {
  PredefinedType: IfcLampTypeEnum;
}
