import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcEngineTypeEnum } from '../enums/IfcEngineTypeEnum.js';

export interface IfcEngine extends IfcEnergyConversionDevice {
  PredefinedType?: IfcEngineTypeEnum | null;
}
