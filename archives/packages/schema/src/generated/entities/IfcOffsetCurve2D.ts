import type { IfcOffsetCurve } from './IfcOffsetCurve.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcLogical } from '../types/IfcLogical.js';

export interface IfcOffsetCurve2D extends IfcOffsetCurve {
  Distance: IfcLengthMeasure;
  SelfIntersect: IfcLogical;
}
