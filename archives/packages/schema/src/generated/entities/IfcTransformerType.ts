import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcTransformerTypeEnum } from '../enums/IfcTransformerTypeEnum.js';

export interface IfcTransformerType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcTransformerTypeEnum;
}
