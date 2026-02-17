import type { IfcFlowTreatmentDevice } from './IfcFlowTreatmentDevice.js';
import type { IfcDuctSilencerTypeEnum } from '../enums/IfcDuctSilencerTypeEnum.js';

export interface IfcDuctSilencer extends IfcFlowTreatmentDevice {
  PredefinedType?: IfcDuctSilencerTypeEnum | null;
}
