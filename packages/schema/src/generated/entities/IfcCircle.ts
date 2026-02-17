import type { IfcConic } from './IfcConic.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcCircle extends IfcConic {
  Radius: IfcPositiveLengthMeasure;
}
