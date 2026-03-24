import type { IfcTessellatedItem } from './IfcTessellatedItem.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';

export interface IfcIndexedPolygonalFace extends IfcTessellatedItem {
  CoordIndex: IfcPositiveInteger[];
}
