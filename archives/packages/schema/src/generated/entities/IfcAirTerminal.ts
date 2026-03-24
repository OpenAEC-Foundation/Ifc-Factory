import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcAirTerminalTypeEnum } from '../enums/IfcAirTerminalTypeEnum.js';

export interface IfcAirTerminal extends IfcFlowTerminal {
  PredefinedType?: IfcAirTerminalTypeEnum | null;
}
