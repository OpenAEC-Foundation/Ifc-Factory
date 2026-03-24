import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcWasteTerminalTypeEnum } from '../enums/IfcWasteTerminalTypeEnum.js';

export interface IfcWasteTerminal extends IfcFlowTerminal {
  PredefinedType?: IfcWasteTerminalTypeEnum | null;
}
