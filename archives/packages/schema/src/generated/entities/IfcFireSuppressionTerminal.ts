import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcFireSuppressionTerminalTypeEnum } from '../enums/IfcFireSuppressionTerminalTypeEnum.js';

export interface IfcFireSuppressionTerminal extends IfcFlowTerminal {
  PredefinedType?: IfcFireSuppressionTerminalTypeEnum | null;
}
