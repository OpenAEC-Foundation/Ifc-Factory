import type { IfcPoint } from './IfcPoint.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcCartesianPoint extends IfcPoint {
  Coordinates: IfcLengthMeasure[];
}
