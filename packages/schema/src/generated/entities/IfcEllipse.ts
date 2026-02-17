import type { IfcConic } from './IfcConic.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcEllipse extends IfcConic {
  SemiAxis1: IfcPositiveLengthMeasure;
  SemiAxis2: IfcPositiveLengthMeasure;
}
