import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcCurveStyleFontSelect } from '../selects/IfcCurveStyleFontSelect.js';
import type { IfcPositiveRatioMeasure } from '../types/IfcPositiveRatioMeasure.js';

export interface IfcCurveStyleFontAndScaling extends IfcPresentationItem {
  Name?: IfcLabel | null;
  CurveStyleFont: IfcCurveStyleFontSelect;
  CurveFontScaling: IfcPositiveRatioMeasure;
}
