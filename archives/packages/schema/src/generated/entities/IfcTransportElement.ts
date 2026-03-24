import type { IfcTransportationDevice } from './IfcTransportationDevice.js';
import type { IfcTransportElementTypeEnum } from '../enums/IfcTransportElementTypeEnum.js';

export interface IfcTransportElement extends IfcTransportationDevice {
  PredefinedType?: IfcTransportElementTypeEnum | null;
}
