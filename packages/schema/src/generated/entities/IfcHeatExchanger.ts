import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcHeatExchangerTypeEnum } from '../enums/IfcHeatExchangerTypeEnum.js';

export interface IfcHeatExchanger extends IfcEnergyConversionDevice {
  PredefinedType?: IfcHeatExchangerTypeEnum | null;
}
