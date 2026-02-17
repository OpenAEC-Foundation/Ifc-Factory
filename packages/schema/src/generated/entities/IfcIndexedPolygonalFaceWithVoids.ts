import type { IfcIndexedPolygonalFace } from './IfcIndexedPolygonalFace.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';

export interface IfcIndexedPolygonalFaceWithVoids extends IfcIndexedPolygonalFace {
  InnerCoordIndices: IfcPositiveInteger[][];
}
