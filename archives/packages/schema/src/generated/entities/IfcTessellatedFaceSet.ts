import type { IfcTessellatedItem } from './IfcTessellatedItem.js';
import type { IfcCartesianPointList3D } from './IfcCartesianPointList3D.js';

export interface IfcTessellatedFaceSet extends IfcTessellatedItem {
  Coordinates: IfcCartesianPointList3D;
}
