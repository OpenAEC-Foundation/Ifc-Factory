import type { IfcRectangleProfileDef } from './IfcRectangleProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcRoundedRectangleProfileDef extends IfcRectangleProfileDef {
  RoundingRadius: IfcPositiveLengthMeasure;
}
