import type { IfcFlowTreatmentDeviceType } from './IfcFlowTreatmentDeviceType.js';
import type { IfcFilterTypeEnum } from '../enums/IfcFilterTypeEnum.js';

export interface IfcFilterType extends IfcFlowTreatmentDeviceType {
  PredefinedType: IfcFilterTypeEnum;
}
