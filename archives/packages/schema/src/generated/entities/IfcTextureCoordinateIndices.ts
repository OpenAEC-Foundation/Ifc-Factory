import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';
import type { IfcIndexedPolygonalFace } from './IfcIndexedPolygonalFace.js';

export interface IfcTextureCoordinateIndices {
  readonly type: string;
  TexCoordIndex: IfcPositiveInteger[];
  TexCoordsOf: IfcIndexedPolygonalFace;
}
