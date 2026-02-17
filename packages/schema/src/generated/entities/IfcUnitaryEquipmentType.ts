import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcUnitaryEquipmentTypeEnum } from '../enums/IfcUnitaryEquipmentTypeEnum.js';

export interface IfcUnitaryEquipmentType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcUnitaryEquipmentTypeEnum;
}
