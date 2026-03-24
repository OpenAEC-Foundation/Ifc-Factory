import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcOutletTypeEnum } from '../enums/IfcOutletTypeEnum.js';

export interface IfcOutletType extends IfcFlowTerminalType {
  PredefinedType: IfcOutletTypeEnum;
}
