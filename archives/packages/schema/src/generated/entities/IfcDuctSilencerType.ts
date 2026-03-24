import type { IfcFlowTreatmentDeviceType } from './IfcFlowTreatmentDeviceType.js';
import type { IfcDuctSilencerTypeEnum } from '../enums/IfcDuctSilencerTypeEnum.js';

export interface IfcDuctSilencerType extends IfcFlowTreatmentDeviceType {
  PredefinedType: IfcDuctSilencerTypeEnum;
}
