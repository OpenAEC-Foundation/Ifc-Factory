import type { IfcFlowTreatmentDevice } from './IfcFlowTreatmentDevice.js';
import type { IfcFilterTypeEnum } from '../enums/IfcFilterTypeEnum.js';

export interface IfcFilter extends IfcFlowTreatmentDevice {
  PredefinedType?: IfcFilterTypeEnum | null;
}
