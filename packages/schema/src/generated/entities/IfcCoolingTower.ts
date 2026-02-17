import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcCoolingTowerTypeEnum } from '../enums/IfcCoolingTowerTypeEnum.js';

export interface IfcCoolingTower extends IfcEnergyConversionDevice {
  PredefinedType?: IfcCoolingTowerTypeEnum | null;
}
