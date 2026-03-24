import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcHumidifierTypeEnum } from '../enums/IfcHumidifierTypeEnum.js';

export interface IfcHumidifier extends IfcEnergyConversionDevice {
  PredefinedType?: IfcHumidifierTypeEnum | null;
}
