import type { IfcCircleProfileDef } from './IfcCircleProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcCircleHollowProfileDef extends IfcCircleProfileDef {
  WallThickness: IfcPositiveLengthMeasure;
}
