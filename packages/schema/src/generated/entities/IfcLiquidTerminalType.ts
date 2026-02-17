import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcLiquidTerminalTypeEnum } from '../enums/IfcLiquidTerminalTypeEnum.js';

export interface IfcLiquidTerminalType extends IfcFlowTerminalType {
  PredefinedType: IfcLiquidTerminalTypeEnum;
}
