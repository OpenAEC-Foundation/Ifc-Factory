import type { IfcSpatialStructureElement } from './IfcSpatialStructureElement.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcBuildingStorey extends IfcSpatialStructureElement {
  Elevation?: IfcLengthMeasure | null;
}
