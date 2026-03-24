import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';

export interface IfcIShapeProfileDef extends IfcParameterizedProfileDef {
  OverallWidth: IfcPositiveLengthMeasure;
  OverallDepth: IfcPositiveLengthMeasure;
  WebThickness: IfcPositiveLengthMeasure;
  FlangeThickness: IfcPositiveLengthMeasure;
  FilletRadius?: IfcNonNegativeLengthMeasure | null;
  FlangeEdgeRadius?: IfcNonNegativeLengthMeasure | null;
  FlangeSlope?: IfcPlaneAngleMeasure | null;
}
