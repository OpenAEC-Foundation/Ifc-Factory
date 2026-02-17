import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcCircleProfileDef extends IfcParameterizedProfileDef {
  Radius: IfcPositiveLengthMeasure;
}
