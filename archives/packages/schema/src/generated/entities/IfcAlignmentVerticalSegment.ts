import type { IfcAlignmentParameterSegment } from './IfcAlignmentParameterSegment.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcRatioMeasure } from '../types/IfcRatioMeasure.js';
import type { IfcAlignmentVerticalSegmentTypeEnum } from '../enums/IfcAlignmentVerticalSegmentTypeEnum.js';

export interface IfcAlignmentVerticalSegment extends IfcAlignmentParameterSegment {
  StartDistAlong: IfcLengthMeasure;
  HorizontalLength: IfcNonNegativeLengthMeasure;
  StartHeight: IfcLengthMeasure;
  StartGradient: IfcRatioMeasure;
  EndGradient: IfcRatioMeasure;
  RadiusOfCurvature?: IfcLengthMeasure | null;
  PredefinedType: IfcAlignmentVerticalSegmentTypeEnum;
}
