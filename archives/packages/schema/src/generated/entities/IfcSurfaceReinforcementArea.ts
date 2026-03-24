import type { IfcStructuralLoadOrResult } from './IfcStructuralLoadOrResult.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcRatioMeasure } from '../types/IfcRatioMeasure.js';

export interface IfcSurfaceReinforcementArea extends IfcStructuralLoadOrResult {
  SurfaceReinforcement1?: IfcLengthMeasure[] | null;
  SurfaceReinforcement2?: IfcLengthMeasure[] | null;
  ShearReinforcement?: IfcRatioMeasure | null;
}
