import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcBoilerTypeEnum } from '../enums/IfcBoilerTypeEnum.js';

export interface IfcBoiler extends IfcEnergyConversionDevice {
  PredefinedType?: IfcBoilerTypeEnum | null;
}
