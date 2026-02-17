import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcHeatExchangerTypeEnum } from '../enums/IfcHeatExchangerTypeEnum.js';

export interface IfcHeatExchangerType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcHeatExchangerTypeEnum;
}
