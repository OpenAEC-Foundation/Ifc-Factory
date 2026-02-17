import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcMotorConnectionTypeEnum } from '../enums/IfcMotorConnectionTypeEnum.js';

export interface IfcMotorConnection extends IfcEnergyConversionDevice {
  PredefinedType?: IfcMotorConnectionTypeEnum | null;
}
