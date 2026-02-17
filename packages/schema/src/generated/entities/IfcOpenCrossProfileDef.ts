import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';

export interface IfcOpenCrossProfileDef extends IfcProfileDef {
  HorizontalWidths: IfcBoolean;
  Widths: IfcNonNegativeLengthMeasure[];
  Slopes: IfcPlaneAngleMeasure[];
  Tags?: IfcLabel[] | null;
  OffsetPoint?: IfcCartesianPoint | null;
}
