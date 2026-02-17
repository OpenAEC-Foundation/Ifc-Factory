import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';

export interface IfcZShapeProfileDef extends IfcParameterizedProfileDef {
  Depth: IfcPositiveLengthMeasure;
  FlangeWidth: IfcPositiveLengthMeasure;
  WebThickness: IfcPositiveLengthMeasure;
  FlangeThickness: IfcPositiveLengthMeasure;
  FilletRadius?: IfcNonNegativeLengthMeasure | null;
  EdgeRadius?: IfcNonNegativeLengthMeasure | null;
}
