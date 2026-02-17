import type { IfcAlignmentParameterSegment } from './IfcAlignmentParameterSegment.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcAlignmentCantSegmentTypeEnum } from '../enums/IfcAlignmentCantSegmentTypeEnum.js';

export interface IfcAlignmentCantSegment extends IfcAlignmentParameterSegment {
  StartDistAlong: IfcLengthMeasure;
  HorizontalLength: IfcNonNegativeLengthMeasure;
  StartCantLeft: IfcLengthMeasure;
  EndCantLeft?: IfcLengthMeasure | null;
  StartCantRight: IfcLengthMeasure;
  EndCantRight?: IfcLengthMeasure | null;
  PredefinedType: IfcAlignmentCantSegmentTypeEnum;
}
