import type { IfcTransportationDeviceType } from './IfcTransportationDeviceType.js';
import type { IfcTransportElementTypeEnum } from '../enums/IfcTransportElementTypeEnum.js';

export interface IfcTransportElementType extends IfcTransportationDeviceType {
  PredefinedType: IfcTransportElementTypeEnum;
}
