import type { IfcBSplineCurveWithKnots } from './IfcBSplineCurveWithKnots.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcRationalBSplineCurveWithKnots extends IfcBSplineCurveWithKnots {
  WeightsData: IfcReal[];
}
