import type { IfcStructuralLoadStatic } from './IfcStructuralLoadStatic.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';

export interface IfcStructuralLoadSingleDisplacement extends IfcStructuralLoadStatic {
  DisplacementX?: IfcLengthMeasure | null;
  DisplacementY?: IfcLengthMeasure | null;
  DisplacementZ?: IfcLengthMeasure | null;
  RotationalDisplacementRX?: IfcPlaneAngleMeasure | null;
  RotationalDisplacementRY?: IfcPlaneAngleMeasure | null;
  RotationalDisplacementRZ?: IfcPlaneAngleMeasure | null;
}
