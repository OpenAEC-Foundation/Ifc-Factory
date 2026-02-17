import type { IfcPoint } from './IfcPoint.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';

export interface IfcPointOnCurve extends IfcPoint {
  BasisCurve: IfcCurve;
  PointParameter: IfcParameterValue;
}
