import type { IfcFlowTreatmentDevice } from './IfcFlowTreatmentDevice.js';
import type { IfcInterceptorTypeEnum } from '../enums/IfcInterceptorTypeEnum.js';

export interface IfcInterceptor extends IfcFlowTreatmentDevice {
  PredefinedType?: IfcInterceptorTypeEnum | null;
}
