import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcAirTerminalBoxTypeEnum } from '../enums/IfcAirTerminalBoxTypeEnum.js';

export interface IfcAirTerminalBox extends IfcFlowController {
  PredefinedType?: IfcAirTerminalBoxTypeEnum | null;
}
