import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcFireSuppressionTerminalTypeEnum } from '../enums/IfcFireSuppressionTerminalTypeEnum.js';

export interface IfcFireSuppressionTerminalType extends IfcFlowTerminalType {
  PredefinedType: IfcFireSuppressionTerminalTypeEnum;
}
