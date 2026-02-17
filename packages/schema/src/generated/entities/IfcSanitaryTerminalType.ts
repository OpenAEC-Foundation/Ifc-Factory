import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcSanitaryTerminalTypeEnum } from '../enums/IfcSanitaryTerminalTypeEnum.js';

export interface IfcSanitaryTerminalType extends IfcFlowTerminalType {
  PredefinedType: IfcSanitaryTerminalTypeEnum;
}
