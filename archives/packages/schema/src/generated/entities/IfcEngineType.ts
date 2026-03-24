import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcEngineTypeEnum } from '../enums/IfcEngineTypeEnum.js';

export interface IfcEngineType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcEngineTypeEnum;
}
