import type { IfcFlowTreatmentDevice } from './IfcFlowTreatmentDevice.js';
import type { IfcElectricFlowTreatmentDeviceTypeEnum } from '../enums/IfcElectricFlowTreatmentDeviceTypeEnum.js';

export interface IfcElectricFlowTreatmentDevice extends IfcFlowTreatmentDevice {
  PredefinedType?: IfcElectricFlowTreatmentDeviceTypeEnum | null;
}
