import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcImpactProtectionDeviceTypeEnum } from '../enums/IfcImpactProtectionDeviceTypeEnum.js';

export interface IfcImpactProtectionDevice extends IfcElementComponent {
  PredefinedType?: IfcImpactProtectionDeviceTypeEnum | null;
}
