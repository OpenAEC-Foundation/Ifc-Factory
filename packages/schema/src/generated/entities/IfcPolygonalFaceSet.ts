import type { IfcTessellatedFaceSet } from './IfcTessellatedFaceSet.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcIndexedPolygonalFace } from './IfcIndexedPolygonalFace.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';

export interface IfcPolygonalFaceSet extends IfcTessellatedFaceSet {
  Closed?: IfcBoolean | null;
  Faces: IfcIndexedPolygonalFace[];
  PnIndex?: IfcPositiveInteger[] | null;
}
