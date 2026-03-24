import type { IfcFacilityPart } from './IfcFacilityPart.js';
import type { IfcBridgePartTypeEnum } from '../enums/IfcBridgePartTypeEnum.js';

export interface IfcBridgePart extends IfcFacilityPart {
  PredefinedType?: IfcBridgePartTypeEnum | null;
}
