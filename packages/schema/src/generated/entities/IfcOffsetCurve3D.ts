import type { IfcOffsetCurve } from './IfcOffsetCurve.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcLogical } from '../types/IfcLogical.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcOffsetCurve3D extends IfcOffsetCurve {
  Distance: IfcLengthMeasure;
  SelfIntersect: IfcLogical;
  RefDirection: IfcDirection;
}
