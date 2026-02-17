import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';

export interface IfcUShapeProfileDef extends IfcParameterizedProfileDef {
  Depth: IfcPositiveLengthMeasure;
  FlangeWidth: IfcPositiveLengthMeasure;
  WebThickness: IfcPositiveLengthMeasure;
  FlangeThickness: IfcPositiveLengthMeasure;
  FilletRadius?: IfcNonNegativeLengthMeasure | null;
  EdgeRadius?: IfcNonNegativeLengthMeasure | null;
  FlangeSlope?: IfcPlaneAngleMeasure | null;
}
