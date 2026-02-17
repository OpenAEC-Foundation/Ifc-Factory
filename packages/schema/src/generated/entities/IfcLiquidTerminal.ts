import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcLiquidTerminalTypeEnum } from '../enums/IfcLiquidTerminalTypeEnum.js';

export interface IfcLiquidTerminal extends IfcFlowTerminal {
  PredefinedType?: IfcLiquidTerminalTypeEnum | null;
}
