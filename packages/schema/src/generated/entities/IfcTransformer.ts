import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcTransformerTypeEnum } from '../enums/IfcTransformerTypeEnum.js';

export interface IfcTransformer extends IfcEnergyConversionDevice {
  PredefinedType?: IfcTransformerTypeEnum | null;
}
