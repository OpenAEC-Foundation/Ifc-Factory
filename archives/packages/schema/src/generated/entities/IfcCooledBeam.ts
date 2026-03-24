import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcCooledBeamTypeEnum } from '../enums/IfcCooledBeamTypeEnum.js';

export interface IfcCooledBeam extends IfcEnergyConversionDevice {
  PredefinedType?: IfcCooledBeamTypeEnum | null;
}
