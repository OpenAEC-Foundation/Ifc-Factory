import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcProtectiveDeviceTrippingUnitTypeEnum } from '../enums/IfcProtectiveDeviceTrippingUnitTypeEnum.js';

export interface IfcProtectiveDeviceTrippingUnit extends IfcDistributionControlElement {
  PredefinedType?: IfcProtectiveDeviceTrippingUnitTypeEnum | null;
}
