import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcOutletTypeEnum } from '../enums/IfcOutletTypeEnum.js';

export interface IfcOutlet extends IfcFlowTerminal {
  PredefinedType?: IfcOutletTypeEnum | null;
}
