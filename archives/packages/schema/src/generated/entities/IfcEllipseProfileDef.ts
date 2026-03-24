import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcEllipseProfileDef extends IfcParameterizedProfileDef {
  SemiAxis1: IfcPositiveLengthMeasure;
  SemiAxis2: IfcPositiveLengthMeasure;
}
