import type { IfcSegment } from './IfcSegment.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcCurve } from './IfcCurve.js';

export interface IfcCompositeCurveSegment extends IfcSegment {
  SameSense: IfcBoolean;
  ParentCurve: IfcCurve;
}
