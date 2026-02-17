import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcAirTerminalBoxTypeEnum } from '../enums/IfcAirTerminalBoxTypeEnum.js';

export interface IfcAirTerminalBoxType extends IfcFlowControllerType {
  PredefinedType: IfcAirTerminalBoxTypeEnum;
}
