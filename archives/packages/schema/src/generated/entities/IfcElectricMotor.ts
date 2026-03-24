import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcElectricMotorTypeEnum } from '../enums/IfcElectricMotorTypeEnum.js';

export interface IfcElectricMotor extends IfcEnergyConversionDevice {
  PredefinedType?: IfcElectricMotorTypeEnum | null;
}
