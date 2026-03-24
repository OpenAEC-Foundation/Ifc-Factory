import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcElectricGeneratorTypeEnum } from '../enums/IfcElectricGeneratorTypeEnum.js';

export interface IfcElectricGeneratorType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcElectricGeneratorTypeEnum;
}
