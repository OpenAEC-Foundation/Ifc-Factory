import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcStackTerminalTypeEnum } from '../enums/IfcStackTerminalTypeEnum.js';

export interface IfcStackTerminal extends IfcFlowTerminal {
  PredefinedType?: IfcStackTerminalTypeEnum | null;
}
