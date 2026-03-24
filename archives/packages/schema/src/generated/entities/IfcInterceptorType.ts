import type { IfcFlowTreatmentDeviceType } from './IfcFlowTreatmentDeviceType.js';
import type { IfcInterceptorTypeEnum } from '../enums/IfcInterceptorTypeEnum.js';

export interface IfcInterceptorType extends IfcFlowTreatmentDeviceType {
  PredefinedType: IfcInterceptorTypeEnum;
}
