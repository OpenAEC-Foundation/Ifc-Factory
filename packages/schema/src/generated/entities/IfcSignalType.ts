import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcSignalTypeEnum } from '../enums/IfcSignalTypeEnum.js';

export interface IfcSignalType extends IfcFlowTerminalType {
  PredefinedType: IfcSignalTypeEnum;
}
