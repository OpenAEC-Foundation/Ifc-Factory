import type { IfcFacilityPart } from './IfcFacilityPart.js';
import type { IfcRailwayPartTypeEnum } from '../enums/IfcRailwayPartTypeEnum.js';

export interface IfcRailwayPart extends IfcFacilityPart {
  PredefinedType?: IfcRailwayPartTypeEnum | null;
}
