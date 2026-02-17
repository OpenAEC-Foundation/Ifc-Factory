import type { IfcSegment } from './IfcSegment.js';
import type { IfcPlacement } from './IfcPlacement.js';
import type { IfcCurveMeasureSelect } from '../selects/IfcCurveMeasureSelect.js';
import type { IfcCurve } from './IfcCurve.js';

export interface IfcCurveSegment extends IfcSegment {
  Placement: IfcPlacement;
  SegmentStart: IfcCurveMeasureSelect;
  SegmentLength: IfcCurveMeasureSelect;
  ParentCurve: IfcCurve;
}
