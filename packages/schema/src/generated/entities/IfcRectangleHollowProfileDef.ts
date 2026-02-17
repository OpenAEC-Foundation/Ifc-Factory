import type { IfcRectangleProfileDef } from './IfcRectangleProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';

export interface IfcRectangleHollowProfileDef extends IfcRectangleProfileDef {
  WallThickness: IfcPositiveLengthMeasure;
  InnerFilletRadius?: IfcNonNegativeLengthMeasure | null;
  OuterFilletRadius?: IfcNonNegativeLengthMeasure | null;
}
