import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcWasteTerminalTypeEnum } from '../enums/IfcWasteTerminalTypeEnum.js';

export interface IfcWasteTerminalType extends IfcFlowTerminalType {
  PredefinedType: IfcWasteTerminalTypeEnum;
}
