import type { IfcSpatialStructureElement } from './IfcSpatialStructureElement.js';
import type { IfcFacilityUsageEnum } from '../enums/IfcFacilityUsageEnum.js';

export interface IfcFacilityPart extends IfcSpatialStructureElement {
  UsageType: IfcFacilityUsageEnum;
}
