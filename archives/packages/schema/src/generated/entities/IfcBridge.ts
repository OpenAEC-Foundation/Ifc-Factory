import type { IfcFacility } from './IfcFacility.js';
import type { IfcBridgeTypeEnum } from '../enums/IfcBridgeTypeEnum.js';

export interface IfcBridge extends IfcFacility {
  PredefinedType?: IfcBridgeTypeEnum | null;
}
