import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcCondenserTypeEnum } from '../enums/IfcCondenserTypeEnum.js';

export interface IfcCondenserType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcCondenserTypeEnum;
}
