import type { IfcBSplineSurfaceWithKnots } from './IfcBSplineSurfaceWithKnots.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcRationalBSplineSurfaceWithKnots extends IfcBSplineSurfaceWithKnots {
  WeightsData: IfcReal[][];
}
