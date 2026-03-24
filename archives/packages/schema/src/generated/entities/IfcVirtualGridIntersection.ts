import type { IfcGridAxis } from './IfcGridAxis.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcVirtualGridIntersection {
  readonly type: string;
  IntersectingAxes: IfcGridAxis[];
  OffsetDistances: IfcLengthMeasure[];
}
