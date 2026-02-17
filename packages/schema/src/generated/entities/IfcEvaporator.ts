import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcEvaporatorTypeEnum } from '../enums/IfcEvaporatorTypeEnum.js';

export interface IfcEvaporator extends IfcEnergyConversionDevice {
  PredefinedType?: IfcEvaporatorTypeEnum | null;
}
