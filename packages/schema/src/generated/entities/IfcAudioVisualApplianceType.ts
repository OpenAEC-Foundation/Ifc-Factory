import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcAudioVisualApplianceTypeEnum } from '../enums/IfcAudioVisualApplianceTypeEnum.js';

export interface IfcAudioVisualApplianceType extends IfcFlowTerminalType {
  PredefinedType: IfcAudioVisualApplianceTypeEnum;
}
