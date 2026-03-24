import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcMotorConnectionTypeEnum } from '../enums/IfcMotorConnectionTypeEnum.js';

export interface IfcMotorConnectionType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcMotorConnectionTypeEnum;
}
