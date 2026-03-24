import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcSpaceHeaterTypeEnum } from '../enums/IfcSpaceHeaterTypeEnum.js';

export interface IfcSpaceHeaterType extends IfcFlowTerminalType {
  PredefinedType: IfcSpaceHeaterTypeEnum;
}
