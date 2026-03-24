import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcCoolingTowerTypeEnum } from '../enums/IfcCoolingTowerTypeEnum.js';

export interface IfcCoolingTowerType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcCoolingTowerTypeEnum;
}
