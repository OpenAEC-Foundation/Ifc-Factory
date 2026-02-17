import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcCurveStyleFontPattern } from './IfcCurveStyleFontPattern.js';

export interface IfcCurveStyleFont extends IfcPresentationItem {
  Name?: IfcLabel | null;
  PatternList: IfcCurveStyleFontPattern[];
}
