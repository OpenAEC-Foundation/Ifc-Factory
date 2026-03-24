import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcElectricMotorTypeEnum } from '../enums/IfcElectricMotorTypeEnum.js';

export interface IfcElectricMotorType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcElectricMotorTypeEnum;
}
