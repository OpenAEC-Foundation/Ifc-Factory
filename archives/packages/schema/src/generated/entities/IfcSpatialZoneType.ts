import type { IfcSpatialElementType } from './IfcSpatialElementType.js';
import type { IfcSpatialZoneTypeEnum } from '../enums/IfcSpatialZoneTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcSpatialZoneType extends IfcSpatialElementType {
  PredefinedType: IfcSpatialZoneTypeEnum;
  LongName?: IfcLabel | null;
}
