import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';

export interface IfcCShapeProfileDef extends IfcParameterizedProfileDef {
  Depth: IfcPositiveLengthMeasure;
  Width: IfcPositiveLengthMeasure;
  WallThickness: IfcPositiveLengthMeasure;
  Girth: IfcPositiveLengthMeasure;
  InternalFilletRadius?: IfcNonNegativeLengthMeasure | null;
}
