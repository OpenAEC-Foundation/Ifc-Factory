import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcStackTerminalTypeEnum } from '../enums/IfcStackTerminalTypeEnum.js';

export interface IfcStackTerminalType extends IfcFlowTerminalType {
  PredefinedType: IfcStackTerminalTypeEnum;
}
