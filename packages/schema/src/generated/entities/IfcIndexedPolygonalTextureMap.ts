import type { IfcIndexedTextureMap } from './IfcIndexedTextureMap.js';
import type { IfcTextureCoordinateIndices } from './IfcTextureCoordinateIndices.js';

export interface IfcIndexedPolygonalTextureMap extends IfcIndexedTextureMap {
  TexCoordIndices: IfcTextureCoordinateIndices[];
}
