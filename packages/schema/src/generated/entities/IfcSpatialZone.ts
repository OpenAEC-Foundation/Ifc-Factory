import type { IfcSpatialElement } from './IfcSpatialElement.js';
import type { IfcSpatialZoneTypeEnum } from '../enums/IfcSpatialZoneTypeEnum.js';

export interface IfcSpatialZone extends IfcSpatialElement {
  PredefinedType?: IfcSpatialZoneTypeEnum | null;
}
