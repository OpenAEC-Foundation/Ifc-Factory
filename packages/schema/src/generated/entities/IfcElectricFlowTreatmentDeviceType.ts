import type { IfcFlowTreatmentDeviceType } from './IfcFlowTreatmentDeviceType.js';
import type { IfcElectricFlowTreatmentDeviceTypeEnum } from '../enums/IfcElectricFlowTreatmentDeviceTypeEnum.js';

export interface IfcElectricFlowTreatmentDeviceType extends IfcFlowTreatmentDeviceType {
  PredefinedType: IfcElectricFlowTreatmentDeviceTypeEnum;
}
