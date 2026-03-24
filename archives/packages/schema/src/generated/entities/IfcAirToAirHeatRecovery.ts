import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcAirToAirHeatRecoveryTypeEnum } from '../enums/IfcAirToAirHeatRecoveryTypeEnum.js';

export interface IfcAirToAirHeatRecovery extends IfcEnergyConversionDevice {
  PredefinedType?: IfcAirToAirHeatRecoveryTypeEnum | null;
}
