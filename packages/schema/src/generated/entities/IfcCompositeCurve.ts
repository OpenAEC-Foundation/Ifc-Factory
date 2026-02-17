import type { IfcBoundedCurve } from './IfcBoundedCurve.js';
import type { IfcSegment } from './IfcSegment.js';
import type { IfcLogical } from '../types/IfcLogical.js';

export interface IfcCompositeCurve extends IfcBoundedCurve {
  Segments: IfcSegment[];
  SelfIntersect: IfcLogical;
}
