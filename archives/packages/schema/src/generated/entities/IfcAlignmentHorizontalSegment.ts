import type { IfcAlignmentParameterSegment } from './IfcAlignmentParameterSegment.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcAlignmentHorizontalSegmentTypeEnum } from '../enums/IfcAlignmentHorizontalSegmentTypeEnum.js';

export interface IfcAlignmentHorizontalSegment extends IfcAlignmentParameterSegment {
  StartPoint: IfcCartesianPoint;
  StartDirection: IfcPlaneAngleMeasure;
  StartRadiusOfCurvature: IfcLengthMeasure;
  EndRadiusOfCurvature: IfcLengthMeasure;
  SegmentLength: IfcNonNegativeLengthMeasure;
  GravityCenterLineHeight?: IfcPositiveLengthMeasure | null;
  PredefinedType: IfcAlignmentHorizontalSegmentTypeEnum;
}
