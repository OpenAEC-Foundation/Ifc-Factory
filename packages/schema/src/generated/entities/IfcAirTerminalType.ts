import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcAirTerminalTypeEnum } from '../enums/IfcAirTerminalTypeEnum.js';

export interface IfcAirTerminalType extends IfcFlowTerminalType {
  PredefinedType: IfcAirTerminalTypeEnum;
}
