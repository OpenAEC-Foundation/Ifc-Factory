import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';

export interface IfcLShapeProfileDef extends IfcParameterizedProfileDef {
  Depth: IfcPositiveLengthMeasure;
  Width?: IfcPositiveLengthMeasure | null;
  Thickness: IfcPositiveLengthMeasure;
  FilletRadius?: IfcNonNegativeLengthMeasure | null;
  EdgeRadius?: IfcNonNegativeLengthMeasure | null;
  LegSlope?: IfcPlaneAngleMeasure | null;
}
