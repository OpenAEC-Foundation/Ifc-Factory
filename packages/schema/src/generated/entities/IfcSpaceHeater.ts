import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcSpaceHeaterTypeEnum } from '../enums/IfcSpaceHeaterTypeEnum.js';

export interface IfcSpaceHeater extends IfcFlowTerminal {
  PredefinedType?: IfcSpaceHeaterTypeEnum | null;
}
