import type { IfcOffsetCurve } from './IfcOffsetCurve.js';
import type { IfcPointByDistanceExpression } from './IfcPointByDistanceExpression.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcOffsetCurveByDistances extends IfcOffsetCurve {
  OffsetValues: IfcPointByDistanceExpression[];
  Tag?: IfcLabel | null;
}
