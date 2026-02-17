import type { IfcDistributionControlElementType } from './IfcDistributionControlElementType.js';
import type { IfcProtectiveDeviceTrippingUnitTypeEnum } from '../enums/IfcProtectiveDeviceTrippingUnitTypeEnum.js';

export interface IfcProtectiveDeviceTrippingUnitType extends IfcDistributionControlElementType {
  PredefinedType: IfcProtectiveDeviceTrippingUnitTypeEnum;
}
