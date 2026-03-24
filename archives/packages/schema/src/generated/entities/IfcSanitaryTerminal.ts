import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcSanitaryTerminalTypeEnum } from '../enums/IfcSanitaryTerminalTypeEnum.js';

export interface IfcSanitaryTerminal extends IfcFlowTerminal {
  PredefinedType?: IfcSanitaryTerminalTypeEnum | null;
}
