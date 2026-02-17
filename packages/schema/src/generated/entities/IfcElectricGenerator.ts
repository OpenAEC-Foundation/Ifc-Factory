import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcElectricGeneratorTypeEnum } from '../enums/IfcElectricGeneratorTypeEnum.js';

export interface IfcElectricGenerator extends IfcEnergyConversionDevice {
  PredefinedType?: IfcElectricGeneratorTypeEnum | null;
}
