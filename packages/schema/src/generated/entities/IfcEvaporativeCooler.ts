import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcEvaporativeCoolerTypeEnum } from '../enums/IfcEvaporativeCoolerTypeEnum.js';

export interface IfcEvaporativeCooler extends IfcEnergyConversionDevice {
  PredefinedType?: IfcEvaporativeCoolerTypeEnum | null;
}
