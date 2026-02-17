import type { IfcPresentationStyle } from './IfcPresentationStyle.js';
import type { IfcCurveFontOrScaledCurveFontSelect } from '../selects/IfcCurveFontOrScaledCurveFontSelect.js';
import type { IfcSizeSelect } from '../selects/IfcSizeSelect.js';
import type { IfcColour } from '../selects/IfcColour.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcCurveStyle extends IfcPresentationStyle {
  CurveFont?: IfcCurveFontOrScaledCurveFontSelect | null;
  CurveWidth?: IfcSizeSelect | null;
  CurveColour?: IfcColour | null;
  ModelOrDraughting?: IfcBoolean | null;
}
