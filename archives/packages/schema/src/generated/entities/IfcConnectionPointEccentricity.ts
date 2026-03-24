import type { IfcConnectionPointGeometry } from './IfcConnectionPointGeometry.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcConnectionPointEccentricity extends IfcConnectionPointGeometry {
  EccentricityInX?: IfcLengthMeasure | null;
  EccentricityInY?: IfcLengthMeasure | null;
  EccentricityInZ?: IfcLengthMeasure | null;
}
