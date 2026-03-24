import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcRectangleProfileDef extends IfcParameterizedProfileDef {
  XDim: IfcPositiveLengthMeasure;
  YDim: IfcPositiveLengthMeasure;
}
