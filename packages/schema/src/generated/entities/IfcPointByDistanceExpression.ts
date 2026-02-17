import type { IfcPoint } from './IfcPoint.js';
import type { IfcCurveMeasureSelect } from '../selects/IfcCurveMeasureSelect.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcCurve } from './IfcCurve.js';

export interface IfcPointByDistanceExpression extends IfcPoint {
  DistanceAlong: IfcCurveMeasureSelect;
  OffsetLateral?: IfcLengthMeasure | null;
  OffsetVertical?: IfcLengthMeasure | null;
  OffsetLongitudinal?: IfcLengthMeasure | null;
  BasisCurve: IfcCurve;
}
