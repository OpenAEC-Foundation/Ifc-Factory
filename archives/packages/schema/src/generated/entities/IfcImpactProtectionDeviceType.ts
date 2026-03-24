import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcImpactProtectionDeviceTypeEnum } from '../enums/IfcImpactProtectionDeviceTypeEnum.js';

export interface IfcImpactProtectionDeviceType extends IfcElementComponentType {
  PredefinedType: IfcImpactProtectionDeviceTypeEnum;
}
