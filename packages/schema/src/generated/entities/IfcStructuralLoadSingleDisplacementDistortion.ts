import type { IfcStructuralLoadSingleDisplacement } from './IfcStructuralLoadSingleDisplacement.js';
import type { IfcCurvatureMeasure } from '../types/IfcCurvatureMeasure.js';

export interface IfcStructuralLoadSingleDisplacementDistortion extends IfcStructuralLoadSingleDisplacement {
  Distortion?: IfcCurvatureMeasure | null;
}
