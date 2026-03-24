import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcCondenserTypeEnum } from '../enums/IfcCondenserTypeEnum.js';

export interface IfcCondenser extends IfcEnergyConversionDevice {
  PredefinedType?: IfcCondenserTypeEnum | null;
}
