import type { IfcIndexedTextureMap } from './IfcIndexedTextureMap.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';

export interface IfcIndexedTriangleTextureMap extends IfcIndexedTextureMap {
  TexCoordIndex?: IfcPositiveInteger[][] | null;
}
