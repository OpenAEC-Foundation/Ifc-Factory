import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcAirToAirHeatRecoveryTypeEnum } from '../enums/IfcAirToAirHeatRecoveryTypeEnum.js';

export interface IfcAirToAirHeatRecoveryType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcAirToAirHeatRecoveryTypeEnum;
}
