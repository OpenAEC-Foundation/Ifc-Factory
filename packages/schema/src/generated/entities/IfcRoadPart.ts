import type { IfcFacilityPart } from './IfcFacilityPart.js';
import type { IfcRoadPartTypeEnum } from '../enums/IfcRoadPartTypeEnum.js';

export interface IfcRoadPart extends IfcFacilityPart {
  PredefinedType?: IfcRoadPartTypeEnum | null;
}
