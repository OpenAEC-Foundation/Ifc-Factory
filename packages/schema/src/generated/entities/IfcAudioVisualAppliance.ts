import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcAudioVisualApplianceTypeEnum } from '../enums/IfcAudioVisualApplianceTypeEnum.js';

export interface IfcAudioVisualAppliance extends IfcFlowTerminal {
  PredefinedType?: IfcAudioVisualApplianceTypeEnum | null;
}
