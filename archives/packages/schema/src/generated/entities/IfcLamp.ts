import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcLampTypeEnum } from '../enums/IfcLampTypeEnum.js';

export interface IfcLamp extends IfcFlowTerminal {
  PredefinedType?: IfcLampTypeEnum | null;
}
