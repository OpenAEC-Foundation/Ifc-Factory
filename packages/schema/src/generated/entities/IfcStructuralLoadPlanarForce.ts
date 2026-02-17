import type { IfcStructuralLoadStatic } from './IfcStructuralLoadStatic.js';
import type { IfcPlanarForceMeasure } from '../types/IfcPlanarForceMeasure.js';

export interface IfcStructuralLoadPlanarForce extends IfcStructuralLoadStatic {
  PlanarForceX?: IfcPlanarForceMeasure | null;
  PlanarForceY?: IfcPlanarForceMeasure | null;
  PlanarForceZ?: IfcPlanarForceMeasure | null;
}
