import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcSignalTypeEnum } from '../enums/IfcSignalTypeEnum.js';

export interface IfcSignal extends IfcFlowTerminal {
  PredefinedType?: IfcSignalTypeEnum | null;
}
