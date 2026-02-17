import type { IfcSpatialStructureElement } from './IfcSpatialStructureElement.js';
import type { IfcSpaceTypeEnum } from '../enums/IfcSpaceTypeEnum.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcSpace extends IfcSpatialStructureElement {
  PredefinedType?: IfcSpaceTypeEnum | null;
  ElevationWithFlooring?: IfcLengthMeasure | null;
}
