import type { IfcTextureCoordinateIndices } from './IfcTextureCoordinateIndices.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';

export interface IfcTextureCoordinateIndicesWithVoids extends IfcTextureCoordinateIndices {
  InnerTexCoordIndices: IfcPositiveInteger[][];
}
