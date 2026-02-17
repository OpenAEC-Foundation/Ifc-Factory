import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';

export interface IfcAsymmetricIShapeProfileDef extends IfcParameterizedProfileDef {
  BottomFlangeWidth: IfcPositiveLengthMeasure;
  OverallDepth: IfcPositiveLengthMeasure;
  WebThickness: IfcPositiveLengthMeasure;
  BottomFlangeThickness: IfcPositiveLengthMeasure;
  BottomFlangeFilletRadius?: IfcNonNegativeLengthMeasure | null;
  TopFlangeWidth: IfcPositiveLengthMeasure;
  TopFlangeThickness?: IfcPositiveLengthMeasure | null;
  TopFlangeFilletRadius?: IfcNonNegativeLengthMeasure | null;
  BottomFlangeEdgeRadius?: IfcNonNegativeLengthMeasure | null;
  BottomFlangeSlope?: IfcPlaneAngleMeasure | null;
  TopFlangeEdgeRadius?: IfcNonNegativeLengthMeasure | null;
  TopFlangeSlope?: IfcPlaneAngleMeasure | null;
}
