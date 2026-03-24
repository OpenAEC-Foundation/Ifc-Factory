import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcUnitaryEquipmentTypeEnum } from '../enums/IfcUnitaryEquipmentTypeEnum.js';

export interface IfcUnitaryEquipment extends IfcEnergyConversionDevice {
  PredefinedType?: IfcUnitaryEquipmentTypeEnum | null;
}
