import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcCurveStyleFontPattern extends IfcPresentationItem {
  VisibleSegmentLength: IfcLengthMeasure;
  InvisibleSegmentLength: IfcPositiveLengthMeasure;
}
